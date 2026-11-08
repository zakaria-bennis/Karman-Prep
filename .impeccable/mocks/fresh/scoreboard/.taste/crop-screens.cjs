// Crops the real engine captures (2x) for the hero. Run from the repo root.
const sharp = require("sharp");
const R = ".impeccable/mocks/redesign/engine/renders/";
const O = ".impeccable/mocks/fresh/scoreboard/img/";
(async () => {
  for (const mode of ["light", "dark"]) {
    // desktop: question + explanation panel, below the top bar, above the bottom bar (2x px)
    const d = sharp(R + `alg-1-desktop-${mode}-correct-explain.png`).extract({ left: 40, top: 176, width: 1540, height: 830 });
    await d.clone().webp({ quality: 88 }).toFile(O + `screen-desk-${mode}.webp`);
    await d.clone().resize({ width: 1200 }).webp({ quality: 86 }).toFile(O + `screen-desk-${mode}-800.webp`);
    // phone: ALGEBRA, the stem and choices A to C (2x px), 416 x 310 at 1x
    const p = sharp(R + `alg-1-phone-${mode}-correct-explain.png`).extract({ left: 24, top: 270, width: 832, height: 474 });
    await p.clone().webp({ quality: 88 }).toFile(O + `screen-phone-${mode}.webp`);
  }
  console.log("ok");
})();
