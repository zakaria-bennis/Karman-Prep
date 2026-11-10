// Draws the six kinds of Karman tutor as hand-drawn people and writes them to public/site/tutors/ as SVG.
// The drawings are Open Peeps by Pablo Stanley (CC0, free for commercial use), assembled with react-peeps
// (MIT). They are made once here and shipped as static files, so the site carries none of the library.
// Usage: node scripts/dev/make-tutor-peeps.mjs
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import PeepModule from "react-peeps";

const Peep = PeepModule.default ?? PeepModule;
const INK = "#1d1a22";
const TUTORS = {
  phd: {
    body: "Geek",
    hair: "MediumBangs",
    face: "Smile",
    accessory: "GlassRound",
    facialHair: "None",
  },
  medic: { body: "ShirtCoat", hair: "Bun", face: "Calm", accessory: "None", facialHair: "None" },
  writer: {
    body: "Coffee",
    hair: "LongCurly",
    face: "Cheeky",
    accessory: "GlassButterfly",
    facialHair: "None",
  },
  researcher: {
    body: "Paper",
    hair: "Twists",
    face: "Cute",
    accessory: "None",
    facialHair: "None",
  },
  professor: {
    body: "Explaining",
    hair: "GrayShort",
    face: "Smile",
    accessory: "GlassRoundThick",
    facialHair: "GrayFull",
  },
};

for (const [name, parts] of Object.entries(TUTORS)) {
  let svg = renderToStaticMarkup(
    createElement(Peep, { ...parts, strokeColor: INK, backgroundColor: "#fffaf3", style: {} })
  );
  /* keep only the drawing itself, as a standalone file */
  const start = svg.indexOf("<svg");
  svg = svg.slice(start, svg.lastIndexOf("</svg>") + 6);
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  writeFileSync(`public/site/tutors/${name}.svg`, svg);
  console.log(name, svg.length, svg.slice(0, 120).replace(/\s+/g, " "));
}
