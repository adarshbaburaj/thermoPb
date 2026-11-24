"""Local Thermo-ID circle demo. No production identity or remote consent is claimed."""
from __future__ import annotations

import copy
import os
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import graph_writer
from .paths import find_paths, me_id
from .store import snapshot, transaction

router = APIRouter(prefix='/circle', tags=['Thermo circle · local demo'])
NOTICE = 'Connections are shared only after the other person accepts.'
DIRECTORY = {
    'TM-PRIYA': {'thermo_id': 'TM-PRIYA', 'person_id': 'person-priya-nair', 'name': 'Priya Nair',
                 'shared_target_ids': ['person-maya-chen', 'person-zara-ahmed', 'person-ethan-park']},
    'TM-ELENA': {'thermo_id': 'TM-ELENA', 'person_id': 'person-elena-park', 'name': 'Elena Park',
                 'shared_target_ids': ['person-maya-chen']},
}


def now():
    return datetime.now(timezone.utc).isoformat()


def require_demo():
    if os.getenv('DEMO_MODE', '1') != '1':
        raise HTTPException(503, 'Thermo-ID sharing is a local demo only; authenticated peer accounts are not connected.')


def circle_state(state):
    circle = state.setdefault('circle', {})
    circle.setdefault('members', [])
    circle.setdefault('invites', [])
    circle.setdefault('suggestions', [])
    return circle


def log_action(state, action, **details):
    state.setdefault('audit', []).append({'id': uuid.uuid4().hex, 'action': action, 'actor': 'you', 'ts': now(),
                                         'mode': 'demo', 'simulated_peer': True, **details})


def activity(state, text):
    state.setdefault('agent_events', []).append({'agent': 'Builder', 'role': 'circle', 'text': text,
                                                'ts': now(), 'tokens': 0, 'cost': 0, 'provider': 'local-demo'})
    state['agent_events'] = state['agent_events'][-150:]


def public_peer(peer):
    return {key: peer[key] for key in ['thermo_id', 'person_id', 'name']}


def shared_relationships(state, peer):
    """Only the peer's allowlisted, already sourced fixture edges can be shared."""
    evidence = {item['id']: item for item in state.get('evidence', [])}
    leads = {lead.get('target_id', lead['id']): lead for lead in state['leads']}
    shared = []
    for edge in state['graph']['edges']:
        if edge.get('relation') not in graph_writer.RELATION_WEIGHTS:
            continue
        ends = [edge.get('source'), edge.get('target')]
        if peer['person_id'] not in ends:
            continue
        target_id = ends[1] if ends[0] == peer['person_id'] else ends[0]
        if target_id not in peer['shared_target_ids'] or target_id not in leads:
            continue
        source = next((evidence[eid] for eid in edge.get('evidence_ids', []) if eid in evidence
                       and evidence[eid].get('url') == edge.get('source_url')
                       and evidence[eid].get('source_file') == edge.get('source_file')), None)
        if source is None or edge.get('confidence') not in {'EXTRACTED', 'INFERRED'}:
            continue
        shared.append({'target_id': target_id, 'target_name': leads[target_id]['person'],
                       'relation': edge['relation'], 'confidence': edge['confidence'],
                       'source_url': edge['source_url'], 'source_file': edge['source_file'],
                       'evidence_id': source['id']})
    return shared


@router.get('')
def get_circle():
    state = snapshot()
    circle = circle_state(state)
    accepted_ids = {member['thermo_id'] for member in circle['members']}
    founder = next((node for node in state['graph']['nodes'] if node['id'] == me_id(state['graph'])), {})
    return {'profile': {'thermo_id': 'TM-ADARSH', 'name': founder.get('label', 'Adarsh Baburaj'),
                        'person_id': me_id(state['graph'])},
            'members': copy.deepcopy(circle['members']), 'invites': copy.deepcopy(circle['invites']),
            'suggestions': [copy.deepcopy(item) for item in circle['suggestions']
                            if item['thermo_id'] in accepted_ids and item.get('status') != 'dismissed'],
            'directory': [public_peer(peer) for peer in DIRECTORY.values()], 'mode': 'demo',
            'notice': NOTICE, 'external_send_enabled': False}


