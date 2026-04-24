// ============================================================
// AuthBackdrop — the cloud-design atmosphere behind /auth pages.
// Matches the landing Hero's palette (violet/blue/teal aurora on
// a deep navy base) so the journey feels continuous.
// Pure CSS animation — no client JS, SSR-safe.
// Used on /auth/sign-in and /auth/sign-up.
// ============================================================

// Deterministic pseudo-random so server and client render identically.
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 160 }, (_, i) => ({
  top: pr(i * 2.111) * 100,
  left: pr(i * 2.111 + 1.3) * 100,
  r: 0.4 + pr(i * 3.77) * 1.3,
  o: 0.18 + pr(i * 4.29) * 0.55,
  // Independent twinkle timing per star — staggered so they feel alive
  // without any JS animation loop.
  twinkleDuration: 3 + pr(i * 5.71) * 4,
  twinkleDelay:    pr(i * 6.13) * 6,
}));

export default function AuthBackdrop() {
  return (
    <>
      {/* Base deep-navy gradient — matches bg-cloud-night on the landing */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 30%, #0E1438 0%, transparent 60%)," +
            "radial-gradient(ellipse 100% 60% at 50% 100%, #070A1C 0%, transparent 55%)," +
            "linear-gradient(180deg, #070B1C 0%, #08091A 100%)",
        }}
      />

      {/* Aurora blobs — violet, blue, teal — echoing the Hero's CloudAurora */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
      >
        <div
          className="absolute rounded-full"
          style={{
            top: "-12%",
            left: "-8%",
            width: "70%",
            height: "70%",
            background:
              "radial-gradient(circle, rgba(168,140,255,0.22) 0%, rgba(168,140,255,0.10) 30%, transparent 65%)",
            filter: "blur(60px)",
            animation: "authDrift1 44s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "10%",
            left: "55%",
            width: "60%",
            height: "60%",
            background:
              "radial-gradient(circle, rgba(88,130,255,0.20) 0%, rgba(88,130,255,0.08) 30%, transparent 65%)",
            filter: "blur(60px)",
            animation: "authDrift2 52s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "55%",
            left: "15%",
            width: "55%",
            height: "55%",
            background:
              "radial-gradient(circle, rgba(80,220,200,0.16) 0%, rgba(80,220,200,0.06) 30%, transparent 65%)",
            filter: "blur(60px)",
            animation: "authDrift3 60s ease-in-out infinite alternate",
          }}
        />
      </div>

      {/* Star field — twinkling in place */}
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top:    `${s.top}%`,
              left:   `${s.left}%`,
              width:  `${s.r}px`,
              height: `${s.r}px`,
              opacity: s.o,
              animation: `authTwinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Grain overlay — matches landing's .bg-grain */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          opacity: 0.1,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Keyframes — inlined so this stays a self-contained drop-in */}
      <style>{`
        @keyframes authDrift1 {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(40px, 30px, 0); }
        }
        @keyframes authDrift2 {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50px, 25px, 0); }
        }
        @keyframes authDrift3 {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(35px, -40px, 0); }
        }
        @keyframes authTwinkle {
          0%, 100% { opacity: var(--base, 0.5); }
          50%      { opacity: calc(var(--base, 0.5) * 0.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="authDrift"], [style*="authTwinkle"] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
