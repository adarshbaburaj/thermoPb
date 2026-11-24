"""thermopb API. Demo providers are explicit; outbound delivery is intentionally disabled."""

from __future__ import annotations

import asyncio
import copy
import csv
import hashlib
import io
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import quote, urlparse

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field, model_validator

from .playbook import router as playbook_router
from . import graph_writer
from .circle import router as circle_router
from .paths import find_paths, me_id
from .store import load_seed, snapshot, transaction

app = FastAPI(title="thermopb · RTM — Route To Meeting", version="0.1.0")
app.include_router(playbook_router)
app.include_router(circle_router)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
                   allow_credentials=False, allow_methods=["GET", "POST", "PATCH"], allow_headers=["*"])
STAGES = ["Matched", "Contacted", "Replied", "Meeting Booked", "Closed/Lost"]
METERS = {"lead_enriched": 1, "outreach_sent": 2, "graph_query": 0, "event_scan": 3, "cake_sent": 150}
DEMO_MODE = os.getenv("DEMO_MODE", "1") == "1"


def now():
    return datetime.now(timezone.utc).isoformat()


def require_demo():
    if not DEMO_MODE:
        raise HTTPException(503, "Live providers are not configured. Set DEMO_MODE=1 to use the labeled local demo.")


def event(state, role, text):
    state["agent_events"].append({"agent": role, "role": role, "text": text, "ts": now(), "tokens": 0,
                                  "cost": 0, "provider": "local-demo"})
    state["agent_events"] = state["agent_events"][-150:]


def audit(state, action, target_id=None, actor="you", **details):
    state["audit"].append({"id": uuid.uuid4().hex, "action": action, "target_id": target_id,
                           "actor": actor, "ts": now(), **details})


def charge(state, name, count=1, key=None):
    if key and any(e.get("key") == key for e in state["meter_events"]):
        return
    amount = METERS[name] * count
    if state["balance"] < amount:
        raise HTTPException(402, {"message": "Not enough credits. Top up to continue.",
                                  "balance": state["balance"], "required": amount})
    state["balance"] -= amount
    state["meter_events"].append({"name": name, "quantity": count, "credits": amount, "key": key, "ts": now()})


def lead_for(state, target_id):
    lead = next((l for l in state["leads"] if l.get("target_id", l["id"]) == target_id or l["id"] == target_id), None)
    if not lead:
        raise HTTPException(404, "Target not found")
    return lead


def target_of(lead):
    return lead.get("target_id", lead["id"])


def evidence_for(state, lead):
    wanted = set(lead.get("evidence_ids", []))
    source = lead.get("source_url")
    for evidence in state["evidence"]:
        if evidence.get("id") in wanted or evidence.get("url", evidence.get("source_url")) == source:
            return evidence
    return {"id": f"signal-{lead['id']}", "text": lead.get("signal", ""), "url": source,
            "source_file": "fixtures/seed.json", "synthetic": True}


@app.get("/health")
def health():
    return {"ok": True, "mode": "demo" if DEMO_MODE else "unconfigured", "storage": "sqlite",
            "outbound_enabled": False, "version": "0.1.0"}


@app.get("/integrations")
def integrations():
    names = ["Claude", "Tavily", "Hunter", "Neo4j", "Moss", "Telegram", "Band", "Flexprice", "Cold Caked"]
    return {"mode": "demo", "integrations": [{"name": name, "status": "not_connected", "live": False} for name in names],
            "note": "Seed data, local path search, local review and local credit metering. No external messages are sent."}


class Intake(BaseModel):
    product_text: str = Field(min_length=20, max_length=10000)
    pricing: str | None = None
    references: str | list[str] | None = None


