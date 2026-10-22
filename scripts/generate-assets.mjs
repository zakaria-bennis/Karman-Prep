#!/usr/bin/env node
// Generates the landing-page clips and plates listed in assets/manifest.json.
//
//   node scripts/generate-assets.mjs                  dry run: price every approved shot, spend nothing
//   node scripts/generate-assets.mjs --only c2        dry run for one shot
//   node scripts/generate-assets.mjs --only c2 --run  generate it (spends money)
//   node scripts/generate-assets.mjs --finish c2 --run  finish an approved Seedance 2.5 draft at 1080p
//   node scripts/generate-assets.mjs --balance        show prepaid balances
//   node scripts/generate-assets.mjs --all            include shots not yet approved in the dry run
//
// Rules: a shot runs only when its manifest status is "approved"; a run stops
// before it starts if the quoted total is over --budget (default $10); after
// each Atlas or fal job the real charge is read from the balance and the run
// stops if it is more than 25% above the quote. Every job is logged to
// assets/spend-log.csv. Keys come from .env.local and are never printed.

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "assets/manifest.json");
const STATE = join(ROOT, "assets/generation-state.json");
const LOG = join(ROOT, "assets/spend-log.csv");
const OUT = join(ROOT, ".impeccable/mocks/decision/film/raw");

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const RUN = flag("run");
const BUDGET = Number(opt("budget", "10"));
const ONLY = opt("only", null)?.split(",");
const FINISH = opt("finish", null);
const OVERRUN = 1.25;

// ---------- keys ----------
function loadEnv() {
  const env = {};
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}
const ENV = { ...loadEnv(), ...process.env };
const key = (name) => {
  if (!ENV[name]) throw new Error(`${name} is missing from .env.local`);
  return ENV[name];
};

// ---------- routes: the cheapest place to run each model ----------
// estimate = dollars per job when the provider has no free quote endpoint.
const ROUTES = {
  "seedance-2.5": { provider: "atlas", kind: "video", model: "bytedance/seedance-2.5" },
  "seedance-2.0-mini": { provider: "atlas", kind: "video", model: "bytedance/seedance-2.0-mini" },
  "wan-3.0": { provider: "atlas", kind: "video", model: "alibaba/wan-3.0" },
  "wan-3.0-prime": { provider: "atlas", kind: "video", model: "alibaba/wan-3.0-prime" },
  "veo-3.1-fast": { provider: "veo", model: "veo-3.1-fast-generate-preview", perSecond: 0.1 },
  "veo-3.1-lite": { provider: "veo", model: "veo-3.1-lite-generate-preview", perSecond: 0.05 },
  // Google image prices: dollars per 1M output tokens (a 2K image is 1,120 to 1,680 tokens).
  "nano-banana-2.1": {
    provider: "gemini-image",
    model: "gemini-nano-banana-2.1",
    estimate: 0.0504,
    perMillionOut: 30,
  },
  "nano-banana-pro": {
    provider: "gemini-image",
    model: "gemini-3-pro-image",
    estimate: 0.134,
    perMillionOut: 120,
  },
  "gpt-image-2.5": { provider: "openai", model: "gpt-image-2.5-flare", estimate: 0.05 },
  "ideogram-4.5": { provider: "fal", model: "ideogram/v4.5", estimate: 0.06 },
  "flux-3": { provider: "fal", model: "blackforestlabs/flux-3/text-to-image", estimate: 0.1 },
  nasa: { provider: "none" },
};

// ---------- small helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (n) => `$${Number(n).toFixed(2)}`;
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const readJson = (f, fallback) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fallback);

