"use client";

// The parent's questions, as clouds, and Karman's answers, as a text conversation in the sky beside them.
// The clouds are mist: soft puffs that breathe and thin, with specks drifting off them. They drift up the left side, about six in view, fade out at the top and come round again from the
// bottom. Picking one makes it burst into puffs; its words fly across to the message box, are typed in and
// sent, and the answer is typed back (founder, 2026-11-10). The clouds stop while the pointer or the
// keyboard is on them, so one can be read and picked. The first exchange is already on the page, so it
// reads without scripts. Under reduced motion, or when the painting is held still, the clouds sit in a
// plain list, nothing flies or types, and a picked question is answered at once.
import { useEffect, useRef, useState } from "react";

interface Words {
  label: string;
  box: string;
  typing: string;
  delivered: string;
  read: string;
}

interface Msg {
  id: number;
  kind: "q" | "lead" | "rest" | "typing";
  text: string;
  /** False for messages that were on the page from the start: they are not typed out. */
  typed: boolean;
}

const TYPE_MS = 26;
const ANSWER_MS = 17;

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An answer leads with one short sentence, set large; the rest follows as its own message. */
function split(answer: string): [string, string] {
  const cut = answer.indexOf(". ");
  return cut > 0 ? [answer.slice(0, cut + 1), answer.slice(cut + 2)] : [answer, ""];
}

/** Words that write themselves out. The whole text holds its place from the start, so nothing jumps. */
function Typed({ text, on }: { text: string; on: boolean }) {
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((was) => (was >= text.length ? was : was + 1)), ANSWER_MS);
    return () => clearInterval(id);
  }, [on, text]);
  return (
    <>
      {text.slice(0, n)}
      <span className="chat-untyped">{text.slice(n)}</span>
    </>
  );
}

