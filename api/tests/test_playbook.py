import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from api.main import app


class PlaybookTests(unittest.TestCase):
    def test_staged_scan_and_saved_ideas_persist_without_duplicate_posts(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'THERMOPB_DB_PATH': str(Path(tmp)/'state.sqlite3'), 'DEMO_MODE': '1'}):
            client=TestClient(app)
            initial=client.get('/playbook').json()
            self.assertEqual(len(initial['ideas']),4)
            self.assertFalse(initial['live'])
            result=client.post('/playbook/scan',json={'days':90}).json()
            self.assertEqual(result['scan']['new_count'],2)
            self.assertEqual(len(result['ideas']),6)
            self.assertTrue(all(idea['is_demo'] for idea in result['ideas']))
            identity=result['ideas'][0]['id']
            client.post(f'/playbook/{identity}/save',json={'saved':True})
            saved=client.get('/playbook').json()['ideas']
            self.assertTrue(next(item for item in saved if item['id']==identity)['saved'])
            self.assertEqual(client.post('/playbook/scan',json={}).json()['scan']['new_count'],0)
            self.assertEqual(client.post('/playbook/missing/save',json={}).status_code,404)
