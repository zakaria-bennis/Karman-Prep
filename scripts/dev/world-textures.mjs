#!/usr/bin/env node
// Makes the photographs the endless world's ground is drawn with (src/lib/flight/world-tex.ts): real
// scanned rock, meadow, snow and stony ground from Poly Haven (CC0), each packed into two small files in
// public/site/world/. Run it again only to change a photograph or its size.
//
//   <name>.jpg    the colour, as a ratio to the photograph's own average, so each land keeps its colours
//                 and the photograph adds what real ground has: its grain, its stones and its moss. Stored as
//                 128 + 40 * log2(ratio), so a dark crack and a bright stone are both kept exactly
//   <name>-n.jpg  how the surface tilts (red, green: the photograph's own normal map) and how high it
//                 stands (blue), for light that catches every ledge and for snow that lies in the hollows
//
// The firs (tree.jpg, tree-n.jpg) are rendered in Blender (scripts/dev/blender/); give their atlas folder
// with --trees to make only those two files.
//
// node scripts/dev/world-textures.mjs [--size 512] [--trees <atlas folder>]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const SIZE = Number(process.argv[process.argv.indexOf("--size") + 1]) || 512;
const OUT = path.join(process.cwd(), "public/site/world");
const CACHE = path.join(os.tmpdir(), "kp-world-textures");
/* each photograph and what it shows (the Poly Haven page is polyhaven.com/a/<id>) */
const SOURCES = [
  {
    name: "rock",
    id: "aerial_rocks_02",
    note: "a cliff face from the air, ledged, with moss (50 m)",
  },
  {
    name: "grass",
    id: "rocky_terrain_02",
    note: "an upland meadow from the air, with stones (90 m)",
  },
  {
    name: "snow",
    id: "snow_field_aerial",
    note: "a snowfield from the air, ground showing through (80 m)",
  },
  { name: "ground", id: "aerial_ground_rock", note: "stony earth and gravel from the air (20 m)" },
];

async function fetchTo(url, file) {
  if (fs.existsSync(file)) return file;
  const r = await fetch(url, { headers: { "User-Agent": "world-textures/1.0" } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}

async function maps(id) {
  const r = await fetch(`https://api.polyhaven.com/files/${id}`, {
    headers: { "User-Agent": "world-textures/1.0" },
  });
  const f = await r.json();
  const get = (m, k) => fetchTo(f[m]["1k"].jpg.url, path.join(CACHE, `${id}_${k}.jpg`));
  return {
    col: await get("Diffuse", "col"),
    nor: await get("nor_gl", "nor"),
    disp: await get("Displacement", "disp"),
  };
}

const raw = (file, channels) =>
  sharp(file)
    .removeAlpha()
    .toColourspace(channels === 1 ? "b-w" : "srgb")
    .resize(SIZE, SIZE, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
const lin = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const trees = process.argv.indexOf("--trees");
if (trees > -1) {
  const dir = process.argv[trees + 1];
  await sharp(path.join(dir, "tree.png"))
    .removeAlpha()
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, "tree.jpg"));
  await sharp(path.join(dir, "tree-n.png"))
    .removeAlpha()
    .jpeg({ quality: 86, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(path.join(OUT, "tree-n.jpg"));
  console.log("trees: tree.jpg, tree-n.jpg");
  process.exit(0);
}
for (const s of SOURCES) {
  const m = await maps(s.id);
  /* colour: in linear light, divided by the photograph's average, so 1 (stored as 128) is "as the land is" */
  const col = await raw(m.col, 3);
  const n = SIZE * SIZE;
  const mean = [0, 0, 0];
  for (let i = 0; i < n * 3; i++) mean[i % 3] += lin(col[i]) / n;
  const out = Buffer.alloc(n * 3);
  for (let i = 0; i < n * 3; i++)
    out[i] = Math.max(
      0,
      Math.min(255, Math.round(128 + 40 * Math.log2(Math.max(lin(col[i]), 1e-4) / mean[i % 3])))
    );
  await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(OUT, `${s.name}.jpg`));
  /* tilt and height: the height stretched so the lowest and highest one percent meet 0 and 1 */
  const nor = await raw(m.nor, 3);
  const disp = await raw(m.disp, 1);
  const sorted = Uint8Array.from(disp).sort();
  const lo = sorted[Math.floor(n * 0.01)];
  const hi = sorted[Math.floor(n * 0.99)];
  const nh = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    nh[i * 3] = nor[i * 3];
    nh[i * 3 + 1] = nor[i * 3 + 1];
    nh[i * 3 + 2] = Math.max(
      0,
      Math.min(255, Math.round(((disp[i] - lo) / Math.max(1, hi - lo)) * 255))
    );
  }
  await sharp(nh, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .jpeg({ quality: 85, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(path.join(OUT, `${s.name}-n.jpg`));
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
  console.log(
    `${s.name.padEnd(7)} ${s.id.padEnd(20)} colour ${kb(`${s.name}.jpg`)} KB, tilt ${kb(`${s.name}-n.jpg`)} KB, average ${mean.map((v) => v.toFixed(3)).join(" ")}`
  );
}
