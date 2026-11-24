# RTM — Route To Meeting: Build Plan

Nov 24, 2026 · @Adarsh Baburaj

## Pitch and moat

**RTM (Route To Meeting) finds the shortest trusted path from a founder to the person they need to meet, and shows every hop with its source.** Every other GTM tool automates cold email. RTM treats cold email as the last resort and searches three routes first: a warm intro through your network, a room where the target will physically be, and a high-signal physical touch.

**The insight from talking to founders:** cold emails to investors rarely land, but the same founder who meets that investor at an event gets the next-round meeting. Meetings come from proximity and trust, not volume. RTM turns proximity and trust into a searchable graph.

**One-liner for the stage:** "Apollo finds emails. RTM finds the route to the meeting."

**The moat, in three layers:**

1. **The relationship graph compounds.** Every contact you capture, every event, every reply adds edges. After a month, RTM knows routes no database sells. Competitors start from zero for each user.
2. **Presence data.** Event Radar knows who will be in which room next week, from public event pages and public posts. Static contact databases do not have time or place.
3. **Provenance.** Every edge is tagged EXTRACTED (read from a source, with its URL) or INFERRED (derived by RTM). Glass Brain draws sourced edges solid and inferred edges dashed, so a founder never sends an intro request built on a guess.

**Products in the build:** graphify (renders and queries the graph), Moss (sub-10 ms evidence search and the email sameness check), founder-skill (competitor scout and a forked buying-committee panel), Cold Caked (cake delivery through its cakeMCP endpoint), Band (multi-agent workspace), Flexprice (credit metering).

## Demo script (3 minutes)

The demo follows one founder (you, pitching Moopa or a seeded devtool) from "I want to meet X" to a booked route. Every screen below must work on seeded data even if live APIs fail.

1. **0:00 Intake (20 s).** Type one paragraph about the product. The ICP card fills in: industries, size, titles, triggers, each with a confidence bar. Accept one expansion segment.
2. **0:20 Discovery (25 s).** Leads stream into the table with a source chip on every row. Open one: the company's trigger signal and its link.
3. **0:45 Glass Brain (30 s).** The graph grows live as files land. Click a target. RTM lights up the best path hop by hop: you, then a former colleague (solid edge, LinkedIn export), then their ex-manager (dashed, inferred from two public bios), then the target.
4. **1:15 Capture a new contact (20 s).** "I just met Priya at this hackathon." Paste her public profile URL. RTM shows her **Unlock score**: she is one hop from 3 targets. A suggested ask appears.
5. **1:35 Event Radar (25 s).** A text arrives on your phone (Telegram): a target investor is speaking at an SF event next Thursday, and two attendees used to work with her. Buttons: Plan trip, Add to calendar, Get intro, Skip.
6. **2:00 Route Planner + HITL (35 s).** For one target, RTM ranks routes with predicted reply odds and cost: warm intro, event meet, 60-word cold email, Cold Caked cake. The Reviewer agent rejects one email sentence that has no source. Approve the warm-intro request.
7. **2:35 Dashboard + credits (20 s).** The Kanban moves the lead to Contacted, tagged "agent" vs "you". Flexprice credits run low and the cake route locks until you top up.
8. **2:55 Close (5 s).** "Cold email is the last resort. RTM finds the route to the meeting."

## Scope: must-have vs stretch

Build the must-haves first; they cover every scored criterion and both bonuses. Stretch items only after the full demo runs end to end on seed data.

| Feature | Tier | Judging criterion it earns |
| --- | --- | --- |
| Intake and ICP with confidence scores | Must | ICP and Discovery (20%) |
| Discovery with source citations (Tavily) + competitor map (founder-competitors) | Must | ICP and Discovery (20%) |
| Glass Brain graph (graphify render, solid vs dashed edges) | Must | Technical Execution (10%), moat |
| Warm Path engine: 1st, 2nd, 3rd degree paths + Unlock score | Must | Startup Viability (15%), moat |
| Route Planner with 4 routes and HITL approval | Must | Enrichment and Outreach (20%) |
| Short cold email + Moss sameness check + Reviewer fact-check | Must | Enrichment and Outreach (20%) |
| Hunter email verification on 5 leads | Must | Enrichment and Outreach (20%) |
| Kanban + agent/rep attribution + conversion chart | Must | Dashboard (15%) |
| Band agents (Planner, Builder, Reviewer, Security) | Must | Band bonus (+20%) |
| Flexprice meters + credit gate on enrichment and cakes | Must | Flexprice bonus (+20%) |
| Event Radar + Telegram alert with buttons | Must | Moat, demo wow |
| Cold Caked route via cakeMCP (design + checkout link) | Must (light) | Demo wow |
| Buying-committee pre-flight panel (founder-consumer fork) | Stretch | Outreach quality |
| Voice "talk to your pipeline" on Moss | Stretch | Demo wow |
| Google Calendar write via OAuth | Stretch | Use .ics download instead |

