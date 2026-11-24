"""Regenerate explicitly fictional, deterministic demo data. No network requests."""
from pathlib import Path
import csv
import json
import re

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'fixtures'
GTM = ROOT / 'gtm'
FIXTURES.mkdir(exist_ok=True)
GTM.mkdir(exist_ok=True)
OBSERVED = '2026-11-24T18:00:00Z'
# Mock data for the product walkthrough. People and companies are invented; nothing here describes a real person.
DISCLAIMER = 'Source record.'

def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')

def pid(name):
    return 'person-' + slug(name)

# All people and organizations below are fictional demo characters.
target_rows = [
    ('Maya Chen', 'Kindred Labs', 'VP of Engineering', 98, 'Published a platform reliability roadmap for AI agents', 'warm_intro', 'Person'),
    ('Sofia Ramirez', 'Everwell Systems Lab', 'Head of Platform', 96, 'Hiring three platform engineers', 'warm_intro', 'Person'),
    ('James Okafor', 'Nestwell Cloud Lab', 'Co-founder & CTO', 95, 'Launching an AI agent developer platform', 'event_meet', 'Person'),
    ('Claire Dubois', 'Silverlight Compute Lab', 'Director of Engineering', 94, 'Announced a production agent infrastructure team', 'warm_intro', 'Person'),
    ('Daniel Wu', 'Hearthstone Data Lab', 'Chief Technology Officer', 93, 'Piloting agent run tracing in production', 'warm_intro', 'Person'),
    ('Aisha Patel', 'Bloom Developer Lab', 'Founder & CTO', 92, 'Launching a new incident review workflow', 'event_meet', 'Person'),
    ('Theo Brooks', 'Longview Infrastructure Lab', 'Head of Developer Experience', 91, 'Looking for agent observability tooling', 'warm_intro', 'Person'),
    ('Olivia Bennett', 'Serene Cloud Lab', 'VP of Engineering', 90, 'Expanding its platform reliability team', 'warm_intro', 'Person'),
    ('Noah Kim', 'Tendwell Software Lab', 'Director of Platform', 89, 'Seeking developer tooling partners', 'event_meet', 'Person'),
    ('Amara Johnson', 'Goodroot Systems Lab', 'Engineering Director', 88, 'Hosting a production AI reliability roundtable', 'warm_intro', 'Person'),
    ('Lucas Martin', 'Kinship Compute Lab', 'VP of Infrastructure', 87, 'Testing a new deployment review workflow', 'warm_intro', 'Person'),
    ('Zara Ahmed', 'Juniper Developer Lab', 'CTO', 86, 'Added a platform observability team', 'short_cold_email', 'Person'),
    ('Ethan Park', 'Lumen Compute Lab', 'Head of Engineering', 85, 'Opened a developer tooling evaluation', 'short_cold_email', 'Person'),
    ('Isabella Rossi', 'Willowbridge Systems Lab', 'Director of Developer Experience', 84, 'Consolidating application tracing software', 'event_meet', 'Person'),
    ('Owen Lewis', 'Daybreak Developer Lab', 'Chief Product & Technology Officer', 83, 'Launching a production AI agent platform', 'short_cold_email', 'Person'),
    ('Mei Tan', 'Aster Infrastructure Lab', 'Platform Engineering Lead', 82, 'Published an incident review automation brief', 'warm_intro', 'Person'),
    ('Gabriel Silva', 'Harborwell Compute Lab', 'VP of Engineering', 80, 'Recruiting site reliability engineers', 'short_cold_email', 'Person'),
    ('Nina Kapoor', 'Gentlepath Systems Lab', 'Head of Platform', 78, 'Replacing a manual deployment audit process', 'short_cold_email', 'Person'),
    ('Samir Das', 'Newleaf Developer Lab', 'CTO', 75, 'Preparing an observability procurement review', 'short_cold_email', 'Person'),
    ('Lily Foster', 'Oakline Compute Lab', 'Director of Infrastructure', 71, 'Announced an agent reliability working group', 'short_cold_email', 'Person'),
]
contact_rows = [
    ('Ravi Shah', 'Northstar Studio Lab', 'Former colleague', 'contact'),
    ('Elena Park', 'Kindred Labs', 'Platform advisor', 'connector'),
    ('Priya Nair', 'Devcraft Studio Lab', 'Founder', 'connector'),
    ('Alex Morgan', 'Everwell Systems Lab', 'Platform advisor', 'contact'),
    ('Jordan Lee', 'Silverlight Compute Lab', 'Technical founder', 'contact'),
    ('Cameron Reed', 'Hearthstone Data Lab', 'Infrastructure advisor', 'contact'),
    ('Taylor Quinn', 'Bloom Developer Lab', 'Community lead', 'contact'),
    ('Morgan Ellis', 'Longview Infrastructure Lab', 'Engineering advisor', 'connector'),
    ('Casey Flynn', 'Serene Cloud Lab', 'Platform strategist', 'connector'),
    ('Jamie Rivera', 'Tendwell Software Lab', 'Developer relations lead', 'connector'),
    ('Avery Scott', 'Goodroot Systems Lab', 'Platform fellow', 'connector'),
    ('Drew Parker', 'Kinship Compute Lab', 'Engineering manager', 'connector'),
    ('Reese Allen', 'Willowbridge Systems Lab', 'Research lead', 'connector'),
    ('Skyler Chen', 'Daybreak Developer Lab', 'Product advisor', 'connector'),
    ('Peyton James', 'Aster Infrastructure Lab', 'Platform mentor', 'connector'),
    ('Emery Cole', 'Harborwell Compute Lab', 'Infrastructure lead', 'connector'),
    ('Blair Adams', 'Gentlepath Systems Lab', 'Program director', 'connector'),
    ('Robin Bell', 'Newleaf Developer Lab', 'Community advisor', 'connector'),
    ('Sage Turner', 'Oakline Compute Lab', 'Research fellow', 'connector'),
]

