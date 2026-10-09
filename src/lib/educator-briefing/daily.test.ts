import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./access", () => ({ requireBriefingEducator: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/queries/tutor", () => ({ fetchTutorScope: vi.fn() }));
import { requireBriefingEducator } from "./access";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchTutorScope } from "@/lib/supabase/queries/tutor";
import { readDailyBriefing } from "./daily";
import { fakeDatabase, studentUuid, tutorUuid, bookingId } from "./fixtures.test-helper";
const profile = { id: tutorUuid, clerk_id: "tutor-a", time_zone: "America/Los_Angeles" };
const booking = {
  id: bookingId,
  student_id: studentUuid,
  tutor_id: tutorUuid,
  scheduled_start: "2026-10-09T01:00:00Z",
  scheduled_end: "2026-10-09T02:00:00Z",
  status: "scheduled",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireBriefingEducator).mockResolvedValue({ clerkId: "tutor-a", role: "tutor" });
  vi.mocked(fetchTutorScope).mockResolvedValue({
    studentClerkIds: ["student-a"],
    cohorts: [],
    assignments: [],
  } as never);
});
function setup(rows: Parameters<typeof fakeDatabase>[0]) {
  const db = fakeDatabase(rows);
  vi.mocked(createAdminClient).mockReturnValue(db.client as never);
  return db;
}
describe("educator-local day briefing", () => {
  it("denies access before profile or booking reads", async () => {
    vi.mocked(requireBriefingEducator).mockRejectedValue(new Error("denied"));
    await expect(readDailyBriefing()).rejects.toThrow();
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it.each([null, "Invalid/Zone"])("does not invent a day with timezone %s", async (time_zone) => {
    const db = setup({ users: [{ data: { ...profile, time_zone } }] });
    expect(await readDailyBriefing()).toEqual({ day: null, timeZone: null, sessions: [] });
    expect(db.calls.filter((c) => c.method === "from")).toHaveLength(1);
  });
  it("uses the local date and retains earlier scheduled sessions that day", async () => {
    const db = setup({
      users: [
        { data: profile },
        {
          data: [
            {
              id: studentUuid,
              clerk_id: "student-a",
              email: "student@example.test",
              first_name: "Synthetic",
              last_name: "Student",
            },
          ],
        },
      ],
      bookings: [{ data: [booking] }],
    });
    const result = await readDailyBriefing(undefined, new Date("2026-10-09T05:00:00Z"));
    expect(result.day).toBe("2026-10-08");
    expect(result.sessions).toHaveLength(1);
    expect(db.calls).toContainEqual({
      table: "bookings",
      method: "eq",
      args: ["tutor_id", tutorUuid],
    });
    expect(db.calls).toContainEqual({
      table: "users",
      method: "in",
      args: ["clerk_id", ["student-a"]],
    });
  });
  it("filters adjacent-day rows from the UTC search envelope", async () => {
    setup({ users: [{ data: profile }], bookings: [{ data: [booking] }] });
    expect((await readDailyBriefing("2026-10-09")).sessions).toEqual([]);
    expect(fetchTutorScope).not.toHaveBeenCalled();
  });
  it("does not read student profiles after all relationships are revoked", async () => {
    vi.mocked(fetchTutorScope).mockResolvedValue({
      studentClerkIds: [],
      cohorts: [],
      assignments: [],
    } as never);
    const db = setup({ users: [{ data: profile }], bookings: [{ data: [booking] }] });
    expect((await readDailyBriefing("2026-10-08")).sessions).toEqual([]);
    expect(db.calls.filter((c) => c.table === "users" && c.method === "from")).toHaveLength(1);
  });
  it("rejects an unexpected tutor booking without reading students", async () => {
    const db = setup({
      users: [{ data: profile }],
      bookings: [{ data: [{ ...booking, tutor_id: studentUuid }] }],
    });
    await expect(readDailyBriefing("2026-10-08")).rejects.toThrow("Schedule is unavailable");
    expect(db.calls.filter((c) => c.table === "users" && c.method === "from")).toHaveLength(1);
  });
  it("does not silently show a truncated day", async () => {
    setup({
      users: [{ data: profile }],
      bookings: [{ data: Array.from({ length: 201 }, () => booking) }],
    });
    await expect(readDailyBriefing("2026-10-08")).rejects.toThrow("Schedule is unavailable");
  });
  it("rejects invalid date input before reading bookings", async () => {
    const db = setup({ users: [{ data: profile }] });
    await expect(readDailyBriefing("2026-02-31")).rejects.toThrow();
    expect(db.calls.some((c) => c.table === "bookings")).toBe(false);
  });
});