## Architecture and stack

&#91;embedded content: RTM architecture · sources to graph to routes to human gate\]

Sources enter through Band agents, but only the deterministic writer touches the graph; every outbound route stops at the human gate, and Flexprice meters each step.

**Stack:** Next.js + Tailwind + Radix (web), FastAPI in Python (api: graphify, founder-skill tools and the Moss Python SDK are all Python), Neo4j Aura (graph), Moss (evidence + sent indexes), Tavily (search), Hunter (email verify), Claude (reasoning + extraction), python-telegram-bot (alerts), cakeMCP (cakes), Band (agents), Flexprice (metering). Deploy web on Vercel and api on Railway or Render, or run both locally for the demo.

## Graph data model

One graph, stored in Neo4j Aura, mirrored to graphify JSON for rendering. Every node and edge carries provenance so the UI can draw solid vs dashed and show the source on click.

**Node types** (`type` property on every node):

| Node | Key properties |
| --- | --- |
| Person | id, name, title, company\_id, public\_urls\[\], role\_tag (me, contact, target, connector), seniority |
| Company | id, name, domain, industry, size\_band, hq, icp\_score (0-100), tier (A/B/C) |
| Investor | extends Person: firm, thesis\[\], stage\_focus, portfolio\[\] |
| Event | id, name, url, start, end, city, venue, source (luma, x, eventbrite), guest\_list\_visibility |
| Signal | id, kind (hiring, funding, exec\_hire, tech\_change, post), text, date, url |
| Product | id, name (yours), value\_props\[\] |
| Competitor | id, name, url, pricing, complaints\[\] |
| Message | id, route, channel, body, status, approved\_by, sent\_at |

**Edge types** (`relation`), with the base trust weight Warm Path uses:

| Edge | Meaning | Weight |
| --- | --- | --- |
| KNOWS\_DIRECT | In your LinkedIn export or added by you after meeting | 0.95 |
| WORKED\_WITH | Same company, overlapping years | 0.75 |
| INVESTED\_IN | Investor to portfolio company or founder | 0.80 |
| COFOUNDED / SAME\_TEAM | Named together on a team page | 0.85 |
| STUDIED\_WITH | Same school, overlapping years | 0.40 |
| INTERACTED\_PUBLICLY | Public replies or co-authored posts on X | 0.50 |
| CO\_SPOKE / CO\_ATTENDED | Same event as speakers, or both listed attendees | 0.30 |
| ATTENDING | Person to Event (speaker, host, or public guest) | n/a |
| WORKS\_AT, HAS\_SIGNAL, COMPETES\_WITH, MATCHED\_TO, CONTACTED\_VIA, REPLIED\_TO, PREVIOUSLY\_EMPLOYED\_AT | Spec edges | n/a |

**Provenance on every edge:** `confidence` = EXTRACTED or INFERRED, `source_url`, `source_file` (graphify requires it; use the evidence file path), `observed_at`, `evidence_ids[]` (Moss doc ids). INFERRED edges multiply their weight by 0.6.

**Write rule (from the HackwithBay 3.0 winners):** agents read the graph; only deterministic code writes to it, with `MERGE` on stable ids so any step can re-run safely.

## Modules

Ten modules, each a FastAPI router plus one UI screen. Each section gives inputs, logic, outputs and the acceptance test.

### M1 Intake and ICP

- **Input:** product paragraph + optional pricing and reference customers.
- **Logic:** one LLM call with a strict JSON schema: industries (NAICS), size bands, titles, seniority, trigger events, each with `confidence` 0.00-1.00 and a one-line `why`. A second call proposes 2 expansion segments with evidence.
- **Reuse:** founder-board's three lenses as a 3-line "board verdict" under the ICP card.
- **Done when:** the ICP card renders with confidence bars and Accept / Adjust / Dismiss on expansions.

### M2 Discovery and competitors

