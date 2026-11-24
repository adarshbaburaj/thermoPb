"""Staged outreach-idea feed for the recording demo. No live trend claims."""
from __future__ import annotations

import copy
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .store import transaction

router = APIRouter(prefix='/playbook', tags=['Outreach ideas · staged demo'])


def idea(identity, technique, title, author, summary, application, result, category, new=False):
    return {'id': identity, 'technique': technique, 'title': title, 'author': author,
            'source_name': 'Founder field notes', 'source_url': '/evidence/' + identity,
            'summary': summary, 'application': application, 'claim_type': 'Author-reported',
            'claim_note': 'Reported by the author. thermopb has not verified the outcome.',
            'reported_result': result, 'category': category, 'saved': False,
            'new': new, 'is_demo': True,
            'evidence_text': f'Post by {author}\n\n{title}\n\n{summary}\n\nReported outcome: {result}'}


IDEAS = [
    idea('idea-tiny-teardown', 'The 90-second teardown.', 'I sent 12 tiny product teardowns. Five founders asked to talk.', 'Lena Ortiz',
         'Instead of a pitch deck, Lena recorded one useful observation about each prospect’s onboarding flow. The email offered the clip, with no meeting link.',
         'Offer a short agent-debugging teardown for a target’s public product walkthrough. Ask permission before sending it.',
         '5 conversations from 12 tailored teardowns', 'Give first'),
    idea('idea-permission-ask', 'Ask for interest. Not a calendar slot.', 'Removing my calendar link changed the replies I got.', 'Noah Bell',
         'Noah replaced a 30-minute meeting request with one easy question: “Would this be useful?” A short reply became the beginning of a conversation.',
         'Close with one low-friction question. Keep the factual hook grounded in your target’s evidence.',
         'Reply rate rose from 4% to 11%', 'Cold email'),
    idea('idea-social-context', 'Continue a conversation they started.', 'One thoughtful reply beat my entire automated sequence.', 'Amira Cole',
         'Amira responded to a public technical post with a concrete example, then followed up with the same context. The message felt like a continuation.',
         'Find a relevant public reliability post. Add one specific insight before asking for an introduction.',
         '3 warm conversations from 9 substantive public replies', 'Social warm-up'),
    idea('idea-room-recap', 'The room is the opener.', 'The day-after-event recap that actually got forwarded.', 'Theo Park',
         'Theo wrote a useful recap of a small engineering event and mentioned the discussion rather than the attendee list. A connector forwarded it with permission.',
         'Use the Platform Salon as a reason to share a useful summary. Let your connector ask the target first.',
         '4 double opt-in introductions from one event', 'Event meet'),
    idea('idea-build-artifact', 'Build the thing you would have pitched.', 'A free one-page reliability map opened a door.', 'Jules Rivera',
         'Jules made a small, relevant artifact for a prospect before asking for their time. The artifact showed how they think and gave the recipient something useful.',
         'Prepare a one-page map of an engineering team’s public agent stack. Cite every component.',
         '2 pilot discussions from 7 useful artifacts', 'Give first', True),
    idea('idea-forwardable', 'Make the introduction effortless.', 'My connector only had to forward three sentences.', 'Mina Shah',
         'Mina gave a mutual connection a concise forwardable note: who she was, why this person, and one easy ask. The connector requested permission first.',
         'Give Priya a three-sentence Tracekit blurb she can forward after Maya agrees.',
         '6 accepted introductions from 10 permission-first asks', 'Warm intro', True),
]


def state_for(state):
    return state.setdefault('playbook', {'ideas': copy.deepcopy(IDEAS[:4]), 'scan': None})


@router.get('')
def get_playbook():
    with transaction() as state:
        value = copy.deepcopy(state_for(state))
    return {**value, 'mode': 'demo', 'live': False, 'notice': 'Outreach ideas from founder posts.'}


class Scan(BaseModel):
    days: int = Field(default=90, ge=1, le=365)


@router.post('/scan')
def scan_playbook(body: Scan):
    if os.getenv('DEMO_MODE', '1') != '1':
        raise HTTPException(503, 'Live outreach monitoring is not connected.')
    with transaction() as state:
        feed = state_for(state)
        existing = {item['id'] for item in feed['ideas']}
        found = [copy.deepcopy(item) for item in IDEAS if item['id'] not in existing]
        feed['ideas'] = found + feed['ideas']
        feed['scan'] = {'status': 'demo', 'scanned_at': datetime.now(timezone.utc).isoformat(),
                        'new_count': len(found), 'live': False, 'days': body.days}
        state['agent_events'].append({'agent': 'Scout', 'role': 'outreach', 'text': f'Lookout found {len(found)} new outreach approaches. Outcomes are author-reported.',
                                      'ts': feed['scan']['scanned_at'], 'provider': 'local-demo', 'tokens': 0, 'cost': 0})
        return {'ideas': copy.deepcopy(feed['ideas']), 'scan': copy.deepcopy(feed['scan']), 'mode': 'demo',
                'message': f'{len(found)} new outreach ideas found.'}


class Save(BaseModel):
    saved: bool = True


@router.post('/{idea_id}/save')
def save_idea(idea_id: str, body: Save):
    with transaction() as state:
        feed = state_for(state)
        item = next((item for item in feed['ideas'] if item['id'] == idea_id), None)
        if item is None:
            raise HTTPException(404, 'Idea not found.')
        item['saved'] = body.saved
        return {'idea': copy.deepcopy(item), 'saved': item['saved'], 'mode': 'demo'}