export default function Doubts({ items, words }: { items: [string, string][]; words: Words }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    const [q, a] = items[0];
    const [lead, rest] = split(a);
    return [
      { id: 0, kind: "q" as const, text: q, typed: false },
      { id: 1, kind: "lead" as const, text: lead, typed: false },
      ...(rest ? [{ id: 2, kind: "rest" as const, text: rest, typed: false }] : []),
    ];
  });
  /* clouds that have burst and are waiting to come round again */
  const [burst, setBurst] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [receipt, setReceipt] = useState(words.read);
  const host = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLParagraphElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const next = useRef(10);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* keep the newest message in view */
  useEffect(() => {
    const el = view.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: still() ? "auto" : "smooth" });
  }, [msgs, receipt]);

  /** The cloud bursts into puffs, and its words fly to the message box. */
  const poof = (cloud: HTMLElement, q: string) => {
    const layer = fx.current;
    const to = box.current;
    const frame = host.current;
    if (!layer || !to || !frame) return;
    const f = frame.getBoundingClientRect();
    const c = cloud.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    for (let k = 0; k < 16; k++) {
      const puff = document.createElement("i");
      const size = 18 + Math.random() * 34;
      const angle = (k / 16) * Math.PI * 2 + Math.random() * 0.5;
      const far = 40 + Math.random() * 80;
      puff.style.cssText = `width:${size}px;height:${size}px;left:${c.left - f.left + Math.random() * c.width - size / 2}px;top:${c.top - f.top + Math.random() * c.height - size / 2}px`;
      layer.append(puff);
      puff
        .animate(
          [
            { transform: "scale(.5)", opacity: 0.95 },
            {
              transform: `translate(${Math.cos(angle) * far}px, ${Math.sin(angle) * far - 30}px) scale(1.5)`,
              opacity: 0,
            },
          ],
          { duration: 620 + Math.random() * 380, easing: "cubic-bezier(.16, 1, .3, 1)" }
        )
        .finished.then(() => puff.remove());
    }
    const words = document.createElement("b");
    words.textContent = q;
    words.style.cssText = `left:${c.left - f.left + 22}px;top:${c.top - f.top + c.height / 2 - 12}px`;
    layer.append(words);
    words
      .animate(
        [
          { transform: "none", opacity: 1 },
          {
            transform: `translate(${(b.left - c.left) * 0.55}px, ${(b.top - c.top) * 0.4 - 50}px) scale(1.12)`,
            opacity: 1,
            offset: 0.5,
          },
          {
            transform: `translate(${b.left - c.left - 22 + 26}px, ${b.top - c.top - c.height / 2 + 12 + 18}px) scale(.9)`,
            opacity: 0,
          },
        ],
        { duration: 720, easing: "cubic-bezier(.5, 0, .2, 1)" }
      )
      .finished.then(() => words.remove());
  };

  const ask = async (q: string, cloud: HTMLElement) => {
    const a = items.find(([question]) => question === q)?.[1];
    if (busy || !a) return;
    const [lead, rest] = split(a);
    const id = next.current;
    next.current += 10;
    const answer: Msg[] = [
      { id: id + 1, kind: "lead", text: lead, typed: true },
      ...(rest ? [{ id: id + 2, kind: "rest" as const, text: rest, typed: true }] : []),
    ];
    if (still()) {
      setMsgs((m) => [
        ...m,
        { id, kind: "q", text: q, typed: false },
        ...answer.map((x) => ({ ...x, typed: false })),
      ]);
      setReceipt(words.read);
      return;
    }
    setBusy(true);
    setBurst((was) => [...was, q]);
    poof(cloud, q);
    await wait(640);
    /* typed into the box, then sent */
    for (let n = 1; n <= q.length; n++) {
      if (!alive.current) return;
      setDraft(q.slice(0, n));
      await wait(TYPE_MS);
    }
    await wait(320);
    setDraft("");
    setReceipt(words.delivered);
    setMsgs((m) => [
      ...m,
      { id, kind: "q", text: q, typed: false },
      { id: id + 9, kind: "typing", text: "", typed: false },
    ]);
    await wait(1100);
    for (const part of answer) {
      if (!alive.current) return;
      setMsgs((m) => [...m.filter((x) => x.kind !== "typing"), part]);
      setReceipt(words.read);
      await wait(part.text.length * ANSWER_MS + 260);
    }
    if (alive.current) setBusy(false);
  };

  const lastQ = [...msgs].reverse().find((m) => m.kind === "q")?.id;
  return (
    <div className="chat" ref={host}>
      <ul
        className="sky"
        aria-label={words.label}
        style={{ "--n": items.length } as React.CSSProperties}
      >
        {items.map(([q], i) => (
          <li
            key={q}
            style={{ "--i": i } as React.CSSProperties}
            /* a burst cloud comes back when its next trip up the sky begins */
            onAnimationIteration={(e) => {
              if (e.target === e.currentTarget) setBurst((was) => was.filter((x) => x !== q));
            }}
          >
            <button
              type="button"
              className="cloud"
              data-burst={burst.includes(q) || undefined}
              disabled={busy || burst.includes(q)}
              onClick={(e) => ask(q, e.currentTarget)}
            >
              <span className="cloud-mist" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <b />
                <b />
                <b />
                <b />
              </span>
              {q}
            </button>
          </li>
        ))}
      </ul>
      <div className="chat-win">
        <div className="chat-view" ref={view} role="log" aria-live="polite" tabIndex={0}>
          {msgs.map((m) =>
            m.kind === "typing" ? (
              <p key={m.id} className="chat-a chat-dots" aria-label={words.typing}>
                <i />
                <i />
                <i />
              </p>
            ) : m.kind === "q" ? (
              <p key={m.id} className="chat-q">
                {m.text}
                {m.id === lastQ ? <small key={receipt}>{receipt}</small> : null}
              </p>
            ) : (
              <p key={m.id} className={m.kind === "lead" ? "chat-a chat-lead" : "chat-a"}>
                <Typed text={m.text} on={m.typed} />
              </p>
            )
          )}
        </div>
        <p className="chat-box" ref={box} data-empty={!draft || undefined} aria-hidden="true">
          <span>{draft || words.box}</span>
          <i>
            <svg viewBox="0 0 24 24">
              <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
            </svg>
          </i>
        </p>
      </div>
      <div className="sky-fx" ref={fx} aria-hidden="true" />
    </div>
  );
}
