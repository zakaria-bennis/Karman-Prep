"use client";

// ============================================================
// HeroPortal — full-screen split between Reading (left lobe) and
// Math (right lobe). Clicking a half plays a "tilt your head up to
// the stars" transition before routing to that constellation.
// ============================================================

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, BookOpen, Calculator, Sparkles } from "lucide-react";

interface SubjectStats {
  total: number;
  mastered: number;
  available: number;
}

interface Props {
  readingStats: SubjectStats;
  mathStats: SubjectStats;
}

// Deterministic pseudo-random for SSR-stable starfields
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const READING_STARS = Array.from({ length: 110 }, (_, i) => ({
  top: pr(i * 2.1) * 100,
  left: pr(i * 2.1 + 0.7) * 100,
  r: 0.5 + pr(i * 3.9) * 1.6,
  o: 0.25 + pr(i * 4.7) * 0.65,
  depth: 1 + (i % 3) * 0.8,   // 3 parallax layers (1, 1.8, 2.6)
}));
const MATH_STARS = Array.from({ length: 110 }, (_, i) => ({
  top: pr(i * 2.3 + 77) * 100,
  left: pr(i * 2.3 + 77.7) * 100,
  r: 0.5 + pr(i * 4.1 + 11) * 1.6,
  o: 0.25 + pr(i * 4.9 + 13) * 0.65,
  depth: 1 + (i % 3) * 0.8,
}));

const HALVES = [
  {
    subject: "reading" as const,
    href: "/learn/reading",
    description: "The shape of argument. The weight of evidence. The geometry of language.",
    Icon: BookOpen,
    color: "#EC4899",
    glowFrom: "#EC4899",
    glowTo: "#9F1239",
    stars: READING_STARS,
    cta: "Into the constellation",
  },
  {
    subject: "math" as const,
    href: "/learn/math",
    description: "Functions, curves, proofs. The quiet grammar underneath the world.",
    Icon: Calculator,
    color: "#38BDF8",
    glowFrom: "#38BDF8",
    glowTo: "#075985",
    stars: MATH_STARS,
    cta: "Into the constellation",
  },
];

