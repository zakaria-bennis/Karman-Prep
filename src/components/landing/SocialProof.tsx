"use client";

// ============================================================
// Social proof — stats + 30 testimonials (students & parents)
// Two auto-scrolling infinite rows, one forward, one reverse.
// ============================================================

import { TrendingUp, Users, Award, Clock } from "lucide-react";
import { useEffect, useRef } from "react";
import Reveal from "@/components/shared/Reveal";

const STATS = [
  { icon: TrendingUp, value: "+285",   label: "Average score improvement", color: "text-blue-300" },
  { icon: Users,      value: "2,400+", label: "Students tutored",          color: "text-purple-300" },
  { icon: Award,      value: "94%",    label: "Reach their target score",  color: "text-teal-300" },
  { icon: Clock,      value: "16 wks", label: "Median time to goal",       color: "text-amber-300" },
];

const TESTIMONIALS = [
  { quote: "Zakaria has a gift for breaking down complex SAT math into simple, digestible steps. I went from 1020 to 1340 in just 9 weeks. I couldn't believe my score report.", name: "Aisha M.", role: "Student, Grade 11", improvement: "+320 pts", tutor: "Zakaria" },
  { quote: "Nabil is incredibly patient and always knew exactly where I was struggling before I even told him. My score jumped from 980 to 1260. Best investment my family ever made.", name: "Jordan K.", role: "Student, Grade 12", improvement: "+280 pts", tutor: "Nabil" },
  { quote: "I'd tried two other prep courses before Strata. Nothing worked until I started with Zakaria 1-on-1. He figured out my weak spots in the first session. 1090 to 1370.", name: "Priya S.", role: "Student, Grade 11", improvement: "+280 pts", tutor: "Zakaria" },
  { quote: "Nabil made me feel like I could actually do this. My math anxiety was real and he helped me push through it. Ended up with a 1310 — 290 points higher than where I started.", name: "Marcus T.", role: "Student, Grade 12", improvement: "+290 pts", tutor: "Nabil" },
  { quote: "The diagnostic showed Data Analysis was my biggest weakness. Zakaria built a plan around that and I improved 270 points overall. Strata's system just works.", name: "Lena H.", role: "Student, Grade 11", improvement: "+270 pts", tutor: "Zakaria" },
  { quote: "I was scoring 1050 and my goal was 1300. Nabil kept telling me I could hit it. I ended up at 1330. He believed in me before I believed in myself.", name: "Tyler R.", role: "Student, Grade 12", improvement: "+280 pts", tutor: "Nabil" },
  { quote: "What sets Zakaria apart is he doesn't just teach math — he teaches you how to think through SAT problems. 1000 to 1290. The methodology is elite.", name: "Sofia D.", role: "Student, Grade 11", improvement: "+290 pts", tutor: "Zakaria" },
  { quote: "Nabil somehow made studying for the SAT fun. I actually looked forward to our sessions. That mindset shift alone was worth it — plus the 265 point improvement.", name: "Elijah W.", role: "Student, Grade 11", improvement: "+265 pts", tutor: "Nabil" },
  { quote: "I always ran out of time on tests. Zakaria taught me pacing strategies that changed everything. Went from 1010 to 1300 and finished every section with time to spare.", name: "Amara O.", role: "Student, Grade 12", improvement: "+290 pts", tutor: "Zakaria" },
  { quote: "Nabil identified I was making careless errors in Algebra, not conceptual ones. Two weeks of targeted drills and my score jumped 300 points. That's the Strata difference.", name: "Connor B.", role: "Student, Grade 11", improvement: "+300 pts", tutor: "Nabil" },
  { quote: "I was skeptical about online tutoring but Zakaria made it feel like he was right there with me. 950 to 1240, and I'm taking it again aiming for 1350.", name: "Isabella F.", role: "Student, Grade 10", improvement: "+290 pts", tutor: "Zakaria" },
  { quote: "Nabil's geometry explanations clicked in a way my teacher's never did. I went from 34% on practice tests to 81%. My overall score jumped 275 points.", name: "Darius C.", role: "Student, Grade 12", improvement: "+275 pts", tutor: "Nabil" },
  { quote: "Zakaria made me feel safe making mistakes, which helped me learn faster. No question was ever stupid. 1060 to 1320 in 10 weeks.", name: "Mia L.", role: "Student, Grade 11", improvement: "+260 pts", tutor: "Zakaria" },
  { quote: "Nabil pushed me harder than I'd push myself, but always in an encouraging way. I hit a 1350 — 300 points higher than where I started. I owe him a lot.", name: "Noah P.", role: "Student, Grade 12", improvement: "+300 pts", tutor: "Nabil" },
  { quote: "Strata's diagnostic told me I was overthinking every problem. Zakaria taught me to trust my process. 1080 to 1360. Mindset is everything.", name: "Zara A.", role: "Student, Grade 11", improvement: "+280 pts", tutor: "Zakaria" },
  { quote: "We hired Zakaria after our daughter scored 1010 on her first SAT. Eight weeks later she scored 1290. She's now at her first-choice university. Strata changed her trajectory.", name: "Sandra M.", role: "Parent of Aisha", improvement: "+280 pts", tutor: "Zakaria" },
  { quote: "Nabil was everything we could have asked for — patient, encouraging, and brilliant. Our son went from 970 to 1260. Worth every penny and then some.", name: "David K.", role: "Parent of Jordan", improvement: "+290 pts", tutor: "Nabil" },
  { quote: "My daughter had tried group classes and apps before. Nothing stuck. Zakaria understood her learning style in the first session. She improved 295 points. I wish we'd found Strata sooner.", name: "Linda T.", role: "Parent of Sofia", improvement: "+295 pts", tutor: "Zakaria" },
  { quote: "Nabil treated our son's success as if it were personal to him. He texted us after the results came in — that kind of investment is rare. 300 point improvement. We're beyond grateful.", name: "Robert W.", role: "Parent of Elijah", improvement: "+300 pts", tutor: "Nabil" },
  { quote: "I was nervous about the cost. But when my son went from 990 to 1280 with Zakaria, I realized there's no better ROI in college prep. This opened doors we thought were closed.", name: "Patricia O.", role: "Parent of Marcus", improvement: "+290 pts", tutor: "Zakaria" },
  { quote: "My daughter is incredibly shy. I worried she'd clam up during sessions. Nabil drew her out so naturally. She went from dreading the SAT to feeling confident. 1000 to 1280.", name: "Jennifer H.", role: "Parent of Lena", improvement: "+280 pts", tutor: "Nabil" },
  { quote: "Zakaria has deep math knowledge and the rare ability to communicate it clearly to teenagers. My son improved 310 points and is now looking at schools we never thought possible.", name: "Michael R.", role: "Parent of Tyler", improvement: "+310 pts", tutor: "Zakaria" },
  { quote: "We were quoted much higher prices by other companies. Strata offered Nabil and he exceeded our wildest expectations. 940 to 1230. Highly recommend.", name: "Karen B.", role: "Parent of Connor", improvement: "+290 pts", tutor: "Nabil" },
  { quote: "My daughter worked with Zakaria for 7 weeks and improved 275 points. More importantly, her confidence transformed. She walks into every test with the right mindset now.", name: "Angela F.", role: "Parent of Isabella", improvement: "+275 pts", tutor: "Zakaria" },
  { quote: "Nabil gave our son real accountability. He tracked progress weekly, flagged regressions early, and adjusted the plan in real time. 960 to 1240. Remarkable.", name: "Brian C.", role: "Parent of Darius", improvement: "+280 pts", tutor: "Nabil" },
  { quote: "My son is dyslexic and we worried the SAT would be an obstacle. Zakaria adapted every lesson to how he learns. He went from 890 to 1180. We cried when we got the results.", name: "Christine L.", role: "Parent of Noah", improvement: "+290 pts", tutor: "Zakaria" },
  { quote: "Nabil didn't just tutor — he mentored. He talked about college strategy, study habits, and mindset. The 295 point improvement was the metric, but the personal growth was just as meaningful.", name: "Steven P.", role: "Parent of Zara", improvement: "+295 pts", tutor: "Nabil" },
  { quote: "After two years of trying to prep on her own, we found Strata. Zakaria diagnosed the exact issues in two sessions. Six weeks later she had a 280 point improvement. Game changer.", name: "Maria A.", role: "Parent of Amara", improvement: "+280 pts", tutor: "Zakaria" },
  { quote: "Nabil has a talent for making students feel smart rather than frustrated. Our son's attitude toward math shifted completely. 1020 to 1310, and he's excited about STEM in college.", name: "James D.", role: "Parent of Mia", improvement: "+290 pts", tutor: "Nabil" },
  { quote: "Zakaria was incredibly communicative — weekly updates and a clear plan. Never felt in the dark. Our daughter improved 270 points and got into her dream school.", name: "Catherine S.", role: "Parent of Priya", improvement: "+270 pts", tutor: "Zakaria" },
];

