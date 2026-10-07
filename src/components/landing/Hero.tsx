import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="overflow-hidden bg-night text-ivory">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:items-center md:gap-12 md:px-8 md:pb-28 md:pt-24">
        <div>
          <p className="mb-6 inline-block border-b-2 border-gold pb-2 text-sm font-semibold text-taupe">
            For students preparing for the digital SAT
          </p>
          <h1 className="max-w-3xl font-plex-serif text-5xl leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
            Know what to practice next.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-taupe sm:text-xl">
            Karman brings a signed-in diagnostic, focused practice, and tutoring support into one
            place. See what a question set shows, then choose a useful next step.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/sign-up" className="btn-primary min-h-12 px-6 py-3">
              Create an account
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="#sample-quiz" className="btn-secondary min-h-12 px-6 py-3">
              Explore the diagnostic
            </Link>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-taupe">
            The diagnostic requires sign-in and covers a limited set of questions.
          </p>
        </div>

        <div className="relative border border-bronze bg-surface p-3 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.35)] sm:p-4">
          <div className="relative aspect-[4/3] overflow-hidden bg-espresso">
            <Image
              src="/images/study-desk-editorial.png"
              alt="An open notebook and pencil on a warmly lit desk"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 48vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