nodes, edges, evidence, leads = [], [], [], []

def add_evidence(key, text, title, kind='fixture'):
    item = {'id': key, 'title': title, 'text': text, 'url': '/evidence/' + key,
            'source_url': '/evidence/' + key, 'source_file': 'fixtures/evidence/' + key + '.md',
            'observed_at': OBSERVED, 'kind': kind, 'is_demo': True, 'disclaimer': DISCLAIMER}
    evidence.append(item)
    return item

def person(name, company, title, role, person_type='Person', fit=None):
    key = pid(name)
    result = {'id': key, 'label': name, 'name': name, 'type': person_type, 'role_tag': role,
              'company': company, 'company_id': 'company-' + slug(company), 'title': title,
              'file_type': 'concept', 'source_file': 'gtm/' + key + '.md', 'is_demo': True,
              'public_urls': ['https://example.com/in/' + slug(name)]}
    if fit is not None:
        result.update(icp_score=fit, fit=fit, tier='A' if fit >= 90 else 'B' if fit >= 80 else 'C')
    if person_type == 'Investor':
        result.update(firm=company, thesis=['production reliability', 'agent run tracing'], stage_focus=['pre-seed', 'seed'])
    nodes.append(result)
    return key

def edge(a, b, relation, confidence='EXTRACTED', text=None):
    weights = {'KNOWS_DIRECT': .95, 'WORKED_WITH': .75, 'INVESTED_IN': .80,
               'COFOUNDED': .85, 'SAME_TEAM': .85, 'STUDIED_WITH': .40,
               'INTERACTED_PUBLICLY': .50, 'CO_SPOKE': .30, 'CO_ATTENDED': .30}
    eid = 'relationship-' + str(len(edges) + 1).zfill(3)
    source = add_evidence(eid, text or f'{a} and {b} share the relationship {relation}.',
                          relation.replace('_', ' ').capitalize(), 'relationship')
    edges.append({'id': 'edge-' + str(len(edges) + 1).zfill(3), 'source': a, 'target': b,
                  'relation': relation, 'confidence': confidence, 'weight': weights.get(relation, 1),
                  'source_url': source['url'], 'source_file': source['source_file'],
                  'observed_at': OBSERVED, 'evidence_ids': [eid], 'is_demo': True})

me = person('Adarsh Baburaj', 'Tracekit', 'Founder', 'me')
for name, company, title, role in contact_rows:
    person(name, company, title, role)
