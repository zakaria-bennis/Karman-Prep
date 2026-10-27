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
  it("builds per-skill points on the quiz-engine ledger, not a second one", () => {
    expect(sql).toMatch(/FROM public\.student_point_awards/);
    expect(sql).not.toMatch(/CREATE TABLE[^;]*point/i);
    expect(sql).toMatch(/column_name = 'skill_id'/);
  });
});
