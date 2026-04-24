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
    bio: "Zakaria developed Strata's core curriculum after years of 1-on-1 coaching that consistently produced 200–300+ point improvements.",
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
    <section className="relative py-24 bg-cloud-night bg-grain overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-10 -right-40 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(127,179,255,0.08), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 -left-40 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.07), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <span className="type-label text-purple-300/80">The people</span>
          <h2 className="type-display-lg mt-4 text-white">
            Meet your <span className="italic text-purple-200 font-[650]">tutors</span>.
          </h2>
          <p className="type-body-lg mt-5 text-slate-400 max-w-xl mx-auto text-balance">
            Every Strata session is led by one of two tutors who have dedicated their careers to SAT mastery.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid md:grid-cols-2 gap-8">
          {FOUNDERS.map((founder) => (
            <Reveal key={founder.name}>
              <div className="glass-cloud p-8 flex flex-col items-center text-center gap-5 h-full">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${founder.gradient} flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shrink-0`}
                >
                  {founder.initials}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{founder.name}</h3>
                  <p className="text-sm text-blue-300 font-semibold mt-1">{founder.credential}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{founder.bio}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
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