@app.post("/intake")
def intake(body: Intake):
    require_demo()
    identity = "icp-" + hashlib.sha256(body.product_text.strip().encode()).hexdigest()[:12]
    with transaction() as state:
        result = {"icp_id": identity, "icp": copy.deepcopy(state["icp"]),
                  "expansions": copy.deepcopy(state.get("expansions", [])), "mode": "demo",
                  "board_verdict": state.get("board_verdict", ["Start with teams shipping agents.", "Prioritize an active reliability trigger.", "Use trusted paths before cold outreach."]),
                  "note": "Ideal customer profile for Tracekit."}
        state["intakes"][identity] = {**result, "product_text": body.product_text, "ts": now()}
        event(state, "Planner", "Intake saved. Your ideal customer profile is ready.")
        audit(state, "intake_saved", identity)
    return result


class Discovery(BaseModel):
    icp_id: str = Field(min_length=1, max_length=200)


@app.post("/discover")
def discover(body: Discovery):
    require_demo()
    with transaction() as state:
        # The canonical seeded ICP remains callable for the initial screen.
        if body.icp_id not in state["intakes"] and body.icp_id not in {"demo", "seed", "icp-tracekit"}:
            raise HTTPException(404, "Create an ICP with /intake first")
        leads = [lead for lead in state["leads"] if graph_writer.safe_url(lead.get("source_url", ""))]
        if body.icp_id not in state["discoveries"]:
            charge(state, "lead_enriched", len(leads), f"discover:{body.icp_id}")
            state["discoveries"][body.icp_id] = [l["id"] for l in leads]
            event(state, "Builder", f"Found {len(leads)} matching people. Every match links to its source.")
            audit(state, "discovery_completed", body.icp_id, "agent", count=len(leads))
        return {"leads": leads, "competitors": state.get("competitors", []), "mode": "demo"}


@app.get("/leads")
def leads():
    state = snapshot()
    return {"leads": state["leads"], "competitors": state.get("competitors", []), "mode": "demo"}


@app.get("/discover/stream")
async def discovery_stream():
    async def stream():
        for lead in snapshot()["leads"]:
            yield f"data: {json.dumps(lead)}\n\n"
            await asyncio.sleep(0.1)
        yield 'event: done\ndata: {"mode":"demo"}\n\n'
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/graph")
def graph(focus: str | None = None):
    with transaction() as state:
        charge(state, "graph_query", key=None)
        result = {**copy.deepcopy(state["graph"]), "mode": "demo", "synthetic": True}
        if focus:
            result["active_paths"] = find_paths(state, focus)
        return result


@app.get("/paths/reverse")
def reverse_paths():
    state = snapshot()
    opportunities = []
    for lead in state["leads"]:
        paths = find_paths(state, target_of(lead))
        if paths:
            path = paths[0]
            opportunities.append({"connector": path["hops"][0]["to_label"], "company": lead["company"],
                                  "icp_score": lead["fit"], "path": path, "target_id": target_of(lead)})
    return {"opportunities": opportunities}


@app.get("/paths/{target_id}")
def paths(target_id: str):
    state = snapshot()
    lead_for(state, target_id)
    return {"paths": find_paths(state, target_id), "mode": "demo", "score_note": "Product of trust weights × inferred penalty × recency × target fit. Not a calibrated reply probability."}


