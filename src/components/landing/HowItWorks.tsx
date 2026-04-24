"use client";

// ============================================================
// How Strata works — scroll-scrubbed vertical timeline.
//
// The glowing rail starts exactly at the center of the first
// badge (Take the diagnostic), passes through the middle badge
// (Follow your path), and ends exactly at the last badge
// (Track your rise) — the three circles encapsulate the line.
//
// Desktop: rail centered between two content columns, cards
// alternate sides. Mobile: rail on the left, cards stack beside.
// ============================================================

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { ClipboardList, BookOpen, TrendingUp, type LucideIcon } from "lucide-react";
import Reveal from "@/components/shared/Reveal";
import { fadeUp, ease, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Step {
  step: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;       // hex — echoes the promise palette
  colorSoft: string;   // rgba with alpha for glow
}

const STEPS: Step[] = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Take the diagnostic",
    description:
      "Our adaptive 20-question assessment identifies your exact weaknesses across every SAT domain. Takes 35 minutes.",
    color: "#7FB3FF",                          // dream-blue
    colorSoft: "rgba(127, 179, 255, 0.18)",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "Follow your path",
    description:
      "A personalized sequence of lessons, videos, and practice problems targeting your specific gaps. Concepts unlock as you master them.",
    color: "#C4A7FF",                          // inspire-violet
    colorSoft: "rgba(196, 167, 255, 0.18)",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Track your rise",
    description:
      "See your predicted score climb in real time. Weekly check-ins with your tutor keep momentum high all the way to test day.",
    color: "#5EE4C6",                          // achieve-teal
    colorSoft: "rgba(94, 228, 198, 0.18)",
  },
];

export default function HowItWorks() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const firstBadgeRef = useRef<HTMLDivElement>(null);
  const lastBadgeRef  = useRef<HTMLDivElement>(null);

  // Rail geometry is measured from the actual badges so the line
  // starts at the first badge's center and ends at the last badge's
  // center — no hardcoded offsets, no misalignment at any viewport.
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    function compute() {
      const tl = timelineRef.current;
      const first = firstBadgeRef.current;
      const last  = lastBadgeRef.current;
      if (!tl || !first || !last) return;
      const tlRect = tl.getBoundingClientRect();
      const f = first.getBoundingClientRect();
      const l = last.getBoundingClientRect();
      const top    = (f.top + f.height / 2) - tlRect.top;
      const bottom = (l.top + l.height / 2) - tlRect.top;
      setRail({ top, height: bottom - top });
    }
    compute();
    const ro = new ResizeObserver(compute);
    if (timelineRef.current) ro.observe(timelineRef.current);
    window.addEventListener("resize", compute);
    // Recompute after fonts/images settle — layout can shift
    const t = window.setTimeout(compute, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.clearTimeout(t);
    };
  }, []);

  // Scroll progress through the timeline, smoothed.
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 70%", "end 30%"],
  });
  const progress   = useSpring(scrollYProgress, { stiffness: 70, damping: 20, mass: 0.3 });
  const lineScaleY = useTransform(progress, [0, 1], [0, 1]);
  const pulseTop   = useTransform(progress, [0, 1], ["0%", "100%"]);

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

        {/* Timeline */}
        <div ref={timelineRef} className="relative max-w-4xl mx-auto">
          {/* ----------------------------------------------------------------
             Rail system — wrapped in a single positioned container whose top
             and height are measured from the actual first and last badges.
             Everything inside aligns via left-1/2 -translate-x-1/2, so every
             element (track, fill, pulse) sits on the exact same vertical axis.
          ------------------------------------------------------------------ */}
          <div
            className="absolute left-6 sm:left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              top:    rail?.top ?? 0,
              height: rail?.height ?? 0,
              opacity: rail ? 1 : 0,
              transition: "opacity 0.35s ease",
            }}
            aria-hidden="true"
          >
            {/* Static faint track */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/10" />

            {/* Scrolling fill — gradient drawn as user descends, pulsing glow */}
            <motion.div
              className="absolute inset-y-0 left-1/2 w-[2px] origin-top"
              style={{
                scaleY: lineScaleY,
                x: "-50%",
                background: "linear-gradient(to bottom, #7FB3FF 0%, #C4A7FF 50%, #5EE4C6 100%)",
              }}
              animate={{
                filter: [
                  "drop-shadow(0 0 6px rgba(127,179,255,0.5))",
                  "drop-shadow(0 0 18px rgba(196,167,255,0.85))",
                  "drop-shadow(0 0 6px rgba(94,228,198,0.5))",
                ],
              }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Travelling light pulse at the scroll tip */}
            <motion.div
              className="absolute w-3.5 h-3.5 rounded-full left-1/2"
              style={{
                top: pulseTop,
                x: "-50%",
                y: "-50%",
                background:
                  "radial-gradient(circle, #ffffff 0%, rgba(196,167,255,0.85) 40%, transparent 70%)",
                boxShadow: "0 0 16px #C4A7FF, 0 0 32px rgba(196,167,255,0.6)",
              }}
            />
          </div>

          <div className="space-y-20 sm:space-y-32">
            {STEPS.map(({ step, icon: Icon, title, description, color, colorSoft }, idx) => {
              const onRight = idx % 2 === 0; // step 1 & 3 right, step 2 left
              const badgeRef =
                idx === 0               ? firstBadgeRef :
                idx === STEPS.length - 1 ? lastBadgeRef  :
                                           undefined;

              return (
                <div
                  key={title}
                  className="relative grid grid-cols-1 sm:grid-cols-2 sm:gap-16 items-start"
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
                    <div className="type-label" style={{ color }}>
                      Step {step}
                    </div>
                    <h3 className="type-display-md mt-3 text-white">{title}</h3>
                    <p
                      className={cn(
                        "mt-4 type-body text-slate-400 max-w-md",
                        !onRight && "sm:ml-auto"
                      )}
                    >
                      {description}
                    </p>
                  </motion.div>

                  {/* Badge — absolutely centered on the rail axis.
                      Solid-ish background so the line visually terminates
                      at its center rather than bleeding through. */}
                  <motion.div
                    ref={badgeRef}
                    initial={{ scale: 0.5, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, margin: "-20%" }}
                    transition={{ duration: 0.6, ease }}
                    className="absolute top-0 left-6 sm:left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full border-2 z-10"
                    style={{
                      borderColor: color,
                      background: `radial-gradient(circle, ${colorSoft} 0%, rgba(7,11,28,0.92) 75%)`,
                      boxShadow: `0 0 36px ${colorSoft}, 0 0 72px ${colorSoft}`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
