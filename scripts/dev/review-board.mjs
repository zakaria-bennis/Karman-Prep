// The founder's page review board. Run it beside the dev server:
//
//   npm run dev:next                    (the site, on port 3000)
//   node scripts/dev/review-board.mjs   (the board, on port 4810)
//
// The board lists every page under src/app, shows the live page in a frame, and keeps one record per
// page in prototypes/page-review.json: its status (approved, denied, remove) and every direction given.
// A direction typed on the board is handed to whoever is waiting on GET /api/wait (the coding
// session), which answers with POST /api/reply once the change is made.

import { createServer } from "node:http";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP_DIR = path.join(ROOT, "src/app");
const STATE_FILE = path.join(ROOT, "prototypes/page-review.json");
const BOARD_FILE = path.join(ROOT, "scripts/dev/review-board.html");
const PORT = Number(process.env.REVIEW_BOARD_PORT ?? 4810);
const SITE = process.env.REVIEW_SITE_URL ?? "http://localhost:3000";
const WAIT_MS = 9 * 60 * 1000;
const STATUSES = ["none", "approved", "denied", "remove"];

const GROUPS = [
  ["Website", null],
  [
    "Sign-up and payment",
    /^\/(auth|join|onboarding|reserve|billing|call|checkout|coming-soon|tutors)(\/|$)/,
  ],
  ["Student portal", /^\/(learn|dashboard\/student)(\/|$)/],
  ["Parent portal", /^\/dashboard\/parent(\/|$)/],
  ["Tutor portal", /^\/tutor(\/|$)/],
  ["School portal", /^\/school(\/|$)/],
  ["Admin", /^\/admin(\/|$)/],
  ["Building tools", /^\/dev(\/|$)/],
  ["Removed from the site", null],
];

async function findPages(dir, segments = []) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name.startsWith("_")) continue;
      const isGroup = /^\(.*\)$/.test(entry.name) || entry.name.startsWith("@");
      found.push(
        ...(await findPages(
          path.join(dir, entry.name),
          isGroup ? segments : [...segments, entry.name]
        ))
      );
    } else if (/^page\.(tsx|jsx|mdx)$/.test(entry.name)) {
      found.push("/" + segments.join("/"));
    }
  }
  return found;
}

