import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ canTutorAccessStudent: vi.fn(), setTimingAccommodation: vi.fn() }));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: async () => ({ userId: "user_tutor" }) }));
vi.mock("@/lib/auth/tutor-access", () => ({ canTutorAccessStudent: db.canTutorAccessStudent }));
vi.mock("@/lib/supabase/queries/quiz/saved", () => ({
  setTimingAccommodation: db.setTimingAccommodation,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { actionSetTimingAccommodation } from "./timing-actions";

beforeEach(() => vi.clearAllMocks());

describe("timing accommodation", () => {
  it("a tutor who is not linked to the student is refused", async () => {
    db.canTutorAccessStudent.mockResolvedValue(false);
    await expect(
      actionSetTimingAccommodation({ studentClerkId: "user_s", value: "double" })
    ).rejects.toThrow("Not allowed");
    expect(db.setTimingAccommodation).not.toHaveBeenCalled();
  });
  it("the student's own tutor, or an admin, can set it", async () => {
    db.canTutorAccessStudent.mockResolvedValue(true);
    await actionSetTimingAccommodation({ studentClerkId: "user_s", value: "time_and_half" });
    expect(db.canTutorAccessStudent).toHaveBeenCalledWith("user_tutor", "user_s");
    expect(db.setTimingAccommodation).toHaveBeenCalledWith("user_s", "time_and_half");
  });
  it("rejects values other than the three", async () => {
    db.canTutorAccessStudent.mockResolvedValue(true);
    await expect(
      actionSetTimingAccommodation({ studentClerkId: "user_s", value: "triple" as "double" })
    ).rejects.toThrow();
  });
});
