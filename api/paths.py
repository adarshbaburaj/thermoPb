"""Evidence-backed, cycle-free path search; no agent can invent a graph edge."""

from datetime import datetime, timezone
from .graph_writer import RELATION_WEIGHTS


def me_id(graph: dict) -> str:
    return next((n["id"] for n in graph["nodes"] if n.get("role_tag") == "me"), "person-adarsh-baburaj")


def edge_weight(edge: dict, now: datetime | None = None) -> float:
    weight = RELATION_WEIGHTS.get(edge.get("relation"), 0)
    if edge.get("confidence") == "INFERRED":
        weight *= 0.6
    # A one-year half life, bounded to avoid making older evidence disappear.
    observed = edge.get("observed_at")
    if observed:
        try:
            date = datetime.fromisoformat(observed.replace("Z", "+00:00"))
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            age_days = max(0, ((now or datetime.now(timezone.utc)) - date).days)
            weight *= max(0.5, 0.5 ** (age_days / 365))
        except ValueError:
            weight *= 0.5
    return weight


def find_paths(state: dict, target_id: str, max_hops: int = 4) -> list[dict]:
    graph = state["graph"]
    origin = me_id(graph)
    if target_id == origin:
        return []
    labels = {n["id"]: n.get("label", n.get("name", n["id"])) for n in graph["nodes"]}
    adjacent = {}
    for edge in graph["edges"]:
        weight = edge_weight(edge)
        if weight <= 0:
            continue
        adjacent.setdefault(edge["source"], []).append((edge["target"], edge, weight))
        adjacent.setdefault(edge["target"], []).append((edge["source"], edge, weight))
    lead = next((l for l in state["leads"] if l.get("target_id", l["id"]) == target_id), {})
    target_value = lead.get("fit", lead.get("icp_score", 80)) / 100
    paths = []

    def walk(current, visited, hops, score):
        if current == target_id:
            paths.append({"score": round(score * target_value, 4), "hops": hops, "target_value": target_value})
            return
        if len(hops) >= max_hops:
            return
        for neighbor, edge, weight in adjacent.get(current, []):
            if neighbor in visited:
                continue
            hop = {**edge, "from": current, "to": neighbor,
                   "from_label": labels.get(current, current), "to_label": labels.get(neighbor, neighbor),
                   "weight": round(weight, 4)}
            walk(neighbor, visited | {neighbor}, hops + [hop], score * weight)

    walk(origin, {origin}, [], 1)
    return sorted(paths, key=lambda p: (-p["score"], len(p["hops"])))[:3]
