import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) =>
  readFileSync(path.resolve(__dirname, "../../../supabase/migrations", name), "utf8");

describe("quiz engine migrations", () => {
  it("saved questions: one row per student and question, bookmark or tutor flag, own rows only", () => {
    const sql = read("20261028000001_student_saved_questions.sql");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.student_saved_questions/);
    expect(sql).toMatch(/PRIMARY KEY \(student_id, question_id\)/);
    expect(sql).toMatch(/CHECK \(source IN \('bookmark', 'tutor_flag'\)\)/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/student_id = auth\.jwt\(\) ->> 'sub'/);
    expect(sql).toMatch(/tutor_assignments/);
    expect(sql).toMatch(/cohort_members/);
  });
  it("timing accommodation: three values, standard by default", () => {
    const sql = read("20261028000002_timing_accommodation.sql");
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS timing_accommodation TEXT NOT NULL DEFAULT 'standard'/
    );
    expect(sql).toMatch(
      /CHECK \(timing_accommodation IN \('standard', 'time_and_half', 'double'\)\)/
    );
  });
  it("point awards: one row per award key, per skill, server-written, with a total view", () => {
    const sql = read("20261028000003_student_point_awards.sql");
    expect(sql).toMatch(/award_key\s+TEXT PRIMARY KEY/);
    expect(sql).toMatch(/skill_id\s+TEXT/);
    expect(sql).toMatch(/CHECK \(points IN \(10, 15\)\)/);
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.student_point_totals/);
    expect(sql).not.toMatch(/FOR INSERT/);
  });
});