function words(segment) {
  if (segment === "faq") return "FAQ";
  const text = segment.replace(/[[\].]/g, "").replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describe(route) {
  const group = GROUPS.find(([, test]) => test?.test(route))?.[0] ?? "Website";
  const segments = route.split("/").filter(Boolean);
  const fixed = segments.filter((segment) => !segment.startsWith("["));
  let name = fixed.length ? words(fixed[fixed.length - 1]) : "Home";
  if (route.includes("[...missing]")) name = "Page not found";
  const needsAddress = route.includes("[") && !/\[\[?\.\.\./.test(route);
  const address = route.includes("[...missing]")
    ? "/a-page-that-does-not-exist"
    : route.replace(/\/\[\[\.\.\..*$/, "");
  return { route, name, group, needsAddress, address };
}

// The student portal is one address with a tab inside it for each screen, so each tab is listed as a page
// of its own, in the order of the portal's menu (src/app/dashboard/student/_portal/plans.ts).
const STUDENT_HOME = "/dashboard/student";
const STUDENT_TABS = [
  ["homework", "Homework"],
  ["library", "Library"],
  ["schedule", "Schedule"],
  ["progress", "Progress"],
  ["mistakes", "Mistake Log"],
  ["rewards", "Rewards"],
  ["chat", "Chat"],
  ["account", "Account and settings"],
].map(([tab, name]) => {
  const route = `${STUDENT_HOME}?page=${tab}`;
  return { route, name, group: "Student portal", needsAddress: false, address: route };
});

// Every page in src/app, then the pages the record still remembers that are no longer there.
async function listPages() {
  const found = [...new Set(await findPages(APP_DIR))].sort();
  const routes = [...found, ...STUDENT_TABS.map((tab) => tab.route)];
  const pages = found
    .flatMap((route) =>
      route === STUDENT_HOME
        ? [{ ...describe(route), name: "First screen" }, ...STUDENT_TABS]
        : [describe(route)]
    )
    .sort((a, b) => groupOrder(a.group) - groupOrder(b.group));
  const gone = Object.keys((await readState()).pages)
    .filter((route) => !routes.includes(route))
    .map((route) => ({ ...describe(route), group: "Removed from the site", needsAddress: false }));
  return [...pages, ...gone];
}

function groupOrder(group) {
  return GROUPS.findIndex(([name]) => name === group);
}

async function readState() {
  if (!existsSync(STATE_FILE)) return { pages: {} };
  return JSON.parse(await readFile(STATE_FILE, "utf8"));
}

let saving = Promise.resolve();
function updateState(change) {
  saving = saving.then(async () => {
    const state = await readState();
    change(state);
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  });
  return saving;
}

function record(state, route) {
  state.pages[route] ??= { status: "none", history: [] };
  return state.pages[route];
}

// Directions waiting for the coding session, and the session's open long-poll requests.
const queue = [];
const waiters = [];
let busy = null;
let lastWaitAt = 0;
let nextId = 1;

function hand(direction) {
  const waiter = waiters.shift();
  if (!waiter) return queue.push(direction);
  clearTimeout(waiter.timer);
  busy = { id: direction.id, route: direction.route, since: Date.now() };
  send(waiter.res, 200, { type: "direction", ...direction });
}

function send(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 100_000) throw new Error("Too long");
  }
  return JSON.parse(text || "{}");
}

const routes = {
  "GET /": async (_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(await readFile(BOARD_FILE, "utf8"));
  },

  "GET /api/state": async (_req, res) => {
    const [pages, state] = await Promise.all([listPages(), readState()]);
    send(res, 200, {
      site: SITE,
      pages,
      records: state.pages,
      busy,
      waiting: queue.map((direction) => direction.route),
      listening: waiters.length > 0 || busy !== null || Date.now() - lastWaitAt < 20_000,
    });
  },

  // The founder sets a status, or saves the address to open for a page whose path has a blank in it.
  "POST /api/page": async (req, res) => {
    const { route, status, address } = await body(req);
    if (!(await listPages()).some((page) => page.route === route))
      return send(res, 404, { error: "No such page" });
    if (status !== undefined && !STATUSES.includes(status))
      return send(res, 400, { error: "Bad status" });
    await updateState((state) => {
      const page = record(state, route);
      if (status !== undefined) {
        page.status = status;
        page.history.push({ at: new Date().toISOString(), from: "status", text: status });
      }
      if (typeof address === "string" && address.startsWith("/")) page.address = address;
    });
    send(res, 200, { ok: true });
  },

  // The founder sends a direction for one page.
  "POST /api/direction": async (req, res) => {
    const { route, text, address, size } = await body(req);
    if (typeof text !== "string" || !text.trim())
      return send(res, 400, { error: "Nothing to send" });
    if (!(await listPages()).some((page) => page.route === route))
      return send(res, 404, { error: "No such page" });
    await updateState((state) => {
      record(state, route).history.push({
        at: new Date().toISOString(),
        from: "you",
        text: text.trim(),
      });
    });
    hand({ id: nextId++, route, address, size, text: text.trim() });
    send(res, 200, { ok: true });
  },

  // The coding session waits here for the next direction.
  "GET /api/wait": async (req, res) => {
    lastWaitAt = Date.now();
    const waiter = { res, timer: null };
    waiter.timer = setTimeout(() => {
      waiters.splice(waiters.indexOf(waiter), 1);
      lastWaitAt = Date.now();
      send(res, 200, { type: "timeout" });
    }, WAIT_MS);
    req.on("close", () => {
      const at = waiters.indexOf(waiter);
      if (at === -1) return;
      clearTimeout(waiter.timer);
      waiters.splice(at, 1);
    });
    waiters.push(waiter);
    const next = queue.shift();
    if (next) hand(next);
  },

  // The coding session reports back on a direction.
  "POST /api/reply": async (req, res) => {
    const { route, text } = await body(req);
    if (typeof route !== "string" || typeof text !== "string")
      return send(res, 400, { error: "Bad reply" });
    await updateState((state) => {
      record(state, route).history.push({ at: new Date().toISOString(), from: "claude", text });
    });
    if (busy?.route === route) busy = null;
    lastWaitAt = Date.now();
    send(res, 200, { ok: true });
  },
};

createServer(async (req, res) => {
  const handler = routes[`${req.method} ${new URL(req.url, "http://x").pathname}`];
  if (!handler) return send(res, 404, { error: "Not found" });
  try {
    await handler(req, res);
  } catch (error) {
    send(res, 500, { error: String(error.message ?? error) });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Review board: http://localhost:${PORT}  (site: ${SITE})`);
});
