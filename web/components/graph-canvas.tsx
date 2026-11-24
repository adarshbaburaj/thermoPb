"use client";
import { useSyncExternalStore } from "react";
import type { Item, Seed } from "@/lib/types";

const compactQuery = "(max-width: 640px)";
function subscribeCompact(onChange: () => void) {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const human = (text: string) => (text || "").replaceAll("_", " ").toLowerCase();
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export default function GraphCanvas({
  graph,
  target,
  pathEdges,
  leads,
  zoom,
  onZoom,
  onSelect,
  onSource,
}: {
  graph: Seed["graph"];
  target: string;
  pathEdges: Item[];
  leads: Item[];
  zoom: number;
  onZoom: (zoom: number) => void;
  onSelect: (id: string) => void;
  onSource: (url: string) => void;
}) {
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(compactQuery).matches,
    () => false,
  );
  const canvasWidth = compact ? 360 : 840;
  const canvasHeight = compact ? 300 : 570;
  const founder =
    graph.nodes.find((n) => n.role_tag === "me") || graph.nodes[0];
  const primary = graph.nodes.find((n) => n.id === target);
  const routeNodes = [founder?.id, ...pathEdges.map((h: Item) => h.to)].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  if (routeNodes.length < 2 && primary) routeNodes.push(primary.id);
  const people = graph.nodes
    .filter((n) => n.type === "Person" || n.type === "Investor" || n.role_tag)
    .slice(0, 40);
  const visible = compact
    ? people
        .filter((node) => routeNodes.includes(node.id))
        .concat(
          people.filter((node) => !routeNodes.includes(node.id)).slice(0, 12),
        )
    : people;
  const coordinates = new Map<string, { x: number; y: number }>();
  const heroCoords = routeNodes.map((_, i) => ({
    x:
      (compact ? 45 : 110) +
      ((compact ? 270 : 610) * i) / Math.max(1, routeNodes.length - 1),
    y: compact ? [140, 120, 145, 120, 140][i] : [255, 225, 285, 225, 255][i],
  }));
  routeNodes.forEach((id, i) => coordinates.set(id, heroCoords[i]));
  let index = 0;
  visible
    .filter((n) => !coordinates.has(n.id))
    .forEach((n) => {
      const i = index++;
      const columns = compact ? 6 : 7;
      const row = Math.floor(i / columns);
      const col = i % columns;
      coordinates.set(n.id, {
        x: compact ? 35 + col * 58 : 88 + col * 113 + (row % 2) * 31,
        y: compact
          ? [40, 245][row % 2] + Math.sin(i * 6) * 8
          : [75, 145, 385, 460, 525][row % 5] + Math.sin(i * 6) * 20,
      });
    });
  const isPath = (a: string, b: string) =>
    pathEdges.some(
      (h: Item) => (h.from === a && h.to === b) || (h.from === b && h.to === a),
    );
  return (
    <div className="graph-canvas">
      <div className="graph-label">
        Relationship graph{" "}
        <span className="graph-count">
          {graph.nodes.length} nodes, {graph.edges.length} connections
        </span>
      </div>
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        role="group"
        aria-label="Relationship graph. Select a target node to explore its sourced path."
      >
        <g
          transform={`translate(${(canvasWidth / 2) * (1 - zoom)} ${(canvasHeight / 2) * (1 - zoom)}) scale(${zoom})`}
        >
          {graph.edges.map((edge, i) => {
            const a = coordinates.get(edge.source),
              b = coordinates.get(edge.target);
            if (!a || !b) return null;
            const active = isPath(edge.source, edge.target);
            const step = pathEdges.findIndex(
              (h) =>
                (h.from === edge.source && h.to === edge.target) ||
                (h.to === edge.source && h.from === edge.target),
            );
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? "var(--route)" : "var(--map-line)"}
                  strokeWidth={active ? 2 : 0.7}
                  strokeOpacity={active ? 1 : 0.13}
                  strokeDasharray={
                    edge.confidence === "INFERRED" ? "5 6" : undefined
                  }
                  className={active ? "path-line" : ""}
                  style={
                    active ? { animationDelay: `${step * 150}ms` } : undefined
                  }
                />
                <title>{`${human(edge.relation)} (${edge.confidence.toLowerCase()})`}</title>
              </g>
            );
          })}
          {visible.map((n, nodeIndex) => {
            const p = coordinates.get(n.id);
            if (!p) return null;
            const active = routeNodes.includes(n.id);
            const targetNode = n.id === target;
            const title = n.id === founder?.id ? "You" : n.label;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                className={"graph-node " + (active ? "active-node" : "")}
                style={{
                  animationDelay: `${active ? Math.max(0, routeNodes.indexOf(n.id)) * 150 : Math.min(nodeIndex * 8, 200)}ms`,
                }}
                aria-pressed={targetNode}
                tabIndex={0}
                role="button"
                aria-label={`Explore ${n.label}`}
                onClick={() => {
                  if (leads.some((l) => l.target_id === n.id)) onSelect(n.id);
                  else
                    onSource(
                      graph.edges.find(
                        (e) => e.source === n.id || e.target === n.id,
                      )?.source_url,
                    );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (leads.some((l) => l.target_id === n.id)) onSelect(n.id);
                    else
                      onSource(
                        graph.edges.find(
                          (edge) =>
                            edge.source === n.id || edge.target === n.id,
                        )?.source_url,
                      );
                  }
                }}
              >
                {active && (
                  <circle
                    className={targetNode ? "target-orbit" : "node-orbit"}
                    r={targetNode ? 32 : 27}
                    fill="none"
                    stroke={targetNode ? "var(--route)" : "var(--map-line)"}
                    strokeOpacity={targetNode ? 0.4 : 0.15}
                  />
                )}
                <circle
                  r={active ? 21 : 8}
                  fill={targetNode ? "var(--signal)" : active ? "var(--paper)" : "var(--graph-node)"}
                  stroke={active ? "var(--route)" : "var(--graph-stroke)"}
                  strokeWidth=".8"
                />
                {active && (
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="var(--ink)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {n.id === founder?.id ? "AB" : initials(n.label)}
                  </text>
                )}
                <text
                  textAnchor="middle"
                  y={active ? 46 : 24}
                  fill="var(--map-label)"
                  opacity={active ? 1 : 0.45}
                  fontSize={active ? 12 : 9}
                >
                  {active && !compact ? title : title?.split(" ")[0]}
                </text>
                {active && !compact && (
                  <text
                    textAnchor="middle"
                    y="63"
                    fill="var(--map-label)"
                    opacity=".4"
                    fontSize="9"
                  >
                    {targetNode
                      ? "Target"
                      : n.id === founder?.id
                        ? "Founder, Tracekit"
                        : n.company || "Connector"}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="graph-bottom">
        <div className="graph-legend">
          <span>
            <i /> Sourced relationship
          </span>
          <span>
            <i className="dashed" /> Inferred relationship
          </span>
        </div>
        <div className="zoom">
          <button
            aria-label="Zoom out"
            onClick={() => onZoom(Math.max(0.7, zoom - 0.1))}
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in"
            onClick={() => onZoom(Math.min(1.5, zoom + 0.1))}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
