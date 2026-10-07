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
// The first screen names the learner's job and the next action.
// ============================================================

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import ConstellationBackground from "./ConstellationBackground";
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
        {/* Clear first-screen purpose on desktop and mobile. */}
        <motion.h1
          variants={settle}
          transition={settleTransition}
          className="type-display-xl mt-8 text-balance text-ivory"
        >
          SAT prep with a clear next step.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={settle}
          transition={settleTransition}
          className="type-body-lg mx-auto mt-8 max-w-2xl text-balance text-taupe"
        >
          For students preparing for the digital SAT: answer a few starting questions, see a
          suggested plan, and use focused practice and tutoring support.
        </motion.p>

        {/* CTAs — gold invitation + quiet secondary. No magnetism. */}
        <motion.div
          variants={settle}
          transition={settleTransition}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/auth/sign-up" className="btn-primary group w-full px-8 py-4 sm:w-auto">
            Create an account
            <ArrowRight className="h-5 w-5 transition-transform duration-fast group-hover:translate-x-0.5" />
          </Link>
          <a href="#sample-quiz" className="btn-secondary w-full px-8 py-4 sm:w-auto">
            Explore the diagnostic
          </a>
        </motion.div>

        <motion.p
          variants={settle}
          transition={settleTransition}
          className="mt-4 text-sm text-taupe/80"
        >
          The diagnostic requires sign-in and covers a limited set of questions.
        </motion.p>
      </motion.div>
    </section>
  );
}
