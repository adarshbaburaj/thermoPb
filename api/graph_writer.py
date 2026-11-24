"""The only graph mutation boundary. IDs and edge provenance are validated here."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

RELATION_WEIGHTS = {
    "KNOWS_DIRECT": 0.95, "WORKED_WITH": 0.75, "INVESTED_IN": 0.8,
    "COFOUNDED": 0.85, "SAME_TEAM": 0.85, "STUDIED_WITH": 0.4,
    "INTERACTED_PUBLICLY": 0.5, "CO_SPOKE": 0.3, "CO_ATTENDED": 0.3,
}


def stable_id(name: str, identity: str = "") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:70] or "contact"
    suffix = hashlib.sha256(identity.strip().lower().encode()).hexdigest()[:10]
    return f"person-{slug}-{suffix}"


def safe_url(value: str) -> bool:
    if value.startswith("/evidence/"):
        return ".." not in value
    parsed = urlparse(value)
    return parsed.scheme in {"https", "http"} and bool(parsed.netloc)


def merge_node(graph: dict, node: dict) -> bool:
    if not node.get("id") or not (node.get("label") or node.get("name")):
        raise ValueError("Every graph node requires a stable id and label")
    for existing in graph["nodes"]:
        if existing["id"] == node["id"]:
            existing.update(node)
            return False
    node.setdefault("label", node.get("name"))
    node.setdefault("file_type", "concept")
    node.setdefault("source_file", "gtm/manual-captures.md")
    graph["nodes"].append(node)
    return True


def merge_edge(graph: dict, edge: dict) -> bool:
    ids = {node["id"] for node in graph["nodes"]}
    if edge.get("source") not in ids or edge.get("target") not in ids:
        raise ValueError("Graph edge endpoints must exist")
    if edge["source"] == edge["target"]:
        raise ValueError("Self-relationships are not supported")
    if edge.get("confidence") not in {"EXTRACTED", "INFERRED"}:
        raise ValueError("Graph edges require explicit EXTRACTED or INFERRED provenance")
    if not safe_url(edge.get("source_url", "")) or not edge.get("source_file"):
        raise ValueError("Graph edges require a safe source URL and source file")
    edge.setdefault("observed_at", datetime.now(timezone.utc).isoformat())
    edge.setdefault("evidence_ids", [])
    identity = (edge["source"], edge["target"], edge["relation"])
    for existing in graph["edges"]:
        if (existing["source"], existing["target"], existing["relation"]) == identity:
            return False
    graph["edges"].append(edge)
    return True


def capture(graph: dict, me_id: str, person: dict, note: str = "") -> bool:
    merge_node(graph, person)
    return merge_edge(graph, {
        "source": me_id, "target": person["id"], "relation": "KNOWS_DIRECT",
        "confidence": "EXTRACTED", "source_url": f"/evidence/capture-{person['id']}",
        "source_file": "gtm/manual-captures.md", "evidence_ids": [f"capture-{person['id']}"],
        "note": note or "Relationship manually confirmed by you.",
    })