class Capture(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    company: str | None = Field(default=None, max_length=200)
    profile_url: str | None = Field(default=None, max_length=2000)
    note: str | None = Field(default=None, max_length=3000)

    @model_validator(mode="after")
    def check_identity(self):
        if not (self.name and self.name.strip()) and not self.profile_url:
            raise ValueError("Provide a name or a public profile URL")
        if self.profile_url and not graph_writer.safe_url(self.profile_url):
            raise ValueError("Provide a valid http(s) public profile URL")
        return self


def capture_contact(state, body):
    profile = (body.profile_url or "").rstrip("/").lower()
    # Match public identity exactly. Name-only capture never inherits seeded connections.
    match = next((n for n in state["graph"]["nodes"] if profile and profile in
                  [u.rstrip("/").lower() for u in n.get("public_urls", []) + ([n["profile_url"]] if n.get("profile_url") else [])]), None)
    person_id = match["id"] if match else graph_writer.stable_id(body.name or profile, profile or f"{body.name}|{body.company}")
    name = body.name or (match or {}).get("label") or (match or {}).get("name") or urlparse(profile).path.rstrip("/").split("/")[-1]
    before = {target_of(l): (find_paths(state, target_of(l)) or [{"score": 0}])[0]["score"] for l in state["leads"]}
    person = {**(match or {}), "id": person_id, "label": name, "name": name, "type": "Person", "role_tag": "contact",
              "company": body.company or (match or {}).get("company", ""), "public_urls": [body.profile_url] if body.profile_url else []}
    added = graph_writer.capture(state["graph"], me_id(state["graph"]), person, body.note)
    evidence_id = f"capture-{person_id}"
    if not any(e["id"] == evidence_id for e in state["evidence"]):
        state["evidence"].append({"id": evidence_id, "text": body.note or f"You confirmed meeting {name}.",
                                  "url": f"/evidence/{evidence_id}", "source_file": "gtm/manual-captures.md", "manually_confirmed": True})
    unlocks = []
    for lead in state["leads"]:
        target_id = target_of(lead)
        after = find_paths(state, target_id)
        if after and after[0]["score"] > before[target_id] + 0.0001:
            unlocks.append({"target_id": target_id, "person": lead["person"], "company": lead["company"],
                            "path_score": after[0]["score"], "previous_score": before[target_id], "fit": lead["fit"]})
    if added:
        event(state, "Builder", f"Saved your connection to {name}. {len(unlocks)} target paths improved.")
        audit(state, "contact_captured", person_id, unlock_count=len(unlocks))
    return {"person_id": person_id, "name": name, "added": added, "unlock_score": len(unlocks),
            "weighted_unlock_score": round(sum(u["fit"] / 100 for u in unlocks), 2), "unlocks": unlocks,
            "suggested_ask": f"Hi {name.split()[0]}, would you be comfortable asking whether an introduction would be welcome? I can send a short forwardable note.",
            "mode": "demo"}


@app.post("/network/capture")
def capture(body: Capture):
    with transaction() as state:
        return capture_contact(state, body)


@app.get("/network")
def network():
    state = snapshot()
    origin = me_id(state["graph"])
    direct_ids = {e["target"] if e["source"] == origin else e["source"] for e in state["graph"]["edges"]
                  if origin in {e["source"], e["target"]} and e["relation"] == "KNOWS_DIRECT"}
    return {"contacts": [n for n in state["graph"]["nodes"] if n["id"] in direct_ids],
            "capture_candidates": state.get("capture_candidates", [])}


@app.post("/network/import")
async def import_network(file: UploadFile = File(...)):
    content = await file.read(2_000_001)
    if len(content) > 2_000_000:
        raise HTTPException(413, "Connections CSV must be under 2 MB")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(422, "Upload a UTF-8 CSV")
    lines = text.splitlines()
    header = next((i for i, line in enumerate(lines) if "First Name" in line and "Last Name" in line), None)
    if header is None:
        raise HTTPException(422, "Expected LinkedIn export headers: First Name, Last Name, URL, Company, Position")
    rows = list(csv.DictReader(lines[header:]))
    if len(rows) > 1000:
        raise HTTPException(413, "Import up to 1,000 contacts at a time")
    added = 0
    with transaction() as state:
        for row in rows:
            name = f"{row.get('First Name', '')} {row.get('Last Name', '')}".strip()
            url = row.get("URL", "").strip() or None
            if not name or (url and not graph_writer.safe_url(url)):
                continue
            result = capture_contact(state, Capture(name=name, company=row.get("Company"), profile_url=url,
                                                    note="Imported from your own LinkedIn Connections.csv export."))
            added += int(result["added"])
    return {"added": added, "mode": "demo"}


def routes_for(state, target_id):
    lead = lead_for(state, target_id)
    paths = find_paths(state, target_id)
    best = paths[0] if paths else None
    event_match = next((e for e in state.get("events", []) if target_id in [p.get("id") if isinstance(p, dict) else p for p in e.get("targets_present", [])]), None)
    routes = []
    if best:
        connector = best["hops"][0]["to_label"]
        routes.append({"kind": "warm_intro", "label": "Warm introduction", "score": round(best["score"] * 100),
                       "est_reply": round(min(.78, .3 + best["score"] * .55), 2), "cost": 0, "credits": 2,
                       "time": "5 min", "rationale": f"Ask {connector} for a double opt-in introduction. {len(best['hops'])} sourced hops.",
                       "path": best, "available": True})
    if event_match:
        routes.append({"kind": "event_meet", "label": "Meet in the room", "score": 72, "est_reply": .56, "cost": 35,
                       "credits": 2, "time": "2 hours", "rationale": f"Listed at {event_match['name']}.", "event_id": event_match["id"], "available": True})
    routes += [{"kind": "cold_email", "label": "Short cold email", "score": 28, "est_reply": .12, "cost": 0, "credits": 2,
                "time": "3 min", "rationale": "One sourced hook, one ask, under 60 words. A fallback when warmer paths are unavailable.", "available": True},
               {"kind": "cold_caked", "label": "Cold Caked", "score": 18, "est_reply": .22, "cost": 150, "credits": 150,
                "time": "2–3 days", "rationale": "A physical touch for a top target, after other routes fail.",
                "available": False, "locked": state["balance"] < 150, "lock_reason": "Requires 150 credits."}]
    return routes


@app.get("/routes/{target_id}")
def routes(target_id: str):
    state = snapshot()
    return {"routes": routes_for(state, target_id), "mode": "demo", "estimates_are_illustrative": True}


class DraftRequest(BaseModel):
    target_id: str
    route: Literal["warm_intro", "event_meet", "cold_email", "cold_caked", "cake", "warm", "event", "cold"] = "warm_intro"
    include_unsourced: bool = False


def sentences(body):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", body) if s.strip()]


def normalize(text):
    return " ".join(text.casefold().strip().split())


def review_draft(state, draft, body):
    # Conservative demo check: only exact, source-backed evidence sentences or the
    # generated request boilerplate are allowed. No keyword heuristic can approve a claim.
    allowed = {normalize(text) for text in draft["allowed_sentences"]}
    evidence = {normalize(s): item for item in state["evidence"] for s in sentences(item.get("text", ""))}
    checks = []
    for sentence in sentences(body):
        key = normalize(sentence)
        source = evidence.get(key)
        ok = key in allowed or source is not None
        checks.append({"text": sentence, "ok": ok,
                       "evidence_id": source.get("id") if source else (draft.get("evidence_id") if key == normalize(draft.get("hook", "")) else None),
                       "source_url": source.get("url", source.get("source_url")) if source else (draft.get("source_url") if key == normalize(draft.get("hook", "")) else None),
                       "reason": "Matched source evidence" if source or key == normalize(draft.get("hook", "")) else ("Generated request; no external factual claim" if ok else "No matching evidence. Remove or provide a source before approval.")})
    words = len(body.split())
    tokens = set(re.findall(r"\w+", body.lower()))
    similarities = []
    for other in state["drafts"].values():
        if other["draft_id"] == draft["draft_id"] or other.get("status") != "queued":
            continue
        other_tokens = set(re.findall(r"\w+", other["body"].lower()))
        similarities.append(len(tokens & other_tokens) / max(1, len(tokens | other_tokens)))
    sameness = round(max(similarities, default=0.12), 2)
    ready = bool(checks) and all(s["ok"] for s in checks) and words <= 60 and sameness <= .8
    return {"body": body, "sentences": checks, "sameness": sameness, "word_count": words, "can_approve": ready,
            "review_method": "conservative local exact-evidence match", "sameness_method": "local token overlap; Moss not connected"}


@app.post("/drafts")
def create_draft(body: DraftRequest):
    with transaction() as state:
        lead = lead_for(state, body.target_id)
        evidence = evidence_for(state, lead)
        hook = evidence.get("text", lead.get("signal", "")).strip()
        hook = sentences(hook)[0] if sentences(hook) else ""
        if not hook.endswith((".", "!", "?")):
            hook += "."
        if len(hook.split()) > 30:
            hook = lead.get("signal", "").strip().rstrip(".!?") + "."
        product = state.get("product", {})
        product_name = product.get("name", "Tracekit") if isinstance(product, dict) else "Tracekit"
        pitch = f"I'm building {product_name}."
        ask = "Would you be open to a 15-minute conversation?"
        if body.route in {"warm_intro", "warm"}:
            ask = f"Would you ask {lead['person'].split()[0]} if an introduction would be welcome?"
        approved_sentences = [hook, pitch, ask]
        draft_body = " ".join(approved_sentences)
        if body.include_unsourced:
            draft_body += " Your team doubled revenue last quarter."
        draft_id = "draft-" + uuid.uuid4().hex[:12]
        draft = {"draft_id": draft_id, "id": draft_id, "target_id": target_of(lead), "person": lead["person"],
                 "company": lead["company"], "route": body.route, "subject": "a warm introduction" if body.route == "warm_intro" else "a quick conversation",
                 "allowed_sentences": approved_sentences, "hook": hook, "evidence_id": evidence["id"],
                 "source_url": evidence.get("url", lead.get("source_url")), "status": "draft", "created_at": now(), "mode": "demo"}
        draft.update(review_draft(state, draft, draft_body))
        state["drafts"][draft_id] = draft
        event(state, "Reviewer", "Draft checked against source evidence. Approval stays blocked until every sentence is supported.")
        return draft


@app.get("/drafts")
def drafts():
    return {"drafts": list(snapshot()["drafts"].values())}


class EditDraft(BaseModel):
    edited_body: str | None = Field(default=None, max_length=10000)


@app.post("/drafts/{draft_id}/review")
def review(draft_id: str, body: EditDraft):
    with transaction() as state:
        draft = state["drafts"].get(draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        if draft["status"] != "draft":
            raise HTTPException(409, "Only unapproved drafts can be edited")
        draft.update(review_draft(state, draft, body.edited_body if body.edited_body is not None else draft["body"]))
        return draft


@app.post("/drafts/{draft_id}/approve")
def approve(draft_id: str, body: EditDraft):
    with transaction() as state:
        draft = state["drafts"].get(draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        if draft["status"] == "queued":
            if body.edited_body is not None and body.edited_body != draft["body"]:
                raise HTTPException(409, "Approved draft cannot be changed. Create a new draft.")
            return {"status": "queued", "draft_id": draft_id, "sent": False, "mode": "demo"}
        if draft["status"] != "draft":
            raise HTTPException(409, "Rejected draft cannot be approved")
        result = review_draft(state, draft, body.edited_body if body.edited_body is not None else draft["body"])
        if not result["can_approve"]:
            raise HTTPException(422, {"message": "Reviewer blocked approval. Resolve unsourced sentences, word limit or sameness.", **result})
        # Local queueing is not delivery, so it must not emit outreach_sent or move
        # the pipeline into Contacted. Only a real delivery acknowledgement may do that.
        draft.update(result)
        draft.update({"status": "queued", "approved_by": "you", "approved_at": now()})
        audit(state, "draft_approved", draft["target_id"], draft_id=draft_id, sent=False)
        event(state, "Security", "Approval recorded. The draft is in your outreach queue.")
        return {"status": "queued", "draft_id": draft_id, "sent": False, "mode": "demo"}


@app.post("/drafts/{draft_id}/reject")
def reject(draft_id: str):
    with transaction() as state:
        draft = state["drafts"].get(draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        if draft["status"] == "queued":
            raise HTTPException(409, "Approved draft cannot be rejected")
        draft["status"] = "rejected"
        audit(state, "draft_rejected", draft["target_id"], draft_id=draft_id)
        return {"status": "rejected", "draft_id": draft_id}


class RadarScan(BaseModel):
    city: str = Field(default="San Francisco", max_length=100)
    days: int = Field(default=21, ge=1, le=90)


@app.post("/radar/scan")
def radar_scan(body: RadarScan):
    require_demo()
    with transaction() as state:
        # Once per city/day/window; retries and refreshes do not spend twice.
        key = f"radar:{body.city.lower()}:{body.days}:{now()[:10]}"
        charge(state, "event_scan", key=key)
        begin = datetime.now(timezone.utc)
        end = begin + timedelta(days=body.days)
        result = []
        for item in state.get("events", []):
            try:
                date = datetime.fromisoformat(item["start"].replace("Z", "+00:00"))
                if date.tzinfo is None:
                    date = date.replace(tzinfo=timezone.utc)
            except (ValueError, KeyError):
                continue
            if begin <= date <= end:
                result.append(item)
        event(state, "Builder", f"Radar found {len(result)} upcoming events where your targets will be.")
        return {"events": sorted(result, key=lambda e: -e.get("score", 0)), "mode": "demo", "city": body.city}


@app.get("/radar")
def radar():
    return {"events": snapshot().get("events", []), "mode": "demo"}


@app.post("/radar/alert/{event_id}")
def alert(event_id: str):
    state = snapshot()
    item = next((e for e in state.get("events", []) if e["id"] == event_id), None)
    if not item:
        raise HTTPException(404, "Event not found")
    return {"sent": False, "mode": "demo", "reason": "Alert preview ready.",
            "preview": {"text": f"{item['name']} · {item['city']} · {item['start']}", "buttons": [
                {"text": "Plan trip", "url": "https://www.google.com/travel/flights?q=" + quote("flights to " + item["city"])},
                {"text": "Add to calendar", "url": f"/radar/{event_id}/calendar"},
                {"text": "Get intro", "action": "open_routes"}, {"text": "Skip", "action": "dismiss"}]}}


def ics_escape(value):
    return str(value).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n").replace("\r", "")


@app.get("/radar/{event_id}/calendar")
def calendar(event_id: str):
    item = next((e for e in snapshot().get("events", []) if e["id"] == event_id), None)
    if not item:
        raise HTTPException(404, "Event not found")
    start = datetime.fromisoformat(item["start"].replace("Z", "+00:00"))
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    end = datetime.fromisoformat(item.get("end", (start + timedelta(hours=2)).isoformat()).replace("Z", "+00:00"))
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    fmt = lambda d: d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    content = "\r\n".join(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//thermopb//RTM//EN", "BEGIN:VEVENT",
        f"UID:{ics_escape(event_id)}@thermopb.local", f"DTSTAMP:{fmt(datetime.now(timezone.utc))}",
        f"DTSTART:{fmt(start)}", f"DTEND:{fmt(end)}", f"SUMMARY:{ics_escape(item['name'])}",
        f"LOCATION:{ics_escape(item.get('venue', item['city']))}",
        f"DESCRIPTION:{ics_escape(item.get('description', ''))}", "END:VEVENT", "END:VCALENDAR", ""])
    return PlainTextResponse(content, media_type="text/calendar", headers={"Content-Disposition": f'attachment; filename="{event_id}.ics"'})


class CakeRequest(BaseModel):
    line: str = Field(min_length=1, max_length=200)


@app.post("/cake/{target_id}")
def cake(target_id: str, body: CakeRequest):
    with transaction() as state:
        lead_for(state, target_id)
        if state["balance"] < METERS["cake_sent"]:
            raise HTTPException(402, {"message": "Cake route requires 150 credits.", "balance": state["balance"], "required": 150})
        # No checkout link is fabricated and no credits are deducted without a provider result.
        return {"coverage": "unconfirmed", "price": 150, "checkout_url": None, "mode": "demo", "sent": False,
                "reason": "Cake coverage for this address is unconfirmed."}


@app.get("/pipeline")
def pipeline():
    state = snapshot()
    cards = state["pipeline"]
    by_stage = {stage: sum(c.get("stage") == stage for c in cards) for stage in STAGES}
    by_route = {}
    for card in cards:
        route = card.get("route", card.get("best_route", "cold_email"))
        data = by_route.setdefault(route, {"total": 0, "contacted": 0, "replied": 0, "meetings": 0})
        data["total"] += 1
        data["contacted"] += int(card.get("stage") in STAGES[1:])
        data["replied"] += int(card.get("stage") in {"Replied", "Meeting Booked"})
        data["meetings"] += int(card.get("stage") == "Meeting Booked")
    return {"cards": cards, "stats": {"by_stage": by_stage, "by_route": by_route,
            "by_tier": {tier: sum(c.get("tier") == tier for c in cards) for tier in ["A", "B", "C"]}},
            "audit": state["audit"][-50:], "mode": "demo"}


class StageChange(BaseModel):
    stage: Literal["Matched", "Contacted", "Replied", "Meeting Booked", "Closed/Lost"]


@app.patch("/pipeline/{target_id}")
def change_stage(target_id: str, body: StageChange):
    with transaction() as state:
        lead = lead_for(state, target_id)
        card = next((c for c in state["pipeline"] if c.get("target_id", c["id"]) in {target_id, target_of(lead)} or c["id"] == lead["id"]), None)
        if not card:
            raise HTTPException(404, "Pipeline card not found")
        previous = card["stage"]
        card.update({"stage": body.stage, "actor": "you", "updated_at": now()})
        audit(state, "stage_changed", target_id, previous=previous, stage=body.stage)
        return {"card": card}


@app.get("/credits")
def credits():
    state = snapshot()
    return {"balance": state["balance"], "events": {name: sum(e["quantity"] for e in state["meter_events"] if e["name"] == name) for name in METERS},
            "history": state["meter_events"][-30:], "provider": "local-demo", "mode": "demo"}


class TopUp(BaseModel):
    amount: int = Field(default=100, ge=1, le=1000)


@app.post("/credits/topup")
def top_up(body: TopUp):
    require_demo()
    with transaction() as state:
        state["balance"] += body.amount
        audit(state, "demo_credit_topup", amount=body.amount)
        return {"balance": state["balance"], "mode": "demo", "charged_money": False}


@app.post("/demo/reset")
def reset_demo():
    require_demo()
    with transaction() as state:
        previous = copy.deepcopy({key: value for key, value in state.items() if key != "_demo_restore"})
        state.clear()
        state.update(load_seed())
        state["_demo_restore"] = previous
        audit(state, "demo_reset", reversible=True)
        return {"status": "reset", "mode": "demo", "can_restore": True, "balance": state["balance"],
                "external_actions": False}


@app.post("/demo/restore")
def restore_demo():
    require_demo()
    with transaction() as state:
        previous = state.get("_demo_restore")
        if not isinstance(previous, dict):
            raise HTTPException(409, "Nothing to restore")
        restored = copy.deepcopy({key: value for key, value in previous.items() if key != "_demo_restore"})
        state.clear()
        state.update(restored)
        audit(state, "demo_restored")
        return {"status": "restored", "mode": "demo", "can_restore": False, "balance": state["balance"],
                "external_actions": False}


@app.get("/audit")
def audit_log():
    return {"events": snapshot()["audit"]}


@app.get("/evidence/{evidence_id}")
def get_evidence(evidence_id: str):
    state = snapshot()
    result = next((e for e in state["evidence"] if e.get("id") == evidence_id), None)
    if result is None:
        raise HTTPException(404, "Evidence not found")
    return {**result, "mode": "demo"}


@app.get("/agents")
def agents():
    return {"events": snapshot()["agent_events"], "provider": "local-demo"}


@app.get("/agents/stream")
async def agent_stream():
    async def stream():
        sent = set()
        while True:
            for item in snapshot()["agent_events"]:
                identity = json.dumps(item, sort_keys=True)
                if identity not in sent:
                    sent.add(identity)
                    yield f"data: {json.dumps(item)}\n\n"
            yield ": heartbeat\n\n"
            await asyncio.sleep(2)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
