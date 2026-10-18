import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import StudyPreview from "./StudyPreview";

export default function Hero() {
  return (
    <section className="bg-night text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-10 md:grid-cols-2 md:items-center md:gap-14 md:px-8 md:pb-16 md:pt-16">
        <div>
          <p className="mb-5 text-sm font-medium text-gold">Your SAT. Your next chapter.</p>
          <h1 className="font-plex-sans text-[clamp(2.7rem,5.1vw,4.8rem)] font-semibold leading-[1.05] tracking-[-0.055em]">
            Know what to practice next.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-taupe">
            SAT practice, a free diagnostic, and tutoring in one place. Pick a skill and take it
            from there.
          </p>
          <Link href="/free-diagnostic" className="btn-primary mt-7 min-h-12 px-5 py-3">
            Explore the free diagnostic{" "}
            <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
          <Link
            href="/plans"
            className="mt-3 flex min-h-11 w-fit items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Compare tutoring formats <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div>
          <h2 className="mb-5 font-plex-serif text-3xl">Find your focus.</h2>
          <StudyPreview />
        </div>
      </div>
    </section>
  );
}
