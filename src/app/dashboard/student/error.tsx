"use client";

export default function StudentDashboardError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-6xl px-5 py-28 text-ivory sm:px-8">
      <h1 className="font-plex-serif text-2xl">Your study desk could not load</h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-taupe">
        Your saved work is still there. Try loading the page again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-11 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
      >
        Try again
      </button>
    </div>
  );
}
