"use client";

// Reading and Writing pictures (src/lib/lessons/figures.ts): a marked passage, two texts and how they
// relate, notes that serve a goal, a timeline for verb tense, and words for a blank. They are HTML so
// the words wrap, on the glass cards and tones of figure.module.css; the wrapper (Figure.tsx) draws
// them in by their data-pop and data-at marks. The transition road and the sentence blocks, which
// draw measured geometry, are in RoadSentenceFigs.tsx.
import { Fragment, type CSSProperties } from "react";
import type {
  NotesFigure,
  PassageFigure,
  TimelineFigure,
  TwoTextsFigure,
  WordsFigure,
} from "@/lib/lessons/figures";
import { LessonText, plainOf, runsOf } from "../LessonText";
import s from "./figure.module.css";
import t from "./text.module.css";

export { RoadFig, SentenceFig } from "./RoadSentenceFigs";

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** True when `pos` falls inside $...$ math, where the text must not be cut. */
const inMath = (text: string, pos: number) =>
  (text.slice(0, pos).match(/\$/g)?.length ?? 0) % 2 === 1;

/** The marks still open at `pos` (bold, underline, italic), written out to reopen them after a cut. */
function openAt(text: string, pos: number): string {
  const runs = runsOf(`${text.slice(0, pos)}x`);
  const last = runs[runs.length - 1];
  return `${last?.b ? "**" : ""}${last?.u ? "<u>" : ""}${last?.i ? "<i>" : ""}`;
}

type Piece = { text: string; mark?: number };

/** The text cut around the marks, in order: plain pieces, and marked ones with their mark's index.
 *  Each mark takes the first place its exact text appears that no other mark holds; a mark whose
 *  text is missing is skipped. Every piece reopens the marks still open where it starts. */
function markPieces(text: string, finds: string[]): Piece[] {
  const spans: { from: number; to: number; mark: number }[] = [];
  finds.forEach((find, mark) => {
    if (!find) return;
    for (let from = text.indexOf(find); from !== -1; from = text.indexOf(find, from + 1)) {
      const to = from + find.length;
      const free = spans.every((x) => to <= x.from || from >= x.to);
      if (free && !inMath(text, from) && !inMath(text, to)) {
        spans.push({ from, to, mark });
        return;
      }
    }
  });
  spans.sort((a, b) => a.from - b.from);
  const pieces: Piece[] = [];
  const cut = (from: number, to: number, mark?: number) =>
    pieces.push({ text: openAt(text, from) + text.slice(from, to), mark });
  let at = 0;
  for (const x of spans) {
    if (x.from > at) cut(at, x.from);
    cut(x.from, x.to, x.mark);
    at = x.to;
  }
  if (at < text.length) cut(at, text.length);
  return pieces;
}

/** A check, drawn: the word that fits. */
function Check() {
  return (
    <svg
      className={t.icon}
      width={14}
      height={14}
      viewBox="0 0 14 14"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 7.5L6 10.5L11.5 4" />
    </svg>
  );
}

// ---------------------------------------------------------------- a marked passage

/** The passage in a card; each mark's words are lit one after another, its note right after them. The
 *  highlights lie in a layer under the words (the same text, transparent), so only they fade in. */
