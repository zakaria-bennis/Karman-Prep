// The site-wide password lock (founder, 2026-11-18 and 2026-11-22): while the portal is tested live, every
// page and API of karmanprep.com asks for one shared password first, and typing another address does not
// get round it, because the middleware checks every request before anything else runs.
//
// The password lives only in the Worker's `SITE_PASSWORD` secret (never in git). With no secret set, as on a
// developer's computer, the lock is off. A visitor who types it gets a cookie holding an HMAC of a fixed
// label keyed by the password: it proves they knew it without storing it, and changing the password
// signs everyone out. Callers that never carry a browser cookie (Stripe, Cal.com and other webhooks, cron
// triggers, calendar feeds) pass straight through; each of those checks its own secret already.
//
// Everything is answered here, inside the middleware, with no page, layout, Clerk call or database query:
// a locked visitor costs one HMAC.

export const LOCK_COOKIE = "kp_site_lock";
export const LOCK_PATH = "/site-lock";
const LABEL = "karman-site-lock-v1";
const MONTH_SECONDS = 60 * 60 * 24 * 30;

/** Addresses called by other services, never by a visitor's browser. Each one checks its own secret. */
const MACHINE_PATHS = [
  /^\/api\/stripe\/webhook$/,
  /^\/api\/webhooks(\/|$)/,
  /^\/api\/cron(\/|$)/,
  /^\/api\/calendar\/feed\//,
];

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The cookie value that proves the password was typed: HMAC-SHA256(password, label), in hex. */
export async function lockToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(LABEL)));
}

/** Compares two strings in time that does not depend on where they first differ. */
export function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Where to go after unlocking: only a path on this site, never another site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith(LOCK_PATH)) return "/";
  return next;
}

export function isMachinePath(pathname: string): boolean {
  return MACHINE_PATHS.some((re) => re.test(pathname));
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

/**
 * The lock's answer for this request, or null to let it through.
 * `password` is the Worker's `SITE_PASSWORD`; empty or missing turns the lock off.
 */
export async function siteLock(
  request: Request,
  password: string | undefined
): Promise<Response | null> {
  if (!password) return null;
  const url = new URL(request.url);
  const { pathname } = url;
  if (isMachinePath(pathname)) return null;

  const token = await lockToken(password);
  const unlocked = sameText(cookieValue(request.headers.get("cookie"), LOCK_COOKIE) ?? "", token);

  // The lock page itself: its form posts here.
  if (pathname === LOCK_PATH) {
    if (request.method === "POST") {
      const form = await request.formData().catch(() => null);
      const typed = String(form?.get("password") ?? "");
      const next = safeNext(String(form?.get("next") ?? "/"));
      // Locations are full addresses on this site: Next's middleware refuses a bare path.
      if (sameText(typed, password)) {
        return new Response(null, {
          status: 303,
          headers: {
            ...NO_STORE,
            location: new URL(next, url).toString(),
            "set-cookie": `${LOCK_COOKIE}=${token}; Path=/; Max-Age=${MONTH_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      // A short wait on a wrong password slows guessing down.
      await new Promise((r) => setTimeout(r, 700));
      const back = new URL(LOCK_PATH, url);
      back.searchParams.set("wrong", "1");
      back.searchParams.set("next", next);
      return new Response(null, {
        status: 303,
        headers: { ...NO_STORE, location: back.toString() },
      });
    }
    if (unlocked)
      return Response.redirect(new URL(safeNext(url.searchParams.get("next")), url), 303);
    return lockPage(safeNext(url.searchParams.get("next")), url.searchParams.has("wrong"));
  }

  if (unlocked) return null;

  if (pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
    return Response.json(
      { error: "This site is private for now." },
      { status: 401, headers: NO_STORE }
    );
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("This site is private for now.", { status: 401, headers: NO_STORE });
  }
  return lockPage(safeNext(pathname + url.search), false);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The lock page: one field and one button on a quiet sky, light or dark with the visitor's device. */
export function lockPage(next: string, wrong: boolean): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>Karman</title>
<style>
:root{--sky-a:#f7e9d7;--sky-b:#dfe8f6;--sky-c:#c9d9f2;--ink:#1d2433;--soft:#4c566a;--glass:rgb(255 255 255 / .58);--edge:rgb(255 255 255 / .75);--field:rgb(255 255 255 / .8);--line:rgb(29 36 51 / .14);--go:#2f6fed;--go-ink:#fff;--warn:#b4232f}
@media (prefers-color-scheme:dark){:root{--sky-a:#0b1026;--sky-b:#161d3d;--sky-c:#2a2350;--ink:#eef1fa;--soft:#a9b1c7;--glass:rgb(20 24 48 / .55);--edge:rgb(255 255 255 / .14);--field:rgb(255 255 255 / .08);--line:rgb(255 255 255 / .16);--go:#5b8cff;--go-ink:#0b1026;--warn:#ff8f97}}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{font-family:ui-sans-serif,-apple-system,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:linear-gradient(170deg,var(--sky-a) 0%,var(--sky-b) 55%,var(--sky-c) 100%);display:grid;place-items:center;padding:24px 16px;-webkit-font-smoothing:antialiased}
.glow{position:fixed;inset:auto -20vmax -35vmax auto;width:70vmax;height:70vmax;border-radius:50%;background:radial-gradient(circle,rgb(255 190 120 / .35),transparent 62%);pointer-events:none}
@media (prefers-color-scheme:dark){.glow{background:radial-gradient(circle,rgb(120 140 255 / .22),transparent 62%)}}
main{position:relative;width:100%;max-width:380px;padding:32px 28px 28px;border-radius:24px;background:var(--glass);box-shadow:inset 0 0 0 1px var(--edge),0 24px 60px -24px rgb(10 14 30 / .35);backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);animation:rise .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@media (prefers-reduced-motion:reduce){main{animation:none}}
.mark{font-size:15px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;margin:0 0 22px}
h1{font-size:26px;line-height:1.2;font-weight:650;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 22px;color:var(--soft);font-size:15px;line-height:1.45}
label{display:block;font-size:13px;font-weight:600;margin:0 0 8px;color:var(--soft)}
input{width:100%;height:50px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:var(--field);color:var(--ink);font:inherit;font-size:17px;outline:none}
input:focus-visible{border-color:var(--go);box-shadow:0 0 0 3px color-mix(in srgb,var(--go) 30%,transparent)}
button{margin-top:14px;width:100%;height:50px;border:0;border-radius:14px;background:var(--go);color:var(--go-ink);font:inherit;font-size:16px;font-weight:650;cursor:pointer}
button:focus-visible{outline:3px solid color-mix(in srgb,var(--go) 45%,transparent);outline-offset:2px}
.wrong{margin:12px 0 0;color:var(--warn);font-size:14px;font-weight:600}
</style>
</head>
<body>
<div class="glow" aria-hidden="true"></div>
<main>
<p class="mark">Karman</p>
<h1>Private for now</h1>
<p>Karman is being tested before launch. Enter the password to come in.</p>
<form method="post" action="${LOCK_PATH}">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus${wrong ? ' aria-describedby="wrong" aria-invalid="true"' : ""}>
<input type="hidden" name="next" value="${escapeHtml(next)}">
<button type="submit">Come in</button>
${wrong ? '<p class="wrong" id="wrong" role="alert">That password didn’t work. Try again.</p>' : ""}
</form>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8" },
  });
}
