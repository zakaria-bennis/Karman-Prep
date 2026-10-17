# 03 foundations: skin colours and contrast, chrome sheet, rollout flag, provider and import rules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Package:** `foundations`, increment 1A, wave 0, depends on nothing. Header, Global Constraints and
Review Focus: `00-index.md`. Contracts: `01-interfaces-runtime.md` section 6 (theme) and
`01-interfaces-integration.md` section 13.1 (seam foundations); every name below matches them.
The lead owns both contract files (index section 4) and applies the comment diffs of coordination
notes 3 and 4 before wave 0; no 03 task edits a `01-*.md` file (Tasks 4 and 8 only check them).

**IDs:** TH-1, TH-3 to TH-8, TH-10, TH-11; AR-1, AR-2, AR-6, AR-7, AR-19. **Open items:** OI-1
(Task 5), OI-30 (Task 9), and OI-34 (Task 6) and OI-33 (Task 3), which this package opens and the
lead numbers in index 6.2 (notes 6 and 7; steps find them by text). **Contributions (index 5.3):**
03 contributes AR-57 (owner 10) in `report-error.test.ts` (Task 8) and AR-24 (owner 11) in
`seam-boundaries.test.ts` (Task 12). Others contribute (rows in 5.3): 11 to AR-7, 07 to TH-10, 08,
10, 11 and 14 to TH-1 and TH-8, 09 to TH-11 (the row note) and 14 to TH-8 (notes 8 and 9).

**Package rules.**

- Theme files and the generator import each other and `src/lib/themes/palettes.ts` by relative
  path (no `@/`), so `npx tsx` and Vitest load them alike. `palettes.ts` is never modified (TH-2).
- Phase 1 checks normal contrast in all 12 skins; reverse contrast joins with TH-13 (overview 7.3).
  Colours are lowercase `#rrggbb`.
- Every scan (TH-3, AR-19, AR-1, AR-2, AR-7) first runs its checker on synthetic in-memory sources
  that must be flagged, then enumerates real files at run time (`readdirSync(dir, { recursive: true })`,
  skipping `*.test.ts(x)` and `__fixtures__/`), so files later packages add are covered unedited.
  Scan helpers live in their test file; the step that writes the failing tests declares them as
  `throw new Error("not implemented")`.
- `ROOT` is the repo root, defined in each test that uses it by folder depth: `resolve(__dirname, "../../../..")`
  in `src/lib/calculator-v2/theme/` (generated, no-raw-colours) and `resolve(__dirname, "../../..")`
  in `src/components/calculator/` (breakpoints, seam-boundaries).
- Run commands under Node 22 (`n exec 22 <command>`, index section 1). Unit tests use the node
  environment unless the file starts with `// @vitest-environment jsdom`.
- Expected failures quote Vitest 4.1 with Vite 8 (the locked versions). A missing module fails a
  node-environment file with `Error: Cannot find module './x' imported from <absolute path>` and a
  jsdom file with `Error: Failed to resolve import "./x" from "<file>". Does the file exist?`. Calling
  a missing named export fails that test with `TypeError: x is not a function`. Steps quote the part
  that names the missing module or export.
- Each task ends with `git add <the task's Files> && git commit -m "<message given>"`.
- Test bullets give the exact title, then the assertions as code (`a` is `b` means `toBe`/`toEqual`).

---

### Task 1: Colour math (TH-4)

**Files:** create `src/lib/calculator-v2/theme/skins.ts`, `targets.ts`, `contrast.ts`; test
`src/lib/calculator-v2/theme/contrast.test.ts`.

**Interfaces.** Consumes nothing. Produces section 6's `skins.ts` exactly and `contrast.ts`'s
`contrastRatio`, `toOklch`, `fromOklch`, `adjustLightness`, `simulateCvd`, `deltaEOk`,
`compositeOver` (`compositeShading` follows in Task 4). Internal to 03:

```ts
// skins.ts
export const COLOR_ROLES: readonly ColorRole[]; // section 6 order: paper … accent, then text … boundary
export const CURVE_SLOTS: readonly CurveSlot[]; // c1 … c6
// targets.ts (only a type import of ./skins)
export type RoleTarget = {
  fg: ForegroundRole;
  on: readonly ColorRole[];
  min: number;
  max?: number;
};
export const TEXT_BACKGROUNDS: readonly ColorRole[]; // paper, list, chrome, key, keyOperator
export const ROLE_TARGETS: readonly RoleTarget[];
// contrast.ts
export function toOklab(hex: string): readonly [number, number, number];
export function inGamut(l: number, c: number, h: number): boolean; // every linear sRGB channel in [-1e-7, 1 + 1e-7]
```

`targets.ts` constants: `CURVE_TARGET = 5.85` (10.3, TH-11 with OI-1), `CURVE_CANDIDATE_TARGET = 5.95`
(TH-6), `ADJUST_STEP = 0.005` and `ADJUST_MARGIN = 0.05` (TH-4), `FILL_CONTRAST = 1.15`,
`SHADING_CAP = 1.3`, `OVERLAP_STEP = 1.04` (TH-8), `MIN_CURVE_DELTA_E = 0.08` (TH-7),
`MINOR_GRID_TARGET = 1.5` (middle of TH-1's 1.4 to 1.6). `ROLE_TARGETS`, in order (10.3 foreground
table): text on `TEXT_BACKGROUNDS` 7; textSecondary on `TEXT_BACKGROUNDS` 7; error on list 7; axis
on paper 7; gridMajor on paper 3; gridMinor on paper min 1.4 max 1.6; focusRing on
`TEXT_BACKGROUNDS` 3; focusBarLabel on focusBar 7; accentLabel on accent 7; boundary on list,
chrome, key 3.

10.3 asks primary text for "7:1 on every background role", accent included, which no skin can meet:
the accent is darkened until a light accentLabel reaches 7:1, so text on it is 1.46 to 2.07:1.
Labels on the accent use accentLabel and secondary text never sits on it, so text and
textSecondary use `TEXT_BACKGROUNDS`; OI-33 (note 7) amends 10.3 to match in Task 3 Step 1.

- [ ] **Step 1: Write the failing tests** in `contrast.test.ts`:
  - `it("TH-4 Warm ivory secondary text and Clean paper Enter fill move to the spec's colours")`: `adjustLightness("#536457", "#fffdf7", 7)` is `"#495a4d"`; `adjustLightness("#735925", "#ffffff", 7)` is `"#6d531f"`.
  - `it("TH-4 a missing role moves only in OKLCH lightness, away from its background, to the target plus 0.05")`: for `[color, bg, target, out]` in `[["#536457","#fffdf7",7,"#495a4d"], ["#bdcbbf","#293c32",7,"#bfcdc1"], ["#8495ab","#e8edf4",3,"#77879d"]]`: `adjustLightness(color, bg, target)` is `out`; `contrastRatio(out, bg) >= target + 0.05`; `|toOklch(out).h - toOklch(color).h| < 2`; `toOklch(out).c <= toOklch(color).c + 0.002`; `Math.sign(toOklch(out).l - toOklch(color).l)` is `toOklch(bg).l > toOklch(color).l ? -1 : 1`.
  - `it("TH-4 a colour that already meets its target is returned unchanged")`: `adjustLightness("#81917F", "#fffdf7", 3)` is `"#81917f"`.
  - `it("TH-4 colour math reference values")`: `contrastRatio("#000000", "#ffffff")` close to 21 (10 places); `contrastRatio("#ffffff", "#777777")` close to 4.478 (3); `fromOklch(l, c, h)` of `toOklch("#285b79")` is `"#285b79"`; `deltaEOk("#000000", "#ffffff")` close to 1 (3); `compositeOver("#000000", 0.5, "#ffffff")` is `"#808080"`; `compositeOver("#285b79", 0.25, "#fffdf7")` is `"#c9d5d8"`; `compositeOver("#285b79", 0, "#fffdf7")` is `"#fffdf7"`; `simulateCvd("#ff0000", "protan")` is `"#6d5f00"`, `("#ff0000", "deutan")` `"#a39000"`, `("#0000ff", "tritan")` `"#006b96"`, `("#285b79", "deutan")` `"#425278"`; `contrastRatio("red", "#ffffff")` throws `"Expected #rrggbb"`; with `o = toOklch("#285b79")`, `inGamut(o.l, o.c, o.h)` is true; `inGamut(0.5, 0.1, 140)` is true; `inGamut(0.5, 0.3, 140)` is false.
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/theme/contrast.test.ts` fails: `Cannot find module './contrast'`.
- [ ] **Step 3: Implement the three files.** Non-`#rrggbb` input (any case accepted) throws
      `Error("Expected #rrggbb, got <value>")`. sRGB transfer is the standard piecewise curve; OKLab
      is Ottosson 2020 from linear sRGB; `toOklch` hue is degrees in [0, 360), 0 when c < 1e-9.
      `compositeOver` mixes 8-bit gamma-encoded channels, `Math.round(a·c + (1 − a)·b)` with `a`
      clamped to [0, 1], as canvas and CSS alpha do. `simulateCvd` multiplies linear sRGB by the
      Machado 2009 severity 1.0 matrix, clamps to [0, 1] and encodes: protan
      `[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]]`,
      deutan `[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]]`,
      tritan `[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]`.
      `deltaEOk` is the Euclidean distance of `toOklab` values. The tests pin these two algorithms:

```ts
// inGamut(l, c, h): OKLCH → OKLab → linear sRGB (Ottosson 2020); true when every linear channel
//   is within [-1e-7, 1 + 1e-7].
// fromOklch(l, c, h): l clamped to [0, 1], c to >= 0. When !inGamut(l, c, h), 24 bisection steps
//   on chroma in [0, c], keeping the in-gamut bound. Encode: clamp linear to [0, 1], sRGB
//   transfer, Math.round(255 · v), lowercase hex.
// adjustLightness(color, bg, target):
//   if contrastRatio(color, bg) >= target return the lowercased color
//   { l, c, h } = toOklch(color); dir = toOklch(bg).l > l ? -1 : 1
//   for n = 1 … 200: out = fromOklch(l + dir · ADJUST_STEP · n, c, h)
//     if contrastRatio(out, bg) >= target + ADJUST_MARGIN return out
//   return fromOklch(dir < 0 ? 0 : 1, c, h)
```

- [ ] **Step 4:** the Step 2 command passes (4 tests).
- [ ] **Step 5: Commit** "Add calculator v2 colour math and the TH-4 adjustment rule".

### Task 2: Role derivation, curve palettes and fill alphas (TH-6)

**Files:** create `src/lib/calculator-v2/theme/derive.ts`; test `derive.test.ts` (same folder).

