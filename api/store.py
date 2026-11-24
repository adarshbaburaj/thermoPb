"""SQLite transactions serialize state updates, including credits and approvals."""

from __future__ import annotations

import copy
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_seed() -> dict:
    seed = json.loads((ROOT / "fixtures" / "seed.json").read_text())
    seed.setdefault("graph", {"nodes": [], "edges": []})
    seed.setdefault("drafts", {})
    seed.setdefault("audit", [])
    seed.setdefault("meter_events", [])
    seed.setdefault("balance", seed.get("credits", {}).get("balance", 120))
    seed.setdefault("discoveries", {})
    seed.setdefault("intakes", {})
    seed.setdefault("agent_events", [])
    seed.setdefault("evidence", [])
    pipeline = seed.get("pipeline", [])
    if isinstance(pipeline, dict):
        pipeline = pipeline.get("cards", [])
    if not pipeline:
        pipeline = [{**lead, "target_id": lead.get("target_id", lead["id"]),
                     "stage": "Matched", "actor": "agent", "route": lead.get("best_route", "warm_intro")}
                    for lead in seed.get("leads", [])]
    for card in pipeline:
        card.setdefault("target_id", card.get("id"))
        card.setdefault("stage", card.get("status", "Matched"))
    seed["pipeline"] = pipeline
    return copy.deepcopy(seed)


def db_path() -> Path:
    return Path(os.environ.get("THERMOPB_DB_PATH", str(ROOT / "api" / "data" / "thermopb.sqlite3")))


@contextmanager
def transaction():
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=20)
    try:
        connection.execute("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)")
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute("SELECT body FROM state WHERE id=1").fetchone()
        state = json.loads(row[0]) if row else load_seed()
        yield state
        connection.execute("INSERT INTO state(id,body) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body", (json.dumps(state),))
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    finally:
        connection.close()


def snapshot() -> dict:
    with transaction() as state:
        return copy.deepcopy(state)
