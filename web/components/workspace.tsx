"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
// avoid-ai-design-ignore-file: I3 (ArrowRight marks a hop direction A to B; Check marks a sentence that passed evidence review)
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  PanelBottomClose,
  PanelBottomOpen,
  CircleHelp,
  Columns3,
  Command,
  Compass,
  CreditCard,
  FileText,
  GitBranch,
  Layers3,
  Lightbulb,
  MessageCircle,
  LayoutDashboard,
  LoaderCircle,
  Network,
  PenLine,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Settings,
  Target,
  Users,
  Waypoints,
  Fingerprint,
  type LucideIcon,
  X,
} from "lucide-react";
import BrandMark from "@/components/brand-mark";
import ChatWorkspace from "@/components/chat-workspace";
import NetworkDashboard from "@/components/network-dashboard";
import GraphCanvas from "@/components/graph-canvas";
import CirclePanel from "@/components/circle-panel";
import OutreachRadar from "@/components/outreach-radar";
import type { Item, Seed } from "@/lib/types";

// Each page gets a two-letter stop code, shown in a route-marker tile (see DESIGN.md).
type NavItem = { screen: string; label: string; icon: LucideIcon };
const navigation: NavItem[] = [
  { screen: "Chat", label: "Chat", icon: MessageCircle },
  { screen: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "Intake", label: "Intake", icon: FileText },
  { screen: "Discovery", label: "Discovery", icon: Compass },
  { screen: "Glass Brain", label: "Glass Brain", icon: Network },
  { screen: "My network", label: "My network", icon: Users },
  { screen: "Event radar", label: "Event radar", icon: CalendarDays },
  { screen: "Routes & queue", label: "Routes & queue", icon: Send },
  { screen: "Outreach ideas", label: "Outreach ideas", icon: Lightbulb },
  { screen: "Pipeline", label: "Pipeline", icon: Columns3 },
];
// Simple mode keeps only the network brain and the TM tag, under friendlier names.
const simpleNavigation: NavItem[] = [
  { screen: "Chat", label: "Chat", icon: MessageCircle },
  { screen: "Glass Brain", label: "Network brain", icon: Network },
  { screen: "My network", label: "TM tag", icon: Fingerprint },
];
// Creative mode keeps the outreach ideas and the draft studio where an idea becomes a message.
const creativeNavigation: NavItem[] = [
  { screen: "Chat", label: "Chat", icon: MessageCircle },
  { screen: "Outreach ideas", label: "Creative ideas", icon: Lightbulb },
  { screen: "Routes & queue", label: "Draft studio", icon: PenLine },
];
type Mode = "simple" | "advanced" | "creative";
const modes: { id: Mode; label: string; note: string }[] = [
  { id: "simple", label: "Simple", note: "Network brain and your TM tag" },
  { id: "advanced", label: "Advanced", note: "The full networking workspace" },
  {
    id: "creative",
    label: "Do creative outreach",
    note: "Ideas that get replies, turned into drafts",
  },
];
const stages = [
  "Matched",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Closed/Lost",
];
const initialPitch =
  "Tracekit helps platform engineering teams trace AI agent runs, catch failures, and review production changes. We work best with growing B2B software companies with 20–200 engineers shipping agents into production.";
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
const label = (value: any): string =>
  typeof value === "string"
    ? value
    : value?.value || value?.name || value?.label || "";
const human = (s: string) => (s || "").replaceAll("_", " ").toLowerCase();