async function http(url, init = {}, label = url) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${text.slice(0, 400)}`);
  return body;
}

async function download(url, file, headers = {}) {
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

function logSpend(row) {
  if (!existsSync(LOG))
    writeFileSync(LOG, "date,shot,route,model,quoted_usd,charged_usd,charge_source,file\n");
  const cells = [
    new Date().toISOString(),
    row.shot,
    row.route,
    row.model,
    row.quoted,
    row.charged,
    row.source,
    row.file,
  ];
  appendFileSync(
    LOG,
    cells.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",") + "\n"
  );
}

// ---------- prompt ----------
function fullPrompt(shot, defaults) {
  const suffix = shot.still ? defaults.stillSuffix : defaults.suffix;
  return `${shot.prompt.trim()} ${suffix ?? ""}`.trim();
}

// ---------- Atlas Cloud (Seedance, Wan) ----------
const ATLAS = "https://api.atlascloud.ai";
const atlasHeaders = () => ({
  Authorization: `Bearer ${key("ATLAS_API_KEY")}`,
  "Content-Type": "application/json",
});

function atlasBody(shot, route, defaults, refUrls = []) {
  const variant = refUrls.length ? "reference-to-video" : "text-to-video";
  const isSeedance = route.model.startsWith("bytedance/");
  const body = {
    model: `${route.model}/${variant}`,
    prompt: fullPrompt(shot, defaults),
    duration: shot.duration ?? defaults.duration,
    ratio: shot.ratio ?? defaults.ratio,
  };
  if (isSeedance) {
    body.generate_audio = false;
    body.watermark = false;
    if (shot.draft) body.draft = true;
    else body.resolution = shot.resolution ?? "720p";
    if (refUrls.length) body.reference_images = refUrls;
  } else {
    body.audio = false;
    body.resolution = shot.resolution ?? "720p";
    if (refUrls.length) body.reference_images = refUrls;
  }
  return body;
}

async function atlasQuote(body) {
  const r = await http(
    `${ATLAS}/api/v1/model/calculate`,
    { method: "POST", headers: atlasHeaders(), body: JSON.stringify(body) },
    "Atlas quote"
  );
  if (r.code !== 200) throw new Error(`Atlas quote: ${r.msg}`);
  return Number(r.data.price);
}

async function atlasBalance() {
  const r = await http(`${ATLAS}/public/v1/balance`, { headers: atlasHeaders() }, "Atlas balance");
  return Number(r.available.value);
}

async function atlasUpload(file) {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(file)]), basename(file));
  const r = await http(
    `${ATLAS}/api/v1/model/uploadMedia`,
    { method: "POST", headers: { Authorization: `Bearer ${key("ATLAS_API_KEY")}` }, body: form },
    "Atlas upload"
  );
  const url = r?.data?.download_url || r?.data?.url || r?.url;
  if (!url) throw new Error(`Atlas upload returned no URL: ${JSON.stringify(r).slice(0, 300)}`);
  return url;
}

async function atlasRun(body) {
  const r = await http(
    `${ATLAS}/api/v1/model/generateVideo`,
    { method: "POST", headers: atlasHeaders(), body: JSON.stringify(body) },
    "Atlas submit"
  );
  const id = r?.data?.id || r?.id;
  if (!id) throw new Error(`Atlas submit returned no id: ${JSON.stringify(r).slice(0, 300)}`);
  process.stdout.write(`  Atlas job ${id} `);
  for (let i = 0; i < 240; i++) {
    await sleep(10000);
    const p = await http(
      `${ATLAS}/api/v1/model/prediction/${id}`,
      { headers: atlasHeaders() },
      "Atlas poll"
    );
    const d = p.data || p;
    if (d.status === "completed" || d.status === "succeeded") {
      process.stdout.write("done\n");
      return { url: d.outputs[0], draftId: d.draft_id, id };
    }
    if (d.status === "failed")
      throw new Error(`Atlas job failed: ${d.error || JSON.stringify(d).slice(0, 300)}`);
    process.stdout.write(".");
  }
  throw new Error("Atlas job timed out after 40 minutes");
}

// ---------- fal (Ideogram, FLUX) ----------
const falHeaders = () => ({
  Authorization: `Key ${key("FAL_KEY")}`,
  "Content-Type": "application/json",
});

async function falBalance() {
  const r = await http(
    "https://api.fal.ai/v1/account/billing?expand=credits",
    { headers: falHeaders() },
    "fal balance"
  );
  return Number(r.credits.current_balance);
}

async function falRun(route, input) {
  const sub = await http(
    `https://queue.fal.run/${route.model}`,
    { method: "POST", headers: falHeaders(), body: JSON.stringify(input) },
    "fal submit"
  );
  for (let i = 0; i < 240; i++) {
    await sleep(5000);
    const s = await http(sub.status_url, { headers: falHeaders() }, "fal poll");
    if (s.status === "COMPLETED") {
      const out = await http(sub.response_url, { headers: falHeaders() }, "fal result");
      return { url: out.images?.[0]?.url || out.image?.url || out.video?.url };
    }
  }
  throw new Error("fal job timed out");
}

// ---------- Google (Veo, Nano Banana) ----------
const GOOGLE = "https://generativelanguage.googleapis.com/v1beta";
const googleHeaders = () => ({
  "x-goog-api-key": key("GEMINI_API_KEY"),
  "Content-Type": "application/json",
});