export function PassageFig({ fig }: { fig: PassageFigure }) {
  const pieces = markPieces(
    fig.text,
    fig.marks.map((m) => m.find)
  );
  const found = pieces.flatMap((p) => (p.mark === undefined ? [] : [fig.marks[p.mark]]));
  const notes = found.flatMap((m) => (m.note ? [m.note] : []));

  const layer = (glow: boolean) =>
    pieces.map((p, k) => {
      if (p.mark === undefined) return <LessonText key={k} text={p.text} />;
      const m = fig.marks[p.mark];
      return (
        <Fragment key={k}>
          {glow ? (
            <span className={cx(s.mark, s[m.tone], t.clone)} data-pop data-at={p.mark * 2}>
              <LessonText text={p.text} />
            </span>
          ) : (
            <mark className={cx(t.inked, t.clone)}>
              <LessonText text={p.text} />
            </mark>
          )}
          {m.note && (
            <span
              className={cx(s.tag, s[m.tone], glow && t.ghost)}
              data-pop={glow ? undefined : true}
              data-at={glow ? undefined : p.mark * 2 + 1}
            >
              {m.note}
            </span>
          )}
        </Fragment>
      );
    });

  return (
    <div
      className={cx(s.fig, s.board, t.root)}
      role="figure"
      aria-label={`A passage with ${count(found.length, "marked part")}${notes.length ? `: ${notes.join(", ")}` : ""}`}
    >
      <div className={cx(s.card, t.passage)}>
        <p className={t.glow} aria-hidden="true">
          {layer(true)}
        </p>
        <p>{layer(false)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- two texts

/** Each relation's word, its words for a screen reader, and its icon (20 by 20, drawn from the first
 *  text toward the second: left to right side by side, top to bottom stacked). */
const RELATIONS: Record<TwoTextsFigure["relation"], { word: string; say: string; d: string }> = {
  // two arrows going the same way
  agree: {
    word: "agrees",
    say: "agrees with",
    d: "M3.5 6H16.5M13.5 3L16.5 6L13.5 9M3.5 14H16.5M13.5 11L16.5 14L13.5 17",
  },
  // two arrows pointing at each other
  disagree: {
    word: "disagrees",
    say: "disagrees with",
    d: "M2 10H8.5M5.5 7L8.5 10L5.5 13M18 10H11.5M14.5 7L11.5 10L14.5 13",
  },
  // one arrow that goes along, then bends part way
  qualify: {
    word: "qualifies",
    say: "qualifies",
    d: "M2.5 7H9Q14 7 16.5 12.5M18 8.6L16.5 12.5L12.6 11",
  },
  // a reply arrow, from the second text back to the first
  answer: {
    word: "answers",
    say: "answers",
    d: "M17 16V13.5A5 5 0 0 0 12 8.5H4M7 5.5L4 8.5L7 11.5",
  },
};

/** Two cards side by side (stacked when narrow), a round badge between them for how they relate, and
 *  the note under them. */
export function TwoTextsFig({ fig }: { fig: TwoTextsFigure }) {
  const rel = RELATIONS[fig.relation];
  const card = (x: TwoTextsFigure["a"], at: number) => (
    <div className={cx(s.card, t.text)} data-pop data-at={at}>
      <span className={t.title}>{x.title}</span>
      <LessonText text={x.claim} />
    </div>
  );
  return (
    <div
      className={cx(s.fig, s.board, t.root, t.two)}
      role="figure"
      aria-label={`Two texts, ${fig.a.title} and ${fig.b.title}: ${fig.b.title} ${rel.say} ${fig.a.title}`}
    >
      <div className={t.pair}>
        {card(fig.a, 0)}
        <div className={cx(t.relation, s.warm)} data-pop data-at={2}>
          <span className={t.badge}>
            <svg
              className={t.icon}
              width={20}
              height={20}
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
            >
              <path d={rel.d} data-draw data-at={3} />
            </svg>
          </span>
          <span className={t.relWord}>{rel.word}</span>
        </div>
        {card(fig.b, 1)}
      </div>
      {fig.note && (
        <p className={t.caption} data-pop data-at={4}>
          <LessonText text={fig.note} />
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- notes and a goal

/** The goal on top, then the notes; the ones the right answer uses light up one by one (in the order
 *  of `pick`), and the others stay dim. */
export function NotesFig({ fig }: { fig: NotesFigure }) {
  const order = fig.pick.filter(
    (i, k, all) => Number.isInteger(i) && i >= 0 && i < fig.notes.length && all.indexOf(i) === k
  );
  return (
    <div
      className={cx(s.fig, s.board, t.root)}
      role="figure"
      aria-label={`A writing goal and ${count(fig.notes.length, "note")}; ${count(order.length, "note")} serve the goal`}
    >
      <p className={cx(s.card, t.goal, s.gold)} data-pop data-at={0}>
        <span className={cx(s.tag, s.gold, t.lead)}>Goal</span>
        <LessonText text={fig.goal} />
      </p>
      <ul className={t.list}>
        {fig.notes.map((note, i) => {
          const k = order.indexOf(i);
          return (
            <li key={i} data-pop data-at={1}>
              <div className={cx(t.noteCard, k === -1 ? t.unused : cx(t.used, s.green))}>
                {k !== -1 && <span className={t.lit} data-pop data-at={2 + k} aria-hidden="true" />}
                <LessonText text={note} />
                {k !== -1 && (
                  <span className={cx(s.tag, s.green)} data-pop data-at={2 + k}>
                    use
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- the timeline

const ZONES = ["earlier past", "past", "now", "future"] as const;

/** An arrow from earlier to later with the zones in use, in order; each event a dot in its zone, its
 *  label above and its verb (bold) below. Down the page when narrow, left to right from 360 px. */
export function TimelineFig({ fig }: { fig: TimelineFigure }) {
  let next = 1;
  const zones = ZONES.flatMap((zone) => {
    const events = fig.events.filter((e) => e.at === zone);
    if (!events.length) return [];
    const col = next;
    next += events.length;
    return [{ zone, events, col }];
  });
  const said = zones
    .flatMap((z) => z.events)
    .map((e) => `${plainOf(e.label)}${e.verb ? ` (${plainOf(e.verb)})` : ""}, ${e.at}`)
    .join("; ");
  return (
    <div
      className={cx(s.fig, s.board, t.root, t.timeline)}
      role="figure"
      aria-label={`A timeline from earlier to later: ${said}`}
    >
      <div className={t.track} style={{ "--n": Math.max(next - 1, 1) } as CSSProperties}>
        <span className={t.axis} aria-hidden="true">
          <svg
            className={cx(t.icon, t.axisHead)}
            width={12}
            height={12}
            viewBox="0 0 12 12"
            focusable="false"
          >
            <path d="M4 2.5L8.5 6L4 9.5" />
          </svg>
        </span>
        {zones.map((z) => (
          <Fragment key={z.zone}>
            <span
              className={cx(t.zone, z.zone === "now" && t.now)}
              style={{ "--col": z.col, "--span": z.events.length } as CSSProperties}
            >
              {z.zone}
            </span>
            {z.events.map((e, k) => (
              <div
                key={k}
                className={t.event}
                style={{ "--col": z.col + k } as CSSProperties}
                data-pop
                data-at={z.col - 1 + k}
              >
                <span className={t.evLabel}>
                  <LessonText text={e.label} />
                </span>
                <span className={cx(t.dot, s.warm)} />
                {e.verb && (
                  <b className={t.verb}>
                    <LessonText text={e.verb} />
                  </b>
                )}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- words for a blank

/** The first blank (______) outside math, or null. */
function blankIn(text: string): { from: number; to: number } | null {
  for (const m of text.matchAll(/_{3,}/g)) {
    const from = m.index ?? 0;
    if (!inMath(text, from)) return { from, to: from + m[0].length };
  }
  return null;
}

/** The sentence with its blank, the words as chips below it, and the sentence again with the word
 *  that fits dropped into the blank, lit green; the other words fade, their notes under them. */
export function WordsFig({ fig }: { fig: WordsFigure }) {
  const n = fig.words.length;
  const fit = fig.words.find((w) => w.fit);
  const blank = blankIn(fig.sentence);
  const noted = fig.words.some((w) => w.note);
  return (
    <div
      className={cx(s.fig, s.board, t.root)}
      role="figure"
      aria-label={`A sentence with a blank and ${count(n, "word")} that might fill it; ${fit ? `"${fit.word}" fits` : "none fits"}`}
    >
      <p className={s.card}>
        <LessonText text={fig.sentence} />
      </p>
      <ul className={cx(t.words, noted && t.noted)}>
        {fig.words.map((w, k) => (
          <li key={k} className={t.word} data-pop data-at={k}>
            <span className={cx(t.chip, w.fit ? cx(t.fit, s.green) : t.miss)}>
              {w.fit && <span className={t.lit} data-pop data-at={n} aria-hidden="true" />}
              {w.fit && <Check />}
              {w.word}
            </span>
            {w.note && (
              <small className={t.why} data-pop data-at={n + 2}>
                {w.note}
              </small>
            )}
          </li>
        ))}
      </ul>
      {fit && blank && (
        <p className={cx(s.card, t.filled, s.green)} data-pop data-at={n + 1}>
          <Check />
          <span>
            <LessonText text={fig.sentence.slice(0, blank.from)} />
            <mark className={cx(s.mark, s.green, t.fill)}>
              <LessonText text={openAt(fig.sentence, blank.from) + fit.word} />
            </mark>
            <LessonText text={openAt(fig.sentence, blank.to) + fig.sentence.slice(blank.to)} />
          </span>
        </p>
      )}
    </div>
  );
}