**Interfaces.** Consumes Task 1 and `type SiteTheme`, `SITE_THEMES` from `palettes.ts`. Produces
(internal to 03, used by Tasks 3 to 5):

```ts
export function deriveRoles(theme: SiteTheme): Record<ColorRole, string>;
export interface CurveCandidate {
  hex: string; // encoded from the OKLCH grid point l, c, h
  l: number;
  c: number;
  h: number;
  contrast: number; // contrastRatio(hex, paper)
  labs: readonly (readonly [number, number, number])[]; // toOklab: normal, protan, deutan, tritan
}
export function curveCandidates(paper: string): CurveCandidate[];
export function curveScore(candidate: CurveCandidate, chosen: readonly CurveCandidate[]): number;
export function pickCurveSlots(candidates: readonly CurveCandidate[]): Record<CurveSlot, string>;
export function fillAlphaFor(color: string, paper: string): number;
export function buildSkinPalette(theme: SiteTheme): SkinPalette;
export function buildSkinColors(
  themes: readonly SiteTheme[]
): Record<SkinId, { normal: SkinPalette }>;
```

- [ ] **Step 1: Write the failing tests** in `derive.test.ts` (`t(id)` finds a theme in `SITE_THEMES`):
  - `it("TH-3 background, label and unadjusted roles come from the 10.3 mapping")`: for every theme `t`, `r = deriveRoles(t)`: `[r.paper, r.list, r.chrome, r.key, r.keyOperator]` is `t.dark ? [t.canvas, t.surface, t.canvas, t.raised, t.surface] : [t.surface, t.surface, t.raised, t.surface, t.canvas]`; `[r.accentLabel, r.focusBarLabel]` is `t.dark ? [t.canvas, t.canvas] : [t.surface, t.surface]`; `r.text` is `t.text`; `r.axis` is `t.text`; `r.focusRing` is `t.math`; when `t.dark` is true, `r.accent` is `t.gold` (10.3 sources with no "adjusted"; Step 3 still routes them through `adjust`, which returns them unchanged in all 12 skins).
  - `it("TH-4 Clean paper's Enter fill derives to #6d531f")`: `deriveRoles(t("paper")).accent` is `"#6d531f"`.
  - `it("TH-6 candidates are in-gamut OKLCH grid colours at least 5.95:1 on the paper")` (timeout 60 000): for every theme, `cands = curveCandidates(deriveRoles(t).paper)`: `cands.length > 1000`; hexes unique; for each `c`: `c.contrast` is `contrastRatio(c.hex, paper)` and `>= 5.95`; `c.l * 100`, `(c.c - 0.07) / 0.015` are integers within 1e-9; `c.c <= 0.26`; `c.h % 4` is 0; `inGamut(c.l, c.c, c.h)` is true; `Math.abs(toOklch(c.hex).l - c.l) < 0.005` and `Math.abs(toOklch(c.hex).c - c.c) < 0.005`; `c.labs` is `[toOklab(c.hex), ...CVD.map((k) => toOklab(simulateCvd(c.hex, k)))]` with `CVD = ["protan", "deutan", "tritan"] as const`.
  - `it("TH-6 slot c1 is the highest-chroma candidate with hue 240 to 270 and each later slot maximises the minimum ΔE_OK")` (timeout 60 000): for every theme, `slots = pickCurveSlots(cands)`; the candidate of `slots.c1` (`p`) has `240 <= h <= 270` and `c` equal to the largest `c` among candidates with `240 <= h <= 270`; `curveScore(p, [])` is `Infinity`; for every `x` of `cands` whose hex is not `p.hex`, `curveScore(x, [p])` is close to (10 places) `Math.min(deltaEOk(x.hex, p.hex), ...CVD.map((k) => deltaEOk(simulateCvd(x.hex, k), simulateCvd(p.hex, k))))` (each vision compared with itself only); with `chosen = [p]`, for c2 … c6 in order, `curveScore(pick, chosen)` is `Math.max(...cands.map((x) => curveScore(x, chosen)))`, then `chosen.push(pick)`.
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/theme/derive.test.ts` fails: `Cannot find module './derive'`.
- [ ] **Step 3: Implement `derive.ts`.** `deriveRoles` sources, light / dark (`adjust` is
      `adjustLightness`; `adjustAll(color, bgs, target)` repeats `adjust` against the lowest-contrast
      background until all reach the target, throwing after 10 rounds; role names stand for their
      derived colours): paper surface / canvas; list
      surface; chrome raised / canvas; key surface / raised; keyOperator canvas / surface;
      accentLabel and focusBarLabel surface / canvas; accent `adjust(gold, accentLabel, 7)`; focusBar
      `adjust(math, focusBarLabel, 7)`; text `adjustAll(text, TEXT_BACKGROUNDS, 7)`; textSecondary
      `adjustAll(muted, TEXT_BACKGROUNDS, 7)`; error `adjust(reading, list, 7)`; axis
      `adjust(text, paper, 7)`; gridMajor `adjust(border, paper, 3)`; gridMinor
      `compositeOver(border, a, paper)` for the largest `a` in 1.00, 0.99, … 0 at most
      `MINOR_GRID_TARGET` against the paper; focusRing `adjustAll(math, TEXT_BACKGROUNDS, 3)`;
      boundary `adjustAll(border, [list, chrome, key], 3)`. `buildSkinPalette(t)` is
      `{ dark: t.dark, roles, curves, fillAlpha }` with `fillAlpha[s] = fillAlphaFor(curves[s], roles.paper)`;
      `buildSkinColors` keys by `SKIN_IDS` and throws `Error("palettes.ts themes do not match SKIN_IDS")`
      when the ids differ. The algorithms the tests do not fully pin:

```ts
// curveCandidates(paper): for li 0..100, k 0..12, hi 0..89 (nested in that order):
//   l = li / 100, c = 0.07 + 0.015 · k, h = 4 · hi; skip unless inGamut(l, c, h);
//   hex = fromOklch(l, c, h); skip a hex already seen; keep when
//   contrastRatio(hex, paper) >= CURVE_CANDIDATE_TARGET; labs[0] = toOklab(hex),
//   labs[1..3] = toOklab(simulateCvd(hex, "protan" | "deutan" | "tritan"))
// curveScore(x, chosen): Infinity when chosen is empty, else the minimum over s in chosen and
//   v in 0..3 of Math.hypot(x.labs[v][0] - s.labs[v][0], x.labs[v][1] - s.labs[v][1],
//   x.labs[v][2] - s.labs[v][2]) (same vision only, never across visions)
// pickCurveSlots: c1 = among 240 <= h <= 270 the highest c, then highest contrast, then first;
//   c2..c6 = the strictly greatest curveScore against the slots so far (ties keep the first)
// fillAlphaFor(color, paper): smallest a in 0.001, 0.002, … 1 with
//   contrastRatio(compositeOver(color, a, paper), paper) >= FILL_CONTRAST; 1 if none
```

- [ ] **Step 4:** the Step 2 command passes (4 tests).
- [ ] **Step 5: Commit** "Derive calculator roles and TH-6 curve palettes from the site skins".

### Task 3: Generator, generated table, chrome sheet, skin fallback and table contrast (TH-5, TH-1, TH-7)

**Files:** create `src/lib/calculator-v2/theme/vars.ts`, `roles.ts`,
`scripts/calculator-v2/generate-skin-colors.ts`; generate `src/lib/calculator-v2/theme/skin-colors.generated.ts`
and `src/components/calculator/calculator-chrome.generated.css`; modify `scripts/check-file-sizes.mjs`,
`docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` (OI-33); test
`src/lib/calculator-v2/theme/generated.test.ts`, `roles.test.ts`, `contrast-suite.test.ts`.

**Interfaces.** Consumes `buildSkinColors` (Task 2), `SITE_THEMES`; the contrast suite consumes
`ROLE_TARGETS`, `CURVE_SLOTS`, `contrastRatio`, `compositeOver`, `simulateCvd` and `deltaEOk`
(Task 1). Produces section 6's `SKIN_COLORS`, `ROLE_VARS`, `CURVE_VARS`, `FILL_ALPHA_VARS` (declared
in `vars.ts`; `roles.ts` re-exports them with
`export { ROLE_VARS, CURVE_VARS, FILL_ALPHA_VARS, CHROME_VARS, type ChromeRole } from "./vars";`, so
section 6's names and paths hold) and `resolveSkinId`; internal to 03:

```ts
// vars.ts: its only import is `import type { ColorRole, CurveSlot } from "./skins"`. The generator
// and Task 6 import the maps from here, never from roles.ts, which imports skin-colors.generated.ts
// from Task 5 on, so the generator still runs when that file is missing or conflicted.
export const ROLE_VARS: Readonly<Record<ColorRole, string>>; // section 6 names
export const CURVE_VARS: Readonly<Record<CurveSlot, string>>;
export const FILL_ALPHA_VARS: Readonly<Record<CurveSlot, string>>;
export type ChromeRole =
  | "chrome"
  | "text"
  | "textSecondary"
  | "boundary"
  | "focusRing"
  | "accent"
  | "accentLabel";
