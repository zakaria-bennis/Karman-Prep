"use client";

// The last resort, shown only when the root layout itself fails (so no fonts, providers or site styles are
// available): the site's dark default colours, one sentence, try again and the way home.
import { useEffect } from "react";

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
  const pill = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 52,
    padding: "0 22px",
    borderRadius: 999,
    border: "1.5px solid #f1ede4",
    background: "transparent",
    color: "#f1ede4",
    font: "800 17px/1 system-ui, sans-serif",
    textDecoration: "none",
    cursor: "pointer",
  } as const;
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: "#0e0d0c",
          color: "#f1ede4",
          font: "17px/1.55 system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 560, display: "grid", gap: 22, justifyItems: "start" }}>
          <p style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.01em" }}>Karman</p>
          <h1 style={{ margin: 0, fontSize: "clamp(34px, 6vw, 56px)", lineHeight: 1.05 }}>
            Something went wrong on our side.
          </h1>
          <p style={{ margin: 0, color: "#b6b0a4" }}>
            The page didn&apos;t load. Try again, or come back in a minute.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" style={pill} onClick={() => reset()}>
              Try again
            </button>
            <a href="/" style={pill}>
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
