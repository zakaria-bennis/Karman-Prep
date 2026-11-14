import { describe, expect, it } from "vitest";
import { MARCH_PROGRAM, NEXT_PROGRAMS } from "@/lib/marketing/offer";
import { openPrograms } from "./programs";
import { detailsSchema, emailSchema, seatSchema } from "./schemas";

describe("the cohorts a family can reserve", () => {
  it("offers every cohort until a week before its first class", () => {
    expect(openPrograms("2026-11-13").map((p) => p.id)).toEqual([
      MARCH_PROGRAM.id,
      ...NEXT_PROGRAMS.map((p) => p.id),
    ]);
    // registration for the first cohort closes one week before it starts
    expect(openPrograms("2026-12-28").map((p) => p.id)).toContain(MARCH_PROGRAM.id);
    expect(openPrograms("2026-12-29").map((p) => p.id)).not.toContain(MARCH_PROGRAM.id);
    expect(openPrograms("2028-01-01")).toEqual([]);
  });
});

describe("what the form may send", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("takes the email alone first, tidied", () => {
    const e = emailSchema.parse({ filledBy: "parent", email: " Parent@Example.com " });
    expect(e.email).toBe("parent@example.com");
    for (const bad of [{ email: "not-an-email" }, { filledBy: "tutor" }, { company: "bot" }])
      expect(emailSchema.safeParse({ filledBy: "parent", email: "a@b.co", ...bad }).success).toBe(
        false
      );
  });
  it("takes one full name, a first name and an optional phone", () => {
    const d = { reservationId: id, parentName: "Mari O'Neil", studentFirst: "Amira", phone: "" };
    expect(detailsSchema.safeParse(d).success).toBe(true);
    expect(detailsSchema.safeParse({ ...d, phone: "(512) 555-0142" }).success).toBe(true);
    for (const bad of [
      { parentName: "Mari4" },
      { studentFirst: "<script>" },
      { parentName: "x'); DROP TABLE seat_reservations;--" },
      { phone: "12" },
      { reservationId: "1" },
    ])
      expect(detailsSchema.safeParse({ ...d, ...bad }).success).toBe(false);
  });
  it("takes a real SAT score or none, and only the two ways of paying", () => {
    const seat = {
      reservationId: id,
      startScore: "1180",
      programId: MARCH_PROGRAM.id,
      payment: "full",
    };
    expect(seatSchema.safeParse(seat).success).toBe(true);
    expect(seatSchema.safeParse({ ...seat, startScore: "" }).success).toBe(true);
    for (const bad of [{ startScore: "1185" }, { startScore: "2000" }, { payment: "free" }])
      expect(seatSchema.safeParse({ ...seat, ...bad }).success).toBe(false);
  });
});