export const CHROME_VARS: Readonly<Record<ChromeRole, string>>;
// scripts/calculator-v2/generate-skin-colors.ts
type SkinTable = Readonly<Record<SkinId, { normal: SkinPalette }>>;
export const GENERATED_FILES: {
  readonly skinColors: "src/lib/calculator-v2/theme/skin-colors.generated.ts";
  readonly chromeCss: "src/components/calculator/calculator-chrome.generated.css";
};
export function skinColorsModule(colors: SkinTable): string; // unformatted
export function chromeStylesheet(colors: SkinTable): string; // unformatted
export function generateSkinColorFiles(): Promise<Record<string, string>>; // path → formatted text
export function syncSkinColorFiles(root: string, mode: "write" | "check"): Promise<string[]>;
```

- [ ] **Step 1: Apply OI-33 to the spec.** Precondition: `grep -c "every background role except the accent" docs/superpowers/specs/calculator-v2/open-items.md`
      prints 1 and that row records the owner's acceptance (note 7); otherwise stop and ask the lead.
      In 10.3's foreground table replace `7:1 on every background role` with
      `7:1 on every background role except the accent, whose labels use the Enter key label role`,
      run `npx prettier --write docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`
      (the table realigns), and `grep -c "every background role except the accent" docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`
      prints 1. `ROLE_TARGETS` (Task 1) is this amended table, so the TH-1 test below checks every pair.
- [ ] **Step 2: Write the failing tests.** In `generated.test.ts`:
  - `it("TH-5 the generator's value imports never reach skin-colors.generated.ts, so it runs when that file is missing")`: from `scripts/calculator-v2/generate-skin-colors.ts`, follow transitively each top-level `ImportDeclaration` or `ExportDeclaration` (`ts.createSourceFile`) whose module specifier starts with `.` and whose clause is not `isTypeOnly` (resolved against the importer's folder, `.ts` appended); the visited repo-relative paths include `src/lib/calculator-v2/theme/vars.ts` and `src/lib/calculator-v2/theme/derive.ts`, and none ends with `skin-colors.generated.ts` or `theme/roles.ts`.
  - `it("TH-5 the checked-in table and chrome sheet match a fresh generation from palettes.ts")` (timeout 60 000): `files = await generateSkinColorFiles()`; `Object.keys(files).sort()` is `[GENERATED_FILES.chromeCss, GENERATED_FILES.skinColors]`; each `readFileSync(join(ROOT, path), "utf8")` is `files[path]`.
  - `it("TH-5 SKIN_IDS are the palettes.ts themes in order")`: `[...SKIN_IDS]` is `SITE_THEMES.map((t) => t.id)`.
  - `it("TH-5 the chrome sheet holds only the seven chrome roles for the 12 skins and the ivory and observatory fallback")`: strip comments from the sheet, read blocks with `/([^{}]+)\{([^{}]*)\}/g` into `{ sel: trimmed selector, decls: name → value }`; the selectors are `[":root", ":root", ...SKIN_IDS.map((id) => 'html[data-theme="' + id + '"]')]`; the sheet matches `/@media \(prefers-color-scheme: dark\) \{\s*:root \{/`; block 0's decls are `expected("ivory")`, block 1's `expected("observatory")`, block `i + 2`'s `expected(SKIN_IDS[i])`, where `expected(s)` maps each `CHROME_VARS[role]` to `SKIN_COLORS[s].normal.roles[role]`; `gzipSync(sheet).length < 10_240`.
  - `it("TH-5 check mode reports drift and write mode repairs it")` (timeout 60 000): in `dir = mkdtempSync(join(tmpdir(), "karman-skins-"))`, `(await syncSkinColorFiles(dir, "write")).sort()` is both paths; `syncSkinColorFiles(dir, "check")` resolves `[]`; after writing `"/* edited */\n"` to the CSS path it resolves `[GENERATED_FILES.chromeCss]`; then `(await syncSkinColorFiles(dir, "write")).sort()` is both paths again, `syncSkinColorFiles(dir, "check")` resolves `[]`, and `readFileSync(join(dir, GENERATED_FILES.chromeCss), "utf8")` is `(await generateSkinColorFiles())[GENERATED_FILES.chromeCss]`.

  In `roles.test.ts`:
  - `it("TH-5 unknown or missing theme ids fall back to Warm ivory or Observatory by prefers-color-scheme")`: `resolveSkinId` of `("paper", true)` `"paper"`, `("plum", false)` `"plum"`, `("unknown", false)` `"ivory"`, `(undefined, false)` `"ivory"`, `(null, true)` `"observatory"`, `("", true)` `"observatory"`.
  - `it("TH-3 every role, curve slot and fill alpha has its own --kc- custom property")`: `ROLE_VARS` equals section 6's 17 names keyed by role (`paper: "--kc-paper"` … `keyOperator: "--kc-key-operator"` … `boundary: "--kc-boundary"`); `Object.values(CURVE_VARS)` is `--kc-curve-1` … `-6`; `Object.values(FILL_ALPHA_VARS)` is `--kc-fill-alpha-1` … `-6`; `Object.values(CHROME_VARS)` is `["--kcc-chrome", "--kcc-text", "--kcc-text-secondary", "--kcc-boundary", "--kcc-focus", "--kcc-accent", "--kcc-accent-label"]`.

  In `contrast-suite.test.ts`, which measures the generated table (`pal(s) = SKIN_COLORS[s].normal`; `fills(s)` = `CURVE_SLOTS` mapped to `{ color: curves[k], alpha: fillAlpha[k] }`; every loop runs over all of `SKIN_IDS`, and each assertion message names the skin and role):
  - `it("TH-1 every 10.3 foreground role meets its target on each background it sits on in all 12 skins")`: for each `t` of `ROLE_TARGETS` and `bg` of `t.on`, `contrastRatio(roles[t.fg], roles[bg]) >= t.min`, and `<= t.max` when set (a comment cites OI-33 for primary text's backgrounds).
  - `it("TH-1 minor gridlines are lighter than major gridlines and curves reach 5.85:1 on the paper")`: `contrastRatio(gridMinor, paper) < contrastRatio(gridMajor, paper)`; every curve `>= 5.85` on the paper.
  - `it("TH-1 light-DOM chrome text and tooltip text reach 7:1 and boundary and focus 3:1 on the chrome")`: text and textSecondary `>= 7` on chrome; boundary and focusRing `>= 3` on chrome; accentLabel `>= 7` on accent.
  - `it("TH-7 the six curve colours are at least 0.08 ΔE_OK apart under normal, protan, deutan and tritan vision")`: for each vision, every pair of the six curves (through `simulateCvd` except normal) has `deltaEOk >= 0.08`.
  - `it("TH-8 each fill alpha gives 1.15:1 against the paper")`: `contrastRatio(compositeOver(color, alpha, paper), paper)` is `>= 1.15` and `< 1.17`.

- [ ] **Step 3:** `npx vitest run src/lib/calculator-v2/theme/generated.test.ts src/lib/calculator-v2/theme/roles.test.ts src/lib/calculator-v2/theme/contrast-suite.test.ts` fails: each file fails to load with `Cannot find module` naming a missing import, `'./roles'` or the generator script for the first two and `'./skin-colors.generated'` for `contrast-suite.test.ts` (its only missing import).
- [ ] **Step 4: Implement `vars.ts`'s maps and `roles.ts`'s re-export and `resolveSkinId`.**
      `resolveSkinId(id, prefersDark)` returns `id` when it is in `SKIN_IDS`, else
      `prefersDark ? "observatory" : "ivory"`. Map key order follows `COLOR_ROLES`, `CURVE_SLOTS` and
      the `ChromeRole` order.
- [ ] **Step 5: Implement the generator** (it imports `CHROME_VARS` from `../../src/lib/calculator-v2/theme/vars`). `skinColorsModule` emits
      `// Generated by scripts/calculator-v2/generate-skin-colors.ts from src/lib/themes/palettes.ts (TH-5). Do not edit.`,
      `import type { SkinId, SkinPalette } from "./skins";` and
      `export const SKIN_COLORS: Readonly<Record<SkinId, { normal: SkinPalette }>> = …` (keys in
      `SKIN_IDS`, `COLOR_ROLES`, `CURVE_SLOTS` order). `chromeStylesheet` emits the same header as a
      CSS comment, `:root { <ivory> }`, `@media (prefers-color-scheme: dark) { :root { <observatory> } }`,
      then `html[data-theme="<id>"] { … }` per skin in `SKIN_IDS` order, each block declaring only
      the seven `CHROME_VARS`. `:root` (specificity 0,1,0) loses to `html[data-theme="<id>"]`
      (0,1,1), so the fallback applies only to a missing or unknown id. `generateSkinColorFiles`
      builds from `buildSkinColors(SITE_THEMES)` and formats each text with
      `prettier.format(text, { ...(await prettier.resolveConfig(abs)), filepath: abs })`, `abs` under
      `REPO_ROOT` (from `import.meta.url`). `syncSkinColorFiles` write mode creates folders and
      writes every file; check mode lists each file missing or different under `root`. CLI (guarded by
      `process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href`): no flag
      writes under `REPO_ROOT`; `--check` prints
      `Generated skin colours are out of date: <paths>. Run npx tsx scripts/calculator-v2/generate-skin-colors.ts`
      and sets `process.exitCode = 1` on drift.
- [ ] **Step 6: Generate and register.** Run `npx tsx scripts/calculator-v2/generate-skin-colors.ts`;
      add `"src/lib/calculator-v2/theme/skin-colors.generated.ts"` and
      `"src/components/calculator-v2/styles/generated.ts"` to `GENERATED` in `scripts/check-file-sizes.mjs`.
- [ ] **Step 7:** `npx vitest run src/lib/calculator-v2/theme/ && npx tsx scripts/calculator-v2/generate-skin-colors.ts --check && node scripts/check-file-sizes.mjs` passes (`generated.test.ts` 5 tests, `contrast-suite.test.ts` 5); `--check` exits 0 (the wave 0 gate).
- [ ] **Step 8: Commit** "Generate the calculator skin colour table and chrome sheet with the 12-skin contrast suite (TH-5, TH-1, TH-7)".

### Task 4: Capped shading (TH-8)

**Files:** modify `src/lib/calculator-v2/theme/contrast.ts`; test
`src/lib/calculator-v2/theme/contrast-suite.test.ts`.

**Interfaces.** Consumes `SKIN_COLORS`, `CURVE_SLOTS`, `SHADING_CAP`, Task 1. Produces section 6's
`compositeShading(paper: string, fills: { color: string; alpha: number }[]): string` with the
comment as the lead amended it (coordination note 3); 08's renderer paints every shaded pixel with it.

- [ ] **Step 1: Precondition.** `grep -c "3 or more" docs/superpowers/plans/2026-10-16-calculator-v2-phase1/01-interfaces-runtime.md`
      prints 1 and `grep -c "fewer-fill" docs/superpowers/plans/2026-10-16-calculator-v2-phase1/01-interfaces-runtime.md`
      prints 0 (the lead applied coordination note 3 before wave 0); otherwise stop and ask the lead.
- [ ] **Step 2: Write the failing tests** in `contrast-suite.test.ts` (`pal`, `fills` and the loop rules as in Task 3):
  - `it("TH-8 shading never exceeds 1.3:1, two fills stay 1.04:1 from one, and every curve stays 4.5:1 over it")`: for each ordered pair `i !== j`, `two = compositeShading(paper, [f[i], f[j]])` has `<= 1.3` against the paper and `>= 1.04` against `compositeShading(paper, [f[i]])` and `[f[j]]`; `compositeShading(paper, fills(s))` is `<= 1.3`; every curve is `>= 4.5` against every one-fill, two-fill and six-fill colour.
  - `it("TH-8 no fills give the paper, one fill under the cap gives that fill over the paper, and one fill over the cap is pulled back to 1.3:1")`: `compositeShading("#fffdf7", [])` is `"#fffdf7"`; `compositeShading("#fffdf7", [{ color: "#285b79", alpha: 0.1 }])` is `"#eaedea"`, which is `compositeOver("#285b79", 0.1, "#fffdf7")` (1.16:1); `over = compositeShading("#fffdf7", [{ color: "#285b79", alpha: 0.25 }])` is `"#dae2e2"` (the uncapped `"#c9d5d8"` is 1.475:1) and `contrastRatio(over, "#fffdf7") <= 1.3`.
- [ ] **Step 3:** `npx vitest run src/lib/calculator-v2/theme/contrast-suite.test.ts`: the five Task 3 tests pass; the two new TH-8 tests fail with `TypeError: compositeShading is not a function`.
- [ ] **Step 4: Implement `compositeShading`:**

```ts
// c = paper; for each fill in order: c = compositeOver(fill.color, fill.alpha, c)
// if contrastRatio(c, paper) <= SHADING_CAP return c
// for k = 999 … 0: d = compositeOver(c, k / 1000, paper); if contrastRatio(d, paper) <= SHADING_CAP return d
```

- [ ] **Step 5:** the Step 3 command passes (7 tests).
- [ ] **Step 6: Commit** "Add capped inequality shading (TH-8)".

### Task 5: Row colours, host CSS and OI-1 (TH-10, TH-11)

**Files:** modify `src/lib/calculator-v2/theme/roles.ts`,
`docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`; test `roles.test.ts`,
`contrast-suite.test.ts`.

**Interfaces.** Consumes `SKIN_COLORS`, `fillAlphaFor`, `adjustLightness`, `compositeShading`,
`CURVE_TARGET`. Produces section 6's `nextSlot(index: number): CurveSlot`,
`resolveRowColor(color: string, skin: SkinId): { hex: string; fillAlpha: number; adjusted: boolean }`,
`hostThemeCss(skin: SkinId): string` and
`EXPLICIT_COLOUR_NOTE = "Colour adjusted for contrast on this theme"` (07 API-2, 08 renderer, 09
swatches, 10 `:host` theme). TH-10's "slot ids in state and in the API" and "new rows take c1 to
c6" through the engine are 07's index 5.3 contribution; TH-11's "the row shows the note" is 09's
(note 8).

- [ ] **Step 1: Apply OI-1 to the spec.** In TH-11 replace
      `when one is below 4.5:1 (7:1 in reverse contrast) against the paper, its OKLCH lightness is adjusted by the TH-4 rule until it meets the target`
      with
      `when one is below 5.85:1 (8.05:1 in reverse contrast) against the paper, the curve targets of the 10.3 role table and TH-13, its OKLCH lightness is adjusted by the TH-4 rule until it meets that target, so it stays at least 4.5:1 (7:1) over any shading (TH-8, D9)`.
      `grep -c "below 5.85:1 (8.05:1" docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` prints 1.
- [ ] **Step 2: Write the failing tests** in `roles.test.ts` (`pal` as in Task 4):
  - `it("TH-10 new rows take slots c1 to c6 in order and repeat")`: `Array.from({ length: 14 }, (_, i) => nextSlot(i))` is `c1 … c6, c1 … c6, c1, c2`.
  - `it("TH-10 a slot id resolves from the active skin and re-maps when the skin changes")`: for every skin and slot, `resolveRowColor(k, s)` is `{ hex: pal(s).curves[k], fillAlpha: pal(s).fillAlpha[k], adjusted: false }`; `resolveRowColor("c1", "ivory").hex` is not `resolveRowColor("c1", "observatory").hex`; `resolveRowColor("not-a-colour", "paper")` equals `resolveRowColor("c1", "paper")`.
  - `it("TH-11 an explicit hex at 4.53:1 on Warm ivory is lifted to 5.85:1 and stays 4.5:1 over capped shading (OI-1)")`: `contrastRatio("#757575", paper)` close to 4.53 (2); `r = resolveRowColor("#757575", "ivory")` matches `{ hex: "#626262", adjusted: true }`; `contrastRatio(r.hex, paper) >= 5.85`; `shade = compositeShading(paper, [{ color: r.hex, alpha: r.fillAlpha }, { color: curves.c1, alpha: fillAlpha.c1 }])` is `<= 1.3` against the paper and `contrastRatio(r.hex, shade) >= 4.5`.
  - `it("TH-11 explicit colours keep hue and chroma (except to stay in gamut) and move only in lightness")`: for `[hex, skin, out]` in `[["#2E7D32", "ivory", "#207126"], ["#ffd400", "ivory", null], ["#1f3fbf", "observatory", null]]`: `adjusted` is true; `hex` is `out` when given; contrast `>= 5.9` on the paper; `|hue change| < 0.5`; `chroma <= original + 0.002`; `compositeOver(r.hex, r.fillAlpha, paper)` is `>= 1.15` against the paper.
  - `it("TH-11 an explicit colour already at 5.85:1 is unchanged and shows no note")`: `resolveRowColor("#000000", "paper")` matches `{ hex: "#000000", adjusted: false }`; `resolveRowColor("#FFFFFF", "observatory")` matches `{ hex: "#ffffff", adjusted: false }`; `EXPLICIT_COLOUR_NOTE` is `"Colour adjusted for contrast on this theme"`.
  - `it("TH-3 hostThemeCss declares every role, curve and fill alpha of the skin on :host and nothing else")`: `css = hostThemeCss("sage")` starts with `":host{"` and ends with `"}"`; `css.slice(6, -1).split(";")` split on `":"` gives 29 entries: `ROLE_VARS[r]` → `roles[r]`, `CURVE_VARS[k]` → `curves[k]`, `FILL_ALPHA_VARS[k]` → `String(fillAlpha[k])`.
  - In `contrast-suite.test.ts` (TH-11's "the contrast suite includes them"; `pal`, `fills` and the loop rules as in Task 3), `it("TH-11 explicit colours meet 5.85:1 on the paper and 4.5:1 over capped shading in all 12 skins")`: for each skin and each `hex` of `["#757575", "#2e7d32", "#ffd400", "#1f3fbf"]`, `r = resolveRowColor(hex, s)` and `own = { color: r.hex, alpha: r.fillAlpha }`: `contrastRatio(r.hex, paper) >= 5.85`; `contrastRatio(r.hex, compositeShading(paper, [own])) >= 4.5`; for each `f` of `fills(s)`, `contrastRatio(r.hex, compositeShading(paper, [own, f])) >= 4.5`.
- [ ] **Step 3:** `npx vitest run src/lib/calculator-v2/theme/roles.test.ts src/lib/calculator-v2/theme/contrast-suite.test.ts`: the two Task 3 roles tests and the seven earlier suite tests pass; the six new roles tests fail with `TypeError: nextSlot is not a function` (the first), `TypeError: hostThemeCss is not a function` (the last) or `TypeError: resolveRowColor is not a function` (the other four), and the new suite test with `TypeError: resolveRowColor is not a function`.
- [ ] **Step 4: Implement.** `nextSlot(i)` is `CURVE_SLOTS[((i % 6) + 6) % 6]`. `resolveRowColor`: a slot
      id gives the skin's curve and fill alpha, `adjusted: false`; a `#rrggbb` (any case, lowercased)
      at or above `CURVE_TARGET` on the paper keeps itself with `fillAlphaFor(hex, paper)`,
      `adjusted: false`, else `adjustLightness(hex, paper, CURVE_TARGET)` with its own `fillAlphaFor`,
      `adjusted: true`; anything else resolves as `"c1"`. Hex results are memoised in a module `Map`
      keyed `${skin}|${hex}`. `hostThemeCss` is `:host{` + `name:value` pairs joined by `;` (roles in
      `COLOR_ROLES` order, curves, fill alphas as `String(alpha)`) + `}`.
- [ ] **Step 5:** `npx vitest run src/lib/calculator-v2/theme/` passes (`contrast-suite.test.ts` 8 tests).
- [ ] **Step 6: Commit** "Resolve row colour slots and lift explicit colours to 5.85:1 (TH-10, TH-11, OI-1)".

### Task 6: No raw colours in calculator styles, canvas code or the shadow sheet (TH-3, OI-34)

**Files:** modify `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` (OI-34);
test `src/lib/calculator-v2/theme/no-raw-colours.test.ts`.

**Interfaces.** Consumes `ROLE_VARS`, `CURVE_VARS`, `FILL_ALPHA_VARS`, `CHROME_VARS` (from `./vars`),
`GENERATED_FILES`, and `postcss` (devDependency) to parse CSS. Produces nothing; it guards the
stylesheets and canvas code of 05, 08, 09, 10, 11 and 14 and the composed shadow sheet
`CALCULATOR_V2_CSS` (10), built from `vendor/mathquill/mathquill.css` (05, byte-exact per AR-5, so
never edited here) and `src/components/calculator-v2/styles/*.css`. Test-local, with
`MQ_CSS = "vendor/mathquill/mathquill.css"` and `SHADOW_TS = "src/components/calculator-v2/styles/generated.ts"`:

```ts
function rawColourFindings(path: string, source: string): string[]; // "<path>: <match>"
function scannedFiles(root: string): string[]; // repo-relative, sorted
function varFindings(files: readonly { path: string; source: string }[]): string[];
type VendorColour = { selector: string; property: string; value: string; important: boolean };
function vendorColourDecls(css: string): VendorColour[]; // one per selector of each rule, source order
function styleSheets(root: string): { path: string; source: string }[]; // non-test .css in styles/
function overrideFindings(
  vendor: readonly VendorColour[],
  sheets: readonly { path: string; source: string }[]
): string[]; // "<selector> { <property> }", deduplicated, first-seen order
```

- [ ] **Step 1: Apply OI-34 to the spec.** Precondition: `grep -c "every one of whose colour declarations is overridden" docs/superpowers/specs/calculator-v2/open-items.md`
      prints 1 and that row records the owner's acceptance (note 6); otherwise stop and ask the lead.
      In TH-3 replace `outside the two generated files of TH-5` with
      `outside the two generated files of TH-5 and the vendored vendor/mathquill/mathquill.css (AR-5), every one of whose colour declarations is overridden by a later calculator stylesheet rule that takes its colour from a role, except declarations every supported engine ignores (IE progid filters, -moz-box-shadow)`;
      `grep -c "every one of whose colour declarations is overridden" docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` prints 1.
- [ ] **Step 2: Write the failing tests:**
  - `it("TH-3 the scan flags hex, colour functions and named colours in synthetic sources")`: `rawColourFindings` of `("a.css", ".a{color:#2f72dc}")` is `["a.css: #2f72dc"]`; of `("a.css", ".a{background:white;border:1px solid rgb(0 0 0)}")` is `["a.css: white", "a.css: rgb("]`; of `("a.css", "/* #fff */ .a{color:var(--kc-text);outline-color:currentColor}")` is `[]`; of `("a.ts", 'ctx.fillStyle = "#fff";')` is `["a.ts: #fff"]`; of `("a.ts", 'ctx.strokeStyle = "black"; el.style.color = "red";')` is `["a.ts: black", "a.ts: red"]`; of `("a.tsx", 'const label = "Colour 1, blue"; ctx.fillStyle = theme.paper;')` is `[]`; of `("a.tsx", '<div style={{ color: "black" }} />')` is `["a.tsx: black"]`.
  - `it("TH-3 calculator stylesheets and canvas code contain no raw colours outside the two generated files")`: `scannedFiles(ROOT)` contains `"src/lib/calculator-v2/theme/roles.ts"`; the findings over all of them are `[]`.
  - `it("TH-3 the v1 focus colour #2f72dc appears in no v2 file, generated and vendored files included")`: no file of `scannedFiles(ROOT)`, `Object.values(GENERATED_FILES)`, `SHADOW_TS` or `MQ_CSS` (each read when it exists) contains `2f72dc` (lowercased text).
  - `it("TH-3 every --kc- and --kcc- variable a calculator stylesheet reads is a declared role or token")`: `varFindings([{ path: "a.css", source: ".a{color:var(--kc-txt)}" }])` is `["a.css: --kc-txt"]`; over `scannedFiles(ROOT)` it is `[]`.
  - `it("TH-3 the override check lists each vendored colour declaration no later role rule replaces")`: `V` is `.mq-editable-field .mq-cursor{border-left:1px solid black}.mq-math-mode .mq-empty{background:#ccc}.mq-math-mode .mq-selection,.mq-editable-field .mq-selection{background:#B4D5FE !important;background:Highlight !important;color:HighlightText}.mq-x{filter:progid:DXImageTransform.Microsoft.Chroma(color='#3399FF');-moz-box-shadow:#8bd 0 0 1px}.mq-math-mode{font-size:115%}`; `S` is `[{ path: "src/components/calculator-v2/styles/math-field.css", source: ":host .mq-editable-field .mq-cursor{border-left-color:var(--kc-text)}.mq-math-mode .mq-selection{background:var(--kc-focus-bar)}.mq-editable-field .mq-selection{background:var(--kc-focus-bar)!important;color:var(--kc-focus-bar-label)}@media (min-width:1px){.mq-math-mode .mq-empty{background:var(--kc-chrome)}}" }]`; `vendorColourDecls(V).length` is 8 with no `filter` or `-moz-box-shadow` entry; `overrideFindings(vendorColourDecls(V), S)` is `[".mq-math-mode .mq-empty { background }", ".mq-math-mode .mq-selection { background }", ".mq-math-mode .mq-selection { color }"]` (inside `@media`, not `!important`, absent); with `[]` for `S` it has 6 entries.
  - `it("TH-3, OI-34 every colour declaration of the vendored MathQuill sheet is overridden from a role by a later calculator stylesheet")`: `decls = existsSync(join(ROOT, MQ_CSS)) ? vendorColourDecls(<its text>) : []`; when the file exists, each of `["#b4d5fe", "rgba", "black", "#8bd", "#6ae", "#709ac0", "gray", "#d4d4d4", "darkgray", "activeborder"]` (the colours of MathQuill `1cbc1c4128`, 05 part 1 Task 2 Step 4's table: selection, empty block, math borders and blurred-selection text, the two focus shadows, focus border, field and command-input border, blurred selection, text-mode cursor shadow, command input with the cursor) is a whole token (split on `/[\s,()]+/`) of some lowercased `value`; `overrideFindings(decls, styleSheets(ROOT))` is `[]`.
  - `it("TH-3 the composed shadow CSS is built only from the vendored sheet and scanned stylesheets")`: `known = new Set([MQ_CSS, ...scannedFiles(ROOT)])`; when `SHADOW_TS` exists, the paths matched by `/\/\* ([\w./-]+\.css) \*\//g` in its text (10's section headers) are non-empty, include `MQ_CSS`, and each is in `known`.
- [ ] **Step 3:** `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts` fails: every test with `not implemented`.
- [ ] **Step 4: Implement the helpers.** `scannedFiles`: non-test `.css`, `.ts`, `.tsx` under
      `src/components/calculator-v2/` (except `styles/generated.ts`), `src/lib/calculator-v2/render/`,
      `src/lib/calculator-v2/theme/` (except `skin-colors.generated.ts`) and `src/components/calculator/`
      (except v1's `calculator.module.css` and `calculator-chrome.generated.css`); a missing folder
      adds nothing. `rawColourFindings` reports matches in source order. CSS, comments stripped: hex
      `/(?<![\w&.#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi`; colour functions
      `/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi` (reported as name plus `(`); the whole
      words white, black, red, green, blue, gray, grey, silver, yellow, orange, purple, pink, navy,
      teal, maroon, olive, lime, aqua, fuchsia in values of `color`, `background*`, `border*`, `outline*`, `fill`,
      `stroke`, `box-shadow`, `caret-color`, `text-decoration-color`, `accent-color`. TS and TSX
      (TypeScript AST): the hex and colour-function patterns inside string and template literal text;
      a named colour only as the whole string assigned (or given as an object property) to
      `fillStyle`, `strokeStyle`, `shadowColor`, `color`, `background`, `backgroundColor`,
      `borderColor` or `outlineColor`. `varFindings`: every `var(--kc…)` must name a value of the four
      maps or a `--kc-…:` declared in a scanned stylesheet (05's `tokens.css` tokens).
      `vendorColourDecls` walks `postcss.parse(css)` declarations in rules at any depth, one entry
      per `rule.selectors` item (whitespace collapsed), when the value holds a hex or colour function
      (the CSS patterns above, any property), or the property is `color`, `background*`, `border*`,
      `outline*`, `box-shadow`, `-webkit-box-shadow`, `text-shadow`, `caret-color`,
      `text-decoration-color`, `fill` or `stroke` and the value holds, as a whole word in any case, a
      CSS Color 4 named colour (148) or system colour (current and deprecated, so `Highlight` and
      `ActiveBorder` count); it skips what every engine drops (`progid:` values, `-moz-box-shadow`).
      `overrideFindings`: an entry is covered by a rule outside any at-rule whose collapsed
      `rule.selectors` include its selector or `:host ` plus it, declaring a property of
      `COVERS[entry.property]` to a value containing `var(--kc-` or equal to `none` or `transparent`,
      `!important` when the entry is. `COVERS`: `background` and `background-color`, `border` and
      `border-color`, `outline` and `outline-color`, `box-shadow` and `-webkit-box-shadow` each cover
      each other; `border-<side>` and `border-<side>-color` are covered by those two, `border` and
      `border-color`; any other property only by itself. Equal or higher specificity and a later
      place in `CALCULATOR_V2_CSS` (AR-36's order) make a covered declaration win the cascade.
- [ ] **Step 5:** the Step 3 command passes (7 tests).
- [ ] **Step 6: Commit** "Guard calculator styles, canvas code and the vendored MathQuill colours (TH-3, OI-34)".

### Task 7: Breakpoints (AR-19)

**Files:** create `src/components/calculator/breakpoints.ts`; test `breakpoints.test.ts` (same folder).

**Interfaces.** Consumes nothing. Produces section 13.1's `CALCULATOR_DOCK_MIN_WIDTH = 1024`,
`FULL_SCREEN_QUERY = "(max-width: 1023px), (max-height: 500px)"` and
`PHONE_QUERY = "(max-width: 767px), (max-height: 500px)"` (10 and 11 import them). Test-local
helpers `breakpointFindings(path: string, source: string, allow?: ReadonlyMap<string, number>): string[]`
(`"<path>: <text>"`) and `v2Files(root: string): string[]`;
`V1_DOCK = new Map([["src/components/calculator/CalculatorScope.tsx|innerWidth >= 1100", 1]])`.

- [ ] **Step 1: Write the failing tests** (`p = "src/components/calculator-v2/a.ts"`, `scope = "src/components/calculator/CalculatorScope.tsx"`):
  - `it("AR-19 breakpoints.ts exports the dock width and the two media queries")`: the three values above, exactly.
  - `it("AR-19 the scan flags other viewport queries and literal innerWidth comparisons")`: `breakpointFindings(p, 'matchMedia("(max-width: 900px)")')` is `[p + ": (max-width: 900px)"]`; `(p, 'matchMedia(FULL_SCREEN_QUERY); matchMedia("(prefers-reduced-motion: reduce)")')` is `[]`; `(p, 'const q = "(max-width: 1023px),  (max-height: 500px)";')` is `[]`; `(p, "if (window.innerWidth >= 1100) {}")` is `[p + ": window.innerWidth >= 1100"]`; `(scope, "a(innerWidth >= 1100);", V1_DOCK)` is `[]`; `(scope, "a(innerWidth >= 1100); b(innerWidth >= 1100);", V1_DOCK)` is `[scope + ": innerWidth >= 1100"]`; `("a.css", "@media (max-width: 600px) {}")` is `["a.css: (max-width: 600px)"]`; `("a.css", "@media (max-width: 767px), (max-height: 500px) {} @media (prefers-color-scheme: dark) {}")` is `[]`.
  - `it("AR-19 v2 code uses only the breakpoints.ts queries and dock width")`: findings over `v2Files(ROOT)` with `V1_DOCK` are `[]`.
- [ ] **Step 2:** `npx vitest run src/components/calculator/breakpoints.test.ts` fails: `Cannot find module './breakpoints'`.
- [ ] **Step 3: Implement `breakpoints.ts` and the helpers.** `v2Files`: non-test `.ts`, `.tsx`, `.css`
      under `src/components/calculator-v2/`, `src/lib/calculator-v2/` and `src/components/calculator/`,
      except `breakpoints.ts` and v1's `CalculatorShell.tsx`, `CalculatorSurface.tsx` and
      `calculator.module.css` (AR-8). Queries compare lowercased with whitespace collapsed. TS (AST):
      string or template text matching `/\((?:min|max)-(?:width|height)\s*:/` must equal
      `FULL_SCREEN_QUERY` or `PHONE_QUERY` (text: the literal); a `<`, `<=`, `>`, `>=` comparison of
      `innerWidth` or `innerHeight` (bare or as a property) with a numeric literal is a finding (text:
      the expression source) unless `allow` has `path|text` with a count left, counted per call on a
      copy (CalculatorScope keeps v1's dock rule for AR-8). CSS: an `@media` prelude with a width or
      height feature must equal one of the two queries (text: the trimmed prelude).
- [ ] **Step 4:** the Step 2 command passes (3 tests).
- [ ] **Step 5: Commit** "Add calculator breakpoint constants and the AR-19 scan".

### Task 8: Privacy-safe error reporter (AR-57 contribution)

**Files:** create `src/components/calculator/report-error.ts`; test
`src/components/calculator/report-error.test.ts`.

**Interfaces.** Consumes `captureException` (`@sentry/nextjs`). Produces section 13.1's
`reportCalculatorError(error: unknown, build: string | null): void` with the comment as the lead
amended it (coordination note 4); 10's `mountQuizCalculator` passes
`onError: (e) => reportCalculatorError(e, CALCULATOR_V2_BUILD)`.

- [ ] **Step 1: Precondition.** `grep -c "followed only by the original" docs/superpowers/plans/2026-10-16-calculator-v2-phase1/01-interfaces-integration.md`
      prints 1 and `grep -c "without its first line" docs/superpowers/plans/2026-10-16-calculator-v2-phase1/01-interfaces-integration.md`
      prints 0 (the lead applied coordination note 4 before wave 0); otherwise stop and ask the lead.
- [ ] **Step 2: Write the failing tests** with `vi.mock("@sentry/nextjs", () => ({ captureException: mocks.capture }))`, `sent()` = the last call's `[err, hint]`, and a local `class KarmanCalculatorError extends Error { name = "KarmanCalculatorError"; code = "unsupported"; }`:
  - `it("AR-57 reportCalculatorError sends only the error name, its code and the calculator tags")`: after `reportCalculatorError(new KarmanCalculatorError("y=\\frac{1}{2} row 3"), "abc123")`, `err.message` is `"KarmanCalculatorError: unsupported"`, `hint` is `{ tags: { calculator: "v2", build: "abc123" } }`, and `JSON.stringify([err.message, err.stack, hint])` does not match `/frac|row 3/`.
  - `it("AR-57 the stack keeps only frame lines, so a multi-line message cannot leak")`: for `e = new TypeError("x^{2}\nquestion text\nanswer B")` and build `null`: `err.message` is `"TypeError"`; `hint.tags.build` is `"unknown"`; `err.stack.split("\n")[0]` is `"Error: TypeError"` and the rest equals `e.stack.split("\n").filter((l) => /^\s+at\s/.test(l))`; `err.stack` does not match `/x\^|question text|answer B/`.
  - `it("AR-57 non-Error values, odd names and unknown codes are reduced to safe names")`: `reportCalculatorError("y=x^2", "b")` sends `"UnknownError"`; `Object.assign(new Error("m"), { name: "y = 2x + 1", code: "row-7" })` sends `"Error"`.
  - `it("AR-57 a throwing Sentry client never escapes the reporter")`: with `mocks.capture` throwing once, `reportCalculatorError(new Error("x"), "b")` does not throw.
- [ ] **Step 3:** `npx vitest run src/components/calculator/report-error.test.ts` fails: `Cannot find module './report-error'`.
- [ ] **Step 4: Implement.** No v2 import (AR-1): codes are a local
      `["invalid-argument", "unsupported", "destroyed"]`. Name: an object's string `name` matching
      `/^[A-Za-z][A-Za-z0-9_]{0,63}$/`, else `"Error"` for objects and `"UnknownError"` otherwise;
      `: <code>` only for a listed string `code`. The reported `new Error(message)` gets
      `stack = ["Error: " + message, ...frames].join("\n")`, frames being the original lines matching
      `/^\s+at\s/` (V8) or `/^[^@]*@\S+:\d+:\d+$/` (WebKit, Gecko); then
      `captureException(reported, { tags: { calculator: "v2", build: build ?? "unknown" } })` in a
      `try`/`catch` that swallows.
- [ ] **Step 5:** the Step 3 command passes (4 tests).
- [ ] **Step 6: Commit** "Add the privacy-safe calculator error reporter (AR-57)".

### Task 9: Rollout flag resolver, release guard and OI-30 (AR-6)

**Files:** create `src/lib/calculator-version.ts`; modify `scripts/build/check-release-env.mjs`,
`docs/superpowers/specs/calculator-v2/d-architecture-integration.md`; test
`src/lib/calculator-version.test.ts`, `tests/unit/build/check-release-env.test.ts`.

**Interfaces.** Consumes `safeAuth` (`src/lib/auth/dev-auth.ts`), `fetchUserRole` and `AppRole`
(`src/lib/supabase/queries/admin.ts`), `getCloudflareContext` (`@opennextjs/cloudflare`), `cache`
(`react`). Produces section 13.1's `CalculatorVersion`, `CalculatorRollout`,
`readCalculatorRollout`, `VersionDeps`, `defaultVersionDeps`, `resolveCalculatorVersionWith`,
`resolveCalculatorVersion` and `checkRolloutNotInEnvFiles(dir: string): string[]`.

- [ ] **Step 1: Precondition.** `grep -c "^| OI-30" docs/superpowers/specs/calculator-v2/open-items.md`
      prints 1 (the lead appended OI-30 with the owner's decision, index 6.2); at 0, stop and ask the lead.
- [ ] **Step 2: Write the failing resolver tests** in `calculator-version.test.ts`, mocking `@/lib/auth/dev-auth` (`safeAuth`), `@/lib/supabase/queries/admin` (`fetchUserRole`, `resolveEffectiveRole`) and `@opennextjs/cloudflare` (`getCloudflareContext` as `mocks.cf`) through `vi.hoisted`; `afterEach` runs `vi.unstubAllEnvs()` and `vi.resetAllMocks()`; `deps(rollout, over)` builds `{ rollout: () => rollout, userId: vi.fn(async () => "user_1"), role: vi.fn(async () => "admin"), ...over }`:
  - `it("AR-6 readCalculatorRollout accepts off, admins and everyone and maps anything else to off")`: `["off", "admins", "everyone", " admins\n", undefined, "", "Admins", "on"].map(readCalculatorRollout)` is `["off", "admins", "everyone", "admins", "off", "off", "off", "off"]`.
  - `it("AR-6 off gives v1 and everyone gives v2 without a user or role query")`: `deps("off")` resolves `"v1"`, `deps("everyone")` `"v2"`; neither calls `userId` or `role`.
  - `it("AR-6 admins gives v2 only when the signed-in user's role is admin")`: `deps("admins")` resolves `"v2"` with `role` called with `"user_1"`; roles `"student"`, `"tutor"`, `"parent"`, `null` resolve `"v1"`; `userId` resolving `null` gives `"v1"` and never calls `role`.
  - `it("AR-6 a failing role lookup resolves v1")`: `deps("admins", over)` resolves `"v1"` for `over` = an async-throwing `role`, a synchronously throwing `role`, an async-throwing `userId`, and a throwing `rollout`.
  - `it("AR-6 the admin check uses the user's own role while impersonating")`: env `NODE_ENV=development`, `CALCULATOR_V2_ROLLOUT=admins`; `safeAuth` → `{ userId: "user_admin" }`, `fetchUserRole` → `"admin"`, `resolveEffectiveRole` → `"student"`; `resolveCalculatorVersion()` resolves `"v2"`; `fetchUserRole` called with `"user_admin"`; `resolveEffectiveRole` never called.
  - `it("AR-6 the rollout is read on every call, from the shell outside production")`: with `NODE_ENV=development`, `defaultVersionDeps.rollout()` is `"everyone"` after stubbing `everyone` and `"off"` after stubbing `off`; `mocks.cf` never called.
  - `it("AR-6, OI-30 production reads only the Worker binding, so a baked .env value never applies")`: with `NODE_ENV=production` and `CALCULATOR_V2_ROLLOUT=everyone` stubbed: `mocks.cf` → `{ env: {} }` gives `"off"`; → `{ env: { CALCULATOR_V2_ROLLOUT: "admins" } }` gives `"admins"`; throwing → `resolveCalculatorVersion()` resolves `"v1"`.
- [ ] **Step 3:** `npx vitest run src/lib/calculator-version.test.ts` fails: `Cannot find module './calculator-version'`.
- [ ] **Step 4: Implement `calculator-version.ts`.** No `"use client"` and no `server-only` import
      (AR-2 loads it under Vitest node). `readCalculatorRollout` trims and accepts exactly `off`,
      `admins`, `everyone`. `defaultVersionDeps.rollout` reads per call: when
      `process.env.NODE_ENV === "production"` only
      `(getCloudflareContext().env as { CALCULATOR_V2_ROLLOUT?: string }).CALCULATOR_V2_ROLLOUT`, else
      `process.env.CALCULATOR_V2_ROLLOUT`; `userId` is `(await safeAuth()).userId`; `role` is
      `fetchUserRole`. `resolveCalculatorVersionWith` catches every throw or rejection as `"v1"` and
      calls `userId` and `role` only for `admins`;
      `resolveCalculatorVersion = cache(() => resolveCalculatorVersionWith(defaultVersionDeps))`.
- [ ] **Step 5:** the Step 3 command passes (7 tests).
- [ ] **Step 6: Write the failing release-guard tests** in `check-release-env.test.ts` (temp dirs from `mkdtempSync(join(tmpdir(), "karman-env-"))`; `valid` is the file's existing input set):
  - `it("AR-6, OI-30 a .env file that defines CALCULATOR_V2_ROLLOUT stops the release build")`: an empty dir gives `[]`; `.env.local` containing `"FOO=1\n# CALCULATOR_V2_ROLLOUT=admins\n"` and `.env.example` containing `"CALCULATOR_V2_ROLLOUT=admins\n"` still give `[]`; adding `.env.production` with `"export CALCULATOR_V2_ROLLOUT=everyone\n"` and `.env` with `"CALCULATOR_V2_ROLLOUT = admins\n"` gives, for `.env` then `.env.production`, `` `${f} defines CALCULATOR_V2_ROLLOUT; set it with wrangler secret put or in the shell, never in a .env file` ``; the JSON of the result does not match `/everyone|=\s*admins/`.
  - `it("AR-6, OI-30 the release CLI runs the public-input and rollout checks together")`: `spawnSync(process.execPath, [resolve("scripts/build/check-release-env.mjs")], { cwd: dir, env: { ...valid, PATH: process.env.PATH }, encoding: "utf8" })` exits 0 in an empty dir; after writing `.env.production.local` with `"CALCULATOR_V2_ROLLOUT=admins\n"` it exits 1 and stderr contains `".env.production.local defines CALCULATOR_V2_ROLLOUT"`.
- [ ] **Step 7:** `npx vitest run tests/unit/build/check-release-env.test.ts`: the four existing tests pass; the first new test fails with `TypeError: checkRolloutNotInEnvFiles is not a function`, and the CLI test fails with `expected 0 to be 1` (the CLI still exits 0 with `.env.production.local` present).
- [ ] **Step 8: Implement.** Files checked in order `.env`, `.env.local`, `.env.development`,
      `.env.development.local`, `.env.production`, `.env.production.local`; a file counts when it
      matches `/^\s*(?:export\s+)?CALCULATOR_V2_ROLLOUT\s*=/m`; the message never includes a value.
      The CLI reports `[...checkReleaseEnvironment(process.env), ...checkRolloutNotInEnvFiles(process.cwd())]`
      under the existing "Release build stopped before compilation" header.
- [ ] **Step 9:** `npx vitest run tests/unit/build/check-release-env.test.ts src/lib/calculator-version.test.ts` passes (the four existing release tests unchanged, plus 9).
- [ ] **Step 10: Apply OI-30 to the spec.** In `d-architecture-integration.md` section 3 replace
      ``Locally it goes in `.env.local`;`` with
      ``In production it is a Worker secret (`wrangler secret put CALCULATOR_V2_ROLLOUT`), read only from the Worker binding; locally it is set in the shell or a Playwright `webServer.env`, never in a `.env*` file, and the release build fails when a `.env*` file defines it;``.
      `grep -c "read only from the Worker binding" docs/superpowers/specs/calculator-v2/d-architecture-integration.md` prints 1.
- [ ] **Step 11: Commit** "Resolve the calculator version from the Worker binding and guard .env files (AR-6, OI-30)".

### Task 10: Version provider and route wrappers (AR-7)

**Files:** create `src/components/calculator/CalculatorVersion.tsx`; modify `src/app/learn/layout.tsx`,
`src/app/diagnostic/page.tsx`; test `src/components/calculator/CalculatorVersion.test.tsx`.

**Interfaces.** Consumes `resolveCalculatorVersion` and `type CalculatorVersion` (Task 9; type-only
in the client file). Produces section 13.1's
`CalculatorVersionProvider(props: { version: CalculatorVersion; children: React.ReactNode }): JSX.Element`
and `useCalculatorVersion(): CalculatorVersion`; 11's `CalculatorScope` reads the hook. AR-7's
`CalculatorScope` statements ("reads `useCalculatorVersion()`", "a scope with no provider uses v1")
are tested by 11's index 5.3 contribution (in place; note 1); this task tests the hook
default, the fixed version and the two route wrappers.

- [ ] **Step 1: Write the failing tests** (`// @vitest-environment jsdom`). Mocks, as in `src/app/dashboard/student/layout.test.tsx`: `@/lib/auth/dev-auth` (`safeAuth` → `{ userId: "user_1" }`), `@/lib/calculator-version` (`resolveCalculatorVersion` → `"v2"`), `next/navigation` (`redirect` throws `` `redirect:${path}` ``), `@/components/learn/LearnLayout` (default renders its children), `@/components/diagnostic/DiagnosticClient` (default renders `<Probe />`), `@/data/diagnostic-questions` (`DIAGNOSTIC_QUESTIONS: []`), and `vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({ from: () => mocks.builder }) }))`, the `createAdminClient` factory shape of `src/app/dashboard/student/layout.test.tsx`, where `mocks.builder` (from `vi.hoisted`) has `select` and `eq` returning `mocks.builder` and `maybeSingle` resolving `{ data: null }` (the page queries `users`, then `subscriptions`; a null user skips the `diagnostic_results` count). `Probe` renders `useCalculatorVersion()` in `data-testid="version"`; `LearnRouteLayout` and `DiagnosticPage` are the default exports of `@/app/learn/layout` and `@/app/diagnostic/page`.
  - `it("AR-7 useCalculatorVersion is v1 without a provider")`: `render(<Probe />)` shows `v1`.
  - `it("AR-7 the version stays fixed for the life of the page when the provider re-renders")`: rendering the provider with `version="v2"` around `Probe` shows `v2`; after `rerender` with `version="v1"` it still shows `v2`.
  - `it("AR-7 the learn layout wraps LearnLayout in the provider with the resolved version")`: `el = await LearnRouteLayout({ children: <Probe /> })`; `el.type` is `CalculatorVersionProvider`; `render(el)` shows `v2`.
  - `it("AR-7 the learn layout redirects signed-out users before resolving the version")`: with `safeAuth` → `{ userId: null }`, `LearnRouteLayout({ children: null })` rejects with `"redirect:/auth/sign-in"` and `resolveCalculatorVersion` is not called.
  - `it("AR-7 the diagnostic page wraps DiagnosticClient in the provider with the resolved version")`: `el = await DiagnosticPage()`; `el.type` is `CalculatorVersionProvider`; `render(el)` shows `v2`.
- [ ] **Step 2:** `npx vitest run src/components/calculator/CalculatorVersion.test.tsx` fails: `Failed to resolve import "./CalculatorVersion"`.
- [ ] **Step 3: Implement.** `CalculatorVersion.tsx` starts with `"use client"`; its context defaults to
      `"v1"`; the provider keeps its first version with `useState(() => props.version)`. In
      `layout.tsx`, after the sign-in redirect, `const version = await resolveCalculatorVersion();` and
      return `<CalculatorVersionProvider version={version}><LearnLayout>{children}</LearnLayout></CalculatorVersionProvider>`.
      `diagnostic/page.tsx` wraps its `DiagnosticClient` element the same way after its redirects and queries.
- [ ] **Step 4:** the Step 2 command passes (5 tests).
- [ ] **Step 5: Commit** "Provide the per-request calculator version on learn and diagnostic routes (AR-7)".

### Task 11: Import boundaries (AR-1)

**Files:** test `src/components/calculator/seam-boundaries.test.ts`.

**Interfaces.** Consumes nothing (scans `src/` with the `typescript` compiler API). Produces
test-local helpers that Task 12 reuses in the same file:

```ts
type ImportKind = "static" | "dynamic" | "require" | "export";
interface ImportRef {
  specifier: string;
  kind: ImportKind;
  typeOnly: boolean;
  line: number;
}
function collectImports(path: string, source: string): ImportRef[];
function resolveSpecifier(importer: string, specifier: string): string | null;
function sourceFiles(root: string, dir?: string): { path: string; source: string }[]; // dir "src"
function importViolations(files: readonly { path: string; source: string }[]): string[];
```

- [ ] **Step 1: Write the failing tests** (`v(path, source)` = `importViolations([{ path, source }])`; `loader` = `src/components/calculator/CalculatorLoader.tsx`; `scope` = `src/components/calculator/CalculatorScope.tsx`; `quizHost` = `"@/components/calculator-v2/host/quiz-host"`):
  - `it("AR-1 the import scan flags every importer outside the allowed set in synthetic sources")`: `v("src/components/learn/Fake.tsx", 'import { parseLatex } from "@/lib/calculator-v2/core/latex";')` is `["src/components/learn/Fake.tsx imports @/lib/calculator-v2/core/latex"]`. One violation each for: a static import of `quizHost` from `loader`; `import(quizHost)` from `scope`; `export { x } from "../calculator-v2/foo"` from `src/components/learn/A.ts`; `import "../../../vendor/mathquill/mathquill.js"` from `src/components/calculator/A.ts`; `@/lib/calculator-transfer/clipboard` from `src/components/calculator/TransferControl.tsx`; `"./clipboard"` from `src/lib/calculator-transfer/classify.ts`. None for: `import(quizHost)` and `type M = typeof import(quizHost)` from `loader`; `import type { OpenTrigger } from quizHost` and `import { type SkinId } from "@/lib/calculator-v2/theme/skins"` from `scope`; `@/lib/calculator-transfer/clipboard` from `src/components/calculator-v2/ui/App.tsx`; `"../../../components/calculator-v2/b"` from `src/lib/calculator-v2/plot/a.ts`; any v2 import from `src/lib/calculator-transfer/a.test.ts` or `src/components/calculator/__fixtures__/f.ts`.
  - `it("AR-1 only v2 modules, the CalculatorLoader import() and the standalone entry import v2 code, and only v2 UI imports clipboard.ts")`: `files = sourceFiles(ROOT)` includes `src/lib/calculator-v2/theme/roles.ts` and no `.test.` path; `importViolations(files)` is `[]`.
- [ ] **Step 2:** `npx vitest run src/components/calculator/seam-boundaries.test.ts -t "AR-1"` fails: `not implemented`.
- [ ] **Step 3: Implement the helpers.** `collectImports` walks
      `ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind)` (TSX for `.tsx`):
      `ImportDeclaration` (type-only when `importClause.isTypeOnly` or every named element is
      `isTypeOnly`; a side-effect import is not), `ExportDeclaration` with a specifier (`isTypeOnly`
      honoured), `ImportEqualsDeclaration` with an external reference, `import("…")` calls (`dynamic`)
      and `require("…")` calls with a string literal; an `ImportTypeNode` (`typeof import(…)`) is not
      an import. `resolveSpecifier`: `@/x` → `src/x`; `./` and `../` against the importer's folder;
      anything else `null`; strips `.ts .tsx .js .mjs .jsx` and a trailing `/index`. `sourceFiles`
      lists `.ts .tsx .js .mjs .jsx .mts` under `root/dir`, skipping tests and `__fixtures__/`.
      `importViolations` skips test and fixture importers and type-only refs. A target under
      `src/lib/calculator-v2/`, `src/components/calculator-v2/` or `vendor/mathquill/` is allowed only
      for an importer in one of those folders (the standalone entry is one) or a `dynamic` ref from
      `loader`; the target `src/lib/calculator-transfer/clipboard` only for an importer under
      `src/components/calculator-v2/`. Message: `<importer> imports <specifier>`.
- [ ] **Step 4:** the Step 2 command passes (2 tests).
- [ ] **Step 5: Commit** "Scan src for imports of lazy calculator v2 modules (AR-1)".

### Task 12: Module scope, learn-header leaf and client imports of the resolver (AR-2, AR-7; AR-24 contribution)

**Files:** create `src/components/learn/learn-header.ts`; modify `src/components/learn/LearnLayout.tsx`
(re-export only), `src/components/calculator/seam-boundaries.test.ts`.

**Interfaces.** Consumes Task 11's helpers. Produces section 13.1's `LEARN_HEADER_CLEARANCE = 72` in
`learn-header.ts` (no imports), re-exported by `LearnLayout.tsx` with
`export { LEARN_HEADER_CLEARANCE } from "./learn-header";` (11's hosts import the leaf). Test-local
helpers `moduleScopeGlobals(path: string, source: string): string[]` (`"<path>:<line> <name>"`),
`eagerFiles(root: string): string[]` and
`clientResolverImports(files: readonly { path: string; source: string }[]): string[]`.

- [ ] **Step 1: Write the failing tests** (`g(src)` = `moduleScopeGlobals("a.ts", src)`):
  - `it("AR-2 the module-scope scan flags window, document, navigator and Worker outside functions")`: `g("const w = window.innerWidth;")` is `["a.ts:1 window"]`; `g("export const nav = globalThis.navigator;")` is `["a.ts:1 navigator"]`; `g("class A extends Worker {}")` is `["a.ts:1 Worker"]`; `g("class A { static el = document.body; }")` is `["a.ts:1 document"]`; `g("const { innerWidth } = window;\nif (navigator.onLine) {}")` is `["a.ts:1 window", "a.ts:2 navigator"]`; `[]` for `"export function f() { return document.title; }\nconst h = () => window.scrollTo(0, 0);"`, `"const isBrowser = typeof window !== 'undefined';\nlet w: Worker | null = null;"` and `"class A { el = document.body; }\nconst o = { window: 1 }; o.window;"`.
  - `it("AR-2 eager calculator modules touch no browser global at module scope")`: `eagerFiles(ROOT)` contains `src/lib/calculator-version.ts`, `src/components/calculator/CalculatorScope.tsx` and `src/components/calculator/report-error.ts`; findings over them are `[]`.
  - `it("AR-2 each eager calculator module loads under Vitest's node environment without a DOM")` (timeout 60 000): `"window" in globalThis` and `"document" in globalThis` are false; `await import(/* @vite-ignore */ join(ROOT, f))` resolves for every eager file.
  - `it("AR-24 learn-header.ts imports nothing and LearnLayout re-exports LEARN_HEADER_CLEARANCE = 72")` (03's index 5.3 contribution to AR-24, owner 11; note 1): `src = readFileSync(join(ROOT, "src/components/learn/learn-header.ts"), "utf8")` first; `collectImports("src/components/learn/learn-header.ts", src)` is `[]`; `(await import("@/components/learn/learn-header")).LEARN_HEADER_CLEARANCE` is 72 (a dynamic import inside the test, so the file still loads before the leaf exists); `LearnLayout.tsx`'s text contains `export { LEARN_HEADER_CLEARANCE } from "./learn-header";`.
  - `it("AR-7 client modules import calculator-version.ts for types only")`: for path `src/components/X.tsx`, `'"use client";\nimport { resolveCalculatorVersion } from "@/lib/calculator-version";'` gives one finding; the same with `import type { CalculatorVersion }` gives none; the value import without `"use client"` gives none; `clientResolverImports(sourceFiles(ROOT))` is `[]`.
- [ ] **Step 2:** `npx vitest run src/components/calculator/seam-boundaries.test.ts -t "AR-2|AR-7|AR-24"`: the three AR-2 tests and the AR-7 test fail with `not implemented`; the AR-24 test fails with `ENOENT: no such file or directory` for `src/components/learn/learn-header.ts`.
- [ ] **Step 3: Implement.** Create `learn-header.ts` and the re-export. `eagerFiles`:
      `src/lib/calculator-version.ts` plus non-test `.ts`/`.tsx` under `src/lib/calculator-transfer/`
      and `src/components/calculator/` (a missing folder adds nothing). `moduleScopeGlobals` reports,
      in source order, each identifier `window`, `document`, `navigator` or `Worker`, and each
      `globalThis.` or `self.` access to them, evaluated at module scope: it does not enter function
      declarations or expressions, arrow functions, methods, constructors, accessors or non-static
      property initialisers; it does enter static initialisers, static blocks, `extends` clauses and
      computed names. It ignores type positions (a `TypeNode` ancestor other than a class `extends`
      clause's `ExpressionWithTypeArguments`), `typeof` operands, declaration names, object-literal
      property names and the name side of a property access. `clientResolverImports` checks files
      whose first statement is the `"use client"` directive and reports each non-type-only ref
      resolving to `src/lib/calculator-version` as `<path> imports <specifier>`.
- [ ] **Step 4:** `npx vitest run src/components/calculator/seam-boundaries.test.ts` passes (7 tests).
- [ ] **Step 5: Package checks.** `npx tsc --noEmit && npm run lint && npm run format:check && npm test && node scripts/check-file-sizes.mjs && npx tsx scripts/calculator-v2/generate-skin-colors.ts --check` exits 0.
- [ ] **Step 6: Commit** "Enforce module-scope safety of eager calculator modules (AR-2, AR-7, AR-24)".

---

## Coordination notes for the lead

1. **Done.** Index 5.3 has the AR-7, TH-10 and AR-24 rows, and 11 and 07 carry those tests.
2. TH-6 as written (chroma from 0.07, no lightness bound) picks a near-black c2 on light skins
   (`#01001e` in a prototype) and a near-white c2 on dark skins (`#f9fec8`), close to the text and
   axis colours. It meets TH-6 and TH-7 (prototype minimum ΔE_OK 0.118 to 0.153), so the plan
   implements it unchanged; an owner look during the Phase 1 review may be worthwhile.
3. **Done: TH-8 contract comment.** `01-interfaces-runtime.md` section 6 holds the amended
   `compositeShading` comment ("3 or more" present, "fewer-fill" gone); Task 4 Step 1 checks it.
4. **Pending, before wave 0: AR-57 contract comment.** `reportCalculatorError` keeps only stack
   frame lines, because a multi-line message spills past the first line of a V8 stack. Section 13.1
   of `01-interfaces-integration.md` still says "the original stack without its first line", so
   Task 8 Step 1 would stop today. The lead applies this diff in its own commit; then, on that file,
   `grep -c "without its first line"` prints 0 and `grep -c "followed only by the original"` prints 1.

```diff
 // captureException (@sentry/nextjs) of a new Error whose message is `${name}` or `${name}: ${code}`
-// (code of a KarmanCalculatorError), whose stack is the original stack without its first line, with
-// tags { calculator: "v2", build: build ?? "unknown" }; never LaTeX, rows, question text or answers
+// (code of a KarmanCalculatorError), whose stack is "Error: <message>" followed only by the original
+// V8/WebKit/Gecko frame lines, with tags { calculator: "v2", build: build ?? "unknown" }; never
+// LaTeX, rows, question text or answers
```

5. **Pending, before wave 0: OI-30.** `grep -c '^| OI-30' docs/superpowers/specs/calculator-v2/open-items.md`
   prints 0; the lead appends index 6.2's row with the owner's decision, or Task 9 Step 1 stops.
6. **OI-34, before wave 0 (TH-3; Task 6 and 05).** Row: major; owner 03 Task 6; issue: the shadow
   sheet starts with the byte-exact `vendor/mathquill/mathquill.css` (AR-5), whose raw colours at
   the pin `1cbc1c4128` (05 part 1 Task 2 Step 4's table: field and command-input borders `gray`,
   focus shadows `#8bd` and `#6ae`, focus border `#709AC0`, command input with the cursor
   `ActiveBorder`, math borders `black`, empty block `rgba(0,0,0,.2)`, text-mode shadow `darkgray`,
   selection `#B4D5FE`, blurred selection `#D4D4D4` with `black` text) break TH-3, and the black
   borders and text vanish on dark skins; fix: Task 6 Step 1's TH-3 text. Accepted: 05 owns
   `src/components/calculator-v2/styles/math-field.css`, committed with the vendored files (Task 6
   fails without it), repeating each listed selector with a role: field and command-input borders
   `--kc-boundary`; focused field `box-shadow: none`, its and the cursor command input's border
   `--kc-focus-ring`; math borders `--kc-text`; empty block `--kc-chrome`; text-mode shadow
   `--kc-boundary`; selection (keeping `!important`) `--kc-focus-bar`, its `color` and `border-color`
   `--kc-focus-bar-label`; blurred selection (keeping `!important`) `--kc-chrome`, its `color` and
   `border-color` `--kc-text`; the caret (`currentColor`, not an entry) `--kc-text`. Not
   `--kc-key-operator`: Task 2 maps it and `list` both to `surface` on dark skins, while `chrome`
   differs from `list` on every skin and `text` reaches 7:1 on it. Rejected: 05 adds
   `patches/0010-colour-roles.patch` (AR-5) writing these variables into MathQuill's LESS, and
   Task 6's vendored test asserts `rawColourFindings(MQ_CSS, <its text>)` is `[]` instead.
7. **OI-33, before wave 0 (TH-1; Task 3).** Row: major; owner 03 Task 3; issue: 10.3 asks primary
   text for 7:1 on every background role and the Enter key label (`surface` light, `canvas` dark)
   for 7:1 on the accent; no colour is 7:1 from both a darker text and a lighter label (that needs
   1.05 ≥ 49 × 0.05), and the derived accents give text on accent 1.46 to 2.07:1 in all 12 skins;
   fix: Task 3 Step 1's 10.3 text. No accent meets both rows, so a rejection means re-planning the
   accent and label roles before Task 3.
8. **TH-11 row (09).** Retitle `09-editor-ui-1-rows.md`'s "R-1 an explicit colour that the skin
   adjusts shows the TH-11 note" test to start `R-1, TH-11` and add the index 5.3 row
   `| TH-11 | 03 | 09: an adjusted explicit colour shows EXPLICIT_COLOUR_NOTE on its row, ExpressionRow.test.tsx |`.
9. **TH-8 row (14).** TH-8's transferred inequalities and systems ship in 1B. Add to 5.3's TH-8 row
   `14: a transferred inequality and system shade within 1.3:1 and keep curves at 4.5:1, transfer.spec.ts`
   and to 14 `test("TH-8 a transferred inequality and system shade within 1.3:1 and keep curves at 4.5:1")`:
   after transferring the fixture's inequality and its system of 2 inequalities, in all 12 skins and
   with 08's `graph-pixels.ts` helpers, the `shading` layer has no partial pixel, each opaque colour
   is a `compositeShading` result of the rows' fills at most 1.3:1 on the paper, and every row's
   curve colour is at least 4.5:1 against each.
10. **Index section 1** says "03 Tasks 4 and 8 (Step 5) and 07 Task 11 edit the `01-interfaces*.md`
    files"; drop "03 Tasks 4 and 8 (Step 5) and" and add "; the lead applies 03's notes 3 and 4 to
    those files before wave 0, and 03 Tasks 4 and 8 only check them (Step 1)". Before cutting the
    wave 0 worktrees the lead also applies note 4 and appends OI-30, OI-34 and OI-33 (numbering the
    last two and renaming them in this file); notes 1 and 3 need nothing.
