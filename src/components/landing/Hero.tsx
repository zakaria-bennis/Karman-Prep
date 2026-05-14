"use client";

// ============================================================
// Hero — above-the-fold conversion driver.
//
// Visual language: "cloud design" — deep navy base, drifting
// aurora blobs (CloudAurora), constellation in supporting role,
// grain overlay, god-ray behind headline.
//
// The headline is "Built to ___" where the last word rotates
// through the brand promises, each colored from the subject palette.
// ============================================================

import Link from "next/link";
import { ArrowRight, Star, Shield, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import ConstellationBackground from "./ConstellationBackground";
import CloudAurora from "./CloudAurora";
import RotatingWord from "./RotatingWord";
import { fadeUp, stagger, ease } from "@/lib/motion";

const heroStagger = stagger();

export default function Hero() {
  const reduce = useReducedMotion();
  const ctaRef = useRef<HTMLAnchorElement>(null);

  // Magnetic CTA — pulls the button toward the cursor within its hit area.
  function handleCTAMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (reduce) return;
    const btn = ctaRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.25}px)`;
  }
  function handleCTALeave() {
    const btn = ctaRef.current;
    if (btn) btn.style.transform = "";
  }

  return (
    <section
      className="relative overflow-hidden bg-cloud-night bg-grain pt-24 pb-28 sm:pt-32 sm:pb-36"
    >
      {/* Atmospheric layers — ordered furthest-back first */}
      <CloudAurora />
      <ConstellationBackground />
      <div className="absolute inset-0 pointer-events-none cloud-godray" aria-hidden="true" />

      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        variants={heroStagger}
        initial="hidden"
        animate="show"
      >
        {/* Eyebrow trust badge */}
        <motion.div variants={fadeUp} transition={{ duration: 0.55, ease }}>
          <div className="inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm text-blue-200/90 px-4 py-1.5 rounded-full type-label border border-white/15">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>2,400+ students improved their scores</span>
          </div>
        </motion.div>

        {/* Headline — "Built to [rotating word]." */}
        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.65, ease }}
          className="type-display-xl text-balance mt-8 text-white"
        >
          <span className="block">Built to</span>
          <span className="block mt-1 sm:mt-2">
            <RotatingWord />
            <span className="text-white">.</span>
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.6, ease }}
          className="type-body-lg mt-8 text-slate-300/95 max-w-2xl mx-auto text-balance"
        >
          Personalized SAT prep with expert tutors, adaptive diagnostics, and a{" "}
          <span className="text-white font-semibold">50-point score improvement guarantee</span>
          —or your money back.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease }}
          className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center"
        >
          <Link
            ref={ctaRef}
            href="/auth/sign-up"
            onMouseMove={handleCTAMove}
            onMouseLeave={handleCTALeave}
            className="btn-primary text-base px-8 py-4 group w-full sm:w-auto transition-transform duration-[180ms] ease-out will-change-transform"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#sample-quiz"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] backdrop-blur-sm px-8 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-white/[0.12] hover:border-white/30 w-full sm:w-auto"
          >
            Take the Free Quiz
          </a>
        </motion.div>

        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.55, ease }}
          className="mt-4 text-sm text-slate-400"
        >
          Cancel anytime · No card required
        </motion.p>

        {/* Trust icons */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease }}
          className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-4"
        >
          {[
            { icon: Shield, label: "Score Guarantee" },
            { icon: Zap,    label: "Adaptive Learning" },
            { icon: Star,   label: "4.9/5 Rating" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <Icon className="w-4 h-4 text-blue-300/90" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Score improvement card — mono numerals for editorial rigor */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.7, ease }}
          className="mt-14 mx-auto max-w-sm bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6"
        >
          <p className="type-label text-slate-400 mb-4">Average score improvement</p>
          <div className="flex items-end justify-center gap-4">
            <div className="text-center">
              <div className="type-mono text-2xl font-bold text-slate-400">1235</div>
              <div className="text-xs text-slate-500 mt-1">Before</div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px w-8 bg-gradient-to-r from-slate-600 to-blue-400" />
              <span className="type-mono text-blue-300 font-bold text-sm">+285</span>
              <div className="h-px w-8 bg-gradient-to-r from-blue-400 to-slate-600" />
            </div>
            <div className="text-center">
              <div className="type-mono text-2xl font-bold text-blue-300">1520</div>
              <div className="text-xs text-slate-500 mt-1">After</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
