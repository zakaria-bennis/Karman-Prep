// ============================================================
// POST /api/diagnostic/submit
// Saves diagnostic results to Supabase, computes score ranges
// and weak concepts, and returns the results for the UI.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { predictScoreRange, pct } from "@/lib/utils";
import type { SATDomain, DomainScores } from "@/types";

interface AnswerPayload {
  questionId: string;
  selectedAnswer: string;
  domain: SATDomain;
  correct: boolean;
  conceptId?: string;
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

    // Calculate per-domain accuracy
    const domainCounts: Record<SATDomain, { correct: number; total: number }> = {
      algebra: { correct: 0, total: 0 },
      advanced_math: { correct: 0, total: 0 },
      geometry: { correct: 0, total: 0 },
      data_analysis: { correct: 0, total: 0 },
      reading_writing: { correct: 0, total: 0 },
    };

    const weakConceptIds = new Set<string>();

    for (const answer of answers) {
      const d = answer.domain;
      if (!domainCounts[d]) continue;
      domainCounts[d].total++;
      if (answer.correct) {
        domainCounts[d].correct++;
      } else if (answer.conceptId) {
        weakConceptIds.add(answer.conceptId);
      }
    }

    // Convert to 0–100 scores
    const domainScores: DomainScores = {
      algebra: pct(domainCounts.algebra.correct, domainCounts.algebra.total || 1),
      advanced_math: pct(domainCounts.advanced_math.correct, domainCounts.advanced_math.total || 1),
      geometry: pct(domainCounts.geometry.correct, domainCounts.geometry.total || 1),
      data_analysis: pct(domainCounts.data_analysis.correct, domainCounts.data_analysis.total || 1),
    };

    const avgScore = Object.values(domainScores).reduce((a, b) => a + b, 0) / 4;
    const { low, high } = predictScoreRange(avgScore);

    const supabase = createAdminClient();

    // Look up the user's Supabase row ID from their Clerk ID
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    const { data: result, error } = await supabase
      .from("diagnostic_results")
      .insert({
        user_id: user.id,
        score_range_low: low,
        score_range_high: high,
        domain_scores: domainScores,
        weak_concepts: Array.from(weakConceptIds),
      })
      .select()
      .single();

    if (error) {
      console.error("[diagnostic/submit] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-unlock concepts related to weak areas
    if (weakConceptIds.size > 0) {
      await supabase.from("progress").upsert(
        Array.from(weakConceptIds).map((conceptId) => ({
          user_id: user.id,
          concept_id: conceptId,
          status: "available",
        }))
      );
    }

    return NextResponse.json({
      resultId: result.id,
      scoreRangeLow: low,
      scoreRangeHigh: high,
      domainScores,
      weakConceptIds: Array.from(weakConceptIds),
    });
  } catch (error) {
    console.error("[diagnostic/submit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
