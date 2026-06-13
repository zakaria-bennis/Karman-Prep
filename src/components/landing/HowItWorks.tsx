"use client";

// ============================================================
// How Karman works — three-step vignette using react-useanimations
// hand-drawn icon animations (play once on entry, replay on hover).
//
// Observatory treatment: the three steps share one quiet voice —
// bronze-ringed badges with gold icon strokes on the night canvas.
// The alternating left/right rhythm carries the visual interest;
// color stays out of the way.
// ============================================================

import { motion } from "framer-motion";
import { useState } from "react";
import UseAnimations from "react-useanimations";
import checkmark from "react-useanimations/lib/checkmark";
import bookmark from "react-useanimations/lib/bookmark";
import arrowUpCircle from "react-useanimations/lib/arrowUpCircle";
import Reveal from "@/components/shared/Reveal";
import { settle, settleTransition, viewportContemplative } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Lottie-style animation objects exported by the pack.
type AnimationObj = Parameters<typeof UseAnimations>[0]["animation"];

interface Step {
  step: string;
  animation: AnimationObj;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    step: "01",
    animation: checkmark,
    title: "Take the diagnostic",
    description:
      "Our adaptive 35-question assessment identifies your exact weaknesses across every SAT domain. Takes 35 minutes.",
  },
  {
    step: "02",
    animation: bookmark,
    title: "Follow your path",
    description:
      "A personalized sequence of lessons, videos, and practice problems targeting your specific gaps. Concepts unlock as you master them.",
  },
  {
    step: "03",
    animation: arrowUpCircle,
    title: "Track your rise",
    description:
      "See your predicted score climb in real time. Weekly check-ins with your tutor keep momentum high all the way to test day.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-grain relative overflow-hidden bg-night py-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="mb-24 text-center">
          <span className="type-label text-taupe">The method</span>
          <h2 className="type-display-lg mt-4 text-ivory">How Karman works.</h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-taupe">
            A proven three-step system that takes you from your current score to your target score.
          </p>
        </Reveal>

        <div className="relative mx-auto max-w-4xl">
          <div className="space-y-20 sm:space-y-32">
            {STEPS.map((s, idx) => {
              const onRight = idx % 2 === 0;
              return (
                <div
                  key={s.title}
                  className="relative grid grid-cols-1 items-center sm:grid-cols-2 sm:gap-16"
                >
                  {/* Content */}
                  <motion.div
                    variants={settle}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportContemplative}
                    transition={{ ...settleTransition, delay: 0.1 }}
                    className={cn(
                      "pl-20 sm:pl-0",
                      onRight
                        ? "text-left sm:col-start-2 sm:pl-8"
                        : "text-left sm:col-start-1 sm:pr-8 sm:text-right"
                    )}
                  >
                    <div className="type-label text-gold">Step {s.step}</div>
                    <h3 className="type-display-md mt-3 text-ivory">{s.title}</h3>
                    <p
                      className={cn("type-body mt-4 max-w-md text-taupe", !onRight && "sm:ml-auto")}
                    >
                      {s.description}
                    </p>
                  </motion.div>

                  {/* Badge — bronze ring, gold stroke. Plays once on entry,
                      replays on hover. */}
                  <AnimatedBadge animation={s.animation} />
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
// Animated badge — a key bump on hover and on each viewport-enter
// forces UseAnimations to remount (which replays the animation,
// since the pack doesn't expose a loop control).
// ─────────────────────────────────────────────────────────────

function AnimatedBadge({ animation }: { animation: AnimationObj }) {
  const [playKey, setPlayKey] = useState(0);
  const replay = () => setPlayKey((k) => k + 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={replay}
      onMouseEnter={replay}
      viewport={{ once: false, margin: "-20%" }}
      transition={settleTransition}
      className="absolute left-6 top-0 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-bronze bg-surface sm:left-1/2"
    >
      <UseAnimations key={playKey} animation={animation} size={26} strokeColor="#C8AB6A" autoplay />
    </motion.div>
  );
}
