// A page inside the app (the student, tutor, school and admin areas) that calls notFound(), for example a
// lesson link with an id that no longer exists: the portal's misty valley at dawn, one sentence and the way
// back. Next.js loads this file's imports on every route, so it carries its own few styles, must never
// import a stylesheet, and leaves the painting to LostMist, which fetches it only when this screen shows.
// The marketing site's 404 page is (site)/not-found.tsx.
import type { Metadata } from "next";
import LostMist from "@/components/lost/LostMist";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Karman Prep" },
  robots: { index: false, follow: true },
};

/* Before the painting arrives (or without scripts) the screen is plain mist, so the words read at once. */
const CSS = `
.lost{position:fixed;inset:0;z-index:60;overflow:hidden;background:linear-gradient(#c9c6d6,#eceae6 46%,#f0eeea);color:#1b1a17;font-family:var(--font-hanken),system-ui,sans-serif}
.lost canvas{position:absolute;top:0;left:0;height:100%;display:block;opacity:0;transition:opacity 1.6s ease}
.lost .lost-picture{width:100%}
.lost .lost-drift{left:-12%;width:124%}
.lost[data-painted] canvas{opacity:1}
.lost .lost-veil{position:absolute;inset:0;background:linear-gradient(rgba(238,236,232,0) 18%,rgba(238,236,232,.8) 55%,rgba(240,238,234,.97))}
.lost .lost-mark{position:absolute;left:clamp(20px,4vw,48px);top:clamp(18px,3vw,36px);margin:0;font-weight:700;font-size:20px;line-height:1;letter-spacing:-0.01em}
.lost main{position:absolute;left:clamp(20px,6vw,96px);right:clamp(20px,6vw,96px);bottom:clamp(40px,10vh,110px);max-width:640px;display:grid;gap:18px;justify-items:start}
.lost h1{margin:0;font:400 clamp(40px,6.4vw,84px)/1.02 var(--font-young-serif),Georgia,serif;letter-spacing:-0.015em;text-wrap:balance}
.lost main p{margin:0;font-size:clamp(17px,1.5vw,20px);line-height:1.5;font-weight:500;max-width:34ch;text-wrap:pretty}
.lost a{display:inline-flex;align-items:center;min-height:52px;margin-top:8px;padding:0 26px;border-radius:999px;background:#1b1a17;color:#f6f1e4;font-weight:700;font-size:17px;line-height:1;text-decoration:none}
.lost a:focus-visible{outline:3px solid #1b1a17;outline-offset:3px}
@keyframes lost-drift{from{transform:translateX(-4%)}to{transform:translateX(4%)}}
.lost[data-painted] .lost-drift{animation:lost-drift 46s ease-in-out infinite alternate}
@media (prefers-reduced-motion: reduce){.lost canvas{transition:none}.lost[data-painted] .lost-drift{animation:none}}
.lost[data-still] canvas{transition:none}.lost[data-still] .lost-drift{animation:none}
@media (max-height:520px){.lost main{bottom:24px;gap:10px}.lost h1{font-size:36px}}
`;

export default function NotFound() {
  return (
    <div className="lost">
      <style>{CSS}</style>
      <LostMist />
      <p className="lost-mark">Karman</p>
      <main>
        <h1>Lost in the mist.</h1>
        <p>This page isn&apos;t here. Step back out and try again.</p>
        {/* A plain link home. LostMist turns it into "back to where you were" when there is a page to go back to. */}
        <a href="/" data-lost-back>
          Take me back
        </a>
      </main>
    </div>
  );
}
