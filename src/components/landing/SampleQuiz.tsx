"use client";

// ============================================================
// 22-question adaptive SAT diagnostic (no account required)
// 10 Reading & Writing + 12 Math, three difficulty tiers each.
// Results show estimated score range + domain breakdown.
// ============================================================

import { useState } from "react";
import { CheckCircle, XCircle, ArrowRight, BookOpen, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Section = "rw" | "math";
type Difficulty = "easy" | "medium" | "hard";

interface Question {
  id: number;
  section: Section;
  difficulty: Difficulty;
  topic: string;
  text: string;
  options: string[];
  correct: string;
  explanation: string;
}

const QUESTIONS: Question[] = [
  // ── Reading & Writing — Easy (Q1–3) ──────────────────────────
  {
    id: 1, section: "rw", difficulty: "easy", topic: "Vocabulary in Context",
    text: "In the sentence \"The obstinate child refused to eat his vegetables despite his mother's repeated requests,\" which word could best replace obstinate without changing the meaning?",
    options: ["A) Cooperative", "B) Stubborn", "C) Hungry", "D) Cheerful"],
    correct: "B",
    explanation: '"Obstinate" means stubbornly refusing to change — "stubborn" is the closest synonym.',
  },
  {
    id: 2, section: "rw", difficulty: "easy", topic: "Main Idea",
    text: "Which sentence best states the main idea of this paragraph? \"Regular exercise has been shown to improve mental health. Studies indicate that physical activity releases endorphins, which reduce stress and anxiety. Many doctors now recommend exercise as a complement to traditional mental health treatments.\"",
    options: [
      "A) Doctors should replace therapy with exercise.",
      "B) Exercise is the only treatment for anxiety.",
      "C) Physical activity can positively impact mental health.",
      "D) Endorphins are produced only during intense workouts.",
    ],
    correct: "C",
    explanation: "The paragraph covers multiple ways exercise benefits mental health — C captures that broad claim.",
  },
  {
    id: 3, section: "rw", difficulty: "easy", topic: "Punctuation",
    text: "Which version of the sentence uses punctuation correctly?",
    options: [
      "A) Its important to bring you're notebook to class.",
      "B) It's important to bring your notebook to class.",
      "C) Its important to bring your notebook to class.",
      "D) It's important to bring you're notebook to class.",
    ],
    correct: "B",
    explanation: '"It\'s" = "it is" (contraction). "Your" = possessive pronoun. Both must be correct.',
  },
  // ── Reading & Writing — Medium (Q4–7) ────────────────────────
  {
    id: 4, section: "rw", difficulty: "medium", topic: "Author's Purpose",
    text: "In an essay arguing for stricter environmental regulations, the author writes: \"For every year we delay action, scientists estimate an additional 10,000 species face extinction.\" What is the author's primary purpose in including this statistic?",
    options: [
      "A) To entertain readers with interesting wildlife facts.",
      "B) To create urgency by showing the concrete costs of inaction.",
      "C) To explain the scientific methods used in environmental research.",
      "D) To suggest that species extinction is inevitable.",
    ],
    correct: "B",
    explanation: "The statistic makes the cost of delay concrete and alarming — its job is to create urgency for the argument.",
  },
  {
    id: 5, section: "rw", difficulty: "medium", topic: "Transitions",
    text: "Choose the best transition: \"The new medication showed promising results in clinical trials; _______, doctors remain cautious about prescribing it widely.\"",
    options: ["A) therefore", "B) similarly", "C) however", "D) consequently"],
    correct: "C",
    explanation: '"However" signals contrast — promising trials are countered by ongoing doctor caution.',
  },
  {
    id: 6, section: "rw", difficulty: "medium", topic: "Data Inference",
    text: "A table shows students scoring 1200+ on the SAT: 2019 (42%), 2020 (38%), 2021 (35%), 2022 (41%). A note states the SAT was redesigned in 2021. Which conclusion is best supported?",
    options: [
      "A) The redesign permanently lowered student performance.",
      "B) Performance declined then partially recovered after the 2021 redesign.",
      "C) More students took the SAT in 2022 than any prior year.",
      "D) The redesign had no measurable effect on scores.",
    ],
    correct: "B",
    explanation: "Scores dropped 2019–2021 then rebounded in 2022 — initial difficulty followed by adaptation.",
  },
  {
    id: 7, section: "rw", difficulty: "medium", topic: "Rhetorical Effect",
    text: "In a climate speech, a senator says: \"We are not just borrowing from our children's future — we are stealing it.\" What rhetorical effect does replacing \"borrowing\" with \"stealing\" achieve?",
    options: [
      "A) It softens the accusation to avoid offending voters.",
      "B) It shifts from neutral description to moral condemnation of current policy.",
      "C) It acknowledges that future generations will be repaid.",
      "D) It suggests the senator plans to reverse course.",
    ],
    correct: "B",
    explanation: '"Stealing" implies wrongdoing; "borrowing" implies repayment. The swap intensifies moral urgency.',
  },
  // ── Reading & Writing — Hard (Q8–10) ─────────────────────────
  {
    id: 8, section: "rw", difficulty: "hard", topic: "Cross-Text Connection",
    text: "Passage 1: \"Social media has democratized information sharing, letting citizens report news without traditional gatekeeping.\" Passage 2: \"The absence of editorial oversight on social media enables misinformation to spread unchecked, eroding trust in all news.\" Which statement best describes their relationship?",
    options: [
      "A) Both argue that social media improves news quality.",
      "B) Passage 1 presents a benefit that Passage 2 identifies as also causing harm.",
      "C) Passage 2 contradicts statistics presented in Passage 1.",
      "D) Both agree that traditional media gatekeeping is harmful.",
    ],
    correct: "B",
    explanation: "The same feature — no gatekeeping — is framed as democratic in P1 and as dangerous in P2.",
  },
  {
    id: 9, section: "rw", difficulty: "hard", topic: "Nuanced Vocabulary",
    text: "\"The scientist presented her findings in a _______ tone — measured and precise, with no hint of the excitement she must have felt at such a groundbreaking discovery.\"",
    options: ["A) dispassionate", "B) melancholy", "C) contemptuous", "D) tentative"],
    correct: "A",
    explanation: '"Dispassionate" = calm and objective. Melancholy = sad; contemptuous = scornful; tentative = uncertain.',
  },
  {
    id: 10, section: "rw", difficulty: "hard", topic: "Argument Structure",
    text: "An economist argues: \"Raising the minimum wage will reduce employment through automation. However, automation was already occurring regardless of wage levels. Therefore, concerns about minimum wage causing unemployment are overstated.\" What is the function of the \"However\" sentence?",
    options: [
      "A) It provides statistical evidence for the main conclusion.",
      "B) It introduces a counterpoint that ultimately supports the main conclusion.",
      "C) It concedes a fatal weakness in the economist's argument.",
      "D) It defines a key term used in the argument.",
    ],
    correct: "B",
    explanation: "The 'however' clause reframes the opponent's premise (automation happens anyway), supporting the economist's conclusion.",
  },
  // ── Math — Easy (Q11–14) ──────────────────────────────────────
  {
    id: 11, section: "math", difficulty: "easy", topic: "Linear Equations",
    text: "If 4x − 9 = 11, what is the value of x?",
    options: ["A) 3", "B) 5", "C) 7", "D) 2"],
    correct: "B",
    explanation: "Add 9 to both sides: 4x = 20. Divide by 4: x = 5.",
  },
  {
    id: 12, section: "math", difficulty: "easy", topic: "Percentages",
    text: "A jacket originally costs $80 and is on sale for 25% off. What is the sale price?",
    options: ["A) $20", "B) $55", "C) $60", "D) $65"],
    correct: "C",
    explanation: "25% of $80 = $20 discount. $80 − $20 = $60.",
  },
  {
    id: 13, section: "math", difficulty: "easy", topic: "Data Interpretation",
    text: "A bar chart shows club enrollment: Science (25), Art (20), Drama (30), Chess (25). What fraction of total students are in the Drama Club?",
    options: ["A) 1/4", "B) 3/10", "C) 1/3", "D) 2/5"],
    correct: "B",
    explanation: "Total = 100 students. Drama = 30. Fraction = 30/100 = 3/10.",
  },
  {
    id: 14, section: "math", difficulty: "easy", topic: "Ratios & Proportions",
    text: "A recipe calls for 3 cups of flour for every 2 cups of sugar. If a baker uses 9 cups of flour, how many cups of sugar are needed?",
    options: ["A) 4", "B) 5", "C) 6", "D) 7"],
    correct: "C",
    explanation: "Set up proportion: 3/2 = 9/x → x = (9 × 2)/3 = 6.",
  },
  // ── Math — Medium (Q15–18) ────────────────────────────────────
  {
    id: 15, section: "math", difficulty: "medium", topic: "Systems of Equations",
    text: "What is the value of x?\n2x + y = 10\nx − y = 2",
    options: ["A) 2", "B) 3", "C) 4", "D) 5"],
    correct: "C",
    explanation: "Add both equations: 3x = 12 → x = 4.",
  },
  {
    id: 16, section: "math", difficulty: "medium", topic: "Quadratic Equations",
    text: "Which values of x satisfy x² − 5x + 6 = 0?",
    options: ["A) x = 1 and x = 6", "B) x = 2 and x = 3", "C) x = −2 and x = −3", "D) x = −1 and x = 6"],
    correct: "B",
    explanation: "Factor: (x − 2)(x − 3) = 0 → x = 2 or x = 3.",
  },
  {
    id: 17, section: "math", difficulty: "medium", topic: "Function Notation",
    text: "If f(x) = 3x² − 2x + 1, what is f(−2)?",
    options: ["A) 9", "B) 15", "C) 17", "D) 21"],
    correct: "C",
    explanation: "f(−2) = 3(4) − 2(−2) + 1 = 12 + 4 + 1 = 17.",
  },
  {
    id: 18, section: "math", difficulty: "medium", topic: "Geometry",
    text: "A figure consists of a rectangle (length 8, width 5) with a right triangle attached to one short side (base 5, height 4). What is the total area of the figure?",
    options: ["A) 40", "B) 48", "C) 50", "D) 60"],
    correct: "C",
    explanation: "Rectangle: 8×5 = 40. Triangle: ½×5×4 = 10. Total = 50.",
  },
  // ── Math — Hard (Q19–22) ──────────────────────────────────────
  {
    id: 19, section: "math", difficulty: "hard", topic: "Exponential Growth",
    text: "A bacteria population is modeled by P(t) = 500 × 2^(t/3), where t is in hours. What does the value 3 in the exponent represent?",
    options: [
      "A) The initial population",
      "B) The population doubles every 3 hours",
      "C) The population triples every 2 hours",
      "D) The hourly growth rate",
    ],
    correct: "B",
    explanation: "In A × b^(t/k), k is the period for one doubling. The population doubles every 3 hours.",
  },
  {
    id: 20, section: "math", difficulty: "hard", topic: "Circle Equations",
    text: "What is the center of the circle defined by (x − 4)² + (y + 3)² = 25?",
    options: ["A) (−4, 3)", "B) (4, −3)", "C) (4, 3)", "D) (−4, −3)"],
    correct: "B",
    explanation: "Standard form: (x−h)² + (y−k)² = r². Here h = 4, k = −3 → center = (4, −3).",
  },
  {
    id: 21, section: "math", difficulty: "hard", topic: "Statistical Inference",
    text: "A poll of 800 voters found 52% support Candidate A, with a margin of error of ±3%. Which conclusion is best supported?",
    options: [
      "A) Candidate A will definitely win the election.",
      "B) Between 49% and 55% of all voters likely support Candidate A.",
      "C) Exactly 52% of all voters support Candidate A.",
      "D) The poll is invalid because the margin of error is too large.",
    ],
    correct: "B",
    explanation: "Margin of error means the true proportion is likely within 52% ± 3%, i.e., 49%–55%.",
  },
  {
    id: 22, section: "math", difficulty: "hard", topic: "Trigonometry",
    text: "On the unit circle, if angle θ is in the second quadrant and sin(θ) = 3/5, what is cos(θ)?",
    options: ["A) 4/5", "B) −4/5", "C) 3/4", "D) −3/4"],
    correct: "B",
    explanation: "sin²θ + cos²θ = 1 → cos²θ = 16/25 → cos θ = ±4/5. In Q2, cosine is negative: cos θ = −4/5.",
  },
];

const TOTAL = QUESTIONS.length;
const RW_COUNT  = 10;
const MATH_COUNT = 12;

function estimateSection(correct: number, total: number): number {
  return 200 + Math.round((correct / total) * 600);
}

const DIFFICULTY_META: Record<Difficulty, { label: string; bg: string; text: string }> = {
  easy:   { label: "Easy",   bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  medium: { label: "Medium", bg: "bg-amber-100 dark:bg-amber-900/30",    text: "text-amber-700 dark:text-amber-400" },
  hard:   { label: "Hard",   bg: "bg-red-100 dark:bg-red-900/30",        text: "text-red-700 dark:text-red-400" },
};

const SECTION_META: Record<Section, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  rw:   { label: "Reading & Writing", Icon: BookOpen,   color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  math: { label: "Math",              Icon: Calculator, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
};

export default function SampleQuiz() {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>(new Array(TOTAL).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const question = QUESTIONS[currentQ];
  const isAnswered = selected !== null;
  const isCorrect  = selected === question.correct;
  const diffMeta    = DIFFICULTY_META[question.difficulty];
  const sectionMeta = SECTION_META[question.section];
  const SectionIcon = sectionMeta.Icon;
  const progress = ((currentQ + (isAnswered ? 1 : 0)) / TOTAL) * 100;

  function handleSelect(option: string) {
    if (isAnswered) return;
    const letter = option.charAt(0);
    setSelected(letter);
    const updated = [...answers];
    updated[currentQ] = letter;
    setAnswers(updated);
    setShowExplanation(true);
  }

  function handleNext() {
    if (currentQ < TOTAL - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      setShowResult(true);
    }
  }

  // Results calculation
  const rwCorrect   = QUESTIONS.slice(0, RW_COUNT).filter((q, i)  => answers[i] === q.correct).length;
  const mathCorrect = QUESTIONS.slice(RW_COUNT).filter((q, i) => answers[RW_COUNT + i] === q.correct).length;
  const rwScore     = estimateSection(rwCorrect, RW_COUNT);
  const mathScore   = estimateSection(mathCorrect, MATH_COUNT);
  const totalScore  = rwScore + mathScore;

  if (showResult) {
    return (
      <section id="sample-quiz" className="relative py-24 bg-cloud-night bg-grain overflow-hidden">
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
          <div className="glass-cloud-strong p-6 sm:p-8">
            <h3 className="text-2xl font-extrabold text-white text-center mb-2">
              Your Estimated Score
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">
              Based on your answers across all SAT domains
            </p>

            {/* Total score */}
            <div className="text-center mb-8">
              <div className="inline-flex items-end gap-2 mb-1">
                <span className="text-6xl font-extrabold text-blue-600 dark:text-blue-400">{totalScore}</span>
                <span className="text-xl text-slate-400 mb-2">/ 1600</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Estimated range: <span className="font-semibold text-slate-700 dark:text-slate-200">{totalScore - 50}–{totalScore + 50}</span>
              </p>
            </div>

            {/* Domain breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: "Reading & Writing", score: rwScore, correct: rwCorrect, total: RW_COUNT,   color: "text-blue-600 dark:text-blue-400",   bar: "bg-blue-500" },
                { label: "Math",              score: mathScore, correct: mathCorrect, total: MATH_COUNT, color: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500" },
              ].map(({ label, score, correct, total, color, bar }) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                  <p className={`text-3xl font-extrabold ${color}`}>{score}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{correct}/{total} correct</p>
                  <div className="mt-3 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar} rounded-full transition-all`}
                      style={{ width: `${(correct / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                {totalScore >= 1200
                  ? "Solid foundation — let's push you to 1400+."
                  : totalScore >= 900
                  ? "There's real room to grow. A full diagnostic will show exactly where."
                  : "Great that you took the quiz — this is exactly why Karman Prep exists."}
              </p>
              <Link href="/auth/sign-up" className="btn-primary w-full text-base py-4">
                Get My Full Diagnostic — Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="mt-3 text-xs text-slate-400">No credit card required for the diagnostic</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="sample-quiz" className="relative py-24 bg-cloud-night bg-grain overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-20 -right-40 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.08), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
        {/* Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-400/15 text-purple-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-purple-400/20">
            <SectionIcon className="w-4 h-4" />
            Free 22-Question Diagnostic
          </div>
          <h2 className="type-display-lg text-white">
            Find your SAT <span className="italic text-purple-200 font-[650]">baseline</span>.
          </h2>
          <p className="type-body-lg mt-4 text-slate-400 text-balance">
            22 questions across all SAT domains. Get your estimated score range and personalized starting point.
          </p>
        </div>

        <div className="glass-cloud-strong p-6 sm:p-8">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Question {currentQ + 1} of {TOTAL}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", sectionMeta.bg, sectionMeta.color)}>
                  {sectionMeta.label}
                </span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", diffMeta.bg, diffMeta.text)}>
                  {diffMeta.label}
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Topic tag */}
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            {question.topic}
          </p>

          {/* Question */}
          <p className="text-base font-semibold text-slate-900 dark:text-white mb-6 leading-relaxed whitespace-pre-line">
            {question.text}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option) => {
              const letter = option.charAt(0);
              const isSelected     = selected === letter;
              const isCorrectOpt   = letter === question.correct;

              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all",
                    !isAnswered && "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer",
                    isAnswered && isCorrectOpt && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
                    isAnswered && isSelected && !isCorrectOpt && "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                    isAnswered && !isSelected && !isCorrectOpt && "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      !isAnswered && "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                      isAnswered && isCorrectOpt && "bg-emerald-500 text-white",
                      isAnswered && isSelected && !isCorrectOpt && "bg-red-400 text-white",
                      isAnswered && !isSelected && !isCorrectOpt && "bg-slate-100 dark:bg-slate-700 text-slate-400",
                    )}>
                      {isAnswered && isCorrectOpt     ? <CheckCircle className="w-4 h-4" />
                       : isAnswered && isSelected ? <XCircle className="w-4 h-4" />
                       : letter}
                    </span>
                    {option.slice(3)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className={cn(
              "mt-4 p-4 rounded-xl text-sm border",
              isCorrect
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
            )}>
              <strong>{isCorrect ? "Correct!" : `Correct answer: ${question.correct}.`}</strong>{" "}
              {question.explanation}
            </div>
          )}

          {/* Next */}
          {isAnswered && (
            <button onClick={handleNext} className="btn-primary w-full mt-5">
              {currentQ < TOTAL - 1 ? "Next Question" : "See My Results"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