class Invite(BaseModel):
    thermo_id: str = Field(min_length=1, max_length=100)


@router.post('/invite')
def invite_peer(body: Invite):
    require_demo()
    thermo_id = body.thermo_id.strip().upper()
    if thermo_id == 'TM-ADARSH':
        raise HTTPException(422, 'You cannot invite your own Thermo ID.')
    peer = DIRECTORY.get(thermo_id)
    if peer is None:
        raise HTTPException(404, 'Thermo ID not found.')
    with transaction() as state:
        circle = circle_state(state)
        existing = next((item for item in circle['invites'] if item['thermo_id'] == thermo_id), None)
        if existing:
            return {**copy.deepcopy(existing), 'invite': copy.deepcopy(existing), 'sent': False,
                    'mode': 'demo', 'notice': NOTICE, 'idempotent': True}
        item = {'id': 'invite-' + uuid.uuid4().hex[:16], **public_peer(peer), 'status': 'pending',
                'created_at': now(), 'demo_peer': True, 'sent': False,
                'sharing': 'Nothing shared until the simulated peer accepts.'}
        circle['invites'].append(item)
        log_action(state, 'circle_invite_created', thermo_id=thermo_id, invite_id=item['id'])
        return {**copy.deepcopy(item), 'invite': copy.deepcopy(item), 'sent': False,
                'mode': 'demo', 'notice': NOTICE, 'idempotent': False}


class Respond(BaseModel):
    decision: Literal['accept', 'decline']
    demo_peer: Literal[True] = Field(description='Explicit acknowledgement that this simulates a fictional peer in the local demo.')


@router.post('/invites/{invite_id}/respond')
def respond_to_invite(invite_id: str, body: Respond):
    require_demo()
    with transaction() as state:
        circle = circle_state(state)
        invite = next((item for item in circle['invites'] if item['id'] == invite_id), None)
        if invite is None:
            raise HTTPException(404, 'Invite not found.')
        if invite['status'] != 'pending':
            expected = 'accepted' if body.decision == 'accept' else 'declined'
            if invite['status'] != expected:
                raise HTTPException(409, 'This invite has already been answered.')
            suggestions = [copy.deepcopy(s) for s in circle['suggestions'] if s['thermo_id'] == invite['thermo_id']
                           and s.get('status') != 'dismissed']
            return {'invite': copy.deepcopy(invite), 'status': invite['status'], 'suggestions': suggestions,
                    'sent': False, 'mode': 'demo', 'notice': NOTICE, 'idempotent': True}
        peer = DIRECTORY.get(invite['thermo_id'])
        if peer is None:
            raise HTTPException(404, 'That person is no longer available.')
        invite.update(status='accepted' if body.decision == 'accept' else 'declined', responded_at=now(),
                      consent_mode='local_simulated_peer')
        if body.decision == 'decline':
            log_action(state, 'circle_invite_declined', thermo_id=peer['thermo_id'], invite_id=invite_id)
            return {'invite': copy.deepcopy(invite), 'status': 'declined', 'suggestions': [],
                    'sent': False, 'mode': 'demo', 'notice': NOTICE, 'idempotent': False}
        person = next((node for node in state['graph']['nodes'] if node['id'] == peer['person_id']), None)
        if person is None:
            raise HTTPException(404, 'That person could not be found in your graph.')
        shared = shared_relationships(state, peer)
        before = {item['target_id']: (find_paths(state, item['target_id']) or [{'score': 0}])[0]['score'] for item in shared}
        added = graph_writer.capture(state['graph'], me_id(state['graph']), copy.deepcopy(person),
                                     f'{peer["name"]} accepted your Thermo ID connection.')
        capture_evidence_id = 'capture-' + peer['person_id']
        if not any(item['id'] == capture_evidence_id for item in state['evidence']):
            state['evidence'].append({'id': capture_evidence_id, 'title': 'Thermo ID connection',
                                     'text': f'{peer["name"]} accepted the connection and chose to share the relationships listed here.',
                                     'url': '/evidence/' + capture_evidence_id, 'source_file': 'gtm/manual-captures.md',
                                     'is_demo': True, 'simulated_peer': True, 'observed_at': now()})
        member = {**public_peer(peer), 'joined_at': invite['responded_at'], 'consent_mode': 'local_simulated_peer',
                  'shared_relationships': shared, 'is_demo': True}
        circle['members'].append(member)
        suggestions = []
        for relationship in shared:
            target_id = relationship['target_id']
            paths = find_paths(state, target_id)
            if not paths or paths[0]['score'] <= before[target_id] + .0001:
                continue
            item = {'id': 'suggestion-' + peer['thermo_id'].lower() + '-' + target_id,
                    **relationship, 'thermo_id': peer['thermo_id'], 'connector_id': peer['person_id'],
                    'connector_name': peer['name'], 'path_score': paths[0]['score'],
                    'previous_score': before[target_id], 'status': 'active', 'created_at': now(),
                    'text': f'{peer["name"]} knows {relationship["target_name"]}; ask {peer["name"].split()[0]} whether an introduction would be welcome.',
                    'is_demo': True, 'sent': False}
            circle['suggestions'].append(item)
            suggestions.append(copy.deepcopy(item))
        log_action(state, 'circle_invite_accepted', thermo_id=peer['thermo_id'], invite_id=invite_id,
                   shared_target_ids=[item['target_id'] for item in shared], added_direct_edge=added)
        activity(state, f'{peer["name"]} accepted. {len(shared)} relationships shared; {len(suggestions)} target routes improved.')
        return {'invite': copy.deepcopy(invite), 'status': 'accepted', 'member': copy.deepcopy(member),
                'suggestions': suggestions, 'sent': False, 'mode': 'demo', 'notice': NOTICE, 'idempotent': False}


