import copy
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from api.graph_writer import merge_edge
from api.main import app, charge
from api.paths import edge_weight, find_paths
from api.store import load_seed, snapshot, transaction


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.environment = patch.dict(os.environ, {"THERMOPB_DB_PATH": str(Path(self.temp.name) / "state.sqlite3")})
        self.environment.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.environment.stop()
        self.temp.cleanup()

    def test_inferred_penalty_and_recency(self):
        now = datetime(2026, 11, 24, tzinfo=timezone.utc)
        edge = {"relation": "WORKED_WITH", "confidence": "EXTRACTED", "observed_at": now.isoformat()}
        self.assertAlmostEqual(edge_weight(edge, now), .75)
        edge["confidence"] = "INFERRED"
        self.assertAlmostEqual(edge_weight(edge, now), .75 * .6)
        edge["observed_at"] = (now - timedelta(days=365)).isoformat()
        self.assertAlmostEqual(edge_weight(edge, now), .75 * .6 * .5)

    def test_path_is_product_and_never_uses_company_links(self):
        state = load_seed()
        paths = find_paths(state, "person-maya-chen")
        self.assertTrue(paths)
        expected = .98
        for hop in paths[0]["hops"]:
            self.assertNotEqual(hop["relation"], "WORKS_AT")
            expected *= edge_weight(hop)
        self.assertAlmostEqual(paths[0]["score"], round(expected, 4), places=4)
        self.assertEqual(len({paths[0]["hops"][0]["from"]} | {h["to"] for h in paths[0]["hops"]}), len(paths[0]["hops"]) + 1)

    def test_capture_known_identity_unlocks_three_and_retries_are_safe(self):
        body = {"name": "Priya Nair", "profile_url": "https://example.com/in/priya-nair"}
        first = self.client.post("/network/capture", json=body)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["unlock_score"], 3)
        count = len(snapshot()["graph"]["edges"])
        second = self.client.post("/network/capture", json=body)
        self.assertFalse(second.json()["added"])
        self.assertEqual(second.json()["unlock_score"], 0)
        self.assertEqual(len(snapshot()["graph"]["edges"]), count)

    def test_capture_arbitrary_identity_does_not_fabricate_relationships(self):
        before = snapshot()
        response = self.client.post("/network/capture", json={"name": "Priya Nair", "profile_url": "https://example.com/someone-else"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["unlock_score"], 0)
        self.assertNotEqual(response.json()["person_id"], "person-priya-nair")
        after = snapshot()
        self.assertEqual(len(after["graph"]["edges"]), len(before["graph"]["edges"]) + 1)
        self.assertEqual(self.client.post("/network/capture", json={"name": "Unsafe", "profile_url": "javascript:alert(1)"}).status_code, 422)

    def test_writer_rejects_missing_provenance(self):
        graph = copy.deepcopy(load_seed()["graph"])
        with self.assertRaises(ValueError):
            merge_edge(graph, {"source": "person-ravi-shah", "target": "person-priya-nair", "relation": "WORKED_WITH", "confidence": "EXTRACTED"})

    def test_review_blocks_unsupported_edits_and_approval_is_idempotent(self):
        draft = self.client.post("/drafts", json={"target_id": "person-maya-chen", "route": "warm_intro"}).json()
        self.assertTrue(draft["can_approve"])
        bad_body = draft["body"] + " Your company raised ten million dollars yesterday."
        bad = self.client.post(f"/drafts/{draft['draft_id']}/approve", json={"edited_body": bad_body})
        self.assertEqual(bad.status_code, 422)
        self.assertEqual(snapshot()["drafts"][draft["draft_id"]]["status"], "draft")
        good = self.client.post(f"/drafts/{draft['draft_id']}/approve", json={})
        self.assertEqual(good.status_code, 200)
        self.assertFalse(good.json()["sent"])
        self.assertEqual(self.client.post(f"/drafts/{draft['draft_id']}/approve", json={}).status_code, 200)
        self.assertEqual(len([a for a in snapshot()["audit"] if a["action"] == "draft_approved"]), 1)
        self.assertEqual(self.client.get("/credits").json()["events"]["outreach_sent"], 0)

    def test_credit_spend_is_atomic_and_never_negative(self):
        with transaction() as state:
            state["balance"] = 3

        def spend(index):
            try:
                with transaction() as state:
                    charge(state, "event_scan", key=f"test-{index}")
                return True
            except Exception:
                return False

        with ThreadPoolExecutor(max_workers=4) as executor:
            outcomes = list(executor.map(spend, range(4)))
        self.assertEqual(sum(outcomes), 1)
        self.assertEqual(snapshot()["balance"], 0)
        denied = self.client.post("/cake/person-maya-chen", json={"line": "Hello"})
        self.assertEqual(denied.status_code, 402)
        self.assertEqual(snapshot()["balance"], 0)

    def test_discovery_is_idempotent_and_requires_intake(self):
        self.assertEqual(self.client.post("/discover", json={"icp_id": "unknown"}).status_code, 404)
        intake = self.client.post("/intake", json={"product_text": "An agent observability toolkit for platform engineering teams."}).json()
        first = self.client.post("/discover", json={"icp_id": intake["icp_id"]})
        self.assertGreaterEqual(len(first.json()["leads"]), 15)
        balance = self.client.get("/credits").json()["balance"]
        self.client.post("/discover", json={"icp_id": intake["icp_id"]})
        self.assertEqual(self.client.get("/credits").json()["balance"], balance)

    def test_calendar_and_alert_are_explicit_demo(self):
        event_id = load_seed()["events"][0]["id"]
        response = self.client.get(f"/radar/{event_id}/calendar")
        self.assertEqual(response.status_code, 200)
        self.assertIn("BEGIN:VCALENDAR", response.text)
        self.assertIn("SUMMARY:", response.text)
        self.assertFalse(self.client.post(f"/radar/alert/{event_id}").json()["sent"])

    def test_demo_reset_restore_is_reversible_bounded_and_blocked_in_live_mode(self):
        profile = {"name": "Priya Nair", "profile_url": "https://example.com/in/priya-nair"}
        self.assertEqual(self.client.post("/network/capture", json=profile).json()["unlock_score"], 3)
        draft = self.client.post("/drafts", json={"target_id": "person-maya-chen", "route": "warm_intro"}).json()
        self.client.post(f"/drafts/{draft['draft_id']}/approve", json={})
        previous = snapshot()
        reset = self.client.post("/demo/reset")
        self.assertEqual(reset.status_code, 200)
        self.assertTrue(reset.json()["can_restore"])
        clean = snapshot()
        self.assertEqual(clean["drafts"], {})
        self.assertNotIn("_demo_restore", clean["_demo_restore"])
        # A replay can now reveal the same three paths and approve its fresh draft.
        self.assertEqual(self.client.post("/network/capture", json=profile).json()["unlock_score"], 3)
        restored = self.client.post("/demo/restore")
        self.assertEqual(restored.status_code, 200)
        state = snapshot()
        self.assertEqual(state["graph"], previous["graph"])
        self.assertEqual(state["drafts"], previous["drafts"])
        self.assertNotIn("_demo_restore", state)
        self.assertEqual(self.client.post("/demo/restore").status_code, 409)
        self.client.post("/demo/reset")
        self.client.post("/demo/reset")
        self.assertNotIn("_demo_restore", snapshot()["_demo_restore"])
        with patch("api.main.DEMO_MODE", False):
            self.assertEqual(self.client.post("/demo/reset").status_code, 503)
            self.assertEqual(self.client.post("/demo/restore").status_code, 503)


if __name__ == "__main__":
    unittest.main()
