import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261028000010_student_skill_points_and_time_trials.sql",
  "utf8"
);

describe("student dashboard migration", () => {
  it("creates the time trial table idempotently with RLS", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.time_trial_runs/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(
      /next_target_seconds INTEGER NOT NULL CHECK \(next_target_seconds >= goal_seconds\)/
    );
  });
  it("keeps tutor-unlocked assignments, one run per assignment link", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.student_assignments/);
    expect(sql).toMatch(/completed_at IS NULL OR unlocked_at IS NOT NULL/);
    expect(sql).toMatch(/assignment_id UUID REFERENCES public\.student_assignments/);
  });
  it("builds per-skill points on the quiz-engine ledger, not a second one", () => {
    expect(sql).toMatch(/FROM public\.student_point_awards/);
    expect(sql).not.toMatch(/CREATE TABLE[^;]*point/i);
    expect(sql).toMatch(/column_name = 'skill_id'/);
  });
});

describe("time trial run kind migration", () => {
  const widen = readFileSync("supabase/migrations/20261112090000_quiz_runs_time_trial.sql", "utf8");
  it("only widens quiz_runs.kind, keeping every existing kind", () => {
    expect(widen).toMatch(/DROP CONSTRAINT IF EXISTS quiz_runs_kind_check/);
    for (const kind of [
      "daily-ten",
      "practice-set",
      "domain-quiz",
      "full-test",
      "diagnostic",
      "time-trial",
    ])
      expect(widen).toContain(`'${kind}'`);
    expect(widen).not.toMatch(/DROP (TABLE|COLUMN)|ADD COLUMN|CREATE TABLE/i);
  });
});