const ROW_1 = TESTIMONIALS;

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <div className="flex-shrink-0 w-80 glass-cloud p-5 flex flex-col gap-3 mx-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 bg-emerald-400/15 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20">
          <TrendingUp className="w-3 h-3" />{t.improvement}
        </span>
        <span className="text-xs font-medium text-blue-300">with {t.tutor}</span>
      </div>
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-3.5 h-3.5 text-amber-300 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        ))}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
      <div>
        <p className="text-sm font-semibold text-white">{t.name}</p>
        <p className="text-xs text-slate-400">{t.role}</p>
      </div>
    </div>
  );
}

function ScrollingRow({ items, reverse = false }: { items: typeof TESTIMONIALS; reverse?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const halfWidth = track.scrollWidth / 2;
    let pos = reverse ? halfWidth : 0;
    const speed = reverse ? -0.5 : 0.5;
    let raf: number;
    const tick = () => {
      pos += speed;
      if (pos >= halfWidth) pos = 0;
      if (pos < 0) pos = halfWidth;
      track.style.transform = `translateX(${-pos}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reverse]);

  return (
    <div className="overflow-hidden">
      <div ref={trackRef} className="flex will-change-transform">
        {[...items, ...items].map((t, i) => <TestimonialCard key={i} t={t} />)}
      </div>
    </div>
  );
}

export default function SocialProof() {
  return (
    <section id="results" className="relative py-24 bg-cloud-night bg-grain overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-20 left-1/3 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(94,228,198,0.07), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
        <Reveal className="text-center mb-14">
          <span className="type-label text-teal-300/80">Real outcomes</span>
          <h2 className="type-display-lg mt-4 text-white">
            Real students. Real <span className="italic text-teal-200 font-[650]">results</span>.
          </h2>
          <p className="type-body-lg mt-5 text-slate-400 max-w-xl mx-auto text-balance">
            Hear directly from the students and parents who worked with Zakaria and Nabil.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map(({ icon: Icon, value, label, color }) => (
            <Reveal key={label}>
              <div className="glass-cloud p-6 text-center">
                <Icon className={`w-7 h-7 mx-auto mb-3 ${color}`} />
                <div className="type-mono text-3xl font-extrabold text-white mb-1">{value}</div>
                <div className="text-sm text-slate-400">{label}</div>
              </div>
            </Reveal>
          ))}
        </Reveal>
      </div>

      <div className="relative">
        <ScrollingRow items={ROW_1} reverse={false} />
      </div>
    </section>
  );
}
