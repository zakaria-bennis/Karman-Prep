// ============================================================
// AuthBackdrop — the observatory night behind /auth pages.
// Matches the landing Hero (warm night, ivory stars, lamp-warm
// horizon) so the journey feels continuous.
// Pure CSS animation — no client JS, SSR-safe.
// Used on /auth/sign-in and /auth/sign-up.
// ============================================================

// Deterministic pseudo-random so server and client render identically.
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 140 }, (_, i) => ({
  top: pr(i * 2.111) * 100,
  left: pr(i * 2.111 + 1.3) * 100,
  r: 0.4 + pr(i * 3.77) * 1.2,
  o: 0.14 + pr(i * 4.29) * 0.45,
  // Independent twinkle timing per star — staggered so they feel alive
  // without any JS animation loop. 3–6s cycles per docs/brand.md.
  twinkleDuration: 3 + pr(i * 5.71) * 3,
  twinkleDelay: pr(i * 6.13) * 6,
}));

export default function AuthBackdrop() {
  return (
    <>
      {/* Base warm-night gradient with the faintest lamp glow rising
          from the horizon — matches the landing canvas. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 140% 50% at 50% 110%, rgba(200,171,106,0.07) 0%, transparent 60%)," +
            "linear-gradient(180deg, #040302 0%, #070605 55%, #0D0A08 100%)",
        }}
      />

      {/* Star field — ivory, twinkling in place */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-ivory"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.r}px`,
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
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          opacity: 0.1,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Keyframes — inlined so this stays a self-contained drop-in */}
      <style>{`
        @keyframes authTwinkle {
          0%, 100% { opacity: var(--base, 0.5); }
          50%      { opacity: calc(var(--base, 0.5) * 0.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="authTwinkle"] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
