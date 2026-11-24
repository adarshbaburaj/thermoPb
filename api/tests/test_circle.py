import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.circle import router
from api.store import snapshot, transaction


class CircleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        path = str(Path(self.temp.name) / 'circle.sqlite3')
        self.environment = patch.dict(os.environ, {'THERMOPB_DB_PATH': path, 'DEMO_MODE': '1'})
        self.environment.start()
        app = FastAPI()
        app.include_router(router)
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.environment.stop()
        self.temp.cleanup()

    def invite(self, thermo_id='TM-PRIYA'):
        response = self.client.post('/circle/invite', json={'thermo_id': thermo_id})
        self.assertEqual(response.status_code, 200)
        return response.json()['id']

    def accept(self, invite_id):
        return self.client.post(f'/circle/invites/{invite_id}/respond', json={'decision': 'accept', 'demo_peer': True})

    def test_pending_invite_shares_nothing_and_does_not_change_graph(self):
        before = snapshot()['graph']
        invite_id = self.invite()
        circle = self.client.get('/circle').json()
        self.assertEqual(circle['members'], [])
        self.assertEqual(circle['suggestions'], [])
        self.assertEqual(circle['invites'][0]['status'], 'pending')
        self.assertNotIn('shared_target_ids', str(circle))
        self.assertEqual(snapshot()['graph'], before)
        self.assertEqual(self.invite(), invite_id)
        self.assertEqual(len(snapshot()['circle']['invites']), 1)

    def test_accept_shares_only_sourced_opted_in_subset_and_is_idempotent(self):
        before = snapshot()
        invite_id = self.invite()
        response = self.accept(invite_id)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'accepted')
        self.assertFalse(data['sent'])
        self.assertEqual({r['target_id'] for r in data['member']['shared_relationships']},
                         {'person-maya-chen', 'person-zara-ahmed', 'person-ethan-park'})
        self.assertEqual(len(data['suggestions']), 3)
        after = snapshot()
        delta = after['graph']['edges'][len(before['graph']['edges']):]
        self.assertEqual(len(delta), 1)
        self.assertEqual(delta[0]['source'], 'person-adarsh-baburaj')
        self.assertEqual(delta[0]['target'], 'person-priya-nair')
        self.assertEqual(delta[0]['relation'], 'KNOWS_DIRECT')
        for suggestion in data['suggestions']:
            evidence = next(e for e in after['evidence'] if e['id'] == suggestion['evidence_id'])
            self.assertEqual(suggestion['source_url'], evidence['url'])
            self.assertEqual(suggestion['source_file'], evidence['source_file'])
            self.assertGreater(suggestion['path_score'], suggestion['previous_score'])
        again = self.accept(invite_id).json()
        self.assertTrue(again['idempotent'])
        self.assertEqual(len(snapshot()['graph']['edges']), len(after['graph']['edges']))
        self.assertEqual(len(snapshot()['circle']['members']), 1)
        self.assertEqual(len([e for e in snapshot()['audit'] if e['action'] == 'circle_invite_accepted']), 1)

    def test_decline_never_adds_graph_relationships(self):
        before = snapshot()['graph']
        invite_id = self.invite('TM-ELENA')
        result = self.client.post(f'/circle/invites/{invite_id}/respond', json={'decision': 'decline', 'demo_peer': True})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['suggestions'], [])
        self.assertEqual(snapshot()['graph'], before)
        self.assertEqual(self.client.get('/circle').json()['members'], [])
        self.assertEqual(self.accept(invite_id).status_code, 409)

    def test_unknown_identity_self_invite_and_unacknowledged_consent_rejected(self):
        before = snapshot()['graph']
        self.assertEqual(self.client.post('/circle/invite', json={'thermo_id': 'TM-UNKNOWN'}).status_code, 404)
        self.assertEqual(self.client.post('/circle/invite', json={'thermo_id': 'TM-ADARSH'}).status_code, 422)
        invite_id = self.invite()
        self.assertEqual(self.client.post(f'/circle/invites/{invite_id}/respond', json={'decision': 'accept'}).status_code, 422)
        self.assertEqual(self.client.post(f'/circle/invites/{invite_id}/respond', json={'decision': 'accept', 'demo_peer': False}).status_code, 422)
        self.assertEqual(snapshot()['graph'], before)
        with patch.dict(os.environ, {'DEMO_MODE': '0'}):
            self.assertEqual(self.accept(invite_id).status_code, 503)

    def test_existing_capture_not_duplicated_and_unsupported_sources_not_shared(self):
        from api import graph_writer
        with transaction() as state:
            priya = next(n for n in state['graph']['nodes'] if n['id'] == 'person-priya-nair')
            graph_writer.capture(state['graph'], 'person-adarsh-baburaj', priya.copy())
        count = len(snapshot()['graph']['edges'])
        result = self.accept(self.invite()).json()
        self.assertEqual(result['suggestions'], [])
        self.assertEqual(len(snapshot()['graph']['edges']), count)
        with transaction() as state:
            for edge in state['graph']['edges']:
                if edge['source'] == 'person-elena-park' and edge['target'] == 'person-maya-chen':
                    edge['evidence_ids'] = ['missing-evidence']
        elena = self.accept(self.invite('TM-ELENA')).json()
        self.assertEqual(elena['member']['shared_relationships'], [])
        self.assertEqual(elena['suggestions'], [])

    def test_intro_prepares_local_double_opt_in_message_and_dismiss_hides_popup(self):
        data = self.accept(self.invite()).json()
        suggestion = data['suggestions'][0]
        route = f'/circle/suggestions/{suggestion["id"]}'
        draft = self.client.post(route + '/request-intro').json()
        self.assertFalse(draft['sent'])
        self.assertTrue(draft['requires_approval'])
        self.assertIn('whether an introduction would be welcome', draft['body'])
        self.assertEqual(snapshot()['drafts'], {})
        self.client.post(route + '/request-intro')
        self.assertEqual(len([e for e in snapshot()['audit'] if e['action'] == 'circle_intro_draft_prepared']), 1)
        self.assertEqual(self.client.post(route + '/dismiss').status_code, 200)
        remaining = self.client.get('/circle').json()['suggestions']
        self.assertNotIn(suggestion['id'], [s['id'] for s in remaining])
        self.assertEqual(self.client.post(route + '/request-intro').status_code, 409)


if __name__ == '__main__':
    unittest.main()
