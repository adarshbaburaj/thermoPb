import type { Item, Seed } from "./types";

const weights: Record<string, number> = {
  KNOWS_DIRECT: 0.95,
  WORKED_WITH: 0.75,
  INVESTED_IN: 0.8,
  COFOUNDED: 0.85,
  SAME_TEAM: 0.85,
  STUDIED_WITH: 0.4,
  INTERACTED_PUBLICLY: 0.5,
  CO_SPOKE: 0.3,
  CO_ATTENDED: 0.3,
};

export function networkPaths(
  graph: Seed["graph"],
  targetId: string,
  fit = 100,
): Item[] {
  const origin = graph.nodes.find((node) => node.role_tag === "me")?.id;
  if (!origin) return [];
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacent = new Map<string, Item[]>();
  for (const edge of graph.edges) {
    if (!weights[edge.relation] || !edge.source_url) continue;
    for (const [from, to] of [
      [edge.source, edge.target],
      [edge.target, edge.source],
    ]) {
      adjacent.set(from, [
        ...(adjacent.get(from) || []),
        {
          ...edge,
          from,
          to,
          from_label: nodes.get(from)?.label || from,
          to_label: nodes.get(to)?.label || to,
        },
      ]);
    }
  }
  const paths: Item[] = [];
  function visit(
    id: string,
    visited: Set<string>,
    hops: Item[],
    score: number,
  ) {
    if (id === targetId) {
      paths.push({ hops, score: (score * fit) / 100 });
      return;
    }
    if (hops.length >= 4) return;
    for (const hop of adjacent.get(id) || []) {
      if (visited.has(hop.to)) continue;
      visit(
        hop.to,
        new Set([...visited, hop.to]),
        [...hops, hop],
        score *
          weights[hop.relation] *
          (hop.confidence === "INFERRED" ? 0.6 : 1),
      );
    }
  }
  visit(origin, new Set([origin]), [], 1);
  return paths
    .sort((a, b) => b.score - a.score || a.hops.length - b.hops.length)
    .slice(0, 3);
}

export type ConnectorInsight = Item & { opportunities: Item[] };

export function connectorInsights(
  graph: Seed["graph"],
  leads: Item[],
): ConnectorInsight[] {
  const origin = graph.nodes.find((node) => node.role_tag === "me")?.id;
  const direct = new Set(
    graph.edges
      .filter(
        (edge) =>
          edge.relation === "KNOWS_DIRECT" &&
          [edge.source, edge.target].includes(origin),
      )
      .map((edge) => (edge.source === origin ? edge.target : edge.source)),
  );
  return graph.nodes
    .filter((node) => direct.has(node.id))
    .map((node): ConnectorInsight => {
      const opportunities = leads
        .map(
          (lead): Item => ({
            ...lead,
            path: networkPaths(graph, lead.target_id, lead.fit).find(
              (path) => path.hops[0]?.to === node.id,
            ),
          }),
        )
        .filter((lead) => lead.path)
        .sort((a, b) => b.fit - a.fit);
      return { ...node, opportunities };
    })
    .sort((a, b) => b.opportunities.length - a.opportunities.length);
}

export const personInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
