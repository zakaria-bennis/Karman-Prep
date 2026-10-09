// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./access", () => ({ requireBriefingEducator: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: vi.fn() }));

import { requireBriefingEducator } from "./access";
import { createAdminClient } from "@/lib/supabase/server";
import { readDailyBriefing } from "./daily";
import DailyBriefingPage from "@/app/tutor/briefing/page";
import { fakeDatabase, bookingId, studentUuid, tutorUuid } from "./fixtures.test-helper";

const profile = { id: tutorUuid, clerk_id: "tutor-a", time_zone: "America/Chicago" };
const booking = {
  id: bookingId,
  student_id: studentUuid,
  tutor_id: tutorUuid,
  scheduled_start: "2026-10-09T15:00:00Z",
  scheduled_end: "2026-10-09T16:00:00Z",
  status: "scheduled",
};
const lookupError = { message: "SYNTHETIC_PRIVATE_ROSTER_ERROR" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireBriefingEducator).mockResolvedValue({ clerkId: "tutor-a", role: "tutor" });
});

function setup(scopeProfile: { data: unknown; error?: unknown }, remaining = {}) {
  const db = fakeDatabase({
    users: [{ data: profile }, scopeProfile],
    bookings: [{ data: [booking] }],
    ...remaining,
  });
  vi.mocked(createAdminClient).mockReturnValue(db.client as never);
  return db;
}

describe("daily briefing through the real tutor scope reader", () => {
  it.each([null, { id: tutorUuid, role: "tutor" }])(
    "propagates profile lookup errors even if partial data is %j",
    async (data) => {
      const db = setup({ data, error: lookupError });
      await expect(readDailyBriefing("2026-10-09")).rejects.toEqual(lookupError);
      expect(db.calls.filter((call) => call.method === "from").map((call) => call.table)).toEqual([
        "users",
        "bookings",
        "users",
      ]);
    }
  );

  it("renders a roster lookup error as unavailable without private error text or empty-day copy", async () => {
    setup({ data: null, error: lookupError });
    render(await DailyBriefingPage({ searchParams: Promise.resolve({ date: "2026-10-09" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("briefing is unavailable");
    expect(screen.queryByText(/SYNTHETIC_PRIVATE_ROSTER_ERROR|No scheduled sessions/)).toBeNull();
  });

  it("preserves the genuinely missing scope-profile result without reading students", async () => {
    const db = setup({ data: null });
    expect(await readDailyBriefing("2026-10-09")).toEqual({
      day: "2026-10-09",
      timeZone: "America/Chicago",
      sessions: [],
    });
    expect(db.calls.filter((call) => call.method === "from")).toHaveLength(3);
  });

  it.each([
    { members: [] },
    {
      members: [
        { cohort_id: "former-cohort", user_id: studentUuid, student: { clerk_id: "student-a" } },
      ],
    },
  ])(
    "preserves an empty or revoked current roster and never opens a student profile read",
    async ({ members }) => {
      const db = setup(
        { data: { id: tutorUuid, role: "tutor" } },
        {
          cohorts: [{ data: [] }],
          cohort_members: [{ data: members }],
          cohort_homework: [{ data: [] }],
          tutor_assignments: [{ data: [] }],
        }
      );
      const result = await readDailyBriefing("2026-10-09");
      expect(result.sessions).toEqual([]);
      expect(
        db.calls.filter((call) => call.method === "from" && call.table === "users")
      ).toHaveLength(2);
      expect(db.calls).toContainEqual({
        table: "cohorts",
        method: "eq",
        args: ["tutor_user_id", tutorUuid],
      });
      expect(db.calls).toContainEqual({
        table: "tutor_assignments",
        method: "is",
        args: ["ended_at", null],
      });
    }
  );
});
