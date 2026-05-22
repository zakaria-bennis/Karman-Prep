// ============================================================
// job-status — small helper for any pipeline script to write
// progress updates into pdf_processing_jobs.progress as the
// stages run.
//
// Used by the GitHub Actions orchestrator (and any local
// scripts launched with JOB_ID set) so the website's progress
// UI can show live status without polling the runner directly.
//
// DESIGN
//   · No-op when JOB_ID is not set (so scripts work locally
//     for ad-hoc runs without needing a job row).
//   · Optimistic concurrency: we write the full progress object
//     each call (not a partial merge) — simpler, and the only
//     writer is the runner itself, so there's no contention.
//   · The progress object shape is stable across stages so the
//     UI can render the same component for every stage.
//
// PROGRESS SHAPE
//   {
//     stage: "queued" | "extracting" | "figures" | "csv" |
//            "importing" | "filling" | "grading" | "done" | "failed",
//     stage_label: "human-readable label",
//     percent: <0-100 across the whole pipeline, see PIPELINE_WEIGHTS>,
//     stage_percent: <0-100 within the current stage>,
//     message: "current activity, short",
//     stats: { ... stage-specific counts ... },
//     started_at: ISO timestamp,
//     updated_at: ISO timestamp,
//     github_run_id?: string,
//     github_run_url?: string,
//   }
//
// USAGE
//   import { JobStatus } from "./lib/job-status.mjs";
//   const job = new JobStatus();
//   await job.setStage("extracting", { message: "Gemini Flash on PDF" });
//   await job.setStagePercent(45, { questions_extracted: 44 });
//   await job.setStage("done");
//
//   await job.fail("Gemini quota exhausted at p52");
// ============================================================

// Stage ordering + cumulative weights for the overall progress bar.
// Numbers sum to 100. Tune based on observed wall-time per stage.
//
//   extracting  Gemini Flash extracts ~98 questions       ~35s   8%
//   figures     Page render + bbox + crop + R2 upload    ~45s   12%
//   csv         JSON → CSV file                          ~1s    1%
//   importing   Bulk import to DB                        ~5s    4%
//   filling     Sonnet explanation_text + per-choice +  ~15min  60%
//               Haiku desmos_strategy
//   grading     Multi-vote grader                       ~5min   15%
const STAGE_WEIGHTS = {
  extracting: 8,
  figures: 12,
  csv: 1,
  importing: 4,
  filling: 60,
  grading: 15,
};

// Pre-compute cumulative weight at the START of each stage.
const STAGE_START_PERCENT = {};
{
  let running = 0;
  for (const [stage, weight] of Object.entries(STAGE_WEIGHTS)) {
    STAGE_START_PERCENT[stage] = running;
    running += weight;
  }
}

const STAGE_LABELS = {
  queued: "Queued",
  extracting: "Extracting questions",
  figures: "Extracting figures",
  csv: "Generating CSV",
  importing: "Writing to database",
  filling: "Generating explanations",
  grading: "Validating answer keys",
  done: "Complete",
  failed: "Failed",
};

export class JobStatus {
  constructor(jobId = process.env.JOB_ID) {
    this.jobId = jobId;
    this.enabled = Boolean(jobId);
    this.startedAt = new Date().toISOString();
    this.currentStage = "queued";
    this.stageStats = {};
    this.supa = null;
    this.githubRunId = process.env.GITHUB_RUN_ID || null;
    this.githubRunUrl = process.env.GITHUB_RUN_URL || null;
  }

  async _supabase() {
    if (this.supa) return this.supa;
    if (!this.enabled) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn(
        "[job-status] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; status updates skipped."
      );
      this.enabled = false;
      return null;
    }
    const { createClient } = await import("@supabase/supabase-js");
    this.supa = createClient(url, key, { auth: { persistSession: false } });
    return this.supa;
  }

  _buildProgress({ stage, stagePercent = 0, message, statsPatch }) {
    if (statsPatch) {
      this.stageStats = { ...this.stageStats, ...statsPatch };
    }
    const stageStart = STAGE_START_PERCENT[stage] ?? 0;
    const stageWeight = STAGE_WEIGHTS[stage] ?? 0;
    const overall =
      stage === "done"
        ? 100
        : stage === "failed"
          ? Math.min(99, Math.round(stageStart + (stageWeight * stagePercent) / 100))
          : Math.round(stageStart + (stageWeight * stagePercent) / 100);
    return {
      stage,
      stage_label: STAGE_LABELS[stage] ?? stage,
      percent: overall,
      stage_percent: stagePercent,
      message: message ?? STAGE_LABELS[stage] ?? "",
      stats: { ...this.stageStats },
      started_at: this.startedAt,
      updated_at: new Date().toISOString(),
      ...(this.githubRunId ? { github_run_id: this.githubRunId } : {}),
      ...(this.githubRunUrl ? { github_run_url: this.githubRunUrl } : {}),
    };
  }

  async _write(progress, extraColumns = {}) {
    if (!this.enabled) {
      // Local-dev convenience: log progress to stdout when no JOB_ID.
      console.log(`[job-status] ${progress.stage} ${progress.percent}% — ${progress.message}`);
      return;
    }
    const supa = await this._supabase();
    if (!supa) return;
    const { error } = await supa
      .from("pdf_processing_jobs")
      .update({ progress, ...extraColumns })
      .eq("id", this.jobId);
    if (error) {
      console.warn(`[job-status] write failed: ${error.message}`);
    }
  }

  /** Move into a new stage. Resets stage_percent to 0. */
  async setStage(stage, { message, stats } = {}) {
    this.currentStage = stage;
    this.stageStats = stats ?? {};
    const progress = this._buildProgress({ stage, stagePercent: 0, message });
    const extra = {};
    if (stage === "extracting" && !this._startedRowWritten) {
      extra.started_at = this.startedAt;
      extra.status = "running";
      this._startedRowWritten = true;
    }
    if (stage === "done") {
      extra.status = "complete";
      extra.completed_at = new Date().toISOString();
    }
    await this._write(progress, extra);
  }

  /** Update progress within the current stage (0-100). */
  async setStagePercent(percent, statsPatch = null) {
    const progress = this._buildProgress({
      stage: this.currentStage,
      stagePercent: percent,
      statsPatch,
    });
    await this._write(progress);
  }

  /** Add stats to the running pile without bumping the percent bar. */
  async patchStats(statsPatch) {
    const progress = this._buildProgress({
      stage: this.currentStage,
      stagePercent: 0,
      statsPatch,
    });
    // Re-read the last stage_percent so this is purely a stats update.
    // (We don't store last percent, but the UI re-renders from progress
    // each tick so a stale percent is fine for one frame.)
    await this._write(progress);
  }

  /** Mark the whole job failed with an error message + the stage it failed in. */
  async fail(message, { error_stage } = {}) {
    const progress = this._buildProgress({
      stage: "failed",
      stagePercent: 0,
      message,
    });
    progress.error_stage = error_stage ?? this.currentStage;
    await this._write(progress, {
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    });
  }

  /** Helper for the orchestrator's final stage transition. */
  async complete(finalStats = {}) {
    await this.setStage("done", { message: "All stages complete.", stats: finalStats });
  }
}

export { STAGE_WEIGHTS, STAGE_LABELS };
