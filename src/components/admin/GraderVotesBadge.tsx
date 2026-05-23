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
  if (!answer) {
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
  const agrees = stored != null && answer.toUpperCase() === stored.toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${
        agrees
          ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
          : "border-rose-800/60 bg-rose-950/40 text-rose-200"
      }`}
      title={`${name} answered ${answer} (stored: ${stored ?? "?"})`}
    >
      <span className="font-semibold">{name}</span>
      <span className="font-mono font-bold">{answer.toUpperCase()}</span>
    </span>
  );
}

export function GraderVotesBadge({ votes, storedAnswer }: Props) {
  if (!votes) {
    return (
      <span className="text-[10px] italic text-slate-500">
        Ungraded — run the multi-vote grader to populate per-LLM votes
      </span>
    );
  }
  const verdictTone = VERDICT_TONE[votes.verdict] ?? VERDICT_TONE.error;
  const verdictLabel = VERDICT_LABEL[votes.verdict] ?? votes.verdict;
  const stored = votes.stored_answer ?? storedAnswer;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <VoterChip name="Flash" answer={votes.pass1.flash} stored={stored} />
      <VoterChip name="DeepSeek" answer={votes.pass1.deepseek} stored={stored} />
      <VoterChip name="Llama" answer={votes.pass1.llama} stored={stored} />
      {votes.pass2_pro && <VoterChip name="Pro" answer={votes.pass2_pro} stored={stored} />}
      {votes.pass3_opus && <VoterChip name="Opus" answer={votes.pass3_opus} stored={stored} />}
      <span
        className={`ml-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${verdictTone}`}
        title={`graded ${new Date(votes.graded_at).toLocaleString()}`}
      >
        {verdictLabel}
      </span>
    </div>
  );
}