export default function PortalCards({ readingStats, mathStats }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<"reading" | "math" | null>(null);
  const [transitioning, setTransitioning] = useState<"reading" | "math" | null>(null);
  const statsMap = { reading: readingStats, math: mathStats };

  // Mouse parallax — subtle sky-shift as you move your cursor
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const parallaxX = useTransform(mx, [-1, 1], [-12, 12]);
  const parallaxY = useTransform(my, [-1, 1], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function handleEnter(subject: "reading" | "math", href: string) {
    if (transitioning) return;
    setTransitioning(subject);
    // Let the full tilt-up pan play before routing (~2.2s total)
    setTimeout(() => router.push(href), 2200);
  }

  // On unmount, reset scroll so the constellation page starts at top
  useEffect(() => {
    return () => { if (typeof window !== "undefined") window.scrollTo(0, 0); };
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 flex overflow-hidden bg-[#02040a]"
    >
      {HALVES.map((h) => {
        const stats = statsMap[h.subject];
        const pct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
        const isHovered = hovered === h.subject;
        const isOther   = hovered !== null && hovered !== h.subject;
        const isLeaving = transitioning === h.subject;
        const isDimming = transitioning !== null && transitioning !== h.subject;

        return (
          <motion.button
            key={h.subject}
            type="button"
            onMouseEnter={() => setHovered(h.subject)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleEnter(h.subject, h.href)}
            className="relative flex-1 group overflow-hidden cursor-pointer text-left"
            animate={{
              flex: isLeaving ? 3 : isDimming ? 0.4 : 1,
              filter: isDimming ? "brightness(0.3) saturate(0.5)" : "brightness(1)",
            }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Animated backdrop layer — hover darkens the other side */}
            <motion.div
              className="absolute inset-0"
              animate={{
                filter: isOther ? "brightness(0.55) saturate(0.7)" : "brightness(1) saturate(1)",
              }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Base space gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at ${h.subject === "reading" ? "80%" : "20%"} 55%, ${h.glowFrom}28 0%, ${h.glowTo}10 45%, #02040a 80%)`,
                }}
              />

              {/* Brand-color halo pulses on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: isHovered ? 1 : 0.55 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: `radial-gradient(circle at ${h.subject === "reading" ? "72%" : "28%"} 55%, ${h.color}22, transparent 55%)`,
                }}
              />

              {/* Parallax starfield — 3 depth layers that drift with the cursor */}
              <motion.div
                className="absolute inset-0"
                style={{ x: parallaxX, y: parallaxY }}
              >
                {h.stars.map((s, i) => {
                  const depthMul = s.depth;
                  return (
                    <motion.span
                      key={i}
                      className="absolute rounded-full bg-white"
                      style={{
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: `${s.r * depthMul}px`,
                        height: `${s.r * depthMul}px`,
                        opacity: s.o,
                      }}
                      animate={isHovered ? {
                        opacity: [s.o, Math.min(1, s.o * 1.6), s.o],
                      } : {}}
                      transition={{
                        duration: 2 + (i % 5) * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (i % 8) * 0.1,
                      }}
                    />
                  );
                })}
              </motion.div>

              {/* (streak animation removed — replaced by the full-screen sky-pan overlay) */}
            </motion.div>

            {/* Vertical dividing edge glow */}
            {h.subject === "reading" && (
              <div
                className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
                style={{ background: `linear-gradient(180deg, transparent, ${h.color}30 50%, transparent)` }}
              />
            )}

            {/* Content */}
            <motion.div
              className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center pointer-events-none"
              animate={{
                scale: isLeaving ? 1.25 : isHovered ? 1.04 : 1,
                opacity: isLeaving ? 0 : 1,
                y: isLeaving ? -60 : 0,
              }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="mb-8"
                animate={{
                  y: isHovered ? -8 : 0,
                  filter: isHovered
                    ? `drop-shadow(0 0 32px ${h.color})`
                    : `drop-shadow(0 0 0px transparent)`,
                }}
                transition={{ duration: 0.5 }}
              >
                <h.Icon className="w-16 h-16" style={{ color: h.color }} />
              </motion.div>

              <h2
                className="text-5xl sm:text-6xl font-extrabold text-white mb-6 tracking-tight"
                style={{ textShadow: `0 0 40px ${h.color}50` }}
              >
                {h.subject === "reading" ? "Reading & Writing" : "Math"}
              </h2>
              <p
                className="max-w-sm text-base leading-relaxed text-slate-300/90 mb-10 italic"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {h.description}
              </p>

              {/* Progress pill */}
              <div
                className="flex items-center gap-4 px-5 py-2.5 rounded-full border backdrop-blur-sm mb-10"
                style={{
                  background: `${h.color}0f`,
                  borderColor: `${h.color}40`,
                }}
              >
                <span className="text-xs font-semibold text-slate-200 tabular-nums">
                  {stats.mastered} <span className="text-slate-500">/</span> {stats.total}
                </span>
                <span className="w-px h-4 bg-white/20" />
                <span className="text-xs font-bold tabular-nums" style={{ color: h.color }}>
                  {pct}% mastered
                </span>
              </div>

              {/* CTA */}
              <motion.span
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold tracking-wide"
                style={{
                  background: isHovered ? h.color : `${h.color}20`,
                  color: isHovered ? "#ffffff" : h.color,
                  border: `1px solid ${h.color}`,
                }}
                animate={{
                  boxShadow: isHovered ? `0 0 50px ${h.color}70` : `0 0 0px transparent`,
                }}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className="w-4 h-4" />
                {h.cta}
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.div>
          </motion.button>
        );
      })}

      {/* Center divider nebula */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-px h-2/3"
        style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.2) 50%, transparent)" }}
      />

      {/* Horizon → sky pan-up transition */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
            style={{ perspective: 1400 }}
          >
            {/* Ground layer — dark foreground. Recedes as the camera tilts up. */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, transparent 55%, #02040a 75%, #000 100%)",
              }}
            />

            {/* Sky layer — perspective-tilted starscape that rotates from looking-down to looking-up */}
            <motion.div
              className="absolute inset-0"
              initial={{ rotateX: 72, translateY: "30%", scale: 1.3 }}
              animate={{ rotateX: 0, translateY: "0%",  scale: 1.0 }}
              transition={{ duration: 2.0, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "50% 100%" }}
            >
              {/* Deep space backdrop tinted by the chosen subject */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 50% 40%, ${transitioning === "reading" ? "#ec489930" : "#38bdf830"} 0%, #02040a 55%, #000 100%)`,
                }}
              />

              {/* Extra dense starfield for the sky */}
              {Array.from({ length: 200 }).map((_, i) => {
                const top = pr(i * 2.2 + 101) * 100;
                const left = pr(i * 2.2 + 202) * 100;
                const r = 0.3 + pr(i * 3.7 + 303) * 1.8;
                const o = 0.3 + pr(i * 4.9 + 404) * 0.7;
                const twinkleDelay = pr(i * 5.3) * 2;
                return (
                  <motion.span
                    key={i}
                    className="absolute rounded-full bg-white"
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${r}px`,
                      height: `${r}px`,
                      opacity: o,
                    }}
                    animate={{ opacity: [o, Math.min(1, o * 1.4), o] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: twinkleDelay, ease: "easeInOut" }}
                  />
                );
              })}

              {/* Horizon line — a soft glow where sky meets ground; fades out at the end of the pan */}
              <motion.div
                className="absolute left-0 right-0 h-px"
                initial={{ top: "70%", opacity: 0.7 }}
                animate={{ top: "-20%", opacity: 0 }}
                transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                style={{
                  background: `linear-gradient(90deg, transparent, ${transitioning === "reading" ? "#ec4899" : "#38bdf8"}, transparent)`,
                  boxShadow: `0 0 40px ${transitioning === "reading" ? "#ec4899" : "#38bdf8"}80`,
                }}
              />
            </motion.div>

            {/* Final dark fade at the end so the constellation page can take over */}
            <motion.div
              className="absolute inset-0 bg-[#02040a]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
