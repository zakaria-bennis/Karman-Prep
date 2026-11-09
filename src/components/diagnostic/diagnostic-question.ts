// The diagnostic's own question format and its adapter onto the shared quiz shell.
import { DOMAIN_LABELS, DOMAIN_SECTION, type SATDomain } from "@/types";
import type { StudentQuizQuestion } from "@/types/quiz";

// Per-section time budgets, proportional to the real Digital SAT.
// (SAT Math: 22q in 35 min ≈ 95 s/q; R&W: 27q in 32 min ≈ 71 s/q.
//  Our diagnostic: 20 math + 15 R&W → 32 min math + 18 min R&W.)
export const SECTION_SECONDS: Record<"math" | "rw", number> = {
  math: 32 * 60,
  rw: 18 * 60,
};

export interface DiagnosticQuestion {
  id: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3;
  conceptId: string;
  passageIntro?: string;
  passage?: string;
  text: string;
  options: string[];
  correct: string;
  explanation: string;
}

const LEVEL: Record<1 | 2 | 3, 2 | 4 | 6> = { 1: 2, 2: 4, 3: 6 };

/** "A. text" or "A) text" options become lettered answer choices. No key travels with them. */
export function toShellQuestion(q: DiagnosticQuestion): StudentQuizQuestion {
  const section = DOMAIN_SECTION[q.domain];
  return {
    id: q.id,
    node_id: null,
    question_text: q.text,
    question_type: "multiple_choice",
    difficulty: "intermediate",
    difficulty_level: LEVEL[q.difficulty],
    answer_format: "multiple_choice",
    hint: null,
    image_url: null,
    image_alt: null,
    subject: section === "math" ? "math" : "reading",
    topic_cluster: DOMAIN_LABELS[q.domain] ?? q.domain,
    display_order: 0,
    passage_intro: q.passageIntro ?? null,
    passage: q.passage ?? null,
    passage_a: null,
    passage_b: null,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    figure_svg: null,
    answer_choices: q.options.map((option, i) => {
      const match = /^([A-D])[.)]\s*([\s\S]*)$/.exec(option.trim());
      const letter = (match?.[1] ?? "ABCD"[i]) as "A";
      return {
        id: `${q.id}-${letter}`,
        question_id: q.id,
        letter,
        choice_text: match?.[2] ?? option,
        choice_table_data: null,
      };
    }),
  } as StudentQuizQuestion;
}

/** The sections in the order the questions present them. */
export function sectionsOf(questions: DiagnosticQuestion[]): ("math" | "rw")[] {
  const out: ("math" | "rw")[] = [];
  for (const q of questions) {
    const s = DOMAIN_SECTION[q.domain];
    if (!out.includes(s)) out.push(s);
  }
  return out;
}
