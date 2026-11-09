// node sheet.cjs out.jpg file1 file2 ... : contact sheet at 420px tall
const sharp = require("/Users/zakariabennis/Karman-Prep/node_modules/sharp");
(async () => {
  const [out, ...files] = process.argv.slice(2);
  const H = 420;
  const bufs = await Promise.all(files.map((f) => sharp(f).resize({ height: H }).toBuffer({ resolveWithObject: true })));
  const W = bufs.reduce((a, b) => a + b.info.width + 8, 0);
  let x = 0; const comps = [];
  for (const b of bufs) { comps.push({ input: b.data, left: x, top: 0 }); x += b.info.width + 8; }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#808080" } }).composite(comps).jpeg({ quality: 85 }).toFile(out);
})();
