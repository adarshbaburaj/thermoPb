"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  Fingerprint,
  Lightbulb,
  MessageCircle,
  Network,
  Plus,
  Square,
  Users,
} from "lucide-react";
import {
  connectorInsights,
  networkPaths,
  personInitials,
} from "@/lib/network-insights";
import BrandMark from "@/components/brand-mark";
import type { Item, Seed } from "@/lib/types";

type Reply = {
  kind: "route" | "events" | "ideas" | "circle" | "dashboard" | "clarify";
  text: string;
  target?: Item;
  path?: Item;
  event?: Item;
  ideas?: Item[];
};
type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  reply?: Reply;
};
type Props = {
  seed: Seed;
  graph: Seed["graph"];
  leads: Item[];
  events: Item[];
  cards: Item[];
  active: boolean;
  onNavigate: (screen: string, targetId?: string) => void;
  onSource: (url: string) => void;
};
const starters = [
  "Who can introduce me to Maya Chen?",
  "What should I do next?",
  "Find a creative way to reach out",
];
const steps = [
  "Finding the relevant people",
  "Following the connections and evidence",
  "Putting together your next move",
];

export default function ChatWorkspace({
  seed,
  graph,
  leads,
  events,
  cards,
  active,
  onNavigate,
  onSource,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [working, setWorking] = useState(false),
    [step, setStep] = useState(0);
  const sequence = useRef(0),
    job = useRef(0),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    thread = useRef<HTMLDivElement>(null),
    composer = useRef<HTMLTextAreaElement>(null);
  const lead = leads[0];
  const person = (id: string) =>
    graph.nodes.find((node) => node.id === id)?.label || id;
  const connectors = useMemo(
    () => connectorInsights(graph, leads),
    [graph, leads],
  );
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      job.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    thread.current?.scrollTo({
      top: thread.current.scrollHeight,
      behavior: reduced ? "instant" : "smooth",
    });
  }, [messages, working, step, active]);

  function stop() {
    job.current += 1;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setWorking(false);
  }
  function newConversation() {
    stop();
    setMessages([]);
    setInput("");
    if (composer.current) {
      composer.current.style.height = "";
      composer.current.focus();
    }
  }

  async function prepareReply(prompt: string): Promise<Reply> {
    const question = prompt.toLowerCase();
    if (
      /creative|outreach|cold (email|mail)|technique|approach|idea/.test(
        question,
      )
    ) {
      let ideas: Item[] = [];
      try {
        const response = await fetch("/api/playbook");
        if (response.ok) ideas = (await response.json()).ideas || [];
      } catch {}
      return {
        kind: "ideas",
        text: ideas.length
          ? "A useful reason to reach out is stronger than a clever opening line. Here are two approaches worth adapting to Tracekit. Keep your hook specific, then make one small ask."
          : "Start with a small, useful artifact: a short reliability teardown or a one-page map. Offer it before asking for a meeting.",
        ideas: ideas.slice(0, 2),
      };
    }
    if (/event|room|salon|conference|where.*meet/.test(question)) {
      const event = [...events].sort((a, b) => b.score - a.score)[0];
      return {
        kind: "events",
        event,
        text: event
          ? `${event.name} looks like your most useful room. ${(event.targets_present || []).length} of your targets and ${(event.connectors_present || []).length} connections are listed. A familiar face gives you a reason to start the conversation.`
          : "There are no rooms on your radar yet. Add an event or explore another route.",
      };
    }
    if (/thermo|tm tag|my (id|tag)|share.*id|connect.*priya/.test(question))
      return {
        kind: "circle",
        text: "Your TM tag is TM-ADARSH. Share it when you meet someone. Once a connection is accepted, you can see which new introductions it opens up. Try connecting with Priya to see how your circle changes.",
      };
    if (/dashboard|pipeline|progress|overview/.test(question))
      return {
        kind: "dashboard",
        text: `You have ${leads.length} matched people, ${connectors.length} direct connectors, and ${cards.filter((card) => card.stage === "Meeting Booked").length} meeting booked. Start with the connectors who already have a path to a high-fit target.`,
      };
    const previousTarget = [...messages]
      .reverse()
      .find((message) => message.reply?.target)?.reply?.target;
    const target =
      leads.find(
        (item) =>
          question.includes(item.person.toLowerCase()) ||
          question.includes(item.company.toLowerCase()),
      ) ||
      leads.find((item) =>
        question.includes(item.person.split(" ")[0].toLowerCase()),
      ) ||
      previousTarget ||
      lead;
    if (!target)
      return {
        kind: "clarify",
        text: "Who would you like to meet? Share a name or company, and we can look for a useful connection.",
      };
    if (
      /who|introduc|connect|route|path|meet|next|maya|help|ravi|elena|priya/.test(
        question,
      ) ||
      target !== lead
    ) {
      const options = networkPaths(graph, target.target_id, target.fit);
      const alternative = /else|another|alternative/.test(question);
      const path = alternative
        ? options.find(
            (option) => option.hops[0]?.to !== options[0]?.hops[0]?.to,
          ) ||
          options[1] ||
          options[0]
        : options[0];
      if (!path)
        return {
          kind: "route",
          target,
          text: `I don't have an evidenced route to ${target.person} yet. A new connection or a shared event could open one up. You can inspect the network brain or add someone you know.`,
        };
      const connector = path.hops[0].to_label;
      const inferred = path.hops.filter(
        (hop: Item) => hop.confidence === "INFERRED",
      ).length;
      return {
        kind: "route",
        target,
        path,
        text: `${alternative ? (path === options[0] ? `The clearest evidenced route still starts with ${connector}.` : `${connector} is another person worth asking.`) : `Start with ${connector}.`} There is a ${path.hops.length}-hop route from you to ${target.person}, ${target.title} at ${target.company}. ${inferred ? `${inferred === 1 ? "One link is" : `${inferred} links are`} inferred, so check the source before asking for an introduction.` : "Each link on this route has supporting evidence."} The next move is a short, forwardable note that asks permission first.`,
      };
    }
    return {
      kind: "clarify",
      text: "I can help you find an introduction, choose the right room, or try a thoughtful outreach approach. Who are you hoping to meet, or what would you like to make happen?",
    };
  }

  function ask(value: string) {
    const prompt = value.trim();
    if (!prompt || working) return;
    const request = ++job.current;
    setMessages((previous) => [
      ...previous,
      { id: ++sequence.current, role: "user", text: prompt },
    ]);
    setInput("");
    setWorking(true);
    setStep(0);
    if (composer.current) composer.current.style.height = "";
    timers.current = [
      setTimeout(() => {
        if (job.current === request) setStep(1);
      }, 360),
      setTimeout(() => {
        if (job.current === request) setStep(2);
      }, 760),
      setTimeout(async () => {
        try {
          const reply = await prepareReply(prompt);
          if (job.current !== request) return;
          setMessages((previous) => [
            ...previous,
            {
              id: ++sequence.current,
              role: "assistant",
              text: reply.text,
              reply,
            },
          ]);
        } catch {
          if (job.current === request)
            setMessages((previous) => [
              ...previous,
              {
                id: ++sequence.current,
                role: "assistant",
                text: "That did not finish. Try asking about a person in your network, or open the dashboard to explore.",
              },
            ]);
        } finally {
          if (job.current === request) setWorking(false);
        }
      }, 1250),
    ];
  }

  function AnswerCard({ reply }: { reply: Reply }) {
    if (reply.kind === "route" && reply.target) {
      const path = reply.path;
      const nodes = path
        ? [
            { id: "me", name: "You" },
            ...path.hops.map((hop: Item) => ({
              id: hop.to,
              name: hop.to_label,
            })),
          ]
        : [];
      return (
        <div className="chat-route-card">
          <div className="chat-card-heading">
            <span className="chat-card-icon">
              <Network size={17} />
            </span>
            <div>
              <strong>A way to {reply.target.person.split(" ")[0]}</strong>
              <span>{reply.target.company}</span>
            </div>
            {path && (
              <span className="chat-hop-count">{path.hops.length} hops</span>
            )}
          </div>
          {path && (
            <div
              className="chat-mini-route"
              aria-label={`Your route to ${reply.target.person}`}
            >
              {nodes.map((node: Item, index: number) => (
                <div className="chat-mini-person" key={node.id}>
                  <span
                    className={
                      index === nodes.length - 1
                        ? "mini-person-avatar is-target"
                        : "mini-person-avatar"
                    }
                  >
                    {node.name === "You" ? "AB" : personInitials(node.name)}
                  </span>
                  <span>{node.name.split(" ")[0]}</span>
                  {index < nodes.length - 1 && (
                    <i
                      className={
                        path.hops[index]?.confidence === "INFERRED"
                          ? "inferred"
                          : ""
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="chat-card-insight">
            <span>Next useful step</span>
            <p>
              {path
                ? `Ask ${path.hops[0].to_label.split(" ")[0]} whether an introduction would be welcome.`
                : "Add a connection or look for a shared room."}
            </p>
          </div>
          <div className="chat-card-actions">
            <button
              onClick={() => onNavigate("Glass Brain", reply.target!.target_id)}
            >
              <Network size={14} /> Explore in Glass Brain{" "}
              <ChevronRight size={14} />
            </button>
            {path?.hops[0]?.source_url && (
              <button
                className="quiet-action"
                onClick={() => onSource(path.hops[0].source_url)}
              >
                View evidence
              </button>
            )}
          </div>
        </div>
      );
    }
    if (reply.kind === "events" && reply.event) {
      const event = reply.event;
      return (
        <div className="chat-event-card">
          <CalendarDays size={21} />
          <div>
            <strong>{event.name}</strong>
            <p>
              {event.city} /{" "}
              {new Date(event.start).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                timeZone: "America/Los_Angeles",
              })}
            </p>
            <span>
              {(event.targets_present || [])
                .map((id: string) => person(id))
                .slice(0, 3)
                .join(", ")}
            </span>
          </div>
          <button onClick={() => onNavigate("Event radar")}>
            Explore room <ChevronRight size={14} />
          </button>
        </div>
      );
    }
    if (reply.kind === "ideas")
      return (
        <div className="chat-ideas-card">
          {reply.ideas?.map((idea) => (
            <div key={idea.id}>
              <Lightbulb size={17} />
              <div>
                <strong>{idea.technique || idea.title}</strong>
                <p>{idea.application || idea.summary}</p>
              </div>
            </div>
          ))}
          <button onClick={() => onNavigate("Outreach ideas")}>
            Explore creative approaches <ChevronRight size={14} />
          </button>
        </div>
      );
    if (reply.kind === "circle")
      return (
        <div className="chat-id-card">
          <Fingerprint size={26} />
          <div>
            <span>Your TM tag</span>
            <strong>TM-ADARSH</strong>
          </div>
          <button onClick={() => onNavigate("My network")}>
            Open your circle <ChevronRight size={14} />
          </button>
        </div>
      );
    if (reply.kind === "dashboard")
      return (
        <button
          className="chat-dashboard-link"
          onClick={() => onNavigate("Dashboard")}
        >
          <Users size={20} />
          <span>
            Find your next connector<strong>Open dashboard</strong>
          </span>
          <ChevronRight size={16} />
        </button>
      );
    return null;
  }

  return (
    <main className="conversation-shell" aria-label="Chat">
      <aside className="conversation-context" aria-label="Conversation context">
        <div className="context-heading">
          <span>Your starting points</span>
          <button
            className="icon-button"
            aria-label="New conversation"
            onClick={newConversation}
          >
            <Plus size={17} />
          </button>
        </div>
        <button
          className="context-card context-person"
          disabled={working}
          onClick={() => ask("Who can introduce me to Maya Chen?")}
        >
          <span className="context-icon">
            <Users size={20} />
          </span>
          <span>Someone worth meeting</span>
          <strong>{lead?.person || "Your next customer"}</strong>
          <p>
            {lead?.title}
            <br />
            {lead?.company}
          </p>
          <span className="context-card-action">
            Find a warm way in <ChevronRight size={14} />
          </span>
        </button>
        <button
          className="context-card"
          disabled={working}
          onClick={() => ask("Which room should I be in?")}
        >
          <span className="context-icon">
            <CalendarDays size={20} />
          </span>
          <span>A room to be in</span>
          <strong>{events[0]?.name || "Your next event"}</strong>
          <p>{events[0]?.city || "Explore your radar"}</p>
          <span className="context-card-action">
            See who’s going <ChevronRight size={14} />
          </span>
        </button>
        <button
          className="context-card context-circle"
          onClick={() => onNavigate("My network")}
        >
          <Fingerprint size={22} />
          <div>
            <span>Your circle starts with you</span>
            <strong>TM-ADARSH</strong>
          </div>
          <ChevronRight size={15} />
        </button>
        <div className="context-foot">
          <BrandMark size={30} />
          <p>The new way of networking.</p>
          <span>RTM / Route To Meeting</span>
        </div>
      </aside>
      <section
        className="conversation-main"
        aria-label="Conversation with thermopb"
      >
        <div className="conversation-title">
          <div className="copilot-label">
            <span className="copilot-mark">
              <BrandMark size={28} />
            </span>{" "}
            thermopb
          </div>
          <button onClick={() => onNavigate("Glass Brain")}>
            <Network size={15} /> Open network brain
          </button>
        </div>
        <div className="conversation-thread" ref={thread}>
          {!messages.length && (
            <div className="chat-welcome">
              <span className="welcome-mark">
                <BrandMark size={92} />
              </span>
              <h1>
                Who would you
                <br />
                like to meet?
              </h1>
              <p>
                A name, a company, or an ambitious idea.
                <br />
                Let’s find a thoughtful way in.
              </p>
              <div className="chat-starters">
                {starters.map((prompt) => (
                  <button key={prompt} onClick={() => ask(prompt)}>
                    {prompt}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            className="chat-messages"
            role="log"
            aria-label="Messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message) => (
              <article
                className={"chat-message message-" + message.role}
                key={message.id}
              >
                <span className="message-author">
                  {message.role === "assistant" ? (
                    <>
                      <BrandMark size={22} /> thermopb
                    </>
                  ) : (
                    "You"
                  )}
                </span>
                <div className="message-content">
                  <p>{message.text}</p>
                  {message.reply && <AnswerCard reply={message.reply} />}
                </div>
              </article>
            ))}
          </div>
          {working && (
            <div className="chat-thinking" role="status" aria-live="polite">
              <details open>
                <summary>
                  <span className="thinking-indicator" /> Thinking with your
                  network <ChevronDown size={14} />
                </summary>
                <ol>
                  {steps.map((text, index) => (
                    <li
                      key={text}
                      className={
                        index < step
                          ? "complete"
                          : index === step
                            ? "current"
                            : ""
                      }
                    >
                      {index < step ? <Check size={12} /> : <span />}
                      {text}
                    </li>
                  ))}
                </ol>
              </details>
              <button
                onClick={() => onNavigate("Glass Brain", lead?.target_id)}
              >
                <Network size={14} /> Look inside Glass Brain{" "}
                <ChevronRight size={13} />
              </button>
            </div>
          )}
          {!working && messages.length > 0 && (
            <div className="chat-followups">
              <span>Keep exploring</span>
              {["Who else could help?", "Which room should I be in?"].map(
                (prompt) => (
                  <button key={prompt} onClick={() => ask(prompt)}>
                    {prompt}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <label htmlFor="chat-message" className="visually-hidden">
            Message thermopb
          </label>
          <textarea
            id="chat-message"
            ref={composer}
            rows={1}
            value={input}
            maxLength={3000}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height =
                Math.min(event.target.scrollHeight, 144) + "px";
            }}
            placeholder="Ask about a person, a connection, or your next move…"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                ask(input);
              }
            }}
          />
          <div className="composer-bottom">
            <span>
              <Network size={13} /> Your network is the context
            </span>
            {working ? (
              <button
                type="button"
                className="chat-send"
                aria-label="Stop response"
                onClick={stop}
              >
                <Square size={13} />
              </button>
            ) : (
              <button
                type="submit"
                className="chat-send"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <ArrowUp size={19} />
              </button>
            )}
          </div>
        </form>
        <div className="composer-caption">
          <span>Connections first. A conversation next.</span>
          <span>
            <CornerDownLeft size={11} /> Send{" "}
            <span>Shift + Enter for a new line</span>
          </span>
        </div>
      </section>
    </main>
  );
}