for i, (name, company, title, fit, signal, route, typ) in enumerate(target_rows):
    target = person(name, company, title, 'target', typ, fit)
    eid = 'signal-' + str(i + 1).zfill(3)
    source = add_evidence(eid, f'{name} is {title} at {company}. {name} {signal[0].lower() + signal[1:]}.',
                          company + ' public update', 'signal')
    leads.append({'id': target, 'target_id': target, 'company': company, 'person': name, 'title': title,
                  'fit': fit, 'tier': 'A' if fit >= 90 else 'B' if fit >= 80 else 'C',
                  'signal': signal, 'signal_kind': 'post' if typ == 'Investor' else 'hiring',
                  'source_url': source['url'], 'evidence_id': eid, 'source_name': 'Public record',
                  'email_status': 'verified' if i < 5 else 'not_checked', 'best_route': route,
                  'status': 'Matched', 'is_demo': True, 'email': slug(name) + '@example.com'})
    nodes.append({'id': 'company-' + slug(company), 'label': company, 'name': company, 'type': 'Company',
                  'industry': 'Developer infrastructure investing' if typ == 'Investor' else 'Developer tooling',
                  'domain': slug(company) + '.example', 'size_band': '51–200',
                  'hq': 'San Francisco, CA', 'icp_score': fit, 'tier': leads[-1]['tier'],
                  'file_type': 'concept', 'source_file': 'gtm/company-' + slug(company) + '.md', 'is_demo': True})
    edge(target, 'company-' + slug(company), 'WORKS_AT', text=f'{name} is {title} at {company}.')

for name in ['Ravi Shah', 'Alex Morgan', 'Jordan Lee', 'Cameron Reed', 'Taylor Quinn']:
    edge(me, pid(name), 'KNOWS_DIRECT', text=f'Adarsh Baburaj added {name} to the Connections.csv export after meeting professionally.')
edge(pid('Ravi Shah'), pid('Elena Park'), 'WORKED_WITH', 'INFERRED',
     'Public bios place Ravi Shah and Elena Park at Northstar Studio Lab during 2022–2024. A direct relationship is inferred, not confirmed.')
edge(pid('Elena Park'), pid('Maya Chen'), 'SAME_TEAM', text='The Kindred Labs team page names Elena Park as a platform advisor working with VP of Engineering Maya Chen.')
edge(pid('Alex Morgan'), pid('Sofia Ramirez'), 'WORKED_WITH', text='Everwell Systems Lab team records state Alex Morgan worked directly with Sofia Ramirez.')
edge(pid('Taylor Quinn'), pid('James Okafor'), 'WORKED_WITH', text='Conference bios state Taylor Quinn and James Okafor worked together on an agent tracing pilot.')
edge(pid('Jordan Lee'), pid('Claire Dubois'), 'WORKED_WITH', text='Engineering team notes state Claire Dubois worked directly with Jordan Lee at a prior developer tools company.')
edge(pid('Cameron Reed'), pid('Daniel Wu'), 'SAME_TEAM', text='The Hearthstone Data Lab team page names Cameron Reed and Daniel Wu on the platform team.')
edge(pid('Taylor Quinn'), pid('Aisha Patel'), 'SAME_TEAM', text='The Bloom Developer Lab team page names Taylor Quinn and founder Aisha Patel.')
for bridge, contact, target in [
    ('Morgan Ellis', 'Jordan Lee', 'Theo Brooks'), ('Casey Flynn', 'Alex Morgan', 'Olivia Bennett'),
    ('Jamie Rivera', 'Taylor Quinn', 'Noah Kim'), ('Avery Scott', 'Jordan Lee', 'Amara Johnson'),
    ('Drew Parker', 'Cameron Reed', 'Lucas Martin'), ('Reese Allen', 'Alex Morgan', 'Isabella Rossi'),
    ('Peyton James', 'Jordan Lee', 'Mei Tan')]:
    edge(pid(contact), pid(bridge), 'WORKED_WITH', text=f'Alumni notes state {contact} worked directly with {bridge}.')
    edge(pid(bridge), pid(target), 'WORKED_WITH', text=f'Team notes state {bridge} worked directly with {target}.')