- **Logic:** build 3-5 Tavily queries from the ICP (company + trigger words), fetch the top pages, LLM-extract {company, person, title, signal, url}. Drop any row without a `url`. Filter negative signals (hiring freeze, non-target region).
- **Competitors:** run the founder-competitors method (public sources only, every fact linked) into Competitor nodes.
- **Moss:** every fetched page is chunked into the `evidence` index with metadata {company\_id, signal\_kind, url, date}.
- **Done when:** 15+ leads with source chips; fit score 0-100 + tier A/B/C.

### M3 Glass Brain (graphify)

- **Logic:** after every graph write, export Neo4j to a graphify extraction dict: nodes need `id, label, file_type, source_file`; edges need `source, target, relation, confidence, source_file`. Use `file_type: "concept"` for people and companies, `"document"` for evidence. Validate with `graphify.validate.validate_extraction`, build with `build_from_json(directed=True)`, render with `graphify.export.to_html`.
- **Also write** one markdown file per entity into `gtm/` (with \[\[links\]\] and source URLs) so `graphify --watch` and `graphify path` work from the CLI for the architecture doc.
- **UI:** embed graph.html in an iframe, or draw with react-force-graph from the same JSON (faster to style in our 3 colours). Solid edge = EXTRACTED, dashed = INFERRED, vibrant colour = the active path.
- **Done when:** clicking a target highlights the best path and each hop shows its source.

### M4 Warm Path engine

The core of the moat. Finds who you know, who they know, and who knows the target.

- **Ingest your network (legal sources only):** LinkedIn data export `Connections.csv` (First Name, Last Name, URL, Email, Company, Position, Connected On) gives KNOWS\_DIRECT edges. X: your own following list via the official API, or a pasted list. Manual capture after meeting someone (name, company, profile URL, or a badge photo).
- **Expand to 2nd and 3rd degree from public evidence:** for each 1st-degree contact, search public bios, team pages, portfolio pages, conference speaker lists and public X interactions; LLM-extract edges with source URLs. These are INFERRED unless the page states the relationship outright.
- **Path search:** Neo4j `shortestPath` / top-k paths up to 4 hops from Me to each target. Path score = product of edge weights x recency factor x target value (icp\_score/100). Show the top 3 paths per target.
- **Reverse search (find clients through connections):** for each 1st and 2nd-degree contact, list the ICP-matching companies they connect to. Output: "Ravi (1st) worked with the VP Ops at Acme (ICP 92)."
- **Unlock score for a new contact:** number of targets (weighted by value) that become reachable or get a stronger path when this person is added. Shown the moment you capture someone.
- **Intro request:** generate a short forwardable blurb for the connector (double opt-in: the connector asks the target first).
- **Done when:** capturing a contact recomputes paths in under 3 s and shows an Unlock score.

### M5 Event Radar

Finds rooms where targets will be, before you book a flight.

- **Sources:** public Luma event pages (host, speakers, featured guests; guest lists only where the host made them visible), Luma city discover pages, Eventbrite, and X posts matching phrases like "speaking at", "see you at", "I'll be at" plus an event link. For the prototype, also allow pasting an event URL or a guest list you can see while logged in.
- **Match:** fuzzy-match event people to Investor/Person targets (name + firm). Also match to anyone with a path of weight > 0.5 to a target, and label them "warm intro in the room".
- **Score:** event score = sum of target values present + 0.5 x warm-intro connectors present, minus a travel-cost penalty from your current city.
- **Alert:** Telegram bot message with inline buttons: Plan trip (Google Flights link prefilled, plus a hotel search link; never books), Add to calendar (.ics), Get intro, Skip. Calendar conflicts: read an uploaded .ics or Google Calendar if connected.
- **Done when:** one seeded event produces a phone alert within 10 s of the scan.

### M6 Route Planner

For each target, rank the routes by predicted reply odds per dollar and per hour. Show 3-5 cards.

| Route | When it wins | Cost |
| --- | --- | --- |
| Warm intro | Path score > 0.5 | Connector's goodwill |
| Event meet | Target at an event within 21 days | Travel + time |
| Portfolio-founder intro (investors) | You know a founder they backed | Low |
| Give-first asset | Cold, high value: send a free 1-page teardown or a Glass Brain map of their market | Agent time |
| Social warm-up | Cold, active on X: 3 thoughtful public replies over a week, then a DM | 1 week |
| Feature them | Invite to your podcast, newsletter or panel (reverse pitch) | Low |
| Cold Caked | Top 5 targets only, after other routes fail | About $150 per cake |
| Short cold email | Default fallback | Near zero |

