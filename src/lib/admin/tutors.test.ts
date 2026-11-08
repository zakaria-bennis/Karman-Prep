import { describe, expect, it } from "vitest";
import type { AdminUserRow } from "./plans";
import {
  buildTutorRoster,
  filterTutors,
  parseKind,
  roleLabel,
  rosterStats,
  type RosterInput,
} from "./tutors";

const user = (id: string, role: string, firstName: string, email = `${id}@karman.local`) =>
  ({
    id,
    clerkId: `clerk_${id}`,
    role,
    email,
    firstName,
    lastName: null,
  }) satisfies AdminUserRow;

const users = [
  user("ana", "tutor", "Ana"),
  user("priya", "affiliate_tutor", "Priya"),
  user("zed", "tutor", "Zed"),
  user("boss", "admin", "Boss"),
  user("idle", "admin", "Idle"),
  user("s1", "student", "Sam"),
  user("s2", "student", "Bea"),
  user("s3", "student", "Cal"),
  user("s4", "student", "Dee"),
  user("s5", "student", "Eli"),
];

const input = (over: Partial<RosterInput> = {}): RosterInput => ({
  users,
  cohorts: [
    { id: "c1", name: "Spring A", tutor_user_id: "ana", archived_at: null },
    { id: "c2", name: "Old", tutor_user_id: "ana", archived_at: "2026-01-01T00:00:00Z" },
    { id: "c3", name: "Boss cohort", tutor_user_id: "boss", archived_at: null },
    { id: "c4", name: "Empty", tutor_user_id: "idle", archived_at: null },
  ],
  members: [
    { cohort_id: "c1", user_id: "s1", joined_at: "2026-09-01T00:00:00Z", left_at: null },
    { cohort_id: "c1", user_id: "s2", joined_at: "2026-09-02T00:00:00Z", left_at: "2026-10-01" },
    { cohort_id: "c2", user_id: "s3", joined_at: "2026-01-01T00:00:00Z", left_at: null },
    { cohort_id: "c3", user_id: "s4", joined_at: "2026-10-01T00:00:00Z", left_at: null },
  ],
  assignments: [
    { tutor_user_id: "ana", student_user_id: "s1", started_at: "2026-08-01T00:00:00Z" },
    { tutor_user_id: "ana", student_user_id: "s5", started_at: "2026-08-01T00:00:00Z" },
    {
      tutor_user_id: "ana",
      student_user_id: "s3",
      started_at: "2026-02-01T00:00:00Z",
      ended_at: "2026-03-01T00:00:00Z",
    },
  ],
  affiliates: [{ id: "a1", tutor_user_id: "priya", seat_limit: 50 }],
  codes: [{ id: "k1", code: "PRIYA10" }],
  redemptions: [
    { affiliate_id: "a1", code_id: "k1", student_user_id: "s2", redeemed_at: "2026-10-05" },
    { affiliate_id: "a1", code_id: "k1", student_user_id: "s3", removed_at: "2026-10-06" },
  ],
  ...over,
});

const byId = (rows: ReturnType<typeof buildTutorRoster>) => new Map(rows.map((r) => [r.userId, r]));

describe("buildTutorRoster", () => {
  it("counts regular students from active assignments and current cohort members", () => {
    const ana = byId(buildTutorRoster(input())).get("ana")!;
    expect(ana.kind).toBe("regular");
    expect(ana.regular).toBe(2);
    expect(ana.affiliate).toBe(0);
    expect(ana.total).toBe(2);
    expect(ana.seatLimit).toBeNull();
    // s1 is both assigned and in Spring A: one student, two links, earliest first.
    const s1 = ana.students.find((s) => s.userId === "s1")!;
    expect(s1.links.map((l) => l.label)).toEqual(["Regular, assigned", "Regular, cohort Spring A"]);
    // Left member (s2), archived cohort and ended assignment (s3) never count.
    expect(ana.students.map((s) => s.userId).sort()).toEqual(["s1", "s5"]);
  });

  it("counts live affiliate redemptions against the seat limit", () => {
    const priya = byId(buildTutorRoster(input())).get("priya")!;
    expect(priya.kind).toBe("affiliate");
    expect(priya.affiliate).toBe(1);
    expect(priya.seatLimit).toBe(50);
    expect(priya.students[0].links).toEqual([
      { kind: "affiliate", label: "Affiliate code PRIYA10", since: "2026-10-05" },
    ]);
  });

  it("counts a student who is regular and affiliate once in the total", () => {
    const rows = buildTutorRoster(
      input({
        affiliates: [{ id: "a2", tutor_user_id: "ana", seat_limit: 10 }],
        codes: [{ id: "k2", code: "ANA" }],
        redemptions: [{ affiliate_id: "a2", code_id: "k2", student_user_id: "s1" }],
      })
    );
    const ana = byId(rows).get("ana")!;
    expect(ana.kind).toBe("affiliate");
    expect([ana.regular, ana.affiliate, ana.total]).toEqual([2, 1, 2]);
  });

  it("lists tutors with no students, and other roles only when they teach", () => {
    const rows = byId(buildTutorRoster(input()));
    expect(rows.get("zed")?.total).toBe(0);
    expect(rows.get("boss")?.regular).toBe(1);
    expect(rows.has("idle")).toBe(false);
    expect(rows.has("s1")).toBe(false);
  });

  it("treats a missing affiliate program as zero affiliate students", () => {
    const rows = byId(buildTutorRoster(input({ affiliates: [], codes: [], redemptions: [] })));
    const priya = rows.get("priya")!;
    expect([priya.kind, priya.affiliate, priya.seatLimit]).toEqual(["affiliate", 0, null]);
  });

  it("sorts by total, then name", () => {
    const order = buildTutorRoster(input()).map((r) => r.userId);
    expect(order).toEqual(["ana", "boss", "priya", "zed"]);
  });
});

describe("filters, stats and labels", () => {
  const rows = buildTutorRoster(input());

  it("filters by kind and by tutor name or email", () => {
    expect(filterTutors(rows, "affiliate", "").map((r) => r.userId)).toEqual(["priya"]);
    expect(filterTutors(rows, "regular", "").map((r) => r.userId)).toEqual(["ana", "boss", "zed"]);
    expect(filterTutors(rows, "all", "ANA").map((r) => r.userId)).toEqual(["ana"]);
    expect(filterTutors(rows, "all", "zed@karman").map((r) => r.userId)).toEqual(["zed"]);
    expect(filterTutors(rows, "affiliate", "ana")).toEqual([]);
  });

  it("parses the kind tab, falling back to all", () => {
    expect(parseKind("affiliate")).toBe("affiliate");
    expect(parseKind("regular")).toBe("regular");
    expect(parseKind("nope")).toBe("all");
    expect(parseKind(undefined)).toBe("all");
  });

  it("counts each student once across tutors, and seats in use", () => {
    expect(rosterStats(rows)).toEqual({ tutors: 4, students: 4, seatsUsed: 1, seatLimit: 50 });
  });

  it("labels the role and notes other account roles", () => {
    const map = byId(rows);
    expect(roleLabel(map.get("priya")!)).toEqual({ label: "Affiliate tutor", note: null });
    expect(roleLabel(map.get("ana")!)).toEqual({ label: "Tutor", note: null });
    expect(roleLabel(map.get("boss")!)).toEqual({ label: "Tutor", note: "Admin account" });
  });
});
