// Progress and history for the overnight test accounts: diagnostics, learn
// nodes and quiz attempts answered on real questions from the local bank.
// Called by scripts/overnight/seed-personas.mjs, which owns the helpers.

// Progress per student: diagnostics, learn nodes and quiz history on real
// questions from the copied bank. `level` 0..1 sets how far along they are.
const LEVEL = {
  free: 0.15,
  practice: 0.45,
  pro: 0.75,
  cohort: 0.55,
  private: 0.7,
  mate1: 0.4,
  mate2: 0.6,
  mate3: 0.3,
  aff1: 0.35,
  aff2: 0.5,
  aff3: 0.2,
  school1: 0.25,
  school2: 0.3,
  school3: 0.4,
  school4: 0.2,
};
const NODES = [
  "rw-00",
  "rw-01",
  "rw-02",
  "rw-05",
  "rw-20",
  "rw-30",
  "rw-35",
  "rw-45",
  "ma-00",
  "ma-01",
  "ma-02",
  "ma-04",
  "ma-05",
  "ma-08",
  "ma-11",
  "ma-15",
];

export async function seedHistory({ id, P, sb, post, inList, daysAgo, rand }) {
  const questions = await sb(
    `quiz_questions_live?select=id,node_id,difficulty,correct_answer&node_id=${inList(NODES)}&limit=400`
  );
  const byNode = {};
  for (const q of questions) (byNode[q.node_id] ??= []).push(q);

  let attempts = 0;
  for (const [k, level] of Object.entries(LEVEL)) {
    const clerk = P[k].clerk_id;
    const base = 900 + Math.round(level * 450);
    const diags = [{ taken_at: daysAgo(35), low: base - 60, high: base + 20 }];
    if (level > 0.3) diags.push({ taken_at: daysAgo(6), low: base + 40, high: base + 120 });
    await post(
      "diagnostic_results",
      diags.map((d) => ({
        user_id: id[k],
        taken_at: d.taken_at,
        score_range_low: d.low,
        score_range_high: d.high,
        domain_scores: {
          algebra: Math.round(40 + level * 50),
          advanced_math: Math.round(30 + level * 50),
          geometry: Math.round(35 + level * 50),
          data_analysis: Math.round(40 + level * 45),
          info_ideas: Math.round(45 + level * 45),
          craft_structure: Math.round(40 + level * 50),
          expression_ideas: Math.round(40 + level * 45),
          conventions: Math.round(50 + level * 45),
        },
        weak_concepts: [],
      })),
      "return=minimal"
    );

    const touched = NODES.slice(0, Math.max(2, Math.round(NODES.length * level)));
    const statuses = touched.map((node, i) => {
      const ratio = i / touched.length;
      const st =
        ratio < level * 0.6 ? "mastered" : ratio < level ? "partially_complete" : "in_progress";
      const best =
        st === "mastered"
          ? 85 + Math.round(rand() * 15)
          : st === "partially_complete"
            ? 70 + Math.round(rand() * 15)
            : 40 + Math.round(rand() * 25);
      return {
        user_id: clerk,
        node_id: node,
        status: st,
        attempts: 1 + Math.round(rand() * 3),
        best_quiz_score: best,
        last_quiz_score: best - Math.round(rand() * 10),
        consecutive_passes: st === "mastered" ? 2 : st === "partially_complete" ? 1 : 0,
        confidence_band:
          st === "mastered"
            ? "mastered"
            : st === "partially_complete"
              ? "proficient"
              : "developing",
        completed_at: st === "mastered" ? daysAgo(3 + Math.round(rand() * 25)) : null,
        updated_at: daysAgo(Math.round(rand() * 10)),
      };
    });
    await post("learn_node_status", statuses, "return=minimal");

    // Quiz attempts with real responses
    for (const [i, node] of touched.entries()) {
      const pool = byNode[node] ?? [];
      if (pool.length === 0) continue;
      const picked = pool.slice(0, Math.min(5, pool.length));
      const when = daysAgo(2 + i * 2 + rand() * 2);
      const correctFlags = picked.map(() => rand() < 0.45 + level * 0.5);
      const correct = correctFlags.filter(Boolean).length;
      const score = Math.round((correct / picked.length) * 100);
      const [attempt] = await post("quiz_attempts", {
        student_id: clerk,
        node_id: node,
        attempt_number: 1,
        score,
        questions_answered: picked.length,
        questions_correct: correct,
        confidence_band:
          score >= 85
            ? "mastered"
            : score >= 70
              ? "proficient"
              : score >= 50
                ? "developing"
                : "struggling",
        started_at: when,
        completed_at: new Date(new Date(when).getTime() + 9 * 60_000).toISOString(),
        adaptive_path: [],
      });
      await post(
        "question_responses",
        picked.map((q, j) => ({
          attempt_id: attempt.id,
          question_id: q.id,
          student_answer: correctFlags[j]
            ? (q.correct_answer ?? "A")
            : wrongLetter(q.correct_answer),
          is_correct: correctFlags[j],
          difficulty_at_time: q.difficulty ?? "intermediate",
          response_time_seconds: 40 + Math.round(rand() * 80),
          answered_at: new Date(new Date(when).getTime() + (j + 1) * 90_000).toISOString(),
        })),
        "return=minimal"
      );
      attempts++;
    }
  }
  console.log(
    `  ✓ history: diagnostics, learn progress and ${attempts} quiz attempts on real questions`
  );
}

function wrongLetter(right) {
  const letters = ["A", "B", "C", "D"];
  return letters.find((l) => l !== right) ?? "A";
}