# Priya's relationships exist in evidence before capture. Capturing Priya only adds the founder edge.
for target in ['Maya Chen', 'Zara Ahmed', 'Ethan Park']:
    edge(pid('Priya Nair'), pid(target), 'SAME_TEAM', text=f'A Devcraft Studio Lab developer advisory cohort lists Priya Nair and {target} as collaborators who meet monthly.')

products = {'id': 'product-tracekit', 'name': 'Tracekit', 'label': 'Tracekit', 'type': 'Product', 'file_type': 'concept',
            'source_file': 'gtm/product-tracekit.md', 'value_props': ['Agent run tracing', 'Production reliability', 'Deployment review'], 'is_demo': True}
nodes.append(products)
events = [
    {'id': 'event-platform-salon', 'name': 'The Platform Engineering Salon', 'start': '2026-12-03T18:00:00-08:00',
     'end': '2026-12-03T20:00:00-08:00', 'city': 'San Francisco', 'venue': 'Founders Loft, South Park',
     'score': 96, 'targets_present': [pid('Maya Chen'), pid('James Okafor'), pid('Aisha Patel')],
     'connectors_present': [pid('Elena Park'), pid('Ravi Shah')], 'travel': 'Local · 20 min · no flight needed',
     'description': 'A small-room discussion about production AI reliability. Maya is a featured speaker.'},
    {'id': 'event-devtools-breakfast', 'name': 'Developer Tools Breakfast', 'start': '2026-12-05T09:00:00-08:00',
     'end': '2026-12-05T11:00:00-08:00', 'city': 'Oakland', 'venue': 'Uptown Commons',
     'score': 88, 'targets_present': [pid('Sofia Ramirez'), pid('Olivia Bennett'), pid('Noah Kim')],
     'connectors_present': [pid('Alex Morgan'), pid('Jamie Rivera')], 'travel': 'Nearby · 35 min by transit',
     'description': 'A breakfast for platform leaders evaluating agent run tracing.'},
    {'id': 'event-ai-reliability-forum', 'name': 'Production AI Reliability Forum', 'start': '2026-12-10T14:00:00-08:00',
     'end': '2026-12-10T17:00:00-08:00', 'city': 'Palo Alto', 'venue': 'University Avenue Hall',
     'score': 81, 'targets_present': [pid('Claire Dubois'), pid('Theo Brooks'), pid('Mei Tan')],
     'connectors_present': [pid('Jordan Lee'), pid('Morgan Ellis')], 'travel': 'Regional · 55 min by train',
     'description': 'An engineering panel on AI reliability and platform infrastructure.'},
]
for event in events:
    eid = event['id'] + '-listing'
    source = add_evidence(eid, event['description'],
                          event['name'] + ' guest list', 'event')
    event.update(url=source['url'], source_url=source['url'], source='listing', guest_list_visibility='public',
                 is_demo=True, target_names=[next(n['label'] for n in nodes if n['id'] == p) for p in event['targets_present']],
                 connector_names=[next(n['label'] for n in nodes if n['id'] == p) for p in event['connectors_present']])
    nodes.append({**event, 'label': event['name'], 'type': 'Event', 'file_type': 'concept', 'source_file': 'gtm/' + event['id'] + '.md'})
    for attendee in event['targets_present'] + event['connectors_present']:
        edge(attendee, event['id'], 'ATTENDING', text=f'The public guest list places {attendee} at {event["name"]}.')

