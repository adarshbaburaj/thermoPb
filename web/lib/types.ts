export type Item = { [key: string]: any };
export type Seed = {
  leads: Item[];
  graph: { nodes: Item[]; edges: Item[] };
  events: Item[];
  evidence: Item[];
  icp: Item;
  expansions: Item[];
  pipeline: Item;
  agent_events: Item[];
  [key: string]: any;
};