### M7 Outreach studio

- **Cold email rules:** 60 words max; subject 2-4 lowercase words; line 1 = one specific, sourced fact about them (from Moss evidence); one ask; no "hope this finds you well". A P.S. may carry a second sourced hook.
- **Uniqueness check (Moss):** embed the draft and query a `sent` index plus a corpus of generic templates. If similarity > 0.80, regenerate. The UI shows a "sameness" meter.
- **Fact-check (Reviewer agent):** split the draft into sentences; each factual sentence must match an evidence chunk in Moss (score above a threshold) or it is flagged red and blocks approval.
- **Cold Caked:** call the cakeMCP endpoint (`https://coldcaked.com/mcp`, streamable HTTP) to check delivery coverage, draft the cake line and get a checkout link. A human always pays. Gate it behind Flexprice credits.
- **HITL gateway:** nothing leaves without Approve. Approve / Edit / Reject in a queue. For the demo, send approved email only to your own inbox (SendGrid or Gmail API). LinkedIn and X messages are drafted for you to paste.

### M8 Pre-flight panel (stretch)

Fork founder-consumer's `panel.py`: replace consumer cards with a B2B committee (Champion, Economic Buyer, Security, End User) or an investor committee (Partner, Associate). Each persona is seeded from the target's cited evidence. Run the draft past them; show "3 of 4 would reply" and the top objection, then auto-fix v2.

### M9 Dashboard

Kanban: Matched, Contacted, Replied, Meeting Booked, Closed/Lost. Each card shows the route used and an "agent" or "you" tag for every action, with timestamps in an audit log. Analytics: conversion by stage, by route (warm vs event vs cold vs cake) and by tier. The route chart is the money shot: it shows warm and event routes beating cold.

### M10 Bonus integrations

- **Band:** Planner (splits the job), Builder (discovery, graph writes through the deterministic writer, drafts), Reviewer (fact-check + sameness), Security (scans links in drafts, checks no personal data goes into prompts). Handoffs via @mentions; HITL before any send or schema change. Show the agent stream in the "Agent thinking" panel.
- **Flexprice:** meter events `lead_enriched`, `outreach_sent`, `graph_query`, `event_scan`, `cake_sent`. Org credit balance; when it hits zero, enrichment and cakes lock with a Top up button.
- **Snyk (optional):** run `snyk test` in CI and show the badge.

## UI/UX spec

Editorial and quiet, with one colour that means "this is the route". Dark graph canvas, light working surfaces.

**Palette (3 colours only; use opacity for tints, never new hues):**

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Dim 1 | Ink | #14161A | Text, graph canvas background, primary buttons |
| Dim 2 | Fog | #E9E7E2 | Page background, cards, table rows (Ink at 8-12% for borders) |
| Vibrant | Signal | #FF5A1F | The active path, alerts, Approve button, warm-intro badges. Nothing else. |

Rules: Signal appears at most 3 times per screen. Solid vs dashed lines carry EXTRACTED vs INFERRED, not colour. Status uses words and icons, not extra colours.

**Type:** Inter or Geist for UI (13/15/20 px), Instrument Serif or Fraunces for screen titles only, Geist Mono for scores, ids and timestamps.

**Layout:** left rail with 6 icons; centre canvas; collapsible right panel "Agent thinking" (Band stream + Moss lookups with ms timings). Spacing on an 8 px grid, radius 8, 1 px borders, no shadows, no gradients.

**Screens:**

1. **Intake:** one large text box, then the ICP card (confidence bars in Ink, the expansion suggestion edged in Signal).
2. **Leads:** dense table. Columns: company, person, title, fit score (mono) + tier, signal, source chip, email status dot, best route badge.
3. **Glass Brain:** full-bleed Ink canvas, Fog nodes, the active path in Signal with hop-by-hop source cards on the right.
4. **Network:** "Capture contact" box at the top; Unlock score as a big mono number; list of targets this person unlocks.
5. **Radar:** list of upcoming events by score; each shows targets present + warm connectors present + travel line.
6. **Routes and Queue:** route cards ranked; draft editor with fact-check underlines (red flag = unsourced) and the sameness meter; Approve in Signal.
7. **Pipeline:** Kanban + one route-conversion bar chart + Flexprice credit meter in the top bar.

