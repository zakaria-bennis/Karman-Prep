/** Existing QuizEngine foundation tokens; no semantic series colors are remapped. */
export const MONOCHROME_FIGURE_PALETTE = {
  background: [23, 22, 17], // surface #171611
  ink: [243, 236, 221], // ivory #F3ECDD
} as const;

/**
 * Opt-in asset conversion for reviewed, opaque grayscale figures only.
 * Positions, dimensions, antialiasing and relative ink intensity are preserved.
 * Reject color/transparency rather than infer whether it carries information.
 */
export function themeMonochromePixels(rgba: Uint8Array): Uint8Array {
  if (!rgba.length || rgba.length % 4 !== 0) throw new Error("Expected complete RGBA pixels");
  const result = new Uint8Array(rgba.length);
  const { background, ink } = MONOCHROME_FIGURE_PALETTE;
  for (let i = 0; i < rgba.length; i += 4) {
    const [r, g, b, alpha] = rgba.subarray(i, i + 4);
    if (r !== g || g !== b) throw new Error("Colored figure requires separate semantic review");
    if (alpha !== 255) throw new Error("Transparent figure requires separate background review");
    const coverage = 1 - r / 255;
    for (let channel = 0; channel < 3; channel++) {
      result[i + channel] = Math.round(
        background[channel] + coverage * (ink[channel] - background[channel])
      );
    }
    result[i + 3] = 255;
  }
  return result;
}
