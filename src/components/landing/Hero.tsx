"use client";

// ============================================================
// Hero — above-the-fold conversion driver.
//
// Visual language: the warm night observatory (docs/brand.md).
// A generated still of the night sky (src/assets/hero-bg.png —
// ivory stars, one rising constellation, lamp-warm horizon)
// grounds the section; a sparse live constellation breathes over
// it; film grain gives the canvas paper tooth. Copy settles in
// (fade + 8px rise) — nothing springs, nothing chases the cursor.
//
// The headline is "Built to ___" where the last word rotates
// through the brand promises in star-gold italic serif.
// ============================================================

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import ConstellationBackground from "./ConstellationBackground";
import RotatingWord from "./RotatingWord";
import { settle, settleTransition, stagger } from "@/lib/motion";
import heroBg from "@/assets/hero-bg.png";

const heroStagger = stagger(0.12, 0.05);

export default function Hero() {
  return (
    <section className="bg-grain relative overflow-hidden bg-night pb-28 pt-24 sm:pb-36 sm:pt-32">
      {/* The night sky — generated observatory still, fading into the
          page canvas at its lower edge so the next section is seamless. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-90"
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-night" />
      </div>

      {/* A sparse live layer of breathing stars over the still. */}
      <ConstellationBackground />

      <motion.div
        className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8"
        variants={heroStagger}
        initial="hidden"
        animate="show"
      >
        {/* Eyebrow */}
        <motion.div variants={settle} transition={settleTransition}>
          <div className="type-label inline-flex items-center gap-2 rounded-full border border-bronze bg-surface/70 px-4 py-1.5 text-taupe backdrop-blur-sm">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
            <span>2,400+ students improved their scores</span>
          </div>
        </motion.div>

        {/* Headline — "Built to [rotating word]." */}
        <motion.h1
          variants={settle}
          transition={settleTransition}
          className="type-display-xl mt-8 text-balance text-ivory"
        >
          <span className="block">Built to</span>
          <span className="mt-1 block sm:mt-2">
            <RotatingWord />
            <span className="text-ivory">.</span>
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={settle}
          transition={settleTransition}
          className="type-body-lg mx-auto mt-8 max-w-2xl text-balance text-taupe"
        >
          Personalized SAT prep with expert tutors, adaptive diagnostics, and a{" "}
          <span className="font-medium text-ivory">50-point score improvement guarantee</span>
          —or your money back.
        </motion.p>

        {/* CTAs — gold invitation + quiet secondary. No magnetism. */}
        <motion.div
          variants={settle}
          transition={settleTransition}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/auth/sign-up" className="btn-primary group w-full px-8 py-4 sm:w-auto">
            Start Free Trial
            <ArrowRight className="h-5 w-5 transition-transform duration-fast group-hover:translate-x-0.5" />
          </Link>
          <a href="#sample-quiz" className="btn-secondary w-full px-8 py-4 sm:w-auto">
            Take the Free Quiz
          </a>
        </motion.div>

        <motion.p
          variants={settle}
          transition={settleTransition}
          className="mt-4 text-sm text-taupe/80"
        >
          Cancel anytime · No card required
        </motion.p>

        {/* Trust line */}
        <motion.div
          variants={settle}
          transition={settleTransition}
          className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-4"
        >
          {[
            { icon: Shield, label: "Score Guarantee" },
            { icon: Zap, label: "Adaptive Learning" },
            { icon: Star, label: "4.9/5 Rating" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-taupe">
              <Icon className="h-4 w-4 text-gold" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Score improvement card — the earned moment gets the gold. */}
        <motion.div
          variants={settle}
          transition={settleTransition}
          className="card-surface mx-auto mt-14 max-w-sm p-6"
        >
          <p className="type-label mb-4 text-taupe">Average score improvement</p>
          <div className="flex items-end justify-center gap-4">
            <div className="text-center">
              <div className="type-mono text-2xl font-medium text-taupe">1235</div>
              <div className="mt-1 text-xs text-taupe/80">Before</div>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-bronze to-gold" />
              <span className="type-mono text-sm font-medium text-gold-bright">+285</span>
              <div className="h-px w-8 bg-gradient-to-r from-gold to-bronze" />
            </div>
            <div className="text-center">
              <div className="type-mono text-2xl font-medium text-ivory">1520</div>
              <div className="mt-1 text-xs text-taupe/80">After</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
