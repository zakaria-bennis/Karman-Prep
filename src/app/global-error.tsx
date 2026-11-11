"use client";

// The last resort, shown only when the root layout itself fails (so no fonts, providers or site styles are
// available): the site's colours, following the device's light or dark setting, one sentence, try again
// and the way home.
import { useEffect } from "react";

const CSS = `
body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#0e0d0c;color:#f1ede4;font:17px/1.55 system-ui,sans-serif}
main{max-width:560px;display:grid;gap:22px;justify-items:start}
h1{margin:0;font-size:clamp(34px,6vw,56px);line-height:1.05}
p{margin:0}.mark{font-weight:800;letter-spacing:-0.01em}.sub{color:#b6b0a4}
.row{display:flex;flex-wrap:wrap;gap:12px}
.pill{display:inline-flex;align-items:center;min-height:52px;padding:0 22px;border-radius:999px;border:1.5px solid currentColor;background:transparent;color:inherit;font:800 17px/1 system-ui,sans-serif;text-decoration:none;cursor:pointer}
@media (prefers-color-scheme: light){body{background:#f5f5f2;color:#12110f}.sub{color:#57534b}}
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] root layout failed:", error.digest ?? error.message);
  }, [error]);
  return (
    <html lang="en">
      <head>
        <style>{CSS}</style>
      </head>
      <body>
        <main>
          <p className="mark">Karman</p>
          <h1>Something went wrong on our side.</h1>
          <p className="sub">The page didn&apos;t load. Try again, or come back in a minute.</p>
          <div className="row">
            <button type="button" className="pill" onClick={() => reset()}>
              Try again
            </button>
            {/* A plain link, not next/link: the root layout failed, so a full reload is the point. */}
            <a href="/" className="pill">
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