icp = {
    'id': 'icp-tracekit', 'name': 'Tracekit · production reliability',
    'industries': [
        {'value': 'Developer platforms & SaaS', 'confidence': .96, 'why': 'Agent run tracing is the central product use case.', 'naics': '541511'},
        {'value': 'Platform engineering teams', 'confidence': .92, 'why': 'The founder is seeking platform teams to pilot an observability toolkit.'}],
    'sizes': [{'value': '51–200 employees', 'confidence': .91, 'why': 'Growing engineering organizations have production reliability needs and a reachable buying team.'},
              {'value': '11–50 employees', 'confidence': .84, 'why': 'Smaller software teams can adopt developer tools quickly.'}],
    'titles': [{'value': 'VP of Engineering / Head of Platform', 'confidence': .95, 'why': 'Owns platform operations and engineering outcomes.'},
               {'value': 'CTO / Director of Engineering', 'confidence': .92, 'why': 'Leads developer tooling evaluation and infrastructure decisions.'},
               {'value': 'Developer Experience Lead', 'confidence': .88, 'why': 'Sponsors new developer tooling pilots.'}],
    'triggers': [{'value': 'Launching production AI agents', 'confidence': .93, 'why': 'Production agent launches increase tracing and reliability needs.'},
                 {'value': 'New platform reliability roadmap', 'confidence': .91, 'why': 'Signals a timely platform engineering conversation.'},
                 {'value': 'Hiring platform engineers', 'confidence': .87, 'why': 'Suggests a funded infrastructure initiative.'}],
    'board_verdict': [
        {'lens': 'Customer', 'text': 'Lead with faster agent failure diagnosis and safer production changes.'},
        {'lens': 'Market', 'text': 'Start with local platform engineering teams shipping AI agents.'},
        {'lens': 'Execution', 'text': 'Secure one platform-team pilot and one technical buyer conversation.'}],
    'is_demo': True,
}
expansions = [
    {'id': 'expansion-ai-native', 'name': 'AI-native product teams', 'title': 'AI-native product teams', 'confidence': .84,
     'why': 'AI-native product teams share the same agent failure diagnosis workflow.', 'evidence': 'Product-context heuristic for Tracekit.', 'status': 'suggested'},
    {'id': 'expansion-internal-platforms', 'name': 'Internal developer platforms', 'title': 'Internal developer platforms', 'confidence': .71,
     'why': 'Internal platform teams need visibility into agent deployments across services.', 'evidence': 'Product-context heuristic; requires customer validation.', 'status': 'suggested'},
]
pipeline_cards = []
for i, lead in enumerate(leads):
    stage = 'Matched' if i < 12 else 'Contacted' if i < 16 else 'Replied' if i < 18 else 'Meeting Booked' if i == 18 else 'Closed/Lost'
    actor = 'agent' if i % 2 == 0 else 'you'
    pipeline_cards.append({'id': lead['id'], 'target_id': lead['target_id'], 'company': lead['company'], 'person': lead['person'],
                           'title': lead['title'], 'tier': lead['tier'], 'fit': lead['fit'], 'stage': stage, 'status': stage,
                           'route': lead['best_route'], 'actor': actor, 'updated_at': OBSERVED,
                           'audit_log': [{'action': 'Added from discovery', 'actor': actor, 'ts': OBSERVED}], 'is_demo': True})
agent_events = [
    {'agent': 'Planner', 'role': 'planning', 'text': '@Builder Find platform engineering leaders and technical buyers with a timely, sourced reason to meet.', 'ts': OBSERVED, 'tokens': 312, 'cost': 0, 'is_demo': True},
    {'agent': 'Builder', 'role': 'discovery', 'text': 'Loaded 20 leads. Every row links to its source record.', 'ts': OBSERVED, 'tokens': 628, 'cost': 0, 'is_demo': True},
    {'agent': 'Builder', 'role': 'graph', 'text': 'Mapped Ravi → Elena → Maya. The Ravi–Elena overlap remains INFERRED.', 'ts': OBSERVED, 'tokens': 241, 'cost': 0, 'is_demo': True},
    {'agent': 'Reviewer', 'role': 'review', 'text': 'Source check ready. Unsupported factual edits will block approval.', 'ts': OBSERVED, 'tokens': 163, 'cost': 0, 'is_demo': True},
    {'agent': 'Security', 'role': 'security', 'text': 'Nothing goes out without your approval.', 'ts': OBSERVED, 'tokens': 110, 'cost': 0, 'is_demo': True},
]
seed = {
    'meta': {'app_name': 'thermopb', 'subtitle': 'Route To Meeting', 'version': 1, 'demo_mode': True, 'story': 'Tracekit', 'generated_for': '2026-11-24', 'disclaimer': DISCLAIMER,
             'founder_id': me, 'default_target_id': pid('Maya Chen')},
    'product': {'name': 'Tracekit', 'description': 'Tracekit helps platform teams trace AI agent runs, catch failures, and review production changes. We are looking for engineering teams to pilot an agent observability toolkit.'},
    'leads': leads, 'graph': {'nodes': nodes, 'edges': edges}, 'events': events, 'evidence': evidence,
    'icp': icp, 'expansions': expansions, 'pipeline': {'cards': pipeline_cards}, 'agent_events': agent_events,
    'capture_candidates': [{'name': 'Priya Nair', 'company': 'Devcraft Studio Lab', 'person_id': pid('Priya Nair'),
                            'profile_url': 'https://example.com/in/priya-nair', 'note': 'I just met Priya at the hackathon.',
                            'expected_target_ids': [pid(n) for n in ['Maya Chen', 'Zara Ahmed', 'Ethan Park']], 'is_demo': True}],
    'credits': {'balance': 120, 'events': {'lead_enriched': 0, 'outreach_sent': 0, 'graph_query': 0, 'event_scan': 0, 'cake_sent': 0}},
}
(FIXTURES / 'seed.json').write_text(json.dumps(seed, indent=2, ensure_ascii=False) + '\n')
for key in ['leads', 'events', 'evidence', 'icp', 'expansions', 'pipeline', 'agent_events']:
    (FIXTURES / (key + '.json')).write_text(json.dumps(seed[key], indent=2, ensure_ascii=False) + '\n')
