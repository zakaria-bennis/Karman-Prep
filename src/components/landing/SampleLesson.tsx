"use client";

// ============================================================
// Sample lesson section — video teaser + locked curriculum peek.
//
// The sample lesson video is OPEN — visitors can watch it
// without a free trial. The actual lesson library that comes
// after stays gated.
//
// Observatory treatment: espresso section, surface video plaque,
// and the locked-lesson chips use the constellation accents as
// SIGNALS (R&W rose, math blue) on the warm canvas — the one
// place on the landing where subject color belongs.
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
    <section id="sample-lesson" className="bg-grain relative overflow-hidden bg-espresso py-24">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-12 text-center">
          <span className="type-label text-taupe">See a real lesson</span>
          <h2 className="type-display-lg mt-4 text-ivory">Watch a sample lesson.</h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-taupe">
            See how our tutors break down SAT Algebra in under 10 minutes.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            className="relative aspect-video overflow-hidden rounded-2xl border border-bronze bg-charcoal"
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
                <div className="relative z-20">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/60 bg-night/70 backdrop-blur-sm transition-colors duration-fast group-hover:border-gold group-hover:bg-night/90">
                    <Play className="ml-1 h-8 w-8 fill-gold text-gold" />
                  </div>
                </div>

                <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-b from-charcoal to-night">
                  <div className="pointer-events-none select-none text-center text-ivory/15">
                    <div className="font-plex-serif text-5xl">Lesson 1</div>
                    <p className="mt-2 text-sm">SAT Algebra Masterclass</p>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-night/95 p-4">
                  <p className="text-left text-sm font-semibold text-ivory">
                    Linear Equations &amp; Inequalities
                  </p>
                  <p className="mt-0.5 text-left text-xs text-taupe">8 min · Algebra · Beginner</p>
                </div>
              </button>
            )}
          </div>
        </Reveal>

        <Reveal className="mt-8" delay={0.12}>
          <div className="card-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <Lock className="h-5 w-5 text-taupe" />
              <p className="text-sm font-semibold text-ivory">
                Unlock 100+ more lessons with your free trial
              </p>
            </div>

            <p className="type-label mb-2 text-rw">Reading &amp; Writing</p>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RW_LESSONS.map((lesson) => (
                <div
                  key={lesson}
                  className="flex items-center gap-2 rounded-lg border border-rw/25 bg-rw/[0.08] px-3 py-2 text-xs text-ivory/75"
                >
                  <Lock className="h-3 w-3 shrink-0 text-rw/70" />
                  {lesson}
                </div>
              ))}
            </div>

            <p className="type-label mb-2 text-math">Math</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MATH_LESSONS.map((lesson) => (
                <div
                  key={lesson}
                  className="flex items-center gap-2 rounded-lg border border-math/25 bg-math/[0.08] px-3 py-2 text-xs text-ivory/75"
                >
                  <Lock className="h-3 w-3 shrink-0 text-math/70" />
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
