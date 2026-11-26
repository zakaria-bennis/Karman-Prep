// Local helper for solver runs in Zakaria's own Chrome tab. The tab fetches each clean picture
// from here, uploads it through the site's own file box, clicks Get Hint and Full Explanation,
// and posts what the page shows back here. Listens on localhost only.
// Usage: node chrome-bridge.mjs <qid list file>
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const todo = readFileSync(process.argv[2], "utf8").split(/\s+/).filter(Boolean);
const cors = {
  "Access-Control-Allow-Origin": "https://www.cvtpsolver.com",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Private-Network": "true",
};
createServer((req, res) => {
  console.log(
    new Date().toISOString(),
    req.method,
    req.url,
    JSON.stringify(req.headers).slice(0, 300)
  );
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  const [, kind, qid] = req.url.split("/");
  if (kind === "todo") {
    const left = todo.filter((q) => !existsSync(`${E}/solver_outputs/${q}.json`));
    return res
      .writeHead(200, { ...cors, "content-type": "application/json" })
      .end(JSON.stringify(left));
  }
  if (kind === "img" && /^Q\d{3}$/.test(qid)) {
    return res
      .writeHead(200, { ...cors, "content-type": "image/png" })
      .end(readFileSync(`${E}/clean/${qid}.png`));
  }
  if (kind === "save" && /^Q\d{3}$/.test(qid) && req.method === "POST") {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      const out = JSON.parse(b);
      writeFileSync(
        `${E}/solver_outputs/${qid}.json`,
        JSON.stringify({ qid, ...out, via: "chrome", at: new Date().toISOString() }, null, 2)
      );
      appendFileSync(
        `${E}/chrome-run.log`,
        `ok ${qid} ${out.seconds}s credits ${out.credits_used}\n`
      );
      res.writeHead(200, cors).end("ok");
    });
    return;
  }
  if (kind === "fail") {
    appendFileSync(
      `${E}/chrome-run.log`,
      `FAIL ${qid} ${decodeURIComponent(req.url.split("?m=")[1] || "")}\n`
    );
    return res.writeHead(200, cors).end("ok");
  }
  res.writeHead(404, cors).end();
}).listen(8765, "127.0.0.1", () => console.log("bridge on 8765,", todo.length, "to do"));
