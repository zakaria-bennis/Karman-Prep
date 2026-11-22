// Every lesson is checked here: its shape, its words, its math (every $...$ must render), its pictures'
// numbers, and its answers, which a second writer worked out blind in checks/ (computed in code for
// Math, solved and recorded for Reading and Writing).
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { SKILLS72, skill72 } from "@/lib/skills/ids72";
import type { Figure } from "./figures";
import type { LessonChecks } from "./checks/types";
import { meets } from "./checks/value";
import type { Lesson, Rich } from "./types";

// Every file in skills/ is tested, whether or not the registry lists it yet, and one broken file fails
// only its own tests.
const FILES = readdirSync(new URL("./skills/", import.meta.url))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.slice(0, -3))
  .sort();
const LOADED = await Promise.all(
  FILES.map(async (file) => {
    try {
      const mod = (await import(`./skills/${file}.ts`)) as { default: Lesson };
      return { file, lesson: mod.default, error: null as unknown };
    } catch (error) {
      return { file, lesson: null, error };
    }
  })
);
const LESSONS = LOADED.flatMap((x) => (x.lesson ? [{ file: x.file, lesson: x.lesson }] : []));
const CHECKS = new Map(
  await Promise.all(
    FILES.map(
      async (file) =>
        [
          file,
          await import(`./checks/${file}.ts`)
            .then((m: { default: LessonChecks }) => m.default)
            .catch(() => undefined),
        ] as const
    )
  )
);

/** Every piece of text a student can read in a lesson. */
function textsOf(l: Lesson): Rich[] {
  const q = (x: { text: Rich; passage?: Rich; choices: Rich[]; why: Rich }) => [
    x.text,
    x.passage ?? "",
    ...x.choices,
    x.why,
  ];
  return [
    l.tests,
    l.spot,
    ...l.idea,
    ...(l.rules ?? []),
    l.strategy.name,
    ...l.strategy.steps,
    ...l.examples.flatMap((e) => [
      e.title,
      e.problem,
      e.passage ?? "",
      ...(e.choices ?? []),
      ...e.steps.flatMap((s) => [s.say, s.show ?? ""]),
      e.answer,
    ]),
    ...l.traps.flatMap((t) => [t.name, t.text]),
    l.tip.title,
    ...l.tip.steps,
    l.tip.note ?? "",
    q(l.check),
    ...l.quiz.flatMap(q),
  ].flat();
}

const BRITISH =
  /\b(organis\w*|recognis\w*|realis(e|ed|es|ing)|summaris\w*|analys(e|ed|es|ing)|emphasis(e|ed|es|ing)|colour\w*|favour\w*|behaviour\w*|centre\w*|metres?|litres?|practis\w*|neighbour\w*|labour\w*|honour\w*|grey|travelled|modelled|labelled|programme|maths|generalis\w*|minimis\w*|maximis\w*|categoris\w*|criticis\w*)\b/i;

function mathErrors(text: string): string[] {
  const out: string[] = [];
  if ((text.match(/\$/g) ?? []).length % 2) out.push(`odd number of $ in: ${text}`);
  for (const [, tex] of text.matchAll(/\$([^$]+)\$/g)) {
    try {
      katex.renderToString(tex, { throwOnError: true });
    } catch (e) {
      out.push(`${(e as Error).message} in: ${tex}`);
    }
  }
  return out;
}

