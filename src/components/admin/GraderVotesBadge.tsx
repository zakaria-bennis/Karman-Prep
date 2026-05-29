// ============================================================
// GraderVotesBadge — small chip row showing each LLM's
// independent answer + the overall verdict for a single question.
// Rendered inside the QuestionCard in the review queue so the
// admin can see at a glance whether the grader trusts the stored
// answer without drilling into the question.
//
// Visual logic:
//   · Each voter chip shows the model name + letter it answered.
//   · Green chip if the voter agreed with the stored answer.
//   · Red chip if it disagreed.
//   · Pro / Opus chips only render when those passes were called.
//   · Verdict badge on the right uses the same color scheme.
// ============================================================

import type { GraderVerdict, GraderVotes } from "@/types/quiz";

interface Props {
  votes: GraderVotes | null | undefined;
  /** Stored answer to compare each voter against. */
  storedAnswer: string | null | undefined;
}

const VERDICT_TONE: Record<GraderVerdict, string> = {
  verified: "border-emerald-700/60 bg-emerald-950/50 text-emerald-200",
  verified_pro: "border-emerald-700/60 bg-emerald-950/50 text-emerald-200",
  verified_opus: "border-emerald-700/60 bg-emerald-950/50 text-emerald-200",
  likely_wrong: "border-rose-700/60 bg-rose-950/50 text-rose-200",
  pass1_split: "border-amber-700/60 bg-amber-950/50 text-amber-200",
  pass1_disagree: "border-amber-700/60 bg-amber-950/50 text-amber-200",
  pass2_disagree: "border-amber-700/60 bg-amber-950/50 text-amber-200",
  uncertain_parse: "border-slate-700 bg-slate-800/40 text-slate-400",
  error: "border-slate-700 bg-slate-800/40 text-slate-400",
};

const VERDICT_LABEL: Record<GraderVerdict, string> = {
  verified: "3-voter consensus ✓",
  verified_pro: "Pro tiebreak ✓",
  verified_opus: "Opus arbiter ✓",
  likely_wrong: "Likely wrong key",
  pass1_split: "Pass-1 split",
  pass1_disagree: "Pass-1 disagree",
  pass2_disagree: "Pass-2 disagree",
  uncertain_parse: "Couldn't parse",
  error: "Grader error",
};

function VoterChip({
  name,
  answer,
  stored,
}: {
  name: string;
  answer: string | null | undefined;
  stored: string | null | undefined;
}) {
  // Coerce to string defensively — JSONB column has no type guard,
  // so a voter's "answer" could come through as a number (e.g. for
  // SPR rows where the answer is "42" or 42) and we used to crash
  // on number.toUpperCase().
  const answerStr = answer == null ? null : typeof answer === "string" ? answer : String(answer);
  const storedStr = stored == null ? null : typeof stored === "string" ? stored : String(stored);

  if (!answerStr) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-900/40 px-1.5 py-0.5 text-[10px] text-slate-500"
        title={`${name} did not vote`}
      >
        <span className="font-semibold">{name}</span>
        <span className="font-mono">—</span>
      </span>
    );
  }
  const agrees = storedStr != null && answerStr.toUpperCase() === storedStr.toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${
        agrees
          ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
          : "border-rose-800/60 bg-rose-950/40 text-rose-200"
      }`}
      title={`${name} answered ${answerStr} (stored: ${storedStr ?? "?"})`}
    >
      <span className="font-semibold">{name}</span>
      <span className="font-mono font-bold">{answerStr.toUpperCase()}</span>
    </span>
  );
}

export function GraderVotesBadge({ votes, storedAnswer }: Props) {
  // Defensive: votes is a JSONB column so its shape isn't actually
  // enforced. If the data is missing entirely OR malformed (not an
  // object, missing required fields, etc.), fall back to the
  // "Ungraded" hint instead of crashing the whole review page.
  if (!votes || typeof votes !== "object") {
    return (
      <span className="text-[10px] italic text-slate-500">
        Ungraded — run the multi-vote grader to populate per-LLM votes
      </span>
    );
  }
  // Best-effort verdict lookup; default to "error" tone if the
  // verdict string isn't one we know (forward-compatible if a
  // future grader version adds new verdicts).
  const verdictTone = VERDICT_TONE[votes.verdict as GraderVerdict] ?? VERDICT_TONE.error;
  const verdictLabel = VERDICT_LABEL[votes.verdict as GraderVerdict] ?? votes.verdict ?? "?";
  const stored = votes.stored_answer ?? storedAnswer;

  // Per-voter answer lookup with v1 → v2 key aliasing.
  //
  // v1 (multi-vote-grader.mjs, removed in PR #189) wrote:
  //   pass1: { flash, deepseek, llama }
  //
  // v2 (verify-answers.mjs, Phase 6) writes:
  //   pass1: { gemini, deepseek, groq }
  //
  // The model behind "Flash" is still Gemini 2.5 Flash; "Llama"
  // is still Llama 3.3 70B (now via OpenRouter — PR #186). Just
  // the JSONB key names changed. Read whichever one exists so the
  // badge keeps working across the schema transition.
  const flashAnswer = votes.pass1?.flash ?? (votes.pass1 as Record<string, unknown>)?.gemini;
  const llamaAnswer = votes.pass1?.llama ?? (votes.pass1 as Record<string, unknown>)?.groq;
  const deepseekAnswer = votes.pass1?.deepseek;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <VoterChip name="Flash" answer={flashAnswer as string | null | undefined} stored={stored} />
      <VoterChip
        name="DeepSeek"
        answer={deepseekAnswer as string | null | undefined}
        stored={stored}
      />
      <VoterChip name="Llama" answer={llamaAnswer as string | null | undefined} stored={stored} />
      {votes.pass2_pro && <VoterChip name="Pro" answer={votes.pass2_pro} stored={stored} />}
      {votes.pass3_opus && <VoterChip name="Opus" answer={votes.pass3_opus} stored={stored} />}
      <span
        className={`ml-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${verdictTone}`}
        // Stable ISO-ish format ("2026-05-23 14:51 UTC") instead of
        // toLocaleString(): the latter renders different strings on
        // the server vs the client, causing a hydration mismatch
        // that crashes the whole admin tree (broke prod in version
        // fd3da1df — rolled back via wrangler).
        title={`graded ${(votes.graded_at ?? "").replace("T", " ").slice(0, 16)} UTC`}
      >
        {verdictLabel}
      </span>
    </div>
  );
}
