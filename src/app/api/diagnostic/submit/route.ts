// ============================================================
// POST /api/diagnostic/submit
//
// Scores a 35-question diagnostic with the new domain-aware,
// foundation-aware engine (src/lib/diagnostic-scoring.ts) and
// persists the result to diagnostic_results.
//
// Returns the full ScoredDiagnostic so the client can render
// the results page in one round-trip.
//
// REFERENCE PATTERN — request body validation with Zod.
// Every new API route accepting JSON should follow this shape:
//   1. Define a Zod schema as the source of truth for the body
//   2. .safeParse() the request body — never trust req.json() blind
//   3. On invalid input return 400 with structured field errors
//   4. The TypeScript type is inferred via z.infer<>
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { scoreDiagnostic, type AnswerInput } from "@/lib/diagnostic-scoring";
import { SAT_DOMAINS } from "@/lib/question-bank/taxonomy";
import type { Json } from "@/types/supabase";

// Zod schema = source of truth. The TypeScript type is derived,
// not duplicated, via z.infer<>.
const AnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedAnswer: z.string(),
  domain: z.enum(SAT_DOMAINS),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conceptId: z.string().optional(),
  correct: z.boolean(),
});

const SubmitDiagnosticSchema = z.object({
  answers: z.array(AnswerSchema).min(1, "answers array must have at least one entry"),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse + validate the body. safeParse never throws — it returns
    // a discriminated union we destructure cleanly.
    const raw = await req.json().catch(() => null);
    const parsed = SubmitDiagnosticSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { answers } = parsed.data;

    // Normalize to the engine's input shape. We trust the client's
    // `correct` flag — it's already validated against the question
    // bank during the quiz, and the question bank lives in code.
    const inputs: AnswerInput[] = answers.map((a) => ({
      questionId: a.questionId,
      domain: a.domain,
      difficulty: a.difficulty,
      conceptId: a.conceptId,
      correct: a.correct,
    }));

    const result = scoreDiagnostic(inputs);

    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, diagnostic_retakes_remaining")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Detect retake by checking for an existing prior result. If
    // any exists, the submit gate above let them through only
    // because diagnostic_retakes_remaining > 0; we decrement here.
    const { count: priorCount } = await supabase
      .from("diagnostic_results")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const isRetake = (priorCount ?? 0) > 0;
    if (isRetake && (user.diagnostic_retakes_remaining ?? 0) <= 0) {
      // Defensive: the gate at /diagnostic should have caught this.
      // Reject so a stale tab can't submit a second result.
      return NextResponse.json(
        { error: "No retake granted. Ask an admin to allow another retake." },
        { status: 403 }
      );
    }

    const { data: row, error } = await supabase
      .from("diagnostic_results")
      .insert({
        user_id: user.id,
        // Total predicted SAT range (400-1600). Old rows are math-only
        // 200-800 — handle both shapes when reading.
        score_range_low: result.totalLow,
        score_range_high: result.totalHigh,
        domain_scores: result.domainScores as unknown as Json,
        weak_concepts: result.weakConcepts,
      })
      .select()
      .single();

    if (error) {
      console.error("[diagnostic/submit] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Consume the retake grant. Failures are non-fatal — the
    // result is already saved; worst case the admin clicks
    // "Allow retake" again. Idempotent via the WHERE clause.
    if (isRetake) {
      await supabase
        .from("users")
        .update({ diagnostic_retakes_remaining: (user.diagnostic_retakes_remaining ?? 0) - 1 })
        .eq("id", user.id)
        .gt("diagnostic_retakes_remaining", 0);
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
