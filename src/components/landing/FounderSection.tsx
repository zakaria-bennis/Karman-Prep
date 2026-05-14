// ============================================================
// Founder section — two tutor cards on dark cloud atmosphere.
// ============================================================

import Reveal from "@/components/shared/Reveal";

const FOUNDERS = [
  {
    name: "Zakaria Bennis",
    credential: "99th percentile · 1,200+ students tutored",
    initials: "ZB",
    gradient: "from-blue-500 to-purple-600",
    bio: "Zakaria developed Karman's core curriculum after years of 1-on-1 coaching that consistently produced 200–300+ point improvements.",
    bio2: "His Socratic teaching method builds genuine understanding — not just test-taking tricks — so students carry their skills all the way to test day.",
  },
  {
    name: "Nabil Kafil Asrar",
    credential: "99th percentile · 1,200+ students tutored",
    initials: "NK",
    gradient: "from-teal-500 to-blue-600",
    bio: "Nabil specializes in turning math anxiety into confidence through patient, adaptive instruction tailored to each student's learning style.",
    bio2: "His students regularly credit him by name for opening doors they never thought possible — from improved scores to first-choice university admissions.",
  },
];

export default function FounderSection() {
  return (
    <section className="bg-cloud-night bg-grain relative overflow-hidden py-24">
      {/* Atmospheric glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(127,179,255,0.08), transparent 70%)" }}
        />
        <div
          className="absolute -left-40 bottom-0 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.07), transparent 70%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-14 text-center">
          <span className="type-label text-purple-300/80">The people</span>
          <h2 className="type-display-lg mt-4 text-white">
            Meet your <span className="font-[650] italic text-purple-200">tutors</span>.
          </h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-slate-400">
            Every Karman session is led by one of two tutors who have dedicated their careers to SAT
            mastery.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid gap-8 md:grid-cols-2">
          {FOUNDERS.map((founder) => (
            <Reveal key={founder.name}>
              <div className="glass-cloud flex h-full flex-col items-center gap-5 p-8 text-center">
                <div
                  className={`h-24 w-24 rounded-full bg-gradient-to-br ${founder.gradient} flex shrink-0 items-center justify-center text-2xl font-extrabold text-white shadow-lg`}
                >
                  {founder.initials}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{founder.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-blue-300">{founder.credential}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm italic leading-relaxed text-slate-300">
                    &ldquo;{founder.bio}
                  </p>
                  <p className="text-sm italic leading-relaxed text-slate-300">
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
