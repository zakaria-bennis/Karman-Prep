import { expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { hostThemeCss } from "./roles";
import { SKIN_COLORS } from "./skin-colors.generated";
import { THEME_SKIN_IDS } from "./skins";
import { TONE_SPECS, deriveTones, toneBackground, toneOver } from "./tones";
import { TONES, TONE_VARS } from "./vars";

it("TH-1 the classic skin keeps the reference calculator's tone strengths", () => {
  const { tones } = SKIN_COLORS.classic.normal;
  expect(tones).toEqual({
    rowNumber: 0.65,
    textMuted: 0.6,
    equals: 0.55,
    fieldText: 0.73,
    fieldPlaceholder: 0.47,
    segmentText: 0.85,
    selectedFill: 0.65,
    fieldLine: 0.42,
    errorTip: 0.6,
  });
  const css = hostThemeCss("classic");
  expect(css).toContain(`${TONE_VARS.rowNumber}:65%`);
  expect(css).toContain(`${TONE_VARS.fieldLine}:42%`);
});

it("TH-1 each theme skin's tones are the smallest strengths from the reference up that meet their targets (the contrast suite measures them)", () => {
  for (const s of THEME_SKIN_IDS) {
    const { roles, tones } = SKIN_COLORS[s].normal;
    expect(deriveTones(roles), s).toEqual(tones);
    for (const tone of TONES) {
      expect(tones[tone], `${s} ${tone}`).toBeGreaterThanOrEqual(TONE_SPECS[tone].reference);
      if (tones[tone] === TONE_SPECS[tone].reference) continue;
      const lower = tones[tone] - 0.01;
      const misses = TONE_SPECS[tone].on.some((on) => {
        const bg = toneBackground(roles, on);
        return contrastRatio(toneOver(roles, tone, lower, bg), bg) < TONE_SPECS[tone].min + 0.05;
      });
      expect(misses, `${s} ${tone} one step lower`).toBe(true);
    }
  }
});

it("TH-1 the settings popover's selected segment, Step: text and Label box border reach 7:1, 7:1 and 3:1 in every theme", () => {
  for (const s of THEME_SKIN_IDS) {
    const { roles, tones } = SKIN_COLORS[s].normal;
    const fill = toneOver(roles, "selectedFill", tones.selectedFill, roles.list);
    expect(contrastRatio(roles.list, fill), `${s} selected segment`).toBeGreaterThanOrEqual(7);
    const step = toneOver(roles, "fieldText", tones.fieldText, roles.list);
    expect(contrastRatio(step, roles.list), `${s} Step:`).toBeGreaterThanOrEqual(7);
    const line = toneOver(roles, "fieldLine", tones.fieldLine, roles.list);
    expect(contrastRatio(line, roles.list), `${s} Label box`).toBeGreaterThanOrEqual(3);
  }
});
