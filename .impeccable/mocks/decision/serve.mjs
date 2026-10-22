// Static preview server for the design mocks, with HTTP range support so
// browsers can seek inside videos (scroll-scrubbed films need it).
// Usage: node .impeccable/mocks/decision/serve.mjs [port] [--open]   (or: npm run copy)
import { createServer } from "node:http";
import { createReadStream, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
const PORT = Number(args.find((a) => /^\d+$/.test(a)) ?? 8765);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
};

const COPY = join(ROOT, "film/copy.js");
const START = "window.KARMAN_COPY = `";

// The copy editor (film/edit.html) reads and saves the words through these two routes.
function copyApi(req, res) {
  if (req.method === "GET") {
    const file = readFileSync(COPY, "utf8");
    const body = file.slice(file.indexOf(START) + START.length, file.lastIndexOf("`"));
    res
      .writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" })
      .end(body);
    return;
  }
  if (req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (body.length > 50000 || body.includes("`") || body.includes("${")) {
        res.writeHead(400).end("The copy can't contain backticks or ${.");
        return;
      }
      const file = readFileSync(COPY, "utf8");
      const head = file.slice(0, file.indexOf(START) + START.length);
      writeFileSync(COPY, `${head}${body.replace(/\r/g, "")}\`;\n`);
      res.writeHead(200).end("saved");
    });
    return;
  }
  res.writeHead(405).end();
}

createServer((req, res) => {
  if (new URL(req.url, "http://x").pathname === "/api/copy") return copyApi(req, res);
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  let file = join(ROOT, path);
  let st;
  try {
    st = statSync(file);
    if (st.isDirectory()) {
      file = join(file, "index.html");
      st = statSync(file);
    }
  } catch {
    res.writeHead(404).end("Not found");
    return;
  }
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${st.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Cache-Control": "no-cache",
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": st.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => {
  const url = `http://localhost:${PORT}/film/edit.html`;
  console.log(`Copy editor: ${url} (this computer only). Press Ctrl+C to stop.`);
  if (args.includes("--open")) execFile("open", [url]);
});
