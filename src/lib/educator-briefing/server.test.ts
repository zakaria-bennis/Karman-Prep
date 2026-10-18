import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./access", () => ({ requireBriefingEducator: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: vi.fn() }));
import { createAdminClient } from "@/lib/supabase/server";
import { requireBriefingEducator } from "./access";
import { readStudentBriefing, readEducatorPracticeReview } from "./server";
import { fakeDatabase, saved, response, sessionId, assignmentId } from "./fixtures.test-helper";
const student = {
  clerk_id: "student-a",
  email: "synthetic@example.test",
  time_zone: "Asia/Kathmandu",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireBriefingEducator).mockResolvedValue({ clerkId: "tutor-a", role: "tutor" });
});
function setup(rows: Parameters<typeof fakeDatabase>[0]) {
  const db = fakeDatabase(rows);
  vi.mocked(createAdminClient).mockReturnValue(db.client as never);
  return db;
}
describe("read-only educator practice service", () => {
  it.each(["briefing", "review"])("checks access before every %s data read", async (kind) => {
    vi.mocked(requireBriefingEducator).mockRejectedValue(new Error("denied"));
    await expect(
      kind === "briefing"
        ? readStudentBriefing("student-a")
        : readEducatorPracticeReview("student-a", sessionId)
    ).rejects.toThrow("denied");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("validates session ID before opening a client", async () => {
    await expect(readEducatorPracticeReview("student-a", "not-an-id")).rejects.toThrow();
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("filters exact student and session before projecting original responses", async () => {
    const db = setup({
      catalog_practice_sessions: [{ data: saved() }],
      catalog_practice_responses: [{ data: [response()] }],
    });
    const result = await readEducatorPracticeReview("student-a", sessionId);
    expect(result?.questions[0].originalAnswer).toBe("B");
    expect(db.calls).toContainEqual({
      table: "catalog_practice_sessions",
      method: "eq",
      args: ["student_id", "student-a"],
    });
    expect(db.calls).toContainEqual({
      table: "catalog_practice_sessions",
      method: "eq",
      args: ["id", sessionId],
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_");
  });
  it("rejects a wrong-owner result before reading responses", async () => {
    const db = setup({ catalog_practice_sessions: [{ data: saved({ student_id: "student-b" }) }] });
    await expect(readEducatorPracticeReview("student-a", sessionId)).rejects.toThrow(
      "Unexpected student"
    );
    expect(db.calls.filter((x) => x.method === "from")).toHaveLength(1);
  });
  it("returns missing sessions without opening response reads", async () => {
    const db = setup({ catalog_practice_sessions: [{ data: null }] });
    expect(await readEducatorPracticeReview("student-a", sessionId)).toBeNull();
    expect(db.calls.filter((x) => x.method === "from")).toHaveLength(1);
  });
  it("shows assigned practice separately without inventing a booking link", async () => {
    setup({
      users: [{ data: student }],
      catalog_practice_sessions: [{ data: [saved()] }],
      catalog_practice_responses: [{ data: [response()] }],
      catalog_assignments: [
        {
          data: [
            {
              id: assignmentId,
              student_clerk_id: "student-a",
              catalog_skill_id: saved().skill_id,
              title: "Synthetic assignment",
              status: "active",
              due_at: null,
            },
          ],
        },
      ],
    });
    const result = await readStudentBriefing("student-a");
    expect(result?.attempts[0]).toMatchObject({
      assignment: { title: "Synthetic assignment" },
      missed: [{ originalAnswer: "B" }],
    });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_|bookingId|graceAt|notice/);
  });
  it("keeps an empty practice list distinct from a failed read", async () => {
    setup({ users: [{ data: student }], catalog_practice_sessions: [{ data: [] }] });
    expect((await readStudentBriefing("student-a"))?.attempts).toEqual([]);
    setup({
      users: [{ data: student }],
      catalog_practice_sessions: [{ data: null, error: { message: "PRIVATE_DB_ERROR" } }],
    });
    await expect(readStudentBriefing("student-a")).rejects.toThrow(
      "Saved practice could not be loaded"
    );
  });
  it("does not infer an assignment title when its header is unavailable", async () => {
    setup({
      users: [{ data: student }],
      catalog_practice_sessions: [{ data: [saved()] }],
      catalog_practice_responses: [{ data: [response()] }],
      catalog_assignments: [{ data: [] }],
    });
    expect((await readStudentBriefing("student-a"))?.attempts[0]).toMatchObject({
      assignmentId,
      assignment: null,
    });
  });
  it("rejects cross-student assignment results", async () => {
    setup({
      users: [{ data: student }],
      catalog_practice_sessions: [{ data: [saved()] }],
      catalog_practice_responses: [{ data: [response()] }],
      catalog_assignments: [
        {
          data: [
            {
              id: assignmentId,
              student_clerk_id: "student-b",
              catalog_skill_id: saved().skill_id,
              title: "Forbidden",
              status: "active",
              due_at: null,
            },
          ],
        },
      ],
    });
    await expect(readStudentBriefing("student-a")).rejects.toThrow("Unexpected assignment");
  });
});
