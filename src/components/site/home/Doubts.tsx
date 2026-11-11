"use client";

// The parent's questions, as a text conversation with Karman. The questions sit in topics beside the chat;
// tapping one sends it as the parent's own message, Karman types, and the answer lands as two messages: one
// short line set large, then the detail. Some answers bring something with them (the guarantee's stamp, the
// tutor kinds, a Start free button: the page passes these in as "shows"). The message box under the chat
// types the next question that hasn't been asked, so one press of Send keeps the conversation going. The
// first exchange is already on the page, so it reads without scripts. Under reduced motion, or when the
// painting is held still, nothing types and answers arrive at once.
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DoubtTopic {
  name: string;
  asks: [string, string][];
}

interface Words {
  label: string;
  send: string;
  typing: string;
  delivered: string;
  read: string;
}

type Msg =
  | { id: number; kind: "q" | "lead" | "rest"; text: string }
  | { id: number; kind: "typing" }
  | { id: number; kind: "show"; show: string };

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An answer leads with one short sentence, set large; the rest follows as its own message. */
function split(answer: string): [string, string] {
  const cut = answer.indexOf(". ");
  return cut > 0 ? [answer.slice(0, cut + 1), answer.slice(cut + 2)] : [answer, ""];
}

/** The messages one question and its answer make, in order. */
function exchange(q: string, a: string, show: string | undefined, id: number): Msg[] {
  const [lead, rest] = split(a);
  const out: Msg[] = [
    { id, kind: "q", text: q },
    { id: id + 1, kind: "lead", text: lead },
  ];
  if (rest) out.push({ id: id + 2, kind: "rest", text: rest });
  if (show) out.push({ id: id + 3, kind: "show", show });
  return out;
}

export default function Doubts({
  topics,
  shows,
  extras,
  words,
}: {
  topics: DoubtTopic[];
  /** Question -> the name of what its answer brings with it. */
  shows: Record<string, string>;
  /** What each name draws. */
  extras: Record<string, ReactNode>;
  words: Words;
}) {
  const [first] = topics[0].asks;
  const [msgs, setMsgs] = useState<Msg[]>(() => exchange(first[0], first[1], shows[first[0]], 0));
  const [asked, setAsked] = useState<string[]>([first[0]]);
  const [topic, setTopic] = useState(0);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(false);
  const [draft, setDraft] = useState("");
  const [receipt, setReceipt] = useState(words.read);
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const next = useRef(10);
  const alive = useRef(true);

  /* the next question nobody has asked: from this topic first, then from any other */
  const order = [...topics[topic].asks, ...topics.flatMap((t) => t.asks)];
  const upNext = order.find(([q]) => !asked.includes(q))?.[0] ?? "";

  useEffect(() => {
    alive.current = true;
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => {
      alive.current = false;
      io.disconnect();
    };
  }, []);

  /* the message box types the next question, a letter at a time */
  useEffect(() => {
    if (busy || !seen || !upNext) return;
    if (still()) {
      setDraft(upNext);
      return;
    }
    let n = 0;
    setDraft("");
    const id = setInterval(() => {
      n += 1;
      setDraft(upNext.slice(0, n));
      if (n >= upNext.length) clearInterval(id);
    }, 34);
    return () => clearInterval(id);
  }, [upNext, busy, seen]);

  /* keep the newest message in view */
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: still() ? "auto" : "smooth" });
  }, [msgs, receipt]);

  const ask = async (q: string) => {
    const a = topics.flatMap((t) => t.asks).find(([question]) => question === q)?.[1];
    if (busy || !a) return;
    const id = next.current;
    next.current += 10;
    const all = exchange(q, a, shows[q], id);
    setAsked((was) => (was.includes(q) ? was : [...was, q]));
    if (still()) {
      setMsgs((m) => [...m, ...all]);
      setReceipt(words.read);
      return;
    }
    setBusy(true);
    setDraft("");
    setReceipt(words.delivered);
    setMsgs((m) => [...m, all[0], { id: id + 9, kind: "typing" }]);
    await wait(1250);
    for (let k = 1; k < all.length; k++) {
      if (!alive.current) return;
      setMsgs((m) => [...m.filter((x) => x.kind !== "typing"), all[k]]);
      if (k === 1) setReceipt(words.read);
      await wait(k === all.length - 1 ? 250 : 620);
    }
    if (alive.current) setBusy(false);
  };

  const lastQ = [...msgs].reverse().find((m) => m.kind === "q")?.id;
  return (
    <div className="chat" ref={host}>
      <div className="chat-menu">
        <div className="chat-topics" role="tablist" aria-label={words.label}>
          {topics.map((t, i) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              aria-selected={i === topic}
              onClick={() => setTopic(i)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <ul className="chat-asks" key={topic}>
          {topics[topic].asks.map(([q], i) => (
            <li key={q} style={{ "--i": i } as React.CSSProperties}>
              <button
                type="button"
                data-asked={asked.includes(q) || undefined}
                disabled={busy}
                onClick={() => ask(q)}
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-win">
        <div className="chat-view" ref={view} role="log" aria-live="polite" tabIndex={0}>
          {msgs.map((m) =>
            m.kind === "typing" ? (
              <p key={m.id} className="chat-a chat-dots" aria-label={words.typing}>
                <i />
                <i />
                <i />
              </p>
            ) : m.kind === "show" ? (
              <div key={m.id} className="chat-show">
                {extras[m.show]}
              </div>
            ) : m.kind === "q" ? (
              <p key={m.id} className="chat-q">
                {m.text}
                {m.id === lastQ ? <small key={receipt}>{receipt}</small> : null}
              </p>
            ) : (
              <p key={m.id} className={m.kind === "lead" ? "chat-a chat-lead" : "chat-a"}>
                {m.text}
              </p>
            )
          )}
        </div>
        <form
          className="chat-box"
          onSubmit={(e) => {
            e.preventDefault();
            if (upNext) ask(upNext);
          }}
        >
          <span aria-hidden="true">{draft}</span>
          <button type="submit" disabled={busy || !upNext} aria-label={`${words.send}: ${upNext}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
