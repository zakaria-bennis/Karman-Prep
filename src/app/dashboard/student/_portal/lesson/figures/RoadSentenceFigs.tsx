"use client";

// The two Reading and Writing pictures that draw geometry (re-exported by TextFigs.tsx): the transition
// road, whose shape shows the turn, and the sentence in blocks, whose link arc is measured from the
// blocks as they wrap. Static markup; Figure.tsx draws them in by their data-draw, data-pop and data-at.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { RoadFigure, SentenceFigure, Tone } from "@/lib/lessons/figures";
import { LessonText, plainOf } from "../LessonText";
import s from "./figure.module.css";
import t from "./text.module.css";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

type Pt = [number, number];

const f = (n: number) => Math.round(n * 10) / 10;

/** An arrowhead at `tip` for a line arriving from `from`. */
function head(tip: Pt, from: Pt, size = 7): string {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const arm = (turn: number) =>
    `${f(tip[0] - size * Math.cos(a + turn))} ${f(tip[1] - size * Math.sin(a + turn))}`;
  return `M${arm(0.6)}L${tip[0]} ${tip[1]}L${arm(-0.6)}`;
}

// ---------------------------------------------------------------- the transition road

/** A domino 13 by 32 standing at x on the road at y = 34: a divider and a pip in each half. */
function domino(x: number, at?: number) {
  return (
    <g data-pop={at === undefined ? undefined : true} data-at={at}>
      <rect x={x} y={18} width={13} height={32} rx={3} className={t.domino} />
      <path d={`M${x + 2.5} 34H${x + 10.5}`} className={t.domino} />
      <circle cx={x + 6.5} cy={26} r={1.7} className={t.pip} />
      <circle cx={x + 6.5} cy={42} r={1.7} className={t.pip} />
    </g>
  );
}

interface Road {
  /** The road's height where the sign's post (x = 40) meets it. */
  y: number;
  /** The soft bed of the road, and the line along it that ends in the arrowhead. */
  bed: string;
  line: string;
  tip: Pt;
  from: Pt;
  /** What the idea runs into: the dominoes, the lens. */
  extra?: ReactNode;
  /** The slot the sign pops in (after the road and its extra are drawn). */
  signAt: number;
  /** The turn in words, for a screen reader. */
  say: string;
}

/** Each turn's road, in a 240 by 64 box: the line traces at 0 and its head at 2. */
const ROADS: Record<RoadFigure["turn"], Road> = {
  // a straight arrow going on
  add: {
    y: 32,
    bed: "M16 32H214",
    line: "M16 32H220",
    tip: [220, 32],
    from: [200, 32],
    signAt: 3,
    say: "goes on the same way",
  },
  // on, then a sharp bend back the other way
  contrast: {
    y: 22,
    bed: "M16 22H182L124 53",
    line: "M16 22H182L124 53",
    tip: [124, 53],
    from: [182, 22],
    signAt: 3,
    say: "turns back the other way",
  },
  // the arrow knocks a domino into the next one
  cause: {
    y: 34,
    bed: "M16 34H150",
    line: "M16 34H157",
    tip: [157, 34],
    from: [137, 34],
    extra: (
      <>
        {domino(188)}
        <g transform="rotate(24 167 50)">{domino(154, 2)}</g>
      </>
    ),
    signAt: 3,
    say: "knocks into the next idea, like a falling domino",
  },
  // stairs, stepping forward and up
  sequence: {
    y: 54,
    bed: "M16 54H98V42H130V30H162V18H214",
    line: "M16 54H98V42H130V30H162V18H220",
    tip: [220, 18],
    from: [200, 18],
    signAt: 3,
    say: "steps forward, one stair at a time",
  },
  // into a lens, pointing at one small detail
  example: {
    y: 32,
    bed: "M16 32H152",
    line: "M16 32H172",
    tip: [172, 32],
    from: [152, 32],
    extra: (
      <>
        <circle cx={182} cy={32} r={17} className={t.lens} data-draw data-at={1} />
        <path d="M194 44L205 55" className={t.handle} data-draw data-at={1} />
        <circle cx={182} cy={32} r={3.4} className={cx(s.dot, s.warm)} data-pop data-at={3} />
      </>
    ),
    signAt: 4,
    say: "zooms in on one small example",
  },
};

/** The sentence before, a short road whose shape shows the turn with the transition word on a sign
 *  beside it, then the sentence after, starting with the word in bold. */
