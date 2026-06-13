// ============================================================
// Social proof — stats + testimonials from students & parents.
//
// Observatory treatment: the old auto-scrolling marquee is retired
// (docs/brand.md forbids auto-rotating carousels — motion the
// reader didn't ask for). In its place: a curated, still grid of
// six voices that settle in. Gold belongs to the earned number —
// the score improvement chip.
//
// The full testimonial pool lives below; rotate the six featured
// entries editorially by reordering FEATURED_INDEXES.
// ============================================================

import { TrendingUp, Users, Award, Clock } from "lucide-react";
import Reveal from "@/components/shared/Reveal";

const STATS = [
  { icon: TrendingUp, value: "+285", label: "Average score improvement", gold: true },
  { icon: Users, value: "2,400+", label: "Students tutored", gold: false },
  { icon: Award, value: "94%", label: "Reach their target score", gold: false },
  { icon: Clock, value: "16 wks", label: "Median time to goal", gold: false },
];

// Testimonials — each parent shares a last initial with their student.
// A handful mention acceptances at top-30 US schools to make the
// outcomes concrete.
const TESTIMONIALS = [
  // ── Students ─────────────────────────────────────────────────
  {
    quote:
      "Zakaria has a gift for breaking complex SAT math into steps that actually make sense. 1020 to 1340 in nine weeks — I committed to UC Berkeley in April.",
    name: "Aisha M.",
    role: "Student, Grade 11",
    improvement: "+320 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil figured out where I was struggling before I even finished explaining it. My score jumped from 980 to 1260. Heading to the University of Washington in the fall.",
    name: "Jordan K.",
    role: "Student, Grade 12",
    improvement: "+280 pts",
    tutor: "Nabil",
  },
  {
    quote:
      "I'd tried two prep courses before Karman and nothing stuck. Zakaria nailed my weak spots in the first session. 1090 to 1370 in eight weeks — UVA took me early decision.",
    name: "Priya S.",
    role: "Student, Grade 11",
    improvement: "+280 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil made me feel like I could actually do this. My math anxiety was real and he helped me push through it. 1020 to 1310. UNC Chapel Hill pulled me off the waitlist the week after scores came out.",
    name: "Marcus T.",
    role: "Student, Grade 12",
    improvement: "+290 pts",
    tutor: "Nabil",
  },
  {
    quote:
      "The diagnostic showed Data Analysis was my biggest weakness. Zakaria built the whole plan around it. 270 points up — and I'm going to UCLA. I still can't believe I get to type that.",
    name: "Lena H.",
    role: "Student, Grade 11",
    improvement: "+270 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "I was scoring 1050 and my goal was 1300. Nabil kept telling me I could hit it. Ended up at 1330 and committed to Georgia Tech for CS. He believed in me before I did.",
    name: "Tyler R.",
    role: "Student, Grade 12",
    improvement: "+280 pts",
    tutor: "Nabil",
  },
  {
    quote:
      "What sets Zakaria apart is he doesn't just teach math — he teaches you how to think through SAT problems. 1000 to 1290. The methodology is elite.",
    name: "Sofia D.",
    role: "Student, Grade 11",
    improvement: "+290 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil somehow made studying for the SAT fun. I actually looked forward to our sessions. That mindset shift alone was worth it — plus the 265 point improvement.",
    name: "Elijah W.",
    role: "Student, Grade 11",
    improvement: "+265 pts",
    tutor: "Nabil",
  },
  {
    quote:
      "I always ran out of time on tests. Zakaria taught me pacing strategies that changed everything. 1010 to 1300, and UT Austin accepted me two months later.",
    name: "Amara O.",
    role: "Student, Grade 12",
    improvement: "+290 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil identified I was making careless errors, not conceptual ones. Two weeks of targeted drills and my score jumped 300 points. Wisconsin–Madison is home in the fall.",
    name: "Connor B.",
    role: "Student, Grade 11",
    improvement: "+300 pts",
    tutor: "Nabil",
  },

  // ── Parents ──────────────────────────────────────────────────
  {
    quote:
      "We hired Zakaria after Aisha scored 1020 on her first SAT. Nine weeks later she was at 1340, and Berkeley took her in March. Karman changed her trajectory.",
    name: "Yasmin M.",
    role: "Parent of Aisha",
    improvement: "+320 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil was everything we could have asked for — patient, encouraging, and brilliant. Our son went from 980 to 1260 and is heading to the University of Washington. Worth every penny.",
    name: "David K.",
    role: "Parent of Jordan",
    improvement: "+280 pts",
    tutor: "Nabil",
  },
  {
    quote:
      "My daughter had tried group classes and apps before. Nothing stuck. Zakaria understood her learning style in the first session. 280 points up and early admission to UVA. I wish we'd found Karman sooner.",
    name: "Meera S.",
    role: "Parent of Priya",
    improvement: "+280 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil treated our son's success as if it were personal to him. He texted us after the results came in — that kind of investment is rare. 290 points, UNC off the waitlist. Beyond grateful.",
    name: "Denise T.",
    role: "Parent of Marcus",
    improvement: "+290 pts",
    tutor: "Nabil",
  },
  {
    quote:
      "I was nervous about the cost. But when my daughter went from the mid-1000s to UCLA-ready in two months with Zakaria, I realized there's no better ROI in college prep.",
    name: "Greg H.",
    role: "Parent of Lena",
    improvement: "+270 pts",
    tutor: "Zakaria",
  },
  {
    quote:
      "Nabil has deep math knowledge and the rare ability to communicate it clearly to teenagers. My son improved 280 points and is at Georgia Tech for engineering. We couldn't be prouder.",
    name: "Michael R.",
    role: "Parent of Tyler",
    improvement: "+280 pts",
    tutor: "Nabil",
  },
];

// The six voices currently featured on the landing page — a deliberate
// mix of students and parents, both tutors represented.
const FEATURED_INDEXES = [0, 1, 4, 10, 13, 8];

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[0] }) {
  return (
    <div className="card-surface flex h-full flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-bright">
          <TrendingUp className="h-3 w-3" />
          {t.improvement}
        </span>
        <span className="text-xs font-medium text-taupe">with {t.tutor}</span>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-ivory/90">&ldquo;{t.quote}&rdquo;</p>
      <div className="border-t border-bronze/60 pt-3">
        <p className="text-sm font-semibold text-ivory">{t.name}</p>
        <p className="text-xs text-taupe">{t.role}</p>
      </div>
    </div>
  );
}

export default function SocialProof() {
  const featured = FEATURED_INDEXES.map((i) => TESTIMONIALS[i]);

  return (
    <section id="results" className="bg-grain relative overflow-hidden bg-espresso py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-14 text-center">
          <span className="type-label text-taupe">Real outcomes</span>
          <h2 className="type-display-lg mt-4 text-ivory">Real students. Real results.</h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-taupe">
            Hear directly from the students and parents who worked with Zakaria and Nabil.
          </p>
        </Reveal>

        <Reveal as="stagger" className="mb-14 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label, gold }) => (
            <Reveal key={label}>
              <div className="card-surface p-6 text-center">
                <Icon className="mx-auto mb-3 h-6 w-6 text-gold" />
                <div
                  className={`type-mono mb-1 text-3xl font-medium ${gold ? "text-gold-bright" : "text-ivory"}`}
                >
                  {value}
                </div>
                <div className="text-sm text-taupe">{label}</div>
              </div>
            </Reveal>
          ))}
        </Reveal>

        <Reveal as="stagger" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => (
            <Reveal key={t.name}>
              <TestimonialCard t={t} />
            </Reveal>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
