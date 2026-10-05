// Explicit local asset operation; preserves the input and refuses overwrites.
import { readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  themeMonochromePixels,
  MONOCHROME_FIGURE_PALETTE,
} from "../../src/lib/figures/monochrome-theme";

async function main() {
  const [input, output] = process.argv.slice(2).map((path) => resolve(path));
  if (!input || !output || input === output)
    throw new Error("Provide distinct input and new output paths");
  try {
    await access(output);
    throw new Error("Output already exists; source/review files are never overwritten");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const original = await readFile(input);
  const { data, info } = await sharp(original)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error("Expected RGBA source");
  const themed = themeMonochromePixels(data);
  // Validate the source foreground mask against the resulting palette-distance mask.
  const { background, ink } = MONOCHROME_FIGURE_PALETTE;
  let foregroundPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const sourceInk = data[i] < 127;
    const distance = (color: readonly number[]) =>
      color.reduce((sum, c, k) => sum + (themed[i + k] - c) ** 2, 0);
    const outputInk = distance(ink) < distance(background);
    if (sourceInk !== outputInk) throw new Error(`Foreground mask mismatch at pixel ${i / 4}`);
    if (sourceInk) foregroundPixels++;
  }
  const png = await sharp(themed, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  await writeFile(output, png, { flag: "wx" });
  console.log(
    JSON.stringify({
      input,
      output,
      width: info.width,
      height: info.height,
      foregroundPixels,
      source_sha256: createHash("sha256").update(original).digest("hex"),
      output_sha256: createHash("sha256").update(png).digest("hex"),
      monochrome: true,
      foreground_mask_threshold: 127,
      foreground_mask_identical: true,
      palette: MONOCHROME_FIGURE_PALETTE,
    })
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
