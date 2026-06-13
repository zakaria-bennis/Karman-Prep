// ============================================================
// Founder section — two tutor cards on the warm night canvas.
//
// Observatory treatment: serif monograms in bronze-ringed plaques
// (no gradient avatars), gold for the credential line — the one
// earned fact on the card.
// ============================================================

import Reveal from "@/components/shared/Reveal";

const FOUNDERS = [
  {
    name: "Zakaria Bennis",
    credential: "99th percentile · 1,200+ students tutored",
    initials: "ZB",
    bio: "Zakaria developed Karman's core curriculum after years of 1-on-1 coaching that consistently produced 200–300+ point improvements.",
    bio2: "His Socratic teaching method builds genuine understanding — not just test-taking tricks — so students carry their skills all the way to test day.",
  },
  {
    name: "Nabil Kafil Asrar",
    credential: "99th percentile · 1,200+ students tutored",
    initials: "NK",
    bio: "Nabil specializes in turning math anxiety into confidence through patient, adaptive instruction tailored to each student's learning style.",
    bio2: "His students regularly credit him by name for opening doors they never thought possible — from improved scores to first-choice university admissions.",
  },
];

export default function FounderSection() {
  return (
    <section className="bg-grain relative overflow-hidden bg-night py-24">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-14 text-center">
          <span className="type-label text-taupe">The people</span>
          <h2 className="type-display-lg mt-4 text-ivory">Meet your tutors.</h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-taupe">
            Every Karman session is led by one of two tutors who have dedicated their careers to SAT
            mastery.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid gap-8 md:grid-cols-2">
          {FOUNDERS.map((founder) => (
            <Reveal key={founder.name}>
              <div className="card-surface flex h-full flex-col items-center gap-5 p-8 text-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-bronze bg-charcoal font-plex-serif text-2xl font-medium text-ivory">
                  {founder.initials}
                </div>
                <div>
                  <h3 className="type-h2 text-ivory">{founder.name}</h3>
                  <p className="mt-1 text-sm font-medium text-gold">{founder.credential}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm italic leading-relaxed text-ivory/80">
                    &ldquo;{founder.bio}
                  </p>
                  <p className="text-sm italic leading-relaxed text-ivory/80">
                    {founder.bio2}&rdquo;
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