async function geminiImage(route, shot, defaults, file, refFiles = []) {
  const parts = refFiles.map((f) => ({
    inlineData: {
      mimeType: f.endsWith(".png") ? "image/png" : "image/jpeg",
      data: readFileSync(f).toString("base64"),
    },
  }));
  parts.push({ text: fullPrompt(shot, defaults) });
  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: shot.ratio ?? defaults.ratio, imageSize: shot.size ?? "2K" },
    },
  };
  const r = await http(
    `${GOOGLE}/models/${route.model}:generateContent`,
    { method: "POST", headers: googleHeaders(), body: JSON.stringify(body) },
    "Gemini image"
  );
  const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error(`Gemini returned no image: ${JSON.stringify(r).slice(0, 300)}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(part.inlineData.data, "base64"));
  const u = r.usageMetadata ?? {};
  const outTokens = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  return outTokens
    ? (outTokens / 1e6) * route.perMillionOut + ((u.promptTokenCount ?? 0) / 1e6) * 2
    : null;
}

async function veoRun(route, shot, defaults, file) {
  const body = {
    instances: [{ prompt: fullPrompt(shot, defaults) }],
    parameters: {
      aspectRatio: shot.ratio ?? defaults.ratio,
      durationSeconds: Math.min(8, shot.duration ?? 8),
      resolution: shot.resolution ?? "720p",
    },
  };
  let op = await http(
    `${GOOGLE}/models/${route.model}:predictLongRunning`,
    { method: "POST", headers: googleHeaders(), body: JSON.stringify(body) },
    "Veo submit"
  );
  for (let i = 0; i < 120 && !op.done; i++) {
    await sleep(10000);
    op = await http(`${GOOGLE}/${op.name}`, { headers: googleHeaders() }, "Veo poll");
  }
  const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) throw new Error(`Veo returned no video: ${JSON.stringify(op).slice(0, 300)}`);
  return download(uri, file, { "x-goog-api-key": key("GEMINI_API_KEY") });
}

// ---------- OpenAI (GPT Image) ----------
async function openaiImage(route, shot, defaults, file) {
  const size = (shot.ratio ?? defaults.ratio) === "9:16" ? "1024x1536" : "1536x1024";
  const r = await http(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key("OPENAI_IMAGES_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: route.model,
        prompt: fullPrompt(shot, defaults),
        size,
        quality: shot.quality ?? "medium",
        n: 1,
      }),
    },
    "OpenAI image"
  );
  const d = r.data?.[0];
  if (d?.b64_json) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(d.b64_json, "base64"));
    return file;
  }
  return download(d.url, file);
}

// ---------- planning ----------
async function plan(item, defaults) {
  const route = ROUTES[item.route];
  if (!route) throw new Error(`${item.id}: unknown route "${item.route}"`);
  if (route.provider === "none")
    return { item, route, quote: 0, note: "free source, downloaded by hand" };
  if (route.provider === "atlas") {
    const fakeRefs = (item.cast ?? []).map(() => "https://example.com/ref.png");
    const body = atlasBody(item, route, defaults, fakeRefs);
    return { item, route, body, quote: await atlasQuote(body) };
  }
  if (route.provider === "veo")
    return {
      item,
      route,
      quote: route.perSecond * Math.min(8, item.duration ?? 8),
      estimated: true,
    };
  return { item, route, quote: route.estimate, estimated: true };
}

// A reference is a cast name from the manifest, or a path relative to the repo.
const refPath = (manifest, ref) => join(ROOT, manifest.cast[ref] ?? ref);

async function execute(p, defaults, manifest, state) {
  const { item, route } = p;
  const ext = route.kind === "video" || route.provider === "veo" ? "mp4" : "png";
  const file = item.still
    ? join(OUT, "stills", `${item.id}-${stamp()}.${ext}`)
    : join(
        OUT,
        `${item.id}-${(item.ratio ?? defaults.ratio).replace(":", "x")}-${item.draft ? "draft" : "final"}-${stamp()}.${ext}`
      );
  let charged = p.quote;
  let source = "estimate";

  if (route.provider === "atlas") {
    const refUrls = [];
    for (const who of item.cast ?? [])
      refUrls.push(await atlasUpload(join(ROOT, manifest.cast[who])));
    const before = await atlasBalance();
    const r = await atlasRun(atlasBody(item, route, defaults, refUrls));
    await download(r.url, file);
    await sleep(3000);
    charged = before - (await atlasBalance());
    source = "balance";
    state[item.id] = {
      ...(state[item.id] ?? {}),
      lastJob: r.id,
      lastFile: file,
      ...(r.draftId ? { draftId: r.draftId } : {}),
    };
  } else if (route.provider === "fal") {
    const before = await falBalance();
    const r = await falRun(route, { prompt: fullPrompt(item, defaults) });
    await download(r.url, file);
    charged = before - (await falBalance());
    source = "balance";
  } else if (route.provider === "gemini-image") {
    const cost = await geminiImage(
      route,
      item,
      defaults,
      file,
      (item.refs ?? []).map((r) => refPath(manifest, r))
    );
    if (cost != null) {
      charged = cost;
      source = "usage tokens";
    }
    state[item.id] = { ...(state[item.id] ?? {}), lastFile: file };
  } else if (route.provider === "veo") await veoRun(route, item, defaults, file);
  else if (route.provider === "openai") await openaiImage(route, item, defaults, file);

  logSpend({
    shot: item.id,
    route: item.route,
    model: route.model,
    quoted: p.quote.toFixed(4),
    charged: charged.toFixed(4),
    source,
    file: file.replace(ROOT + "/", ""),
  });
  console.log(
    `  saved ${file.replace(ROOT + "/", "")}  quoted ${money(p.quote)}  charged ${money(charged)} (${source})`
  );
  if (source === "balance" && charged > p.quote * OVERRUN + 0.01) {
    throw new Error(
      `${item.id} charged ${money(charged)} against a quote of ${money(p.quote)}. Stopping so you can check before anything else runs.`
    );
  }
  return charged;
}

// ---------- commands ----------
async function showBalances() {
  const rows = [];
  for (const [name, fn] of [
    ["Atlas Cloud", atlasBalance],
    ["fal", falBalance],
  ]) {
    try {
      rows.push(`${name}: ${money(await fn())}`);
    } catch (e) {
      rows.push(`${name}: ${e.message}`);
    }
  }
  rows.push("Google and OpenAI: no balance API; check their billing pages.");
  console.log(rows.join("\n"));
}

async function finishDraft(id, state) {
  const draftId = state[id]?.draftId;
  if (!draftId) throw new Error(`${id} has no Seedance 2.5 draft yet. Run it as a draft first.`);
  const body = { model: "bytedance/seedance-2.5/draft-complete", draft_id: draftId };
  let quote = null;
  try {
    quote = await atlasQuote(body);
  } catch {
    quote = null;
  }
  console.log(
    `${id}: finish draft at 1080p, quote ${quote == null ? "not available (measured from the balance)" : money(quote)}`
  );
  if (!RUN) return console.log("Dry run. Add --run to spend.");
  if (quote != null && quote > BUDGET)
    throw new Error(`Quote ${money(quote)} is over the ${money(BUDGET)} budget.`);
  const before = await atlasBalance();
  const r = await atlasRun(body);
  const file = join(OUT, `${id}-final-1080p-${stamp()}.mp4`);
  await download(r.url, file);
  await sleep(3000);
  const charged = before - (await atlasBalance());
  logSpend({
    shot: id,
    route: "seedance-2.5",
    model: body.model,
    quoted: (quote ?? 0).toFixed(4),
    charged: charged.toFixed(4),
    source: "balance",
    file: file.replace(ROOT + "/", ""),
  });
  state[id] = { ...state[id], finalFile: file };
  console.log(`  saved ${file.replace(ROOT + "/", "")}  charged ${money(charged)}`);
}

async function main() {
  const manifest = readJson(MANIFEST, null);
  const state = readJson(STATE, {});
  const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

  if (flag("balance")) return showBalances();
  if (FINISH) {
    await finishDraft(FINISH, state);
    return save();
  }

  const items = [
    ...(manifest.stills ?? []).map((s) => ({ ...s, still: true })),
    ...manifest.shots,
    ...(manifest.plates ?? []),
  ].filter((s) => !ONLY || ONLY.includes(s.id));
  const chosen = items.filter((s) => s.status === "approved" || (!RUN && flag("all")));
  const skipped = items.filter((s) => !chosen.includes(s));
  if (skipped.length)
    console.log(`Not approved yet, skipped: ${skipped.map((s) => s.id).join(", ")}`);
  if (!chosen.length)
    return console.log(
      'Nothing to run. Mark shots "approved" in assets/manifest.json first (or add --all to price everything).'
    );

  const plans = [];
  for (const item of chosen) plans.push(await plan(item, manifest.defaults));
  let total = 0;
  for (const p of plans) {
    total += p.quote;
    console.log(
      `${p.item.id.padEnd(12)} ${p.item.route.padEnd(16)} ${money(p.quote)}${p.estimated ? " (estimate)" : ""}${p.note ? `  ${p.note}` : ""}`
    );
  }
  console.log(`Total ${money(total)}, budget ${money(BUDGET)}`);
  if (!RUN) return console.log("Dry run. Nothing was spent. Add --run to generate.");
  if (total > BUDGET)
    throw new Error(
      `Total ${money(total)} is over the budget. Raise it with --budget or run fewer shots.`
    );

  for (const p of plans) {
    if (p.route.provider === "none") continue;
    console.log(`${p.item.id}: generating`);
    await execute(p, manifest.defaults, manifest, state);
    save();
  }
}

main().catch((e) => {
  console.error(`Stopped: ${e.message}`);
  process.exit(1);
});
