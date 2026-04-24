// ============================================================
// AuthBackdrop — space-gradient background with a soft brand
// glow behind the Clerk card. Static (no animation, no client JS).
// Used on /auth/sign-in and /auth/sign-up.
// ============================================================

// Deterministic pseudo-random so server and client render identically
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 160 }, (_, i) => ({
  top: pr(i * 2.111) * 100,
  left: pr(i * 2.111 + 1.3) * 100,
  r: 0.4 + pr(i * 3.77) * 1.3,
  o: 0.18 + pr(i * 4.29) * 0.55,
}));

export default function AuthBackdrop() {
  return (
    <>
      {/* Base deep-space gradient */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #1e1338 0%, #0a0f22 50%, #020410 100%)",
        }}
      />
      {/* Brand glow halo — soft pink and cyan blobs */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 500px 340px at 30% 45%, rgba(236,72,153,0.18), transparent 70%)," +
            "radial-gradient(ellipse 500px 340px at 70% 55%, rgba(56,189,248,0.18), transparent 70%)",
        }}
      />
      {/* Star field */}
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
            }}
          />
        ))}
      </div>
    </>
  );
}
