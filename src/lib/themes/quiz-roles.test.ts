import { describe, expect, it } from "vitest";
import { SITE_THEMES } from "./palettes";
import { contrastRatio, quizRoleStyleSheet, quizRoles } from "./quiz-roles";

describe("quiz roles in every account theme", () => {
  for (const theme of SITE_THEMES)
    describe(theme.name, () => {
      const r = quizRoles(theme);
      it("text and muted text pass AA on the panel", () => {
        expect(contrastRatio(r["quiz-text"], r["quiz-panel"])).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(r["quiz-text-muted"], r["quiz-panel"])).toBeGreaterThanOrEqual(4.5);
      });
      it("all five pens reach 3:1 on the panel and are distinct", () => {
        const pens = [1, 2, 3, 4, 5].map((n) => r[`quiz-pen-${n}`]);
        for (const pen of pens)
          expect(contrastRatio(pen, r["quiz-panel"]), pen).toBeGreaterThanOrEqual(3);
        expect(new Set(pens).size).toBe(5);
      });
      it("text stays readable on every highlight", () => {
        for (const n of [1, 2, 3])
          expect(contrastRatio(r["quiz-text"], r[`quiz-highlight-${n}`])).toBeGreaterThanOrEqual(
            4.5
          );
      });
      it("accent, correct and wrong reach 3:1 on the panel", () => {
        for (const role of ["quiz-accent", "quiz-correct", "quiz-wrong"])
          expect(contrastRatio(r[role], r["quiz-panel"]), role).toBeGreaterThanOrEqual(3);
      });
      it("text passes AA on the soft correct bar", () => {
        expect(contrastRatio(r["quiz-text"], r["quiz-correct-soft"])).toBeGreaterThanOrEqual(4.5);
      });
    });
  it("the quiz role stylesheet covers every account theme", () => {
    for (const theme of SITE_THEMES)
      expect(quizRoleStyleSheet()).toContain(`html[data-theme="${theme.id}"]{--quiz-bg:`);
    expect(quizRoleStyleSheet()).toMatch(/html\[data-theme="observatory"\]\{[^}]*--quiz-pen-5:#/);
  });
});
