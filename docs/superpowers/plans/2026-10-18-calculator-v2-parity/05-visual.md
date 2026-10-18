# 05 visual: the Desmos-feel retune

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curves in a calm red, blue, green, purple, neutral and orange; shading close to Desmos's
strength without any curve dropping below 4.5:1; 2.5 px strokes, 10 px points, 12/6 dashes for
strict inequalities, a neutral 1 px grid and 1.5 px axes; rows with no boxes and a filled gutter
when focused; the window title in Arial.

**IDs:** TH-6, TH-7, TH-8, TH-17, TH-19; G-25; L-3, L-16.

**Owns:** `theme/derive.ts`, `theme/targets.ts`, the generated colour files,
`render/constants.ts`, `styles/list.css` (row look), `src/components/calculator/CalculatorWindow.module.css`
(title font only; v2 path, v1 never renders it).

## Decisions

- **Palette (TH-6 amended, owner decision 5):** slots c1 to c6 take hue windows red 15–40°,
  blue 235–265°, green 130–160°, purple 285–315°, neutral (C < 0.03, the text hue), orange 45–70°.
  Each chromatic slot has chroma at most 0.17 (light skins) or 0.14 (dark), and all chromatic
  slots share one 0.10-wide OKLCH lightness band. Candidates still need 5.95:1 on the paper.
  The search picks the band and the per-slot colour that maximise the minimum pairwise ΔE_OK over
  normal vision and the three Machado simulations; TH-7's 0.08 floor is kept and checked.
- **Shading (TH-8 amended, decision 4):** per skin, the combined cap is
  min over slots of contrast(slot, paper) / 4.5 (contrast ratios of colours on the same side of the
  paper divide exactly), never above the contrast of a 40% mix; each single fill uses
  min(40%, the opacity reaching cap / 1.04), so overlaps keep the 1.04 step. Generated per skin
  as `shadingCap`.
- **Sizes (G-25 added):** curves 2.5 px (selected 4 px), points 10 px discs, dashes 12 on 6 off,
  axes 1.5 px, grid lines 1 px. **Grid (TH-19 added):** both gridline roles have OKLCH chroma at
  most 0.02.
- **Rows (L-16 added, L-3 amended):** no field border, fill or box around unfocused math; one 1 px
  rule between rows; the focused row fills its whole gutter cell in the focused-row colour (row
  number in its label colour) and keeps the 2 px TH-14 outline.
- **Fonts (TH-17 amended, decision 7):** the window title and every calculator UI text use
  `Arial, sans-serif`; only math uses KaTeX fonts.

---

### Outcome of Task 1 (decided 2026-10-18)

Task 1 was not shipped. A search over the OKLCH grid with the hue windows above, chroma limits
and one 0.10-wide lightness band found no palette that meets TH-7's 0.08 ΔE_OK floor under the
three colour-vision simulations: the best minimum was 0.012 to 0.046 on dark skins and 0.03 to
0.07 on light skins (red, orange and green collapse under deutan and protan simulation inside one
lightness band). Widening the band to 0.25 reached 0.08 only on some light skins, and only with
near-black curves. Under normal vision alone the windows give calm colours with a minimum of
0.13 to 0.16 (for example #fd8993, #43befd, #68ca80, #c499f9, grey and #e9a03e on Observatory).
Shipping that would drop the colour-blind guarantee. Decision (the founder delegated it): TH-7
under simulation wins, so the TH-6 palette stays as it is and the Desmos hue order is dropped; the
f-desmos-parity.md decision 5 records this. Tasks 2 to 4 shipped.

### Task 1: The curve palette (TH-6, TH-7)

**Files:** modify `theme/derive.ts`, `theme/targets.ts`, `scripts/calculator-v2/generate-skin-colors.ts`
(regenerate); tests `theme/derive.test.ts`, `theme/contrast.test.ts`. Spec edit: amend TH-6.

- [ ] **Step 1: failing tests.** `it("TH-6 slots follow the hue order red, blue, green, purple, neutral, orange in every skin")`; `it("TH-6 chromatic slots keep chroma at most 0.17 on light skins and 0.14 on dark and share a 0.10 lightness band")`; `it("TH-6 every slot is at least 5.95:1 on the paper")`; `it("TH-7 the minimum pairwise ΔE_OK is at least 0.08 under normal vision and the three simulations")`.
- [ ] **Step 2–4:** fail, implement, regenerate (`npx tsx scripts/calculator-v2/generate-skin-colors.ts`), pass. **Step 5: commit** `Retune calculator v2 curve colours to a calm Desmos-feel palette (TH-6, TH-7)`.

### Task 2: Shading strength (TH-8)

**Files:** modify `theme/derive.ts`, `theme/contrast.ts`, `theme/skins.ts` (`shadingCap`),
`render/shading.ts`; tests `theme/shading.test.ts`; `tests/calculator/v2/graph.spec.ts` TH-8 case
reads the per-skin cap. Spec edit: amend TH-8 (and the TH-8 row of section 10.3).

- [ ] **Step 1: failing tests.** `it("TH-8 each skin's cap keeps every curve at 4.5:1 over any shading and never exceeds a 40% mix")`; `it("TH-8 single fills use min(40%, the cap over 1.04) so an overlap stays 1.04 apart")`.
- [ ] **Step 2–4:** fail, implement, regenerate, pass. **Step 5: commit** `Raise calculator v2 shading toward Desmos strength within the curve contrast rule (TH-8)`.

### Task 3: Strokes, points, dashes, axes and a neutral grid (G-25, TH-19)

**Files:** modify `render/constants.ts`, `theme/derive.ts` (grid roles), tests
`render/draw-geometry.test.ts`, `render/draw-grid.test.ts`, `theme/derive.test.ts`. Spec edit: add
G-25 after G-24 in A and TH-19 after TH-18 in E.

- [ ] **Step 1: failing tests.** `it("G-25 curves stroke 2.5 px, points are 10 px discs, strict boundaries dash 12 on 6 off and axes are 1.5 px")`; `it("TH-19 major and minor gridlines have OKLCH chroma at most 0.02 and keep their contrast targets")`.
- [ ] **Step 2–4:** fail, implement, regenerate, pass. **Step 5: commit** `Set calculator v2 stroke, point, dash and axis sizes and a neutral grid (G-25, TH-19)`.

### Task 4: Rows and fonts (L-3, L-16, TH-17)

**Files:** modify `styles/list.css`, `styles/base.css`, `CalculatorWindow.module.css`; regenerate
`styles/generated.ts`; tests `ui/list/ExpressionRow.test.tsx` (class contract),
`tests/calculator/v2/shell.spec.ts` (computed styles). Spec edit: amend L-3 and TH-17, add L-16.

- [ ] **Step 1: failing tests.** `test("L-16 unfocused rows have no border, fill or box around the math and are separated by one 1 px rule")`; `test("L-3 the focused row fills its whole gutter in the focused-row colour")`; `test("TH-17 the window title and calculator UI text use Arial")` (quiz fixture).
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Retune calculator v2 rows and use Arial for the window title (L-3, L-16, TH-17)`.

**Package gate:** section 3 of `00-index.md`, plus `graph.spec.ts`, `shell.spec.ts`,
`quiz-chrome-theme.spec.ts` on every runnable project, `check-spec-ids --ids` with this package's IDs.
