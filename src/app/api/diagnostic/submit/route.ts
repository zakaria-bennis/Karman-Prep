// ============================================================
// POST /api/diagnostic/submit
//
// Scores a 35-question diagnostic with the new domain-aware,
// foundation-aware engine (src/lib/diagnostic-scoring.ts) and
// persists the result to diagnostic_results.
//
// Returns the full ScoredDiagnostic so the client can render
// the results page in one round-trip.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { scoreDiagnostic, type AnswerInput } from "@/lib/diagnostic-scoring";
import type { SATDomain } from "@/types";

interface AnswerPayload {
  questionId: string;
  selectedAnswer: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3;
  conceptId?: string;
  correct: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { answers }: { answers: AnswerPayload[] } = await req.json();
    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Answers array required" }, { status: 400 });
    }

    // Normalize to the engine's input shape. We trust the client's
    // `correct` flag — it's already validated against the question
    // bank during the quiz, and the question bank lives in code.
    const inputs: AnswerInput[] = answers.map((a) => ({
      questionId: a.questionId,
      domain: a.domain,
      difficulty: a.difficulty,
      conceptId: a.conceptId,
      correct: a.correct === true,
    }));

    const result = scoreDiagnostic(inputs);

    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    const { data: row, error } = await supabase
      .from("diagnostic_results")
      .insert({
        user_id: user.id,
        // Total predicted SAT range (400-1600). Old rows are math-only
        // 200-800 — handle both shapes when reading.
        score_range_low: result.totalLow,
        score_range_high: result.totalHigh,
        domain_scores: result.domainScores,
        weak_concepts: result.weakConcepts,
      })
      .select()
      .single();

    if (error) {
      console.error("[diagnostic/submit] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      resultId: row.id,
      // Full scored result — client renders directly from this.
      scoring: result,
      // Legacy fields kept for any downstream readers that haven't
      // been updated yet.
      scoreRangeLow: result.totalLow,
      scoreRangeHigh: result.totalHigh,
      domainScores: result.domainScores,
      weakConceptIds: result.weakConcepts,
    });
  } catch (error) {
    console.error("[diagnostic/submit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
