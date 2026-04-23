// ============================================================
// Founder section — two tutor cards with photo placeholders
// Placed between testimonials and pricing on the landing page
// ============================================================

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
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Meet Your Tutors
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Every Strata session is led by one of two tutors who have dedicated their careers to SAT mastery.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {FOUNDERS.map((founder) => (
            <div
              key={founder.name}
              className="glass-card p-8 flex flex-col items-center text-center gap-5"
            >
              {/* Photo placeholder */}
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br ${founder.gradient} flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shrink-0`}
              >
                {founder.initials}
              </div>

              {/* Name & credential */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {founder.name}
                </h3>
                <p className="text-sm text-blue-500 dark:text-blue-400 font-semibold mt-1">
                  {founder.credential}
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;{founder.bio}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  {founder.bio2}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