function markErrors(text: string): string[] {
  const out: string[] = [];
  if ((text.match(/\*\*/g) ?? []).length % 2) out.push(`unclosed ** in: ${text}`);
  const opens = (text.match(/<u>/g) ?? []).length;
  if (opens !== (text.match(/<\/u>/g) ?? []).length) out.push(`unclosed <u> in: ${text}`);
  return out;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function figureErrors(f: Figure): string[] {
  const out: string[] = [];
  const need = (ok: boolean, why: string) => ok || out.push(`${f.kind}: ${why}`);
  switch (f.kind) {
    case "triangle":
      need(
        Math.abs(f.angles[0] + f.angles[1] + f.angles[2] - 180) < 1e-9,
        "angles must sum to 180"
      );
      need(
        f.angles.every((a) => a > 0),
        "every angle must be above 0"
      );
      break;
    case "circle":
      need(f.angle > 0 && f.angle < 360, "angle must be between 0 and 360");
      break;
    case "angles":
      need(f.tilt >= 20 && f.tilt <= 89, "tilt must be 20 to 89");
      break;
    case "passage":
      for (const m of f.marks) need(f.text.includes(m.find), `mark "${m.find}" is not in the text`);
      break;
    case "notes":
      need(
        f.pick.every((i) => i >= 0 && i < f.notes.length),
        "pick points past the notes"
      );
      break;
    case "words":
      need(f.words.filter((w) => w.fit).length === 1, "exactly one word must fit");
      need(/_{3,}/.test(f.sentence), "the sentence needs a blank (______)");
      break;
    case "sentence":
      for (const j of f.joints ?? [])
        need(j.after >= 0 && j.after < f.parts.length, "a joint points past the parts");
      if (f.link)
        need(
          [f.link.from, f.link.to].every((i) => i >= 0 && i < f.parts.length),
          "the link points past the parts"
        );
      break;
    case "tape":
      need(
        f.bars.every((b) => b.parts.every((p) => p.n > 0)),
        "every part needs n above 0"
      );
      break;
    case "plane":
      need(!f.x || f.x[0] < f.x[1], "x window runs backward");
      need(!f.y || f.y[0] < f.y[1], "y window runs backward");
      break;
    case "grid":
      need(
        f.cells.length === f.rows.length && f.cells.every((r) => r.length === f.cols.length),
        "cells must be rows by columns"
      );
      break;
    case "data":
      if (f.chart === "table")
        need(
          f.rows.every((r) => r.length === f.head.length),
          "every row needs one cell per head"
        );
      if (f.chart === "bar") {
        const series = Array.isArray(f.values[0])
          ? (f.values as number[][])
          : [f.values as number[]];
        need(
          series.every((s) => s.length === f.labels.length),
          "one value per label"
        );
      }
      if (f.chart === "line")
        need(
          f.series.every((s) => s.values.length === f.labels.length),
          "one value per label"
        );
      if (f.chart === "box")
        need(
          f.five.every((v, i) => i === 0 || v >= f.five[i - 1]),
          "box out of order"
        );
      break;
  }
  return out;
}

describe("lessons", () => {
  it("the registry lists every lesson and video file", () => {
    expect(() =>
      execFileSync("node", ["scripts/lessons/build-registry.mjs", "--check"], { stdio: "pipe" })
    ).not.toThrow();
  });

  for (const { file, error } of LOADED)
    it(`${file} loads`, () => {
      expect(error).toBeNull();
    });

  it("are named by their skill", () => {
    for (const { file, lesson } of LESSONS) {
      expect(lesson.id, file).toBe(file);
      expect(skill72(file), file).toBeDefined();
    }
  });

  for (const { file, lesson: l } of LESSONS) {
    const skill = skill72(file);
    const math = skill?.section === "Math";

    describe(file, () => {
      it("has every part", () => {
        expect(l.tests.length).toBeGreaterThan(20);
        expect(l.spot.length).toBeGreaterThan(20);
        expect(l.idea.length).toBeGreaterThanOrEqual(2);
        expect(l.idea.length).toBeLessThanOrEqual(4);
        expect(l.strategy.steps.length).toBeGreaterThanOrEqual(2);
        expect(l.examples.length).toBeGreaterThanOrEqual(2);
        expect(l.examples.length).toBeLessThanOrEqual(3);
        expect(l.traps.length).toBeGreaterThanOrEqual(2);
        expect(l.traps.length).toBeLessThanOrEqual(3);
        expect(l.tip.kind).toBe(math ? "calculator" : "reading");
        if (math) expect(l.tip.type?.length ?? 0).toBeGreaterThan(0);
        expect(l.quiz.length).toBeGreaterThanOrEqual(3);
        expect(l.quiz.length).toBeLessThanOrEqual(5);
        for (const e of l.examples) {
          expect(e.steps.length, e.title).toBeGreaterThanOrEqual(2);
          if (e.tryFrom !== undefined) expect(e.tryFrom).toBeLessThan(e.steps.length);
          if (e.choices) {
            expect(e.choices, e.title).toHaveLength(4);
            expect(e.right, e.title).toBeGreaterThanOrEqual(0);
            expect(e.right, e.title).toBeLessThan(4);
          }
          if (!math) expect(e.choices, `${e.title}: Reading examples are questions`).toBeDefined();
        }
      });

      it("asks fair questions", () => {
        for (const q of [l.check, ...l.quiz]) {
          expect(q.choices, q.text).toHaveLength(4);
          expect(new Set(q.choices).size, q.text).toBe(4);
          expect(q.right, q.text).toBeGreaterThanOrEqual(0);
          expect(q.right, q.text).toBeLessThan(4);
          expect(q.why.length, q.text).toBeGreaterThan(30);
        }
        for (const q of l.quiz) expect(q.subject).toBe(math ? "math" : "reading");
        // a passage is short, as on the test
        for (const p of [
          l.check.passage,
          ...l.quiz.map((q) => q.passage),
          ...l.examples.map((e) => e.passage),
        ])
          if (p) expect(words(p), p).toBeLessThanOrEqual(160);
        // the answers are not all in the same place
        expect(new Set(l.quiz.map((q) => q.right)).size).toBeGreaterThan(1);
      });

      it("keeps headings short", () => {
        for (const e of l.examples) expect(words(e.title), e.title).toBeLessThanOrEqual(3);
        for (const t of l.traps) expect(words(t.name), t.name).toBeLessThanOrEqual(4);
        expect(words(l.tip.title), l.tip.title).toBeLessThanOrEqual(5);
        expect(words(l.strategy.name), l.strategy.name).toBeLessThanOrEqual(5);
      });

      it("writes clean text and math", () => {
        const errors = textsOf(l).flatMap((t) => [
          ...mathErrors(t),
          ...markErrors(t),
          ...(BRITISH.test(t) ? [`British spelling in: ${t}`] : []),
          ...(/\bofficial\b|bluebook/i.test(t) ? [`forbidden word in: ${t}`] : []),
          ...(/[—–]/.test(t) ? [`a long dash in: ${t}`] : []),
        ]);
        expect(errors).toEqual([]);
      });

      it("draws pictures from sound numbers", () => {
        const figures = [l.figure, ...l.examples.flatMap((e) => (e.figure ? [e.figure] : []))];
        expect(figures.flatMap(figureErrors)).toEqual([]);
      });

      it("has the answers a second writer worked out", () => {
        const c = CHECKS.get(file);
        expect(c, `checks/${file}.ts is missing`).toBeDefined();
        if (!c) return;
        expect(c.examples).toHaveLength(l.examples.length);
        expect(c.quiz).toHaveLength(l.quiz.length);
        const hits = (want: LessonChecks["check"], choices: Rich[]) =>
          choices.flatMap((ch, i) => (meets(want, ch, i) ? [i] : []));
        l.examples.forEach((e, i) => {
          if (e.choices) expect(hits(c.examples[i], e.choices), e.title).toEqual([e.right]);
          else expect(meets(c.examples[i], e.answer, -1), `${e.title}: ${e.answer}`).toBe(true);
        });
        expect(hits(c.check, l.check.choices), l.check.text).toEqual([l.check.right]);
        l.quiz.forEach((q, i) => {
          expect(hits(c.quiz[i], q.choices), q.text).toEqual([q.right]);
        });
      });
    });
  }
});

describe("lesson coverage", () => {
  it("only uses the 72 skills", () => {
    const ids = new Set(SKILLS72.map((s) => s.id));
    for (const { file } of LESSONS) expect(ids.has(file), file).toBe(true);
  });
});