**Motion:** only two animations: nodes fading in as the graph grows, and the path lighting up hop by hop (150 ms per hop).

## API contracts

FastAPI on port 8000, Next.js on 3000. All responses are JSON. Agents agree on these shapes first so the frontend can build against `fixtures/*.json` while the backend is unfinished.

| Method + path | Request | Response |
| --- | --- | --- |
| POST /intake | {product\_text, pricing?, references?} | {icp: {industries\[\], sizes\[\], titles\[\], triggers\[\]} each item {value, confidence, why}, expansions\[\]} |
| POST /discover | {icp\_id} | {leads: \[{id, company, person, title, fit, tier, signal, source\_url}\]} (streams via SSE /discover/stream) |
| GET /graph | ?focus=node\_id | graphify JSON {nodes\[\], edges\[\]} |
| POST /network/import | multipart Connections.csv | {added: n} |
| POST /network/capture | {name?, company?, profile\_url?, note?} | {person\_id, unlock\_score, unlocks: \[{target\_id, path\_score}\]} |
| GET /paths/{target\_id} | none | {paths: \[{score, hops: \[{from, to, relation, confidence, source\_url}\]}\]} |
| GET /paths/reverse | none | {opportunities: \[{connector, company, icp\_score, path}\]} |
| POST /radar/scan | {city?, days: 21} | {events: \[{id, name, url, start, city, score, targets\_present\[\], connectors\_present\[\]}\]} |
| POST /radar/alert/{event\_id} | none | {sent: true} (Telegram) |
| GET /routes/{target\_id} | none | {routes: \[{kind, score, est\_reply, cost, rationale}\]} |
| POST /drafts | {target\_id, route} | {draft\_id, body, sentences: \[{text, evidence\_id?, ok}\], sameness} |
| POST /drafts/{id}/approve | {edited\_body?} | {status: "queued"} |
| POST /cake/{target\_id} | {line} | {coverage, price, checkout\_url} |
| GET /pipeline | none | {cards\[\], stats: {by\_stage, by\_route, by\_tier}} |
| GET /credits | none | {balance, events: {lead\_enriched, outreach\_sent, graph\_query, event\_scan, cake\_sent}} |
| GET /agents/stream | SSE | {agent, role, text, ts, tokens, cost} |

**Env vars:** ANTHROPIC\_API\_KEY (or OPENAI), TAVILY\_API\_KEY, HUNTER\_API\_KEY, NEO4J\_URI/USER/PASSWORD, MOSS\_PROJECT\_ID, MOSS\_PROJECT\_KEY, TELEGRAM\_BOT\_TOKEN, TELEGRAM\_CHAT\_ID, FLEXPRICE\_API\_KEY, BAND\_\* (per Band docs), SENDGRID\_API\_KEY.

## Work breakdown for coding agents

Five agents in parallel, each in its own folder, joined only through the API contracts and `fixtures/`. Paste each block as that agent's brief, together with this whole doc.

**Repo layout:** `/api` (FastAPI), `/web` (Next.js + Tailwind + Radix), `/gtm` (entity markdown for graphify), `/fixtures` (seed JSON), `/vendor/founder-skill`, `/scripts`.

### Agent A: Core backend (intake, discovery, enrichment)

- FastAPI skeleton, env loading, CORS, SSE helper.
- M1 /intake with JSON-schema output; M2 /discover with Tavily + extraction + url-required filter; Hunter verify for top 5 leads.
- Deterministic graph writer (`graph_writer.py`): the only module allowed to write Neo4j; MERGE on stable ids (slug of name + domain).
- Moss: create `evidence` and `sent` indexes; chunk every fetched page with metadata.
- **Done when:** POST /intake then POST /discover returns 15+ leads, each with a source\_url, and they exist in Neo4j and Moss.

### Agent B: Glass Brain + Warm Path

- Neo4j to graphify JSON exporter; validate, build, `to_html`; write `/gtm/*.md` per entity.
- /network/import (Connections.csv), /network/capture, public-evidence expansion to 2nd and 3rd degree with INFERRED tags.
- /paths/{target}, /paths/reverse, Unlock score.
- **Done when:** importing the seed CSV and capturing one new contact returns an Unlock score and top-3 paths with sources in under 3 s.

### Agent C: Event Radar + alerts + Cold Caked

