"use client";
import { useEffect, useState } from "react";
// avoid-ai-design-ignore-file: I3 (Check marks how an idea applies to your target)
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Lightbulb,
  LoaderCircle,
  Radio,
  Search,
} from "lucide-react";
import type { Item } from "@/lib/types";
type Props = {
  onApply: (idea: Item) => void;
  onNotice: (text: string) => void;
  onSource: (idea: Item) => void;
};
export default function OutreachRadar({ onApply, onNotice, onSource }: Props) {
  const [ideas, setIdeas] = useState<Item[]>([]),
    [scan, setScan] = useState<Item | null>(null),
    [busy, setBusy] = useState(""),
    [filter, setFilter] = useState("All ideas"),
    [query, setQuery] = useState("");
  async function request(path: string, body?: Item) {
    const res = await fetch("/api/playbook" + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await res.json();
    if (!res.ok)
      throw Error(
        typeof result.detail === "string"
          ? result.detail
          : result.detail?.message || "The scan could not finish.",
      );
    return result;
  }
  async function load() {
    const value = await request("");
    setIdeas(value.ideas || []);
    setScan(value.scan || value.last_scan || null);
  }
  useEffect(() => {
    load().catch(() => {});
  }, []);
  async function run(name: string, task: () => Promise<void>) {
    setBusy(name);
    try {
      await task();
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  const visible = ideas.filter(
    (i) =>
      (filter !== "Saved" || i.saved) &&
      `${i.title} ${i.technique} ${i.summary}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="outreach-intro card">
        <span className="outreach-orbit">
          <Lightbulb size={25} />
        </span>
        <div>
          <h2>Someone tried something different.</h2>
          <p>
            We look for public posts where people explain an outreach technique
            and share what happened. Save a useful idea, then adapt it to your
            own route.
          </p>
        </div>
        <span className="source-chip">Learn, adapt, review</span>
      </div>
      <div className="ideas-toolbar">
        <div className="tab-line">
          {["All ideas", "Saved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={"tab " + (filter === f ? "active" : "")}
            >
              {f}
              {f === "Saved" && (
                <span>{ideas.filter((i) => i.saved).length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="search-input">
          <Search size={13} />
          <input
            aria-label="Search outreach ideas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a technique…"
          />
        </div>
        <button
          className="button primary"
          disabled={!!busy}
          onClick={() =>
            run("scan", async () => {
              const r = await request("/scan", { days: 90 });
              await load();
              setScan(r.scan || r);
              onNotice(
                r.message ||
                  "Public post scan finished. Sources and reported outcomes are labeled.",
              );
            })
          }
        >
          {busy === "scan" ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <Radio size={14} />
          )}{" "}
          Run lookout
        </button>
      </div>
      <div className="scan-status" role="status" aria-live="polite">
        <span className="live-dot dark" />
        <span>
          {busy === "scan"
            ? "Looking through recent posts…"
            : scan?.status === "demo"
              ? `${scan.new_count} new ideas found`
              : scan?.status === "success"
                ? "Latest public scan"
                : scan?.status === "no_matches"
                  ? "No recent matching posts found"
                  : "Founder posts with reported outcomes"}
        </span>
        <span>
          {scan?.scanned_at
            ? new Date(scan.scanned_at).toLocaleString()
            : "Last 90 days"}
        </span>
      </div>
      <div className="ideas-grid">
        {visible.map((idea, i) => (
          <article
            className="card idea-card"
            key={idea.id}
            style={{ animationDelay: `${Math.min(i, 5) * 45}ms` }}
          >
            <div className="idea-source">
              <span>
                {idea.source_name || "Public post"},{" "}
                {idea.author || "Original author"}
              </span>
              <button
                className={
                  "icon-button " + (idea.saved ? "bookmark-saved" : "")
                }
                aria-pressed={!!idea.saved}
                aria-label={`${idea.saved ? "Unsave" : "Save"} ${idea.title}`}
                disabled={!!busy}
                onClick={() =>
                  run(idea.id, async () => {
                    await request(`/${idea.id}/save`, { saved: !idea.saved });
                    await load();
                  })
                }
              >
                {idea.saved ? (
                  <Bookmark size={16} fill="currentColor" />
                ) : (
                  <Bookmark size={16} />
                )}
              </button>
            </div>
            <div className="idea-number">
              <span>{idea.claim_type || "Author-reported"}</span>
            </div>
            <h2>{idea.technique || idea.title}</h2>
            <p>{idea.summary}</p>
            <div className="idea-outcome">
              <span>What the source claims</span>
              <p>{idea.title}</p>
              <small>
                {idea.claim_note ||
                  "Reported by the source. thermopb has not independently verified the outcome."}
              </small>
            </div>
            {idea.application && (
              <div className="idea-application">
                <Check size={12} />
                <span>{idea.application}</span>
              </div>
            )}
            <div className="idea-actions">
              <button className="text-button" onClick={() => onSource(idea)}>
                View post <ArrowUpRight size={12} />
              </button>
              <button className="text-button" onClick={() => onApply(idea)}>
                Try this approach
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="card empty-state">
          <Lightbulb size={30} />
          <p>
            {filter === "Saved"
              ? "Your next good idea belongs here."
              : "No ideas match yet."}
          </p>
          <span>
            {filter === "Saved"
              ? "Save a technique to build your own outreach playbook."
              : "Run a public scan or try another search."}
          </span>
        </div>
      )}
    </>
  );
}
