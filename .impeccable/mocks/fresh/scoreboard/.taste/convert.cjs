// Converts the kept stills to WebP (native size + -800) and crops the three result portraits.
const sharp = require("sharp");
const fs = require("fs");
const RAW = ".impeccable/mocks/fresh/scoreboard/raw/stills/";
const O = ".impeccable/mocks/fresh/scoreboard/img/";
const F = ".impeccable/mocks/decision/film/";
const keep = ["focus-girl", "hands-laptop", "bench-phone", "tutor-zoom", "student-zoom", "parent-phone", "parent-dad", "bus-phone", "weekend-desk", "girl-window"];
(async () => {
  const files = fs.readdirSync(RAW);
  for (const k of keep) {
    const f = files.find((x) => x.startsWith("scoreboard-" + k + "-"));
    if (!f) { console.log("missing", k); continue; }
    let img = sharp(RAW + f);
    if (k === "focus-girl") img = img.extract({ left: 150, top: 0, width: 730, height: 1184 }); // drops the laptop lid logo at the left edge
    await img.clone().webp({ quality: 82 }).toFile(O + k + ".webp");
    await img.clone().resize({ width: 600 }).webp({ quality: 80 }).toFile(O + k + "-800.webp");
  }
  const crops = { c8a: [F + "c8a-p.jpg", { left: 80, top: 200, width: 400, height: 500 }], c8b: [F + "c8b-p.jpg", { left: 58, top: 360, width: 440, height: 550 }], c8c: [F + "c8c-p.jpg", { left: 66, top: 160, width: 300, height: 375 }] };
  for (const [id, [src, box]] of Object.entries(crops)) await sharp(src).extract(box).resize({ width: 300, height: 375 }).webp({ quality: 82 }).toFile(O + id + ".webp");
  console.log("done");
})();
