"use client";

// ============================================================
// How Strata works — three-step scroll-revealed vignette using
// react-useanimations icon animations.
//
// react-useanimations is a free, hand-drawn icon animation pack
// (~100 icons, all bundled). We pair each step with the closest
// semantic match:
//
//   Step 1 — `checkmark`        (diagnostic completed)
//   Step 2 — `bookmark`         (saving / following lessons)
//   Step 3 — `arrowUpCircle`    (score climbing)
//
// Each animation plays once on viewport entry and replays on
// hover. Subtle, polished, agency-trailer feel — no infinite
// loops, no twitchy motion. Strata gradient lives in the badge
// border + atmospheric glow; the icon stays brand-colored via
// the `strokeColor` prop.
// ============================================================

import { motion } from "framer-motion";
import { useState } from "react";
import UseAnimations from "react-useanimations";
import checkmark from "react-useanimations/lib/checkmark";
import bookmark from "react-useanimations/lib/bookmark";
import arrowUpCircle from "react-useanimations/lib/arrowUpCircle";
import Reveal from "@/components/shared/Reveal";
import { fadeUp, ease, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Lottie-style animation objects exported by the pack.
type AnimationObj = Parameters<typeof UseAnimations>[0]["animation"];

interface Step {
  step: string;
  animation: AnimationObj;
  title: string;
  description: string;
  color: string;       // hex — echoes the promise palette
  colorSoft: string;   // rgba with alpha for glow
}

const STEPS: Step[] = [
  {
    step: "01",
    animation: checkmark,
    title: "Take the diagnostic",
    description:
      "Our adaptive 35-question assessment identifies your exact weaknesses across every SAT domain. Takes 35 minutes.",
    color: "#7FB3FF",                          // dream-blue
    colorSoft: "rgba(127, 179, 255, 0.18)",
  },
  {
    step: "02",
    animation: bookmark,
    title: "Follow your path",
    description:
      "A personalized sequence of lessons, videos, and practice problems targeting your specific gaps. Concepts unlock as you master them.",
    color: "#C4A7FF",                          // inspire-violet
    colorSoft: "rgba(196, 167, 255, 0.18)",
  },
  {
    step: "03",
    animation: arrowUpCircle,
    title: "Track your rise",
    description:
      "See your predicted score climb in real time. Weekly check-ins with your tutor keep momentum high all the way to test day.",
    color: "#5EE4C6",                          // achieve-teal
    colorSoft: "rgba(94, 228, 198, 0.18)",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 bg-cloud-night bg-grain overflow-hidden">
      {/* Atmospheric glows tie this section to the Hero's cloud language */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-16 -left-40 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(127,179,255,0.09), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 -right-40 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(94,228,198,0.07), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — italic last word echoes the Hero rotating word */}
        <Reveal className="text-center mb-24">
          <span className="type-label text-blue-300/80">How it works</span>
          <h2 className="type-display-lg mt-4 text-white">
            How Strata <span className="italic text-blue-200 font-[650]">works</span>.
          </h2>
          <p className="type-body-lg mt-5 text-slate-400 max-w-xl mx-auto text-balance">
            A proven three-step system that takes you from your current score to your target score.
          </p>
        </Reveal>

        <div className="relative max-w-4xl mx-auto">
          <div className="space-y-20 sm:space-y-32">
            {STEPS.map((s, idx) => {
              const onRight = idx % 2 === 0;
              return (
                <div
                  key={s.title}
                  className="relative grid grid-cols-1 sm:grid-cols-2 sm:gap-16 items-center"
                >
                  {/* Content */}
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportOnce}
                    transition={{ duration: 0.6, ease, delay: 0.12 }}
                    className={cn(
                      "pl-20 sm:pl-0",
                      onRight
                        ? "sm:col-start-2 sm:pl-8 text-left"
                        : "sm:col-start-1 sm:pr-8 text-left sm:text-right"
                    )}
                  >
                    <div className="type-label" style={{ color: s.color }}>
                      Step {s.step}
                    </div>
                    <h3 className="type-display-md mt-3 text-white">{s.title}</h3>
                    <p
                      className={cn(
                        "mt-4 type-body text-slate-400 max-w-md",
                        !onRight && "sm:ml-auto"
                      )}
                    >
                      {s.description}
                    </p>
                  </motion.div>

                  {/* Badge — back to w-12 (48px), no rail. The icon
                      animation plays once on viewport entry and
                      replays on hover. */}
                  <AnimatedBadge color={s.color} colorSoft={s.colorSoft} animation={s.animation} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Animated badge — the Reveal handles entry; a key bump on
// hover and on each viewport-enter forces UseAnimations to
// remount (which replays the animation, since the pack doesn't
// expose a loop control).
// ─────────────────────────────────────────────────────────────

function AnimatedBadge({
  color,
  colorSoft,
  animation,
}: {
  color: string;
  colorSoft: string;
  animation: AnimationObj;
}) {
  const [playKey, setPlayKey] = useState(0);
  const replay = () => setPlayKey((k) => k + 1);

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      onViewportEnter={replay}
      onMouseEnter={replay}
      viewport={{ once: false, margin: "-20%" }}
      transition={{ duration: 0.6, ease }}
      className="absolute top-0 left-6 sm:left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full border-2 z-10"
      style={{
        borderColor: color,
        background: `radial-gradient(circle, ${colorSoft} 0%, rgba(7,11,28,0.92) 75%)`,
        boxShadow: `0 0 36px ${colorSoft}, 0 0 72px ${colorSoft}`,
      }}
    >
      <UseAnimations
        key={playKey}
        animation={animation}
        size={26}
        strokeColor={color}
        autoplay
      />
    </motion.div>
  );
}
