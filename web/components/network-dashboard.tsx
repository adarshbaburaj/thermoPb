"use client";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  MessageCircle,
  Network,
  Search,
  Users,
} from "lucide-react";
import { connectorInsights, personInitials } from "@/lib/network-insights";
import type { Item, Seed } from "@/lib/types";

type Props = {
  graph: Seed["graph"];
  leads: Item[];
  cards: Item[];
  events: Item[];
  onNavigate: (screen: string, targetId?: string) => void;
};
export default function NetworkDashboard({
  graph,
  leads,
  cards,
  events,
  onNavigate,
}: Props) {
  const [query, setQuery] = useState("");
  const connectors = useMemo(
    () => connectorInsights(graph, leads),
    [graph, leads],
  );
  const visible = connectors.filter((person) =>
    `${person.label} ${person.company}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="network-dashboard">
      <div className="dashboard-stats">
        <div>
          <span>People in your network</span>
          <strong>
            {
              graph.nodes.filter((node) =>
                ["Person", "Investor"].includes(node.type),
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Direct connectors</span>
          <strong>{connectors.length}</strong>
        </div>
        <div>
          <span>People you want to meet</span>
          <strong>{leads.length}</strong>
        </div>
        <div>
          <span>Meetings booked</span>
          <strong>
            {cards.filter((card) => card.stage === "Meeting Booked").length}
          </strong>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-connectors">
          <div className="dashboard-section-head">
            <div>
              <h2>The people who open doors.</h2>
              <p>Start with someone you already know.</p>
            </div>
            <Users size={19} />
          </div>
          <div className="search-input">
            <Search size={15} />
            <input
              aria-label="Search connectors"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a connector…"
            />
          </div>
          <div className="connector-list">
            {visible.map((person) => (
              <article key={person.id} className="connector-row">
                <span className="avatar">{personInitials(person.label)}</span>
                <div className="connector-person">
                  <strong>{person.label}</strong>
                  <span>{person.company || "Your connection"}</span>
                </div>
                <div className="connector-reach">
                  <b>{person.opportunities.length}</b>
                  <span>reachable targets</span>
                </div>
                <button
                  className="button"
                  onClick={() =>
                    onNavigate(
                      "Glass Brain",
                      person.opportunities[0]?.target_id || leads[0]?.target_id,
                    )
                  }
                >
                  Explore routes
                </button>
              </article>
            ))}
            {!visible.length && (
              <p className="dashboard-empty">
                No connector matches that search.
              </p>
            )}
          </div>
          <button
            className="dashboard-text-link"
            onClick={() => onNavigate("My network")}
          >
            Manage your connections
          </button>
        </section>
        <aside className="dashboard-next">
          <h2>Keep things moving.</h2>
          <button
            onClick={() => onNavigate("Glass Brain", leads[0]?.target_id)}
          >
            <span className="dashboard-next-icon">
              <Network size={19} />
            </span>
            <strong>Understand the route</strong>
            <p>
              See every connection between you and{" "}
              {leads[0]?.person?.split(" ")[0] || "your target"}.
            </p>
            <span>Open network brain</span>
          </button>
          <button onClick={() => onNavigate("Event radar")}>
            <span className="dashboard-next-icon">
              <CalendarDays size={19} />
            </span>
            <strong>{events[0]?.name || "Find your next room"}</strong>
            <p>
              {events[0]?.city || "Your city"}
              {events[0]?.start
                ? ` / ${new Date(events[0].start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" })}`
                : ""}
            </p>
            <span>Explore events</span>
          </button>
          <button onClick={() => onNavigate("Chat")}>
            <span className="dashboard-next-icon">
              <MessageCircle size={19} />
            </span>
            <strong>Talk it through</strong>
            <p>Ask thermopb for the next useful step.</p>
            <span>Back to conversation</span>
          </button>
        </aside>
      </div>
    </section>
  );
}