(FIXTURES / 'graph.json').write_text(json.dumps(seed['graph'], indent=2, ensure_ascii=False) + '\n')
with (FIXTURES / 'Connections.csv').open('w', newline='') as out:
    writer = csv.writer(out)
    writer.writerow(['First Name', 'Last Name', 'URL', 'Email', 'Company', 'Position', 'Connected On'])
    for name, company, title, role in contact_rows:
        if role == 'contact':
            first, last = name.split(' ', 1)
            writer.writerow([first, last, 'https://example.com/in/' + slug(name), '', company, title, '24 Nov 2026'])
# The self-contained graphify corpus has one entity page and one evidence page per record.
(FIXTURES / 'evidence').mkdir(exist_ok=True)
for item in evidence:
    (ROOT / item['source_file']).write_text(f'# {item["title"]}\n\n> {DISCLAIMER}\n\n{item["text"]}\n\nSource: [{item["id"]}]({item["url"]})\n\nObserved: {OBSERVED}\n')
for node in nodes:
    related = [e for e in edges if node['id'] in (e['source'], e['target'])]
    lines = [f'# {node["label"]}', '', '> ' + DISCLAIMER, '', f'Type: {node["type"]}', '']
    if node.get('company'):
        lines.extend([f'Company: {node["company"]}', f'Title: {node["title"]}', ''])
    for e in related:
        other = e['target'] if e['source'] == node['id'] else e['source']
        lines.append(f'- {e["relation"]}: [[{other}]] · {e["confidence"]} · [source]({e["source_url"]})')
    (GTM / (node['id'] + '.md')).write_text('\n'.join(lines) + '\n')
(FIXTURES / 'README.md').write_text('''# Demo fixtures\n\nAll target people, organizations, relationships, signals, and events are fictional. The founder and Tracekit supply the demo context only. Demo evidence is never a claim of live discovery or verification.\n\n`seed.json` is the single combined API/UI seed. The individual JSON files are generated views. Run `python3 scripts/seed_fixtures.py` to reproduce all fixtures and entity pages. Dates intentionally anchor the November 24, 2026 demo; update the generator before a later live presentation.\n\n`Connections.csv` demonstrates the public LinkedIn-export column shape using fictional contacts and reserved `.example` URLs. No private contact details are included.\n\nEvery graph edge has provenance, an evidence ID, a source path, an observation timestamp, and an EXTRACTED or INFERRED label. EXTRACTED means stated in the fictional fixture; it does not mean independently verified. Priya has three documented demo relationships before capture. Capturing her adds only the founder’s direct edge; arbitrary captures receive no invented relationships.\n''')
print(f'Generated {len(leads)} leads, {sum(n["type"] in ("Person", "Investor") for n in nodes)} people, {len(events)} events, {len(edges)} sourced edges.')
