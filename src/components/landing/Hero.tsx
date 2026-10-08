import Link from "next/link";
import { ArrowUpRight, BookOpen, CalendarDays, MessagesSquare } from "lucide-react";
import StudyPreview from "./StudyPreview";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-night text-ivory">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-16 md:px-8 md:pb-24 md:pt-20">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-taupe">
            <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
            Your next chapter starts with the SAT
          </p>
          <h1 className="max-w-2xl font-plex-sans text-[clamp(3.1rem,5.3vw,5rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
            Know what to practice next.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-taupe sm:text-xl">
            A starting point, a place to practice, and people in your corner. Bring your SAT
            preparation into a routine you can come back to.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/sign-up" className="btn-primary min-h-12 px-6 py-3">
              Create an account <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="#sample-quiz" className="btn-secondary min-h-12 px-6 py-3">
              Explore the diagnostic
            </Link>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-taupe">
            The diagnostic requires sign-in to save your results.
          </p>
        </div>
        <StudyPreview />
      </div>
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-5 border-y border-bronze/35 py-6 text-sm sm:grid-cols-3 sm:gap-8">
          <p className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-gold" aria-hidden="true" />
            Math and Reading &amp; Writing
          </p>
          <p className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-gold" aria-hidden="true" />
            Practice that fits into your week
          </p>
          <p className="flex items-center gap-3">
            <MessagesSquare className="h-5 w-5 text-gold" aria-hidden="true" />
            Tutoring options for different needs
          </p>
        </div>
      </div>
    </section>
  );
}
