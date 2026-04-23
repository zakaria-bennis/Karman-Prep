"use client";

// ============================================================
// Hero section — above-the-fold conversion driver
// Headline, subtext, single CTA, and social proof badges.
// ============================================================

import Link from "next/link";
import { ArrowRight, Star, Shield, Zap } from "lucide-react";
import ConstellationBackground from "./ConstellationBackground";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* Constellation canvas — lives behind everything */}
      <ConstellationBackground />

      {/* Soft radial glows for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute -bottom-20 -left-32 w-[500px] h-[500px] rounded-full bg-purple-700/8 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 border border-white/15 animate-fade-up">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>2,400+ students improved their scores</span>
        </div>

        {/* Headline — premium shimmer sweep, no color-shift rainbow */}
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-balance animate-fade-up shimmer-headline"
          style={{ animationDelay: "0.1s" }}
        >
          The SAT Tutor That{" "}
          Actually Works.
        </h1>

        {/* Subtext */}
        <p
          className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto text-balance animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          50-point score improvement guaranteed — or your money back. Powered by adaptive diagnostics, personalized lessons, and weekly 1-on-1 coaching.
        </p>

        {/* CTA */}
        <div
          className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link href="/auth/sign-up" className="btn-primary text-base px-8 py-4 group w-full sm:w-auto">
            Start Free Trial
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#sample-quiz"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-white/20 w-full sm:w-auto"
          >
            Take the Free Quiz
          </a>
        </div>

        {/* Trial note — Card required removed */}
        <p
          className="mt-4 text-sm text-slate-400 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          Cancel anytime
        </p>

        {/* Trust icons */}
        <div
          className="mt-14 flex flex-wrap justify-center gap-8 animate-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          {[
            { icon: Shield, label: "Score Guarantee" },
            { icon: Zap,    label: "Adaptive Learning" },
            { icon: Star,   label: "4.9/5 Rating" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <Icon className="w-4 h-4 text-blue-400" />
              {label}
            </div>
          ))}
        </div>

        {/* Score improvement graphic */}
        <div
          className="mt-14 mx-auto max-w-sm bg-white/8 backdrop-blur-md border border-white/12 rounded-2xl shadow-xl p-6 animate-fade-up"
          style={{ animationDelay: "0.6s" }}
        >
          <p className="text-sm font-semibold text-slate-400 mb-4">Average score improvement</p>
          <div className="flex items-end justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-400">1235</div>
              <div className="text-xs text-slate-500 mt-1">Before</div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px w-8 bg-gradient-to-r from-slate-600 to-blue-500" />
              <span className="text-blue-400 font-bold text-sm">+285 pts</span>
              <div className="h-px w-8 bg-gradient-to-r from-blue-500 to-slate-600" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">1520</div>
              <div className="text-xs text-slate-500 mt-1">After</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
