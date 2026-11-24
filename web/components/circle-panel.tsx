"use client";
import { useEffect, useState } from "react";
// avoid-ai-design-ignore-file: I3 (Check marks a confirmed copy or accepted connection)
import {
  Check,
  Copy,
  Fingerprint,
  Link2,
  LoaderCircle,
  Plus,
  Users,
} from "lucide-react";
import type { Item } from "@/lib/types";

type Props = {
  onRefresh: () => Promise<void>;
  onIntro: (target: string) => void;
  onSuggestion: (item: Item) => void;
  onNotice: (text: string) => void;
  onSource: (url: string) => void;
};
export default function CirclePanel({
  onRefresh,
  onIntro,
  onSuggestion,
  onNotice,
  onSource,
}: Props) {
  const [data, setData] = useState<Item | null>(null),
    [thermoId, setThermoId] = useState(""),
    [busy, setBusy] = useState(""),
    [copied, setCopied] = useState(false);
  async function request(path: string, body?: Item) {
    const res = await fetch("/api/circle" + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const value = await res.json();
    if (!res.ok)
      throw Error(
        typeof value.detail === "string"
          ? value.detail
          : value.detail?.message || "Could not update your circle.",
      );
    return value;
  }
  async function load() {
    const value = await request("");
    setData(value);
    return value;
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
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timeout);
  }, [copied]);
  const profile = data?.profile || {
    thermo_id: "TM-ADARSH",
    name: "Adarsh Baburaj",
  };
  return (
    <section className="circle-section">
      <div className="thermo-identity card">
        <div className="thermo-identity-main">
          <h2>
            Your people.
            <br />
            One TM tag.
          </h2>
          <p>
            Share an ID. Connect your circles.
            <br />
            Find the introduction you didn’t know you had.
          </p>
          <div className={"thermo-id " + (copied ? "is-copied" : "")}>
            <Fingerprint size={24} />
            <b>{profile.thermo_id}</b>
            <button
              aria-label={copied ? "TM tag copied" : "Copy TM tag"}
              className="icon-button"
              onClick={() =>
                navigator.clipboard
                  .writeText(profile.thermo_id)
                  .then(() => {
                    setCopied(true);
                    onNotice("TM tag copied.");
                  })
                  .catch(() =>
                    onNotice(`Your TM tag is ${profile.thermo_id}`),
                  )
              }
            >
              {copied ? (
                <Check size={15} className="copy-feedback" />
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>
          <div className="field-note">
            <Users size={13} /> Connections are shared after they accept.
          </div>
        </div>
        <div className="thermo-connect">
          <h3>Got someone’s TM tag?</h3>
          <p>
            Send a connection request. Their shared connections appear after
            they accept.
          </p>
          <label htmlFor="thermo-id" className="visually-hidden">
            Someone’s TM tag
          </label>
          <div className="thermo-connect-input">
            <input
              id="thermo-id"
              value={thermoId}
              onChange={(e) => setThermoId(e.target.value.toUpperCase())}
              placeholder="TM-PRIYA"
            />
            <button
              className="button primary"
              disabled={!thermoId.trim() || !!busy}
              onClick={() =>
                run("invite", async () => {
                  await request("/invite", { thermo_id: thermoId.trim() });
                  await load();
                  setThermoId("");
                  onNotice(
                    "Request sent. Waiting for them to accept.",
                  );
                })
              }
            >
              {busy === "invite" ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <Plus size={14} />
              )}{" "}
              Connect
            </button>
          </div>
          <div className="demo-id-picks">
            <span>Suggested</span>
            {["TM-PRIYA", "TM-ELENA"].map((id) => (
              <button key={id} onClick={() => setThermoId(id)}>
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!!data?.invites?.length && (
        <div className="circle-invites">
          <div className="section-header">
            <h2>Connection requests</h2>
            <span>Waiting on replies</span>
          </div>
          {data.invites.map((invite: Item) => (
            <div className="card circle-invite" key={invite.id}>
              <span className="avatar">
                {(
                  invite.name ||
                  invite.peer_name ||
                  invite.thermo_id ||
                  "TC"
                ).slice(0, 2)}
              </span>
              <div>
                <strong>
                  {invite.name ||
                    invite.peer_name ||
                    invite.to_name ||
                    invite.thermo_id ||
                    invite.to_thermo_id}
                </strong>
                <small>
                  {invite.thermo_id || invite.to_thermo_id}, {invite.status}
                </small>
              </div>
              {invite.status === "pending" ? (
                <div className="demo-peer-actions">
                  <span>Their reply</span>
                  <button
                    className="button"
                    disabled={!!busy}
                    onClick={() =>
                      run(invite.id, async () => {
                        const result = await request(
                          `/invites/${invite.id}/respond`,
                          { decision: "accept", demo_peer: true },
                        );
                        const next = await load();
                        await onRefresh();
                        const suggestions =
                          result.suggestions || next.suggestions || [];
                        if (suggestions[0]) onSuggestion(suggestions[0]);
                        onNotice(
                          "Connection accepted. Shared paths are now available.",
                        );
                      })
                    }
                  >
                    <Check size={13} /> Accepted
                  </button>
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() =>
                      run(invite.id, async () => {
                        await request(`/invites/${invite.id}/respond`, {
                          decision: "decline",
                          demo_peer: true,
                        });
                        await load();
                      })
                    }
                  >
                    Declined
                  </button>
                </div>
              ) : (
                <span className="source-chip">
                  {invite.status === "accepted" ? "Connected" : "Declined"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {!!data?.suggestions?.filter(
        (s: Item) => !s.dismissed && s.status !== "dismissed",
      ).length && (
        <div>
          <div className="section-header">
            <h2>A connection you didn’t see coming.</h2>
            <span>From your shared circle</span>
          </div>
          <div className="connection-suggestions">
            {data.suggestions
              .filter((s: Item) => !s.dismissed && s.status !== "dismissed")
              .map((s: Item) => (
                <article className="card circle-suggestion" key={s.id}>
                  <div className="suggestion-link">
                    <Link2 size={19} />
                  </div>
                  <h3>
                    {s.connector_name} knows {s.target_name}.
                  </h3>
                  <p>
                    {s.text ||
                      "A shared connection puts a new introduction within reach."}
                  </p>
                  <button
                    className="text-button shared-source"
                    onClick={() => onSource(s.source_url)}
                  >
                    Shared relationship, view source
                  </button>
                  <div>
                    <button
                      className="text-button"
                      onClick={() =>
                        run(s.id, async () => {
                          await request(
                            `/suggestions/${s.id}/request-intro`,
                            {},
                          );
                          onIntro(s.target_id);
                        })
                      }
                    >
                      Ask for an introduction
                    </button>
                    <button
                      className="text-button muted"
                      onClick={() =>
                        run(s.id, async () => {
                          await request(`/suggestions/${s.id}/dismiss`, {});
                          await load();
                        })
                      }
                    >
                      Dismiss
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
