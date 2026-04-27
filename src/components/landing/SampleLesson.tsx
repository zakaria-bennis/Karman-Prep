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
    <section id="sample-lesson" className="relative py-24 bg-cloud-night bg-grain overflow-hidden">
      {/* Atmospheric glow — ties to the cloud language */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-16 right-[-10%] w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.08), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <span className="type-label text-blue-300/80">See a real lesson</span>
          <h2 className="type-display-lg mt-4 text-white">
            Watch a sample <span className="italic text-blue-200 font-[650]">lesson</span>.
          </h2>
          <p className="type-body-lg mt-5 text-slate-400 max-w-xl mx-auto text-balance">
            See how our tutors break down SAT Algebra in under 10 minutes.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-2xl border border-white/10"
            aria-label="Sample SAT lesson"
          >
            {playing && SAMPLE_VIDEO_URL ? (
              <iframe
                src={SAMPLE_VIDEO_URL}
                title="Sample SAT lesson"
                className="w-full h-full"
                frameBorder={0}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center group"
                aria-label="Play sample lesson"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50 z-10" />
                <div className="relative z-20">
                  <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white/25">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </div>

                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <div className="text-center text-white/20 select-none pointer-events-none">
                    <div className="text-6xl font-bold">▶</div>
                    <p className="mt-2 text-sm">SAT Algebra Masterclass — Lesson 1</p>
                  </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-4 z-20">
                  <p className="text-white font-semibold text-sm text-left">Linear Equations &amp; Inequalities</p>
                  <p className="text-white/60 text-xs mt-0.5 text-left">8 min · Algebra · Beginner</p>
                </div>
              </button>
            )}
          </div>
        </Reveal>

        <Reveal className="mt-8" delay={0.12}>
          <div className="glass-cloud p-6">
            <div className="flex items-center gap-3 mb-5">
              <Lock className="w-5 h-5 text-slate-400" />
              <p className="text-sm font-semibold text-slate-200">
                Unlock 100+ more lessons with your free trial
              </p>
            </div>

            <p className="type-label text-rose-300 mb-2">Reading &amp; Writing</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {RW_LESSONS.map((lesson) => (
                <div
                  key={lesson}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 text-xs text-rose-300 border border-rose-400/20"
                >
                  <Lock className="w-3 h-3 shrink-0 opacity-60" />
                  {lesson}
                </div>
              ))}
            </div>

            <p className="type-label text-blue-300 mb-2">Math</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MATH_LESSONS.map((lesson) => (
                <div
                  key={lesson}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-xs text-blue-300 border border-blue-400/20"
                >
                  <Lock className="w-3 h-3 shrink-0 opacity-60" />
                  {lesson}
                </div>
              ))}
            </div>

            <Link href="/auth/sign-up" className="btn-primary w-full mt-6 text-sm py-3">
              Start Free Trial — Unlock Everything
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