def find_suggestion(state, suggestion_id):
    circle = circle_state(state)
    suggestion = next((item for item in circle['suggestions'] if item['id'] == suggestion_id), None)
    if suggestion is None or not any(m['thermo_id'] == suggestion['thermo_id'] for m in circle['members']):
        raise HTTPException(404, 'Shared route suggestion not found.')
    return suggestion


@router.post('/suggestions/{suggestion_id}/dismiss')
def dismiss_suggestion(suggestion_id: str):
    require_demo()
    with transaction() as state:
        suggestion = find_suggestion(state, suggestion_id)
        if suggestion.get('status') != 'dismissed':
            suggestion.update(status='dismissed', dismissed_at=now())
            log_action(state, 'circle_suggestion_dismissed', suggestion_id=suggestion_id)
        return {'status': 'dismissed', 'suggestion_id': suggestion_id, 'sent': False, 'mode': 'demo'}


@router.post('/suggestions/{suggestion_id}/request-intro')
def prepare_intro(suggestion_id: str):
    require_demo()
    with transaction() as state:
        suggestion = find_suggestion(state, suggestion_id)
        if suggestion.get('status') == 'dismissed':
            raise HTTPException(409, 'This route suggestion was dismissed.')
        body = (f'Hi {suggestion["connector_name"].split()[0]}, would you be comfortable asking '
                f'{suggestion["target_name"]} whether an introduction would be welcome? '
                'I can send a short forwardable note first.')
        if not suggestion.get('draft_prepared_at'):
            suggestion['draft_prepared_at'] = now()
            log_action(state, 'circle_intro_draft_prepared', suggestion_id=suggestion_id,
                       target_id=suggestion['target_id'])
        return {'status': 'draft', 'body': body, 'suggested_message': body,
                'target_id': suggestion['target_id'], 'connector_id': suggestion['connector_id'],
                'route': 'warm_intro', 'source_url': suggestion['source_url'],
                'requires_approval': True, 'sent': False, 'mode': 'demo', 'notice': NOTICE}
