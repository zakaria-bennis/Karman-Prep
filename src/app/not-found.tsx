// A page inside the app (the student, tutor, school and admin areas) that calls notFound(), for example a
// lesson link with an id that no longer exists. Next.js loads this file's imports on every route, so it
// carries its own few styles and must never import a stylesheet: the marketing site's 404 page is
// (site)/not-found.tsx. Colours follow the device's light or dark setting, as in global-error.tsx.
import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { SITE } from "@/lib/marketing/site-copy";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Karman Prep" },
  robots: { index: false, follow: true },
};

const CSS = `
.nf{position:fixed;inset:0;z-index:1;overflow:auto;display:grid;place-items:center;padding:24px;background:#0e0d0c;color:#f1ede4;font:17px/1.55 system-ui,sans-serif}
.nf main{max-width:560px;display:grid;gap:22px;justify-items:start}
.nf h1{margin:0;font-size:clamp(34px,6vw,56px);line-height:1.05;font-weight:700}
.nf p{margin:0}.nf .mark{font-weight:800;letter-spacing:-0.01em}
.nf .pill{display:inline-flex;align-items:center;min-height:52px;padding:0 22px;border-radius:999px;border:1.5px solid currentColor;color:inherit;font:800 17px/1 system-ui,sans-serif;text-decoration:none}
.nf .pill:focus-visible{outline:3px solid currentColor;outline-offset:3px}
@media (prefers-color-scheme: light){.nf{background:#f5f5f2;color:#12110f}}
`;

export default function NotFound() {
  return (
    <div className="nf">
      <style>{CSS}</style>
      <main>
        <p className="mark">Karman</p>
        <h1>{SITE["not found title"]}</h1>
        <Link href={ROUTES.home} className="pill">
          {SITE["not found home"]}
        </Link>
      </main>
    </div>
  );
}