export default function Workspace({ seed }: { seed: Seed }) {
  const [screen, setScreen] = useState("Chat");
  const [leads, setLeads] = useState(seed.leads);
  const [graph, setGraph] = useState(seed.graph);
  const [events, setEvents] = useState(seed.events);
  const [target, setTarget] = useState(
    seed.leads[0]?.target_id || "person-maya-chen",
  );
  const [paths, setPaths] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("All tiers");
  const [credits, setCredits] = useState(seed.credits?.balance ?? 120);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [pathsLoading, setPathsLoading] = useState(true);
  const [thinking, setThinking] = useState(true);
  const [agentEvents, setAgentEvents] = useState<Item[]>([]);
  const [icp, setIcp] = useState<Item | null>(null);
  const [pitch, setPitch] = useState(initialPitch);
  const [expansions, setExpansions] = useState(seed.expansions || []);
  const [expansionStates, setExpansionStates] = useState<
    Record<string, string>
  >({});
  const [captureName, setCaptureName] = useState("");
  const [profile, setProfile] = useState("");
  const [capture, setCapture] = useState<Item | null>(null);
  const [routeOptions, setRouteOptions] = useState<Item[]>([]);
  const [route, setRoute] = useState("warm_intro");
  const [draft, setDraft] = useState<Item | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<Item[]>([]);
  const [body, setBody] = useState("");
  const [reviewedBody, setReviewedBody] = useState("");
  const [cards, setCards] = useState<Item[]>(seed.pipeline?.cards || []);
  const [audit, setAudit] = useState<Item[]>([]);
  const [evidence, setEvidence] = useState<Item | null>(null);
  const [settings, setSettings] = useState(false);
  const [connectionPopup, setConnectionPopup] = useState<Item | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Item | null>(null);
  const seenSuggestions = useRef(new Set<string>());
  const [integrations, setIntegrations] = useState<Item | null>(null);
  const [zoom, setZoom] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("simple");
  const simple = mode === "simple";
  const creative = mode === "creative";
  const focused = simple || creative;
  const navItems = simple
    ? simpleNavigation
    : creative
      ? creativeNavigation
      : navigation;
  const screenLabel =
    navItems.find((item) => item.screen === screen)?.label || screen;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [palette, setPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const current = leads.find((l) => l.target_id === target) || leads[0];
  const personName = (id: string) =>
    graph.nodes.find((n) => n.id === id)?.label || id;

  async function api(endpoint: string, data?: Item, method?: string) {
    const response = await fetch("/api" + endpoint, {
      method: method || (data ? "POST" : "GET"),
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        typeof result.detail === "string"
          ? result.detail
          : JSON.stringify(result.detail || "Request failed"),
      );
    return result;
  }
  async function action(name: string, task: () => Promise<void>) {
    setBusy(name);
    setNotice("");
    try {
      await task();
      const c = await api("/credits");
      setCredits(c.balance);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }
  async function syncPipeline() {
    const p = await api("/pipeline");
    setCards(p.cards || []);
    const a = await api("/audit");
    setAudit(a.events || a.audit || a || []);
    const q = await api("/drafts");
    setSavedDrafts(q.drafts || []);
  }
  useEffect(() => {
    let active = true;
    api("/health")
      .then(() => {
        if (active) {
          setConnected(true);
          setConnectionChecked(true);
        }
      })
      .catch(() => {
        if (active) setConnectionChecked(true);
      });
    api("/credits")
      .then((c) => {
        if (active) setCredits(c.balance);
      })
      .catch(() => {});
    api("/pipeline")
      .then((p) => {
        if (active) setCards(p.cards || []);
      })
      .catch(() => {});
    api("/graph")
      .then((g) => {
        if (active) setGraph(g);
      })
      .catch(() => {});
    api("/leads")
      .then((r) => {
        if (active) setLeads(r.leads);
      })
      .catch(() => {});
    api("/drafts")
      .then((r) => {
        if (active) setSavedDrafts(r.drafts || []);
      })
      .catch(() => {});
    api("/audit")
      .then((r) => {
        if (active) setAudit(r.events || []);
      })
      .catch(() => {});
    const scanCircle = () =>
      api("/circle")
        .then((r) => {
          const next = (r.suggestions || []).find(
            (s: Item) =>
              s.status !== "dismissed" && !seenSuggestions.current.has(s.id),
          );
          if (next && active) {
            seenSuggestions.current.add(next.id);
            setConnectionPopup(next);
          }
        })
        .catch(() => {});
    scanCircle();
    const circleTimer = setInterval(scanCircle, 15000);
    const stream = new EventSource("/api/agents/stream");
    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (active) setAgentEvents((prev) => [...prev.slice(-11), data]);
      } catch {}
    };
    return () => {
      active = false;
      stream.close();
      clearInterval(circleTimer);
    };
  }, []);
  useEffect(() => {
    let current = true;
    setPathsLoading(true);
    api("/paths/" + target)
      .then((result) => {
        if (current) setPaths(result.paths || []);
      })
      .catch(() => {
        if (current) setPaths([]);
      })
      .finally(() => {
        if (current) setPathsLoading(false);
      });
    api("/routes/" + target)
      .then((result) => {
        if (current) setRouteOptions(result.routes || []);
      })
      .catch(() => {});
    setDraft(null);
    setBody("");
    return () => {
      current = false;
    };
  }, [target]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => {
      setNarrow(media.matches);
      setSidebarOpen(
        media.matches
          ? false
          : localStorage.getItem("thermopb:sidebar") !== "closed",
      );
    };
    sync();
    media.addEventListener("change", sync);
    const savedMode = localStorage.getItem("thermopb:mode");
    if (savedMode === "advanced" || savedMode === "creative") {
      setMode(savedMode);
    }
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteQuery("");
        setPaletteIndex(0);
        setPalette((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === "Escape" && narrow) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function toggleSidebar(next?: boolean) {
    setSidebarOpen((open) => {
      const value = next ?? !open;
      if (!narrow)
        localStorage.setItem("thermopb:sidebar", value ? "open" : "closed");
      return value;
    });
  }
  function switchMode(next: Mode) {
    setMode(next);
    localStorage.setItem("thermopb:mode", next);
    const allowed =
      next === "simple"
        ? simpleNavigation
        : next === "creative"
          ? creativeNavigation
          : null;
    if (allowed && !allowed.some((i) => i.screen === screen))
      setScreen(allowed[1].screen);
  }
  function go(name: string) {
    setScreen(name);
    if (name === "Pipeline") syncPipeline().catch(() => {});
    if (narrow) setSidebarOpen(false);
  }
  function openDestination(name: string, targetId?: string) {
    if (targetId) selectTarget(targetId);
    if (
      ["Dashboard", "Pipeline", "Intake", "Discovery", "Event radar"].includes(
        name,
      )
    ) {
      setMode("advanced");
      localStorage.setItem("thermopb:mode", "advanced");
    } else if (name === "Outreach ideas") {
      setMode("creative");
      localStorage.setItem("thermopb:mode", "creative");
    } else if (
      ["Glass Brain", "My network"].includes(name) &&
      mode === "creative"
    ) {
      setMode("simple");
      localStorage.setItem("thermopb:mode", "simple");
    }
    if (name === "Dashboard") syncPipeline().catch(() => {});
    go(name);
  }
  function openSettings() {
    setSettings(true);
    api("/integrations")
      .then(setIntegrations)
      .catch(() => {});
  }
  const paletteItems = [
    ...navItems.map((item) => ({
      key: "screen:" + item.screen,
      icon: item.icon as LucideIcon | null,
      text: item.label,
      hint: "Page",
      run: () => go(item.screen),
    })),
    ...modes
      .filter((m) => m.id !== mode)
      .map((m) => ({
        key: "mode:" + m.id,
        icon: null,
        text: m.id === "creative" ? "Do creative outreach" : `${m.label} mode`,
        hint: "Mode",
        run: () => switchMode(m.id),
      })),
    ...leads.map((l) => ({
      key: "lead:" + l.target_id,
      icon: null,
      text: `${l.person}, ${l.company}`,
      hint: "Trace route",
      run: () => {
        selectTarget(l.target_id);
        go("Glass Brain");
      },
    })),
    {
      key: "toggle:sidebar",
      icon: null,
      text: sidebarOpen ? "Compact navigation dock" : "Expand navigation dock",
      hint: "Navigation",
      run: () => toggleSidebar(),
    },
    {
      key: "toggle:thinking",
      icon: null,
      text: thinking ? "Hide agent thinking" : "Show agent thinking",
      hint: "Panel",
      run: () => setThinking((v) => !v),
    },
  ].filter((item) =>
    item.text.toLowerCase().includes(paletteQuery.trim().toLowerCase()),
  );
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 7500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const filtered = leads.filter(
    (l) =>
      `${l.company} ${l.person} ${l.title}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (tier === "All tiers" || l.tier === tier),
  );
  const pathEdges = paths[0]?.hops || [];
  function selectTarget(id: string) {
    if (id !== target) {
      setPaths([]);
      setRouteOptions([]);
    }
    setTarget(id);
    setDraft(null);
  }
  function source(url: string) {
    const id = url?.split("/").pop();
    const item = seed.evidence.find((e) => e.id === id || e.url === url);
    setEvidence(
      item || {
        id,
        text: "This relationship is recorded in your network.",
        url,
      },
    );
  }
  const button = (
    text: string,
    onClick: () => void,
    primary = false,
    disabled = false,
  ) => (
    <button
      className={primary ? "button primary" : "button"}
      onClick={onClick}
      disabled={disabled || !!busy}
    >
      {busy === text ? <LoaderCircle size={15} className="spin" /> : null}
      {text}
    </button>
  );

  return (
    <div
      className={
        "workspace bottom-dock " +
        (sidebarOpen ? "nav-open" : "nav-closed") +
        (narrow ? " is-narrow" : "") +
        (screen === "Chat" ? " is-chat" : "")
      }
    >
      <aside className="side" aria-label="Navigation dock">
        <div className="side-head">
          <button
            className="side-workspace"
            title="Workspace settings"
            onClick={openSettings}
          >
            <span className="side-avatar" aria-hidden="true">
              <BrandMark size={30} />
            </span>
            <span className="rail-hide side-text">Tracekit</span>
            <ChevronDown size={13} className="rail-hide side-caret" />
          </button>
          <button
            className="side-toggle"
            aria-label={
              sidebarOpen ? "Compact navigation dock" : "Expand navigation dock"
            }
            aria-expanded={sidebarOpen}
            title={
              (sidebarOpen ? "Collapse" : "Expand") + " navigation dock  ⌘\\"
            }
            onClick={() => toggleSidebar()}
          >
            {sidebarOpen ? (
              <PanelBottomClose size={16} />
            ) : (
              <PanelBottomOpen size={16} />
            )}
          </button>
        </div>
        <button
          className="side-item"
          title="Search  ⌘K"
          onClick={() => {
            setPaletteQuery("");
            setPaletteIndex(0);
            setPalette(true);
          }}
        >
          <Search size={16} className="side-icon" aria-hidden="true" />
          <span className="rail-hide side-text">Search</span>
          <kbd className="rail-hide">⌘K</kbd>
        </button>
        <button className="side-item" title="Settings" onClick={openSettings}>
          <Settings size={16} className="side-icon" aria-hidden="true" />
          <span className="rail-hide side-text">Settings</span>
        </button>
        <p className="side-label rail-hide">
          {simple ? "Simple" : creative ? "Creative outreach" : "Workspace"}
        </p>
        <nav aria-label="Workspace" className="side-nav">
          {navItems.map(({ screen: name, label: text, icon: Icon }) => (
            <button
              key={name}
              aria-label={text}
              title={text}
              aria-current={screen === name ? "page" : undefined}
              className={screen === name ? "side-item selected" : "side-item"}
              onClick={() => go(name)}
            >
              <Icon size={16} className="side-icon" aria-hidden="true" />
              <span className="rail-hide side-text">{text}</span>
              {name === "Routes & queue" &&
                savedDrafts.filter((d) => d.status === "draft").length > 0 && (
                  <span className="side-count">
                    {savedDrafts.filter((d) => d.status === "draft").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button
            className="side-item"
            title="Help"
            onClick={() =>
              setEvidence({
                id: "How thermopb works",
                text: simple
                  ? "Network brain shows who can introduce you to the person you want to meet, one hop at a time. Share your TM tag with people you meet. When they accept, their connections join your network brain. Switch to advanced mode for discovery, events, outreach and your pipeline."
                  : "Start with Intake, discover your ideal customers, then inspect every hop in Glass Brain. Capture contacts to find stronger paths. Compare routes, review evidence, and approve a draft before anything is queued.",
              })
            }
          >
            <CircleHelp size={16} className="side-icon" aria-hidden="true" />
            <span className="rail-hide side-text">Help</span>
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <nav className="view-switch" aria-label="Workspace view">
            <button
              aria-current={screen === "Chat" ? "page" : undefined}
              className={screen === "Chat" ? "active" : ""}
              onClick={() => go("Chat")}
            >
              Chat
            </button>
            <button
              aria-current={screen !== "Chat" ? "page" : undefined}
              className={screen !== "Chat" ? "active" : ""}
              onClick={() => openDestination("Dashboard")}
            >
              Dashboard
            </button>
          </nav>
          <div className="breadcrumb">
            <span className="crumb-root">
              Workspace <ChevronRight size={13} />
            </span>
            <strong>{screenLabel}</strong>
          </div>
          <div className="topbar-right">
            {!focused && screen !== "Chat" && (
              <button className="credits" onClick={openSettings}>
                <b>{credits}</b> credits
              </button>
            )}
            {!focused && screen !== "Chat" && screen !== "Dashboard" && (
              <button
                aria-label="Toggle agent thinking"
                className={
                  thinking ? "icon-button thinking-active" : "icon-button"
                }
                onClick={() => setThinking(!thinking)}
              >
                Agent log
              </button>
            )}
          </div>
        </header>
        <div className="chat-home" hidden={screen !== "Chat"}>
          <ChatWorkspace
            seed={seed}
            graph={graph}
            leads={leads}
            events={events}
            cards={cards}
            active={screen === "Chat"}
            onNavigate={openDestination}
            onSource={source}
          />
        </div>
        {screen !== "Chat" && (
          <main key={screen} className="screen-view" aria-label={screenLabel}>
            {screen !== "Dashboard" && (
              <div className="mode-board" role="group" aria-label="Mode">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    aria-label={m.label}
                    aria-pressed={mode === m.id}
                    className={
                      `mode-tile mode-${m.id}` +
                      (mode === m.id ? " active" : "")
                    }
                    onClick={() => switchMode(m.id)}
                  >
                    <strong>{m.label}</strong>
                    <span>{m.note}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="page-heading">
              <div>
                <h1>
                  {screen === "Dashboard"
                    ? "Your network, at a glance."
                    : creative && screen === "Outreach ideas"
                      ? "Do creative outreach."
                      : simple && screen === "Glass Brain"
                        ? "Your network brain."
                        : simple && screen === "My network"
                          ? "Your TM tag."
                          : screen === "Glass Brain"
                            ? "Good things happen through people."
                            : screen === "Intake"
                              ? "Tell us what you’re building."
                              : screen === "Discovery"
                                ? "The right people. A real reason."
                                : screen === "My network"
                                  ? "Small world. Bigger possibilities."
                                  : screen === "Event radar"
                                    ? "Be in the right room."
                                    : screen === "Routes & queue"
                                      ? "A thoughtful way in."
                                      : screen === "Outreach ideas"
                                        ? "Good ideas travel."
                                        : "From a hello to a meeting."}
                </h1>
                <p>
                  {screen === "Dashboard"
                    ? "Find the person who can make your next introduction happen."
                    : creative && screen === "Outreach ideas"
                      ? "Pick an approach that worked for other founders, then make it yours in the draft studio."
                      : simple && screen === "Glass Brain"
                        ? "See who can introduce you to the person you want to meet."
                        : simple && screen === "My network"
                          ? "Share your tag. When someone accepts, their connections join your network brain."
                          : screen === "Glass Brain"
                            ? "Find the shortest trusted path to the people who matter."
                            : screen === "Intake"
                              ? "A little context helps us find your people."
                              : screen === "Discovery"
                                ? "Every match has a signal. Every signal has a source."
                                : screen === "My network"
                                  ? "Bring your connections together. See which doors they open."
                                  : screen === "Event radar"
                                    ? "Discover where your targets and warm connections will be."
                                    : screen === "Routes & queue"
                                      ? "Compare your routes, check the evidence, and make the call."
                                      : screen === "Outreach ideas"
                                        ? "Discover the creative outreach approaches people say are working."
                                        : "Keep every conversation moving, one meaningful step at a time."}
                </p>
              </div>
              {!focused && screen !== "Chat" && (
                <button
                  className="button"
                  onClick={() => {
                    setScreen("My network");
                    setCaptureName("");
                  }}
                >
                  <Plus size={15} /> Add a connection
                </button>
              )}
            </div>

            {screen === "Dashboard" && (
              <NetworkDashboard
                graph={graph}
                leads={leads}
                cards={cards}
                events={events}
                onNavigate={openDestination}
              />
            )}
            {screen === "Glass Brain" && (
              <>
                {!simple && (
                  <div className="metric-strip">
                    <div>
                      <span>People in your orbit</span>
                      <strong>
                        {
                          graph.nodes.filter((n) =>
                            ["Person", "Investor"].includes(n.type),
                          ).length
                        }
                        <small>and counting</small>
                      </strong>
                    </div>
                    <div>
                      <span>Matched targets</span>
                      <strong>
                        {leads.length}
                        <small>across your ICP</small>
                      </strong>
                    </div>
                    <div>
                      <span>Paths to explore</span>
                      <strong>
                        {
                          graph.edges.filter((e) => e.relation !== "WORKS_AT")
                            .length
                        }
                        <small>with evidence attached</small>
                      </strong>
                    </div>
                    <div>
                      <span>Your next best move</span>
                      <strong className="metric-action">
                        Ask for an introduction
                      </strong>
                    </div>
                  </div>
                )}
                <div className="graph-toolbar">
                  <div className="tab-line">
                    <button className="tab active">Relationship map</button>
                    {!simple && (
                      <button
                        className="tab"
                        onClick={() => setScreen("My network")}
                      >
                        Your connections{" "}
                        <span>
                          {
                            graph.nodes.filter((n) => n.role_tag === "contact")
                              .length
                          }
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="graph-target-picker">
                    <Target size={14} />
                    <select
                      aria-label="Graph target"
                      value={target}
                      onChange={(e) => selectTarget(e.target.value)}
                    >
                      {leads.map((l) => (
                        <option key={l.id} value={l.target_id}>
                          {l.person}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="graph-workbench">
                  <GraphCanvas
                    key={
                      "graph:" +
                      target +
                      pathEdges
                        .map((hop: Item) => `${hop.from}:${hop.to}`)
                        .join("|")
                    }
                    graph={graph}
                    target={target}
                    pathEdges={pathEdges}
                    leads={leads}
                    zoom={zoom}
                    onZoom={setZoom}
                    onSelect={selectTarget}
                    onSource={source}
                  />
                  <aside className="path-panel" key={`path:${target}`}>
                    <div className="section-kicker">Best route to</div>
                    <div className="target-identity">
                      <div className="large-avatar">
                        {initials(current.person)}
                      </div>
                      <h2>{current.person}</h2>
                      <p>{current.title}</p>
                      <span>{current.company}</span>
                    </div>
                    <div className="path-summary">
                      <span>Best available path</span>
                      <b>
                        {pathsLoading
                          ? "Tracing…"
                          : pathEdges.length
                            ? `${pathEdges.length} hops away`
                            : "No route yet"}
                      </b>
                    </div>
                    <div className="hop-list">
                      {pathEdges.length ? (
                        pathEdges.map((h: Item, i: number) => (
                          <div
                            className="hop"
                            key={`${h.from}:${h.to}`}
                            style={{ animationDelay: `${i * 150}ms` }}
                          >
                            <div
                              className={
                                "hop-number " +
                                (h.confidence === "INFERRED" ? "inferred" : "")
                              }
                            >
                              {i + 1}
                            </div>
                            <div>
                              <strong>
                                {personName(h.from)} <ArrowRight size={11} />{" "}
                                {personName(h.to)}
                              </strong>
                              <p>{human(h.relation)}</p>
                              <button onClick={() => source(h.source_url)}>
                                <FileText size={10} />
                                {h.confidence === "INFERRED"
                                  ? "Inferred, view evidence"
                                  : "Sourced, view evidence"}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-small">
                          {pathsLoading
                            ? "Finding the people between you and your next meeting…"
                            : connected
                              ? "No trusted path yet. Add a connection to open a door."
                              : "Start the API to calculate trusted paths."}
                        </div>
                      )}
                    </div>
                    <div className="path-footnote">
                      <ShieldCheck size={14} />
                      <span>
                        Every hop has a source.
                        <br />
                        Inferences are always labeled.
                      </span>
                    </div>
                    <button
                      className="button primary full"
                      onClick={() =>
                        simple
                          ? switchMode("advanced")
                          : setScreen("Routes & queue")
                      }
                    >
                      {simple ? "Plan the introduction" : "Explore routes"}
                    </button>
                  </aside>
                </div>
                {!simple && (
                  <div className="insight-strip">
                    <p>
                      <strong>
                        One new connection can change your whole map.
                      </strong>
                      <br />
                      <span>
                        Met someone interesting? Capture them and see which
                        targets become closer.
                      </span>
                    </p>
                    <button onClick={() => setScreen("My network")}>
                      Grow your network
                    </button>
                  </div>
                )}
              </>
            )}

            {screen === "Intake" && (
              <div className="two-column">
                <section className="card padded">
                  <div className="section-kicker">Step 1 of 2</div>
                  <h2>The one-paragraph pitch.</h2>
                  <label htmlFor="pitch">
                    What does it do, and who is it for?
                  </label>
                  <textarea
                    id="pitch"
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    rows={7}
                  />
                  <p className="field-note">
                    Be specific. Include a customer, problem, or buying trigger.
                  </p>
                  {button(
                    "Build my ICP",
                    () =>
                      action("Build my ICP", async () => {
                        const r = await api("/intake", { product_text: pitch });
                        setIcp({ ...r.icp, id: r.icp_id });
                        setExpansions(r.expansions || []);
                      }),
                    true,
                    pitch.trim().length < 20,
                  )}
                </section>
                <section className="card padded">
                  <div className="section-kicker">Step 2 of 2</div>
                  <h2>A clearer picture.</h2>
                  {!icp ? (
                    <div className="empty-state">
                      <Target size={32} />
                      <p>Your customer profile will appear here.</p>
                      <span>
                        Start with your product, and we’ll connect the dots.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="icp-fields">
                        {Object.entries(icp)
                          .filter(
                            ([k, v]) =>
                              Array.isArray(v) &&
                              [
                                "industries",
                                "sizes",
                                "titles",
                                "triggers",
                              ].includes(k),
                          )
                          .map(([key, values]) => (
                            <div key={key}>
                              <h3>{key}</h3>
                              {(values as Item[]).map((item, i) => (
                                <div className="confidence-row" key={i}>
                                  <div>
                                    <span>{label(item)}</span>
                                    <b>{Math.round(item.confidence * 100)}%</b>
                                  </div>
                                  <div className="confidence-track">
                                    <i
                                      style={{
                                        width: `${item.confidence * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <small>{item.why}</small>
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                      <h3>Worth exploring</h3>
                      {expansions.map((ex, i) => (
                        <div className="expansion" key={i}>
                          <strong>{label(ex) || ex.segment || ex.name}</strong>
                          <p>{ex.why || ex.rationale}</p>
                          <div>
                            {["Accept", "Adjust", "Dismiss"].map((a) => (
                              <button
                                key={a}
                                disabled={!!expansionStates[i]}
                                onClick={() => {
                                  if (a === "Adjust") {
                                    setPitch(
                                      (p) =>
                                        p +
                                        " Also consider " +
                                        (label(ex) || ex.segment || ex.name) +
                                        ".",
                                    );
                                    setExpansionStates((s) => ({
                                      ...s,
                                      [i]: "Added to pitch. Rebuild the ICP.",
                                    }));
                                  } else
                                    setExpansionStates((s) => ({
                                      ...s,
                                      [i]:
                                        a === "Accept"
                                          ? "Accepted"
                                          : "Dismissed",
                                    }));
                                }}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                          {expansionStates[i] && (
                            <small>{expansionStates[i]}</small>
                          )}
                        </div>
                      ))}
                      {button("Discover my people", () => {
                        setScreen("Discovery");
                      })}
                    </>
                  )}
                </section>
              </div>
            )}

            {screen === "Discovery" && (
              <>
                <div className="table-toolbar">
                  <div className="search-input">
                    <Search size={15} />
                    <input
                      aria-label="Search leads"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search people or companies…"
                    />
                  </div>
                  <select
                    aria-label="Filter by tier"
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                  >
                    {["All tiers", "A", "B", "C"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {button(
                    "Find leads",
                    () =>
                      action("Find leads", async () => {
                        const r = await api("/discover", {
                          icp_id: icp?.id || "icp-tracekit",
                        });
                        setLeads(r.leads);
                        setNotice(
                          `${r.leads.length} sourced matches ready to explore.`,
                        );
                      }),
                    true,
                    credits <= 0,
                  )}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Company and person</th>
                        <th>Role</th>
                        <th>Fit</th>
                        <th>Why now</th>
                        <th>Source</th>
                        <th>Email</th>
                        <th>Best route</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((l) => (
                        <tr
                          key={l.id}
                          onClick={() => {
                            selectTarget(l.target_id);
                            setScreen("Glass Brain");
                          }}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              selectTarget(l.target_id);
                              setScreen("Glass Brain");
                            }
                          }}
                        >
                          <td>
                            <div className="company-cell">
                              <span className="company-monogram">
                                {initials(l.company)}
                              </span>
                              <span>
                                <strong>{l.company}</strong>
                                <small>{l.person}</small>
                              </span>
                            </div>
                          </td>
                          <td>{l.title}</td>
                          <td>
                            <b className="mono">{l.fit}</b>{" "}
                            <span className="tier">{l.tier}</span>
                          </td>
                          <td className="signal-cell">
                            {typeof l.signal === "string"
                              ? l.signal
                              : l.signal?.text}
                          </td>
                          <td>
                            <button
                              className="source-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                source(l.source_url);
                              }}
                            >
                              Source
                            </button>
                          </td>
                          <td>
                            <span className="email-status">
                              {l.email_status || "Unverified"}
                            </span>
                          </td>
                          <td>
                            <span className="route-badge">
                              {human(l.best_route)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div className="empty-state">
                      No matches. Try a different name or tier.
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  {filtered.length} matches. Every signal links to its source.
                  <span>Built for thoughtful outreach.</span>
                </div>
              </>
            )}

            {screen === "My network" && (
              <>
                <CirclePanel
                  onSource={source}
                  onNotice={setNotice}
                  onIntro={(id) => {
                    selectTarget(id);
                    setRoute("warm_intro");
                    setScreen("Routes & queue");
                  }}
                  onSuggestion={(s) => {
                    seenSuggestions.current.add(s.id);
                    setConnectionPopup(s);
                  }}
                  onRefresh={async () => {
                    setGraph(await api("/graph"));
                    const p = await api("/paths/" + target);
                    setPaths(p.paths || []);
                    const r = await api("/routes/" + target);
                    setRouteOptions(r.routes || []);
                  }}
                />
                {!simple && (
                  <>
                    <div className="section-header">
                      <h2>Grow your personal graph</h2>
                      <span>Manual contacts & imports</span>
                    </div>
                    <div className="two-column">
                      <section className="card padded">
                        <h2>Who did you just meet?</h2>
                        <label htmlFor="contact-name">Their name</label>
                        <input
                          id="contact-name"
                          value={captureName}
                          onChange={(e) => setCaptureName(e.target.value)}
                          placeholder="e.g. Priya Nair"
                        />
                        <label htmlFor="profile-url">
                          Public profile URL{" "}
                          <span className="muted">(optional)</span>
                        </label>
                        <input
                          id="profile-url"
                          value={profile}
                          onChange={(e) => setProfile(e.target.value)}
                          placeholder="https://…"
                        />
                        <div className="button-row">
                          {button(
                            "Capture connection",
                            () =>
                              action("Capture connection", async () => {
                                const r = await api("/network/capture", {
                                  name: captureName,
                                  profile_url: profile || undefined,
                                  note: "Met in person; manually captured by founder.",
                                });
                                setCapture(r);
                                const g = await api("/graph");
                                setGraph(g);
                                setNotice(
                                  "Connection captured. Your map has been recalculated.",
                                );
                                const p = await api("/paths/" + target);
                                setPaths(p.paths || []);
                              }),
                            true,
                            !captureName.trim(),
                          )}
                          <button
                            className="text-button"
                            onClick={() => {
                              setCaptureName("Priya Nair");
                              setProfile("https://example.com/in/priya-nair");
                            }}
                          >
                            Use Priya Nair
                          </button>
                        </div>
                        <div className="quiet-box">
                          <FileText size={19} />
                          <span>
                            Already have a network? Import your own LinkedIn
                            Connections.csv export.
                          </span>
                          <button
                            className="text-button"
                            onClick={() => importRef.current?.click()}
                          >
                            Import CSV
                          </button>
                          <input
                            ref={importRef}
                            type="file"
                            accept=".csv"
                            className="visually-hidden"
                            aria-label="Import Connections CSV"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              action("Import CSV", async () => {
                                const form = new FormData();
                                form.append("file", file);
                                const res = await fetch("/api/network/import", {
                                  method: "POST",
                                  body: form,
                                });
                                const r = await res.json();
                                if (!res.ok) throw Error(r.detail);
                                setNotice(`${r.added} connections imported.`);
                                setGraph(await api("/graph"));
                              });
                            }}
                          />
                        </div>
                      </section>
                      <section className="card padded unlock-card">
                        {capture ? (
                          <>
                            <div className="unlock-number">
                              {capture.unlock_score}
                            </div>
                            <h2>Unlock score</h2>
                            <p>
                              {capture.unlocks?.length || 0} targets have a new
                              or stronger path.
                            </p>
                            <div className="unlock-list">
                              {capture.unlocks?.map((u: Item) => (
                                <button
                                  key={u.target_id}
                                  onClick={() => {
                                    selectTarget(u.target_id);
                                    setScreen("Glass Brain");
                                  }}
                                >
                                  <span>{personName(u.target_id)}</span>
                                  <span>
                                    {Math.round(u.path_score * 100)}% path
                                    score{" "}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <small>
                              Calculated from sourced paths. A new name alone
                              never creates a relationship to a target.
                            </small>
                            <div className="quiet-box">
                              {capture.suggested_ask}
                            </div>
                          </>
                        ) : (
                          <div className="empty-state">
                            <Waypoints size={38} />
                            <h2>One hello. New possibilities.</h2>
                            <span>
                              Capture a contact to calculate their unlock score.
                            </span>
                          </div>
                        )}
                      </section>
                    </div>
                    <div className="section-header">
                      <h2>Your people</h2>
                      <span>
                        {
                          graph.nodes.filter(
                            (n) =>
                              n.role_tag === "contact" ||
                              n.role_tag === "connector",
                          ).length
                        }{" "}
                        connections
                      </span>
                    </div>
                    <div className="contact-grid">
                      {graph.nodes
                        .filter(
                          (n) =>
                            n.role_tag === "contact" ||
                            n.role_tag === "connector",
                        )
                        .map((n) => (
                          <div className="card contact-card" key={n.id}>
                            <span className="avatar">{initials(n.label)}</span>
                            <div>
                              <strong>{n.label}</strong>
                              <small>
                                {n.title || "Your connection"}, {n.company}
                              </small>
                            </div>
                            <button
                              aria-label={`View ${n.label} evidence`}
                              className="icon-button"
                              onClick={() =>
                                source(
                                  graph.edges.find(
                                    (e) =>
                                      e.source === n.id || e.target === n.id,
                                  )?.source_url,
                                )
                              }
                            ></button>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}

            {screen === "Event radar" && (
              <>
                <div className="radar-controls">
                  <div>
                    <span className="live-dot dark" /> San Francisco{" "}
                    <span className="muted"> / Next 21 days</span>
                  </div>
                  {button(
                    "Scan for rooms",
                    () =>
                      action("Scan for rooms", async () => {
                        const r = await api("/radar/scan", {
                          city: "San Francisco",
                          days: 21,
                        });
                        setEvents(r.events);
                        setNotice("Radar updated with upcoming events.");
                      }),
                    true,
                  )}
                </div>
                <div className="events-list">
                  {events.map((ev, i) => (
                    <article className="card event-card" key={ev.id}>
                      <div className="event-date">
                        <span>
                          {new Date(ev.start).toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <b>{new Date(ev.start).getDate()}</b>
                      </div>
                      <div className="event-content">
                        <div className="section-kicker">
                          {i === 0
                            ? "Best match for your targets"
                            : "Also worth attending"}
                        </div>
                        <h2>{ev.name}</h2>
                        <p>
                          {ev.city},{" "}
                          {new Date(ev.start).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "America/Los_Angeles",
                          })}{" "}
                          Pacific
                        </p>
                        <div className="attendee-row">
                          {(ev.targets_present || []).map((id: string) => (
                            <span className="attendee" key={id}>
                              <span className="mini-avatar">
                                {initials(personName(id))}
                              </span>
                              {personName(id)}
                            </span>
                          ))}
                        </div>
                        <p className="field-note">
                          {ev.connectors_present?.length || 0} warm connections
                          in the room.{" "}
                          {ev.city === "San Francisco"
                            ? "Local, no flight needed"
                            : "Travel required"}
                        </p>
                        <div className="button-row">
                          <a
                            className="button"
                            href={`/api/radar/${ev.id}/calendar`}
                          >
                            <CalendarDays size={14} /> Add to calendar
                          </a>
                          <button
                            className="button"
                            onClick={() => {
                              selectTarget(ev.targets_present?.[0] || target);
                              setScreen("Routes & queue");
                            }}
                          >
                            Get an intro
                          </button>
                          <a
                            className="text-button"
                            href={`https://www.google.com/travel/flights?q=${encodeURIComponent("Flights to " + ev.city + " on " + ev.start.slice(0, 10))}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Plan trip <ArrowUpRight size={12} />
                          </a>
                          <button
                            className="text-button"
                            onClick={() =>
                              setEvents(events.filter((e) => e.id !== ev.id))
                            }
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                      <div className="event-score">
                        <b>{ev.score}</b>
                        <span>room score</span>
                        <button
                          className="icon-button"
                          aria-label={`Preview alert for ${ev.name}`}
                          onClick={() =>
                            action("Preview alert", async () => {
                              const r = await api("/radar/alert/" + ev.id, {});
                              setNotice(
                                r.sent
                                  ? "Telegram alert sent."
                                  : "Alert preview ready.",
                              );
                            })
                          }
                        >
                          <Bell size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {screen === "Outreach ideas" && (
              <OutreachRadar
                onSource={(idea) =>
                  setEvidence({ id: idea.id, text: idea.evidence_text })
                }
                onNotice={setNotice}
                onApply={(idea) => {
                  setSelectedTechnique(idea);
                  setScreen("Routes & queue");
                  setNotice(
                    "Approach added to your planning context. Your factual claims still need evidence.",
                  );
                }}
              />
            )}
            {screen === "Routes & queue" && (
              <>
                {selectedTechnique && (
                  <div className="selected-technique card">
                    <Lightbulb size={18} />
                    <div>
                      <strong>
                        Approach to try:{" "}
                        {selectedTechnique.technique || selectedTechnique.title}
                      </strong>
                      <p>
                        {selectedTechnique.application ||
                          selectedTechnique.summary}
                      </p>
                      <small>
                        Planning guidance only. Apply it in the editor and
                        review all factual claims.
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Clear selected approach"
                      onClick={() => setSelectedTechnique(null)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                <div className="route-top">
                  <div className="target-select">
                    <span className="avatar">{initials(current.person)}</span>
                    <select
                      aria-label="Route target"
                      value={target}
                      onChange={(e) => selectTarget(e.target.value)}
                    >
                      {leads.map((l) => (
                        <option key={l.id} value={l.target_id}>
                          {l.person}, {l.company}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="field-note">
                    <ShieldCheck size={14} /> You make the final call.
                  </span>
                </div>
                <div className="route-layout">
                  <section>
                    <div className="section-kicker">
                      Ways in, ranked by reply estimate
                    </div>
                    {routeOptions.length ? (
                      routeOptions.map((r, i) => (
                        <button
                          key={r.kind}
                          className={
                            "card route-option " +
                            (route === r.kind ? "chosen" : "")
                          }
                          onClick={() => {
                            setRoute(r.kind);
                            setDraft(null);
                          }}
                          disabled={
                            r.available === false ||
                            (r.kind.includes("cake") && credits < 150)
                          }
                        >
                          <div className="route-rank">{i + 1}</div>
                          <div>
                            <strong>{human(r.kind)}</strong>
                            <p>{r.rationale}</p>
                            <span>
                              {typeof r.cost === "number"
                                ? `$${r.cost}`
                                : r.cost}
                              {", "}
                              {r.kind.includes("cake") && credits < 150
                                ? "Locked, needs 150 credits"
                                : r.available === false
                                  ? "Not available yet"
                                  : "Estimate"}
                            </span>
                          </div>
                          <div className="route-odds">
                            <b>{Math.round((r.est_reply || 0) * 100)}%</b>
                            <small>reply estimate</small>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="card padded empty-state">
                        Start the API to compare evidence-based routes.
                      </div>
                    )}
                    <p className="field-note">Reply odds are estimates.</p>
                    <div className="saved-queue">
                      <h3>Saved approval queue</h3>
                      {savedDrafts
                        .filter((d) => d.target_id === target)
                        .slice(-5)
                        .reverse()
                        .map((d) => (
                          <button
                            key={d.draft_id}
                            onClick={() => {
                              setDraft(d);
                              setBody(d.body);
                              setReviewedBody(d.body);
                              setRoute(d.route);
                            }}
                          >
                            <span>{human(d.route)}</span>
                            <span>
                              {d.status === "queued"
                                ? "Approved, queued"
                                : d.status}
                            </span>
                            <ChevronRight size={12} />
                          </button>
                        ))}
                      {!savedDrafts.some((d) => d.target_id === target) && (
                        <p className="field-note">
                          Drafts for this target will appear here.
                        </p>
                      )}
                    </div>
                  </section>
                  <section className="card padded draft-studio">
                    <h2>Make it personal.</h2>
                    {!draft ? (
                      <>
                        <div className="empty-state">
                          <FileText size={34} />
                          <p>A little context goes a long way.</p>
                          <span>
                            Generate a short, forwardable request based on
                            sourced evidence.
                          </span>
                        </div>
                        {button(
                          "Prepare a draft",
                          () =>
                            action("Prepare a draft", async () => {
                              const r = await api("/drafts", {
                                target_id: target,
                                route,
                              });
                              setDraft(r);
                              setBody(r.body);
                              setReviewedBody(r.body);
                              setSavedDrafts((prev) => [...prev, r]);
                            }),
                          true,
                        )}
                      </>
                    ) : (
                      <>
                        <label htmlFor="draft-body">
                          {draft.subject
                            ? `Subject: ${draft.subject}`
                            : "Your message"}
                        </label>
                        <textarea
                          id="draft-body"
                          rows={8}
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                        />
                        <div className="draft-meta">
                          <span>
                            {body.trim().split(/\s+/).filter(Boolean).length} /
                            60 words
                          </span>
                          <span>
                            Sameness {Math.round((draft.sameness || 0) * 100)}%
                          </span>
                        </div>
                        <div className="review-results">
                          {(draft.sentences || []).map((s: Item, i: number) => (
                            <div
                              className={
                                s.ok ? "review-line" : "review-line flagged"
                              }
                              key={i}
                            >
                              {s.ok ? <Check size={13} /> : <X size={13} />}
                              <span>
                                {s.ok ? "Evidence checked" : "Needs a source"}:{" "}
                                {s.text}
                              </span>
                              {s.evidence_id && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    source("/evidence/" + s.evidence_id)
                                  }
                                >
                                  Source
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {body !== reviewedBody && (
                          <p className="review-warning">
                            Your edits need a fresh evidence review before
                            approval.
                          </p>
                        )}
                        <div className="button-row">
                          {button("Review draft", () =>
                            action("Review draft", async () => {
                              const r = await api(
                                `/drafts/${draft.draft_id || draft.id}/review`,
                                { edited_body: body },
                              );
                              setDraft({ ...draft, ...r });
                              setReviewedBody(body);
                              setNotice("Evidence review complete.");
                            }),
                          )}
                          {button(
                            draft.status === "queued"
                              ? "Queued"
                              : draft.status === "rejected"
                                ? "Rejected"
                                : "Approve request",
                            () =>
                              action("Approve request", async () => {
                                const r = await api(
                                  `/drafts/${draft.draft_id || draft.id}/approve`,
                                  { edited_body: body },
                                );
                                setDraft({ ...draft, ...r });
                                setNotice(
                                  "Approved. The draft is in your outreach queue.",
                                );
                                await syncPipeline();
                              }),
                            true,
                            body !== reviewedBody ||
                              !draft.can_approve ||
                              draft.sentences?.some((s: Item) => !s.ok) ||
                              draft.status !== "draft",
                          )}
                          <button
                            className="text-button"
                            onClick={() =>
                              action("Reject", async () => {
                                await api(
                                  `/drafts/${draft.draft_id || draft.id}/reject`,
                                  {},
                                );
                                setDraft(null);
                                setNotice("Draft rejected.");
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                        <p className="field-note">
                          Approved requests wait in your queue until you send
                          them.
                        </p>
                      </>
                    )}
                  </section>
                </div>
              </>
            )}

            {screen === "Pipeline" && (
              <>
                <div className="pipeline-summary">
                  <div>
                    <span>In your pipeline</span>
                    <b>{cards.length}</b>
                  </div>
                  <div>
                    <span>Conversations started</span>
                    <b>{cards.filter((c) => c.stage !== "Matched").length}</b>
                  </div>
                  <div>
                    <span>Meetings booked</span>
                    <b>
                      {cards.filter((c) => c.stage === "Meeting Booked").length}
                    </b>
                  </div>
                  <div>
                    <span>A little momentum</span>
                    <p>One good conversation at a time.</p>
                  </div>
                </div>
                <div className="kanban">
                  {stages.map((stage) => (
                    <section key={stage}>
                      <div className="kanban-header">
                        {stage}
                        <span>
                          {cards.filter((c) => c.stage === stage).length}
                        </span>
                      </div>
                      {cards
                        .filter((c) => c.stage === stage)
                        .map((c, i) => {
                          const l =
                            leads.find(
                              (l) => l.target_id === (c.target_id || c.id),
                            ) || c;
                          return (
                            <div className="card pipeline-card" key={c.id || i}>
                              <span className="company-monogram">
                                {initials(l.company || "Target")}
                              </span>
                              <h3>{l.company || c.company}</h3>
                              <p>
                                {l.person ||
                                  c.person ||
                                  personName(c.target_id)}
                              </p>
                              <div>
                                <span className="source-chip">
                                  {human(
                                    c.route || c.best_route || "warm_intro",
                                  )}
                                </span>
                                <span className="attribution">
                                  {c.actor || c.attribution || "agent"}
                                </span>
                              </div>
                              <label
                                className="visually-hidden"
                                htmlFor={`stage-${c.id || i}`}
                              >
                                Move {l.company} stage
                              </label>
                              <select
                                id={`stage-${c.id || i}`}
                                value={c.stage}
                                onChange={(e) =>
                                  action("Move stage", async () => {
                                    await api(
                                      `/pipeline/${c.target_id || c.id}`,
                                      { stage: e.target.value },
                                      "PATCH",
                                    );
                                    await syncPipeline();
                                  })
                                }
                              >
                                {stages.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                    </section>
                  ))}
                </div>
                <div className="two-column pipeline-bottom">
                  <section className="card padded">
                    <h2>Meetings by route</h2>
                    {[
                      "warm_intro",
                      "event_meet",
                      "cold_email",
                      "cold_caked",
                    ].map((r) => {
                      const total = cards.filter(
                        (c) =>
                          ((c.route || c.best_route) === "short_cold_email"
                            ? "cold_email"
                            : c.route || c.best_route) === r,
                      );
                      const booked = total.filter(
                        (c) => c.stage === "Meeting Booked",
                      ).length;
                      return (
                        <div className="chart-row" key={r}>
                          <span>{human(r)}</span>
                          <div>
                            <i
                              style={{
                                width: `${total.length ? (booked / total.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <b>
                            {booked}/{total.length}
                          </b>
                        </div>
                      );
                    })}
                    <p className="field-note">
                      Meeting conversion by route. Small numbers are not
                      predictive.
                    </p>
                  </section>
                  <section className="card padded">
                    <h2>Activity log</h2>
                    {Array.isArray(audit) && audit.length ? (
                      audit
                        .slice(-5)
                        .reverse()
                        .map((a, i) => (
                          <div className="audit-row" key={i}>
                            <span className="mini-avatar">
                              {a.actor === "you" ? "AB" : "AI"}
                            </span>
                            <div>
                              <strong>{human(a.action || a.text)}</strong>
                              <small>
                                {a.actor}, {a.ts || a.timestamp || "just now"}
                              </small>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="muted">
                        Approvals and pipeline changes appear here with
                        attribution.
                      </p>
                    )}
                  </section>
                </div>
              </>
            )}
            <footer className="page-footer">
              <span>
                <span
                  className={"connection-dot " + (connected ? "connected" : "")}
                />
                {!connectionChecked
                  ? "Connecting…"
                  : connected
                    ? "Connected"
                    : "Offline"}
              </span>
              <span>Real relationships. Thoughtful routes.</span>
            </footer>
          </main>
        )}
        {thinking &&
          !focused &&
          screen !== "Chat" &&
          screen !== "Dashboard" && (
            <section className="thinking-bar">
              <div>
                <strong>Agent thinking</strong>
              </div>
              <p key={agentEvents.at(-1)?.ts || "ready"}>
                {agentEvents.at(-1)?.text ||
                  "Every good route starts with evidence. Your graph is ready to explore."}
              </p>
              <button
                className="icon-button"
                aria-label="Close agent thinking"
                onClick={() => setThinking(false)}
              >
                <X size={14} />
              </button>
            </section>
          )}
      </div>
      {connectionPopup && (
        <aside
          className="connection-popup"
          key={connectionPopup.id}
          role="status"
        >
          <div className="section-kicker">
            New route found
            <button
              className="icon-button"
              aria-label="Close connection suggestion"
              onClick={() => {
                api(
                  `/circle/suggestions/${connectionPopup.id}/dismiss`,
                  {},
                ).catch(() => {});
                setConnectionPopup(null);
              }}
            >
              <X size={13} />
            </button>
          </div>
          <h3>
            {connectionPopup.connector_name} knows {connectionPopup.target_name}
            .
          </h3>
          <p>
            A connection in your circle opens a new route. Ask for a double
            opt-in introduction.
          </p>
          <button
            className="button primary"
            onClick={() => {
              selectTarget(connectionPopup.target_id);
              setRoute("warm_intro");
              setScreen("Routes & queue");
              setConnectionPopup(null);
            }}
          >
            Ask for an introduction
          </button>
          <small>Shared relationship. The source is in your network.</small>
        </aside>
      )}
      {notice && (
        <div className="toast" key={notice} role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <Dialog.Root open={palette} onOpenChange={setPalette}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="palette" aria-describedby={undefined}>
            <Dialog.Title className="visually-hidden">
              Search or jump to
            </Dialog.Title>
            <div className="palette-input">
              <Search size={16} />
              <input
                autoFocus
                aria-label="Search pages, people, and actions"
                placeholder="Jump to a page, person, or action…"
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPaletteIndex((i) =>
                      Math.min(i + 1, paletteItems.length - 1),
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPaletteIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && paletteItems[paletteIndex]) {
                    e.preventDefault();
                    paletteItems[paletteIndex].run();
                    setPalette(false);
                  }
                }}
              />
              <kbd>esc</kbd>
            </div>
            <div className="palette-list" role="listbox">
              {paletteItems.length ? (
                paletteItems.slice(0, 40).map((item, i) => (
                  <button
                    key={item.key}
                    role="option"
                    aria-selected={i === paletteIndex}
                    className={
                      i === paletteIndex
                        ? "palette-item active"
                        : "palette-item"
                    }
                    onMouseEnter={() => setPaletteIndex(i)}
                    onClick={() => {
                      item.run();
                      setPalette(false);
                    }}
                  >
                    <span className="palette-icon" aria-hidden="true">
                      {item.icon ? <item.icon size={15} /> : null}
                    </span>
                    <span>{item.text}</span>
                    <small>{item.hint}</small>
                  </button>
                ))
              ) : (
                <p className="palette-empty">
                  No page, person, or action matches.
                </p>
              )}
            </div>
            <div className="palette-foot">
              <span>↑↓ to move</span>
              <span>↵ to open</span>
              <span>⌘K to toggle</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!evidence}
        onOpenChange={(v) => !v && setEvidence(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal">
            <Dialog.Title>Follow the evidence.</Dialog.Title>
            <Dialog.Description className="muted">
              Source record: {evidence?.id}
            </Dialog.Description>
            <div className="evidence-text">
              {evidence?.text || evidence?.content}
            </div>
            <Dialog.Close
              className="modal-close icon-button"
              aria-label="Close evidence"
            >
              <X size={18} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={settings} onOpenChange={setSettings}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal">
            <Dialog.Title>Your workspace connections.</Dialog.Title>
            <Dialog.Description className="muted">
              Credits, connected accounts, and workspace controls.
            </Dialog.Description>
            <div className="settings-credit">
              <CreditCard size={24} />
              <div>
                <b>{credits} credits</b>
                <p>Used for lookups, scans, and outreach</p>
              </div>
              {button("Add 100 credits", () =>
                action("Add 100 credits", async () => {
                  const r = await api("/credits/topup", { amount: 100 });
                  setCredits(r.balance);
                  setNotice("100 credits added.");
                }),
              )}
            </div>
            <div className="integration-list">
              {[
                "LinkedIn",
                "Luma",
                "X",
                "Google Calendar",
                "Email",
                "Telegram",
              ].map((n) => (
                <div key={n}>
                  <span>{n}</span>
                  <span className="source-chip">Not connected</span>
                </div>
              ))}
            </div>
            <div className="demo-replay">
              <h3>Start over</h3>
              <p>
                Return the workspace to its starting state. You can undo this
                once.
              </p>
              <div className="button-row">
                {button("Reset workspace", () =>
                  action("Reset workspace", async () => {
                    await api("/demo/reset", {});
                    window.location.reload();
                  }),
                )}
                {button("Undo reset", () =>
                  action("Undo reset", async () => {
                    await api("/demo/restore", {});
                    window.location.reload();
                  }),
                )}
              </div>
            </div>
            <Dialog.Close
              className="modal-close icon-button"
              aria-label="Close settings"
            >
              <X size={18} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
