// Writes iphone-17-pro-max-<finish>.svg from device.js. node device/build.mjs
import { writeFileSync } from "node:fs";
import { iphoneSVG, FINISHES } from "./device.js";
for (const f of Object.keys(FINISHES)) writeFileSync(new URL(`./iphone-17-pro-max-${f}.svg`, import.meta.url), iphoneSVG(f));
console.log("wrote", Object.keys(FINISHES).join(", "));
