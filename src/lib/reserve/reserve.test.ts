import { describe, expect, it } from "vitest";
import { MARCH_PROGRAM, NEXT_PROGRAMS } from "@/lib/marketing/offer";
import { openPrograms } from "./programs";
import { contactSchema, seatSchema } from "./schemas";

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
  const contact = {
    filledBy: "parent",
    parentFirst: "Mari",
    parentLast: "O'Neil",
    parentEmail: " Parent@Example.com ",
    parentPhone: "(512) 555-0142",
    studentFirst: "Amira",
  };
  it("tidies a real family's details", () => {
    const c = contactSchema.parse(contact);
    expect(c.parentEmail).toBe("parent@example.com");
  });
  it("refuses digits and code in names, and bad contact details", () => {
    for (const bad of [
      { parentFirst: "Mari4" },
      { studentFirst: "<script>" },
      { parentLast: "x'); DROP TABLE seat_reservations;--" },
      { parentEmail: "not-an-email" },
      { parentPhone: "12" },
      { filledBy: "tutor" },
    ])
      expect(contactSchema.safeParse({ ...contact, ...bad }).success).toBe(false);
  });
  it("takes a real SAT score or none, and only the two ways of paying", () => {
    const seat = {
      reservationId: "11111111-1111-4111-8111-111111111111",
      startScore: "1180",
      programId: MARCH_PROGRAM.id,
      payment: "full",
    };
    expect(seatSchema.safeParse(seat).success).toBe(true);
    expect(seatSchema.safeParse({ ...seat, startScore: "" }).success).toBe(true);
    for (const bad of [
      { startScore: "1185" },
      { startScore: "2000" },
      { payment: "free" },
      { reservationId: "1" },
    ])
      expect(seatSchema.safeParse({ ...seat, ...bad }).success).toBe(false);
  });
});
