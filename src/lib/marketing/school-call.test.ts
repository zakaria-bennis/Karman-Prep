import { describe, expect, it } from "vitest";
import { CALL_ERRORS, CALL_RULES, CALL_STEPS, nextSchoolDay } from "./school-call";
import { schoolCallSchema } from "./school-call-schema";

const good = {
  school: "  Lakeview   High School ",
  role: "Counselor",
  students: "250 to 500",
  start: "Next semester",
  name: "Dana Reyes",
  email: " Dana.Reyes@Lakeview.K12.us ",
  phone: "",
  callTime: "",
  website: "",
};

describe("schoolCallSchema", () => {
  it("accepts a full request and tidies it: one-line names, a lower-case email", () => {
    const r = schoolCallSchema.safeParse(good);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      school: "Lakeview High School",
      email: "dana.reyes@lakeview.k12.us",
      phone: "",
      callTime: "",
    });
  });

  it("leaves the phone and the call time optional, and checks them when given", () => {
    const { phone: _p, callTime: _c, ...rest } = good;
    expect(schoolCallSchema.safeParse(rest).success).toBe(true);
    expect(
      schoolCallSchema.safeParse({ ...good, phone: "(512) 555-0142", callTime: "After school" })
        .success
    ).toBe(true);
    const bad = schoolCallSchema.safeParse({ ...good, phone: "555", callTime: "Midnight" });
    expect(bad.error?.issues.map((i) => [i.path[0], i.message])).toEqual([
      ["phone", CALL_ERRORS.phone],
      ["callTime", CALL_ERRORS.callTime],
    ]);
  });

  it("refuses answers that aren't on the lists, with the screen's own words", () => {
    const r = schoolCallSchema.safeParse({
      ...good,
      school: " \u0000 ",
      role: "Superintendent",
      students: "lots",
      start: "",
      name: "",
      email: "dana@",
    });
    const fields = Object.fromEntries(r.error?.issues.map((i) => [i.path[0], i.message]) ?? []);
    expect(fields).toEqual({
      school: CALL_ERRORS.school,
      role: CALL_ERRORS.role,
      students: CALL_ERRORS.students,
      start: CALL_ERRORS.start,
      name: CALL_ERRORS.name,
      email: CALL_ERRORS.email,
    });
  });

  it("flags the hidden trap field when a bot fills it", () => {
    const r = schoolCallSchema.safeParse({ ...good, website: "spam.example" });
    expect(r.error?.issues[0]?.path).toEqual(["website"]);
  });
});

describe("the screen's checks", () => {
  it("agree with the server on every field", () => {
    for (const k of CALL_STEPS.flat()) {
      const v = (good as Record<string, string>)[k];
      expect(CALL_RULES[k](v), k).toBe("");
    }
    expect(CALL_RULES.school("")).toBe(CALL_ERRORS.school);
    expect(CALL_RULES.role("")).toBe(CALL_ERRORS.role);
    expect(CALL_RULES.email("a@b")).toBe(CALL_ERRORS.email);
    expect(CALL_RULES.phone("12")).toBe(CALL_ERRORS.phone);
  });

  it("ask about the school first and how to reach you second", () => {
    expect(CALL_STEPS[0]).toEqual(["school", "role", "students", "start"]);
    expect(CALL_STEPS[1]).toContain("email");
  });
});

describe("nextSchoolDay", () => {
  it("skips the weekend", () => {
    expect(nextSchoolDay(new Date("2026-11-12T15:00:00Z"))).toBe("2026-11-13"); // Thu to Fri
    expect(nextSchoolDay(new Date("2026-11-13T15:00:00Z"))).toBe("2026-11-16"); // Fri to Mon
    expect(nextSchoolDay(new Date("2026-11-15T15:00:00Z"))).toBe("2026-11-16"); // Sun to Mon
  });
});