- /radar/scan from Tavily search over Luma, Eventbrite and X post URLs; extractor for host, speakers, visible guests; matcher against targets and connectors.
- Telegram bot with inline buttons (python-telegram-bot); .ics generator; Google Flights link builder.
- cakeMCP client for /cake.
- **Done when:** the seeded event triggers a phone alert with 4 working buttons.

### Agent D: Frontend

- The 7 screens in the UI spec, built against `fixtures/` first, then wired to the API.
- Graph view with react-force-graph-2d (solid vs dashed, Signal path animation) and a link to open graphify's graph.html.
- Agent thinking panel reading /agents/stream.
- **Done when:** the full demo script clicks through on fixtures with no backend running.

### Agent E: Outreach, governance, bonuses

- Route Planner scoring; draft generator with the 60-word rules; Moss sameness check; sentence fact-check.
- HITL queue + approve flow; send approved mail to your own inbox only.
- Band: four agents and their @mention handoffs; stream to /agents/stream.
- Flexprice: meters, balance, credit gate on /discover enrichment and /cake.
- Kanban data, audit log, /pipeline stats.
- **Done when:** one unsourced sentence is flagged and blocks approval, and spending to zero credits locks the cake route.

## Timeline to 3:30 PM and demo fallback

Seed data goes in first, so the demo works at every checkpoint even if a live API fails.

| Time | Milestone | Owner |
| --- | --- | --- |
| 12:15 | Repo scaffold, contracts frozen, `fixtures/` written (20 leads, 40 people, 3 events, your Connections.csv sample) | You + Agent D |
| 12:45 | Frontend clicks through all 7 screens on fixtures | Agent D |
| 1:15 | Intake + discovery live; graph writer + Moss indexing | Agent A |
| 1:45 | Glass Brain renders from Neo4j; paths + Unlock score live | Agent B |
| 2:00 | Radar alert hits your phone; cake checkout link works | Agent C |
| 2:30 | Drafts, fact-check, sameness, HITL, Band stream, Flexprice gate | Agent E |
| 2:45 | Feature freeze. Full demo run x2 | Everyone |
| 3:00 | Record the 2-3 min video; README + architecture notes | You |
| 3:20 | Push the public repo and submit | You |

**Fallback switch:** an env flag `DEMO_MODE=1` makes every endpoint answer from `fixtures/` with realistic delays (300-900 ms) and keeps the SSE streams running. Use it if wifi or an API dies on stage.

**Seed story:** use your own Moopa pitch to senior-care investors and operators, or a seeded devtool. One investor target, one event in SF next week, two attendees who worked with her, one new contact you "just met" with an Unlock score of 3.

## Guardrails

These keep the product shippable after the hackathon and are worth saying out loud in the pitch: judges from large tech companies will ask.

- **No logged-in scraping of LinkedIn or X.** It breaks their terms and gets accounts banned. Use your own LinkedIn data export, the official X API, public web pages via search, and what you add yourself.
- **2nd and 3rd-degree edges are inferred from public evidence** (bios, team pages, portfolio pages, speaker lists, public posts), always tagged INFERRED with the source URL. RTM never claims to see someone else's private connections.
- **Event Radar uses professional, public presence only:** public event pages, speakers, hosts, guest lists the host made visible, and public posts by the person. No home addresses, no personal location tracking, and no storing data on people who are not business targets or connectors. Events older than 30 days are purged.
- **HITL before every external action:** emails, DMs, intro requests and cakes. Travel is a link to search, never a booking. Cakes return a checkout link; a human pays.
- **Email compliance:** business addresses only, real sender identity, one-click opt-out line, and a suppression list.
- **Agents read, code writes.** LLM output never writes the graph directly; the deterministic writer validates it first.

## Open questions for Adarsh

Defaults are already chosen so agents can start now; change any of them.

- [ ] **Demo story:** Moopa raising pre-seed from age-tech investors (default), or a devtool selling to engineers?
- [ ] **RTM meaning:** "Route To Meeting" (default). Keep it?
- [ ] **Team size:** how many coding agents or people are building? The plan assumes 5 parallel agents.
- [ ] **Alerts:** Telegram (default, fastest), WhatsApp via your existing pipeline, or SMS?
- [ ] **LLM:** Claude (default) or another provider you have credits for?
- [ ] **Band and Flexprice access:** do you have API keys from the sponsors yet?
- [ ] **Your LinkedIn export:** request it now (Settings, Data privacy, Get a copy of your data, Connections only); it usually arrives within minutes.