export function RoadFig({ fig }: { fig: RoadFigure }) {
  const road = ROADS[fig.turn];
  const word = fig.word.trim();
  const { signAt } = road;
  return (
    <div
      className={cx(s.fig, s.board, t.root)}
      role="figure"
      aria-label={`The transition${word ? ` "${word}"` : ""} as a road: the idea ${road.say}`}
    >
      <p className={s.card}>
        <LessonText text={fig.before} />
      </p>
      <div className={t.road}>
        {word && (
          <span className={cx(t.sign, s.warm)} data-pop data-at={signAt}>
            {word}
          </span>
        )}
        <svg className={t.roadSvg} viewBox="0 0 240 64" aria-hidden="true" focusable="false">
          {word && (
            <line
              x1={40}
              y1={0}
              x2={40}
              y2={road.y - 6}
              className={t.post}
              data-draw
              data-at={signAt}
            />
          )}
          <path d={road.bed} className={t.bed} />
          <path d={road.line} className={cx(s.line, s.warm)} data-draw data-at={0} />
          <path
            d={head(road.tip, road.from)}
            className={cx(s.line, s.warm)}
            data-draw
            data-at={2}
          />
          <circle cx={16} cy={road.y} r={3.6} className={cx(s.dot, s.warm)} />
          {road.extra}
        </svg>
      </div>
      <p className={cx(s.card, t.after, s.warm)} data-pop data-at={signAt + 1}>
        <LessonText text={word ? `**${word}** ${fig.after}` : fig.after} />
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- the sentence in blocks

type Role = NonNullable<SentenceFigure["parts"][number]["role"]>;

const ROLES: Record<Role, { tone?: Tone; tag?: string }> = {
  main: { tone: "blue", tag: "main clause" },
  dependent: { tone: "gold", tag: "dependent clause" },
  extra: { tag: "extra info" },
  item: { tone: "warm", tag: "item" },
  subject: { tone: "blue", tag: "subject" },
  verb: { tone: "warm", tag: "verb" },
  modifier: { tone: "gold", tag: "modifier" },
  noun: { tone: "green", tag: "noun" },
  other: {},
};

/** The link's drawing, and the room it needs above one row of blocks. */
interface Geo {
  d: string;
  ends: Pt[];
  label: Pt;
  anchor: "middle" | "start" | "end";
  /** The items on the row the link is drawn over (they get `space` above them). */
  inLane: string;
  space: number;
}

/** The gap between a block and the end of the arc. */
const GAP = 3;

/** An element's layout box inside the sentence. Offsets, not getBoundingClientRect, because the
 *  draw-in scales the blocks while it plays and a resize may land in the middle of it. */
function boxIn(el: HTMLElement | null, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  if (!el || node !== root || el.offsetWidth <= 0 || el.offsetHeight <= 0) return null;
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Where the link goes. On one row, an arc above the two blocks with its label at the top. On two
 *  rows, a curve from under the upper block down into the top of the lower one, through the room
 *  above the lower row. Null until the blocks have a layout (never in jsdom). */
function linkGeometry(root: HTMLElement, from: number, to: number, labeled: boolean): Geo | null {
  const rows = new Map<string, number>();
  let row = -1;
  let top = Number.NEGATIVE_INFINITY;
  for (const item of root.querySelectorAll<HTMLElement>("[data-item]")) {
    const b = boxIn(item, root);
    if (!b) return null;
    if (b.y > top + 1) {
      row += 1;
      top = b.y;
    }
    rows.set(item.dataset.item ?? "", row);
  }
  const a = boxIn(root.querySelector<HTMLElement>(`[data-box="${from}"]`), root);
  const b = boxIn(root.querySelector<HTMLElement>(`[data-box="${to}"]`), root);
  if (!a || !b) return null;
  const ra = rows.get(`p${from}`) ?? 0;
  const rb = rows.get(`p${to}`) ?? 0;
  let geo: Omit<Geo, "inLane" | "space">;
  let lane: number;
  if (ra === rb) {
    const x1 = f(a.x + a.w / 2);
    const x2 = f(b.x + b.w / 2);
    const y = Math.min(a.y, b.y) - GAP;
    const h = f(Math.min(26, Math.max(16, Math.abs(x2 - x1) * 0.3)));
    geo = {
      d: `M${x1} ${y}C${x1} ${y - h} ${x2} ${y - h} ${x2} ${y}`,
      ends: [
        [x1, y],
        [x2, y],
      ],
      label: [f((x1 + x2) / 2), f(y - h * 0.75 - 6)],
      anchor: "middle",
    };
    lane = ra;
  } else {
    const [up, low] = ra < rb ? [from, to] : [to, from];
    const u = boxIn(root.querySelector<HTMLElement>(`[data-item="p${up}"]`), root);
    const l = up === from ? b : a;
    if (!u) return null;
    const x1 = f(u.x + u.w / 2);
    const y1 = u.y + u.h + GAP;
    const x2 = f(l.x + l.w / 2);
    const y2 = l.y - GAP;
    const k = f((y2 - y1) * 0.6);
    // the label sits in the room kept above the lower row, beside the end of the curve, so it never
    // lands on a row the curve passes over; turned to the left near the right edge
    const left = x2 > root.offsetWidth * 0.55;
    geo = {
      d: `M${x1} ${y1}C${x1} ${y1 + k} ${x2} ${y2 - k} ${x2} ${y2}`,
      ends: [
        [x1, y1],
        [x2, y2],
      ],
      label: [f(x2 + (left ? -8 : 8)), f(y2 - 10)],
      anchor: left ? "end" : "start",
    };
    lane = rows.get(`p${low}`) ?? 0;
  }
  const inLane = [...rows]
    .filter(([, r]) => r === lane)
    .map(([key]) => key)
    .join(",");
  return { ...geo, inLane, space: labeled ? 34 : 24 };
}

/** The parts as blocks that wrap like a sentence, each role tinted and tagged under it; the joints as
 *  punctuation chips (green when right, red and struck when wrong); the link as an arc between two
 *  blocks, measured once they are laid out and again whenever they move. */
export function SentenceFig({ fig }: { fig: SentenceFigure }) {
  const root = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const n = fig.parts.length;
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < n;
  const link =
    fig.link && fig.link.from !== fig.link.to && inRange(fig.link.from) && inRange(fig.link.to)
      ? fig.link
      : null;
  const from = link?.from ?? -1;
  const to = link?.to ?? -1;
  const labeled = Boolean(link?.label);

  const measure = useCallback(() => {
    const el = root.current;
    const next = el && from >= 0 ? linkGeometry(el, from, to, labeled) : null;
    setGeo((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [from, to, labeled]);

  // after every render: the room above the link's row moves the blocks, so measure again until still
  useIso(() => measure());

  useIso(() => {
    const el = root.current;
    if (!el || from < 0 || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    el.querySelectorAll("[data-box]").forEach((box) => ro.observe(box));
    return () => ro.disconnect();
  }, [measure, fig, from]);

  const lane = new Set(geo?.inLane.split(","));
  const lift = (key: string): CSSProperties | undefined =>
    geo && lane.has(key) ? { marginTop: geo.space } : undefined;

  const items: ReactNode[] = [];
  fig.parts.forEach((p, k) => {
    const role = ROLES[p.role ?? "other"];
    const tone = role.tone && s[role.tone];
    items.push(
      <span
        key={`p${k}`}
        className={t.part}
        data-item={`p${k}`}
        style={lift(`p${k}`)}
        data-pop
        data-at={k}
      >
        <span
          data-box={k}
          className={cx(t.box, tone, p.role === "extra" ? t.extra : !role.tone && t.plain)}
        >
          <LessonText text={p.text} />
        </span>
        {role.tag && <span className={cx(t.role, tone)}>{role.tag}</span>}
      </span>
    );
    (fig.joints ?? []).forEach((j, m) => {
      if (j.after !== k) return;
      items.push(
        <span
          key={`j${m}`}
          className={cx(t.joint, j.ok ? s.green : s.red, !j.ok && t.struck)}
          data-item={`j${m}`}
          style={lift(`j${m}`)}
          data-pop
          data-at={n}
        >
          {j.mark.trim() ? (
            <span className={t.jointMark}>{j.mark}</span>
          ) : (
            <svg
              className={t.icon}
              width={12}
              height={12}
              viewBox="0 0 12 12"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2.5 8L6 3.5L9.5 8" />
            </svg>
          )}
          <span className={t.sr}>
            {j.mark.trim() ? "" : "no mark, "}
            {j.ok ? "right here" : "wrong here"}
          </span>
        </span>
      );
    });
  });

  const tone = link?.ok ? s.green : s.red;
  const said = link
    ? `, with "${plainOf(fig.parts[from].text)}" linked to "${plainOf(fig.parts[to].text)}"${link.label ? ` (${link.label})` : ""}, ${link.ok ? "which is right" : "which is wrong"}`
    : "";
  return (
    <div
      ref={root}
      className={cx(s.fig, t.root, t.sentence)}
      role="figure"
      aria-label={`A sentence in ${n} ${n === 1 ? "block" : "blocks"}${said}`}
    >
      {geo && link && (
        <svg className={t.links} aria-hidden="true" focusable="false">
          <path
            d={geo.d}
            className={cx(t.arc, tone, !link.ok && s.dashed)}
            data-draw
            data-at={n + 1}
          />
          {geo.ends.map(([x, y], k) => (
            <circle
              key={k}
              cx={x}
              cy={y}
              r={2.8}
              className={cx(t.end, tone)}
              data-pop
              data-at={n + 1}
            />
          ))}
          {link.label && (
            <text
              x={geo.label[0]}
              y={geo.label[1]}
              textAnchor={geo.anchor}
              className={cx(t.linkLabel, tone)}
              data-pop
              data-at={n + 2}
            >
              {link.label}
            </text>
          )}
        </svg>
      )}
      {items}
    </div>
  );
}
