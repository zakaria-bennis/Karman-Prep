/*
 * The prize sits in a soft light with thin rays that turn slowly behind it,
 * like something catching the light (the end screen's P.rays). The halo is a
 * flat tinted disc, not a radial gradient (rule 21), and both ray wheels hold
 * still under reduced motion.
 */
export function Rays() {
  const path = (i: number, thin: boolean) =>
    thin
      ? `M-1 -10 L0 -30 L1 -10Z`
      : `M-${i % 2 ? 1 : 1.8} -9 L0 -${i % 2 ? 34 : 48} L${i % 2 ? 1 : 1.8} -9Z`;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span
        className="absolute rounded-full"
        style={{ inset: "22%", background: "rgb(var(--k-accent) / 0.14)" }}
      />
      <svg className="rays absolute inset-0 h-full w-full" viewBox="-50 -50 100 100">
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={path(i, false)}
            transform={`rotate(${i * 22.5})`}
            fill="color-mix(in srgb, rgb(var(--k-accent)) 55%, #fff)"
            opacity={0.55}
          />
        ))}
      </svg>
      <svg className="rays r2 absolute inset-0 h-full w-full" viewBox="-50 -50 100 100">
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d={path(i, true)}
            transform={`rotate(${i * 45 + 11})`}
            fill="color-mix(in srgb, rgb(var(--k-accent)) 55%, #fff)"
            opacity={0.4}
          />
        ))}
      </svg>
    </div>
  );
}
