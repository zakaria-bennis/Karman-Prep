"use client";

// ============================================================
// Sample lesson section — video teaser + locked curriculum peek.
//
// The sample lesson video is OPEN — visitors can watch it
// without a free trial. The actual lesson library that comes
// after stays gated.
//
// To swap in the real video: drop its embed URL in
// SAMPLE_VIDEO_URL below. Anything that supports an iframe
// player works (YouTube, Vimeo, Cloudflare Stream, Mux).
// ============================================================

import { Play, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Reveal from "@/components/shared/Reveal";

// Replace with the production embed URL when the lesson video
// is uploaded. Use the embed-style URL for YouTube
// ("https://www.youtube.com/embed/<id>?rel=0&modestbranding=1")
// to suppress related-video chrome. Vimeo / Cloudflare Stream
// embed URLs work the same way.
const SAMPLE_VIDEO_URL: string | null = null;

const RW_LESSONS = [
  "Rhetorical synthesis",
  "Cross-text connections",
  "Command of evidence (quantitative)",
  "Transitional logic",
  "Authorial purpose and tone",
  "Inferences from data-rich passages",
];

const MATH_LESSONS = [
  "Nonlinear functions & exponential models",
  "Systems of equations (linear & quadratic)",
  "Circle equations in standard form",
  "Trigonometric identities",
  "Statistical inference & margin of error",
  "Complex numbers & polynomial roots",
];

export default function SampleLesson() {
  const [playing, setPlaying] = useState(false);
  return (
    <section id="sample-lesson" className="bg-cloud-night bg-grain relative overflow-hidden py-24">
      {/* Atmospheric glow — ties to the cloud language */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute right-[-10%] top-16 h-[480px] w-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.08), transparent 70%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-12 text-center">
          <span className="type-label text-blue-300/80">See a real lesson</span>
          <h2 className="type-display-lg mt-4 text-white">
            Watch a sample <span className="font-[650] italic text-blue-200">lesson</span>.
          </h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-slate-400">
            See how our tutors break down SAT Algebra in under 10 minutes.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
            aria-label="Sample SAT lesson"
          >
            {playing && SAMPLE_VIDEO_URL ? (
              <iframe
                src={SAMPLE_VIDEO_URL}
                title="Sample SAT lesson"
                className="h-full w-full"
                frameBorder={0}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 flex items-center justify-center"
                aria-label="Play sample lesson"
              >
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-900/50 to-purple-900/50" />
                <div className="relative z-20">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/40 bg-white/15 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:bg-white/25">
                    <Play className="ml-1 h-8 w-8 fill-white text-white" />
                  </div>
                </div>

                <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <div className="pointer-events-none select-none text-center text-white/20">
                    <div className="text-6xl font-bold">▶</div>
                    <p className="mt-2 text-sm">SAT Algebra Masterclass — Lesson 1</p>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 p-4">
                  <p className="text-left text-sm font-semibold text-white">
                    Linear Equations &amp; Inequalities
                  </p>
                  <p className="mt-0.5 text-left text-xs text-white/60">
                    8 min · Algebra · Beginner
                  </p>
                </div>
              </button>
            )}
          </div>
        </Reveal>

        <Reveal className="mt-8" delay={0.12}>
          <div className="glass-cloud p-6">
            <div className="mb-5 flex items-center gap-3">
              <Lock className="h-5 w-5 text-slate-400" />
              <p className="text-sm font-semibold text-slate-200">
                Unlock 100+ more lessons with your free trial
              </p>
            </div>

            <p className="type-label mb-2 text-rose-300">Reading &amp; Writing</p>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RW_LESSONS.map((lesson) => (
                <div
                  key={lesson}
                  className="flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
                >
                  <Lock className="h-3 w-3 shrink-0 opacity-60" />
                  {lesson}
                </div>
              ))}
            </div>

            <p className="type-label mb-2 text-blue-300">Math</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MATH_LESSONS.map((lesson) => (
                <div
                  key={lesson}
                  className="flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300"
                >
                  <Lock className="h-3 w-3 shrink-0 opacity-60" />
                  {lesson}
                </div>
              ))}
            </div>

            <Link href="/auth/sign-up" className="btn-primary mt-6 w-full py-3 text-sm">
              Start Free Trial — Unlock Everything
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
