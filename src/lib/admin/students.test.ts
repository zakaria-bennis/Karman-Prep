import { describe, expect, it } from "vitest";
import {
  clerkIdSchema,
  countMastered,
  displayName,
  latestByKey,
  mapInBatches,
  searchTokens,
  summarizeAttempts,
  timingLabel,
  tokenFilter,
} from "./students";
import {
  isPastDue,
  mapCatalogAssignment,
  mapCheckpointAssignment,
  mapCohortHomework,
  mapStudentAssignment,
  mapTutorHomework,
  sortHomework,
  type TutorHomeworkRow,
} from "./student-homework";

const NOW = new Date("2026-11-08T12:00:00Z");

const tutorRow = (over: Partial<TutorHomeworkRow> = {}): TutorHomeworkRow => ({
  id: "h1",
  kind: "skill_practice",
  title: "Linear equations",
  note: null,
  due_on: "2026-11-10",
  status: "assigned",
  completed_at: null,
  created_at: "2026-11-01T10:00:00Z",
  ...over,
});

describe("clerkIdSchema", () => {
  it("accepts Clerk ids and rejects anything else", () => {
    expect(clerkIdSchema.safeParse("user_2abcXYZ09").success).toBe(true);
    expect(clerkIdSchema.safeParse("user-2abc").success).toBe(false);
    expect(clerkIdSchema.safeParse("../etc").success).toBe(false);
    expect(clerkIdSchema.safeParse("").success).toBe(false);
  });
});

describe("displayName", () => {
  it("joins first and last name, then falls back to the email", () => {
    expect(displayName("Ada", "Lovelace", "ada@x.com")).toBe("Ada Lovelace");
    expect(displayName(" Ada ", null, "ada@x.com")).toBe("Ada");
    expect(displayName(null, "", "ada@x.com")).toBe("ada@x.com");
    expect(displayName(null, null, null)).toBe("Unnamed student");
  });
});

describe("searchTokens and tokenFilter", () => {
  it("strips PostgREST filter characters and caps the word count", () => {
    expect(searchTokens("  Jane   O'Brien ")).toEqual(["Jane", "O'Brien"]);
    expect(searchTokens("a,b(c)*d%e:f")).toEqual(["a", "b", "c", "d"]);
    expect(searchTokens("jane.doe+sat@mail.com")).toEqual(["jane.doe+sat@mail.com"]);
    expect(searchTokens(null)).toEqual([]);
  });

  it("matches the word in first name, last name or email", () => {
    expect(tokenFilter("ada")).toBe(
      "first_name.ilike.%ada%,last_name.ilike.%ada%,email.ilike.%ada%"
    );
  });
});

describe("latestByKey", () => {
  it("keeps the newest timestamp per key and skips nulls", () => {
    const rows = [
      { k: "a", t: "2026-11-01T00:00:00Z" },
      { k: "a", t: "2026-11-05T00:00:00Z" },
      { k: "b", t: null },
      { k: "c", t: "2026-10-01T00:00:00Z" },
    ];
    const map = latestByKey(
      rows,
      (r) => r.k,
      (r) => r.t
    );
    expect(map.get("a")).toBe("2026-11-05T00:00:00Z");
    expect(map.has("b")).toBe(false);
    expect(map.get("c")).toBe("2026-10-01T00:00:00Z");
  });
});

describe("mapInBatches", () => {
  it("runs at most `size` at once and keeps the order", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapInBatches([1, 2, 3, 4, 5, 6, 7], 5, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBe(5);
  });

  it("handles an empty list", async () => {
    expect(await mapInBatches([], 5, async (n: number) => n)).toEqual([]);
  });
});

describe("summarizeAttempts and countMastered", () => {
  it("averages scored attempts only", () => {
    expect(summarizeAttempts([{ score: 80 }, { score: null }, { score: 61 }])).toEqual({
      count: 3,
      averageScore: 71,
    });
    expect(summarizeAttempts([])).toEqual({ count: 0, averageScore: null });
  });

  it("counts mastered nodes within the given ids", () => {
    const statuses = [
      { node_id: "r1", status: "mastered" },
      { node_id: "r2", status: "in_progress" },
      { node_id: "m1", status: "mastered" },
    ];
    expect(countMastered(statuses, ["r1", "r2", "r3"])).toBe(1);
  });
});

describe("timingLabel", () => {
  it("labels each accommodation and defaults to standard", () => {
    expect(timingLabel("double")).toBe("Double time");
    expect(timingLabel(null)).toBe("Standard time");
    expect(timingLabel("weird")).toBe("Standard time");
  });
});

describe("isPastDue", () => {
  it("treats a date-only due date as due through that day", () => {
    expect(isPastDue("2026-11-08", NOW)).toBe(false);
    expect(isPastDue("2026-11-07", NOW)).toBe(true);
    expect(isPastDue("2026-11-08T11:00:00Z", NOW)).toBe(true);
    expect(isPastDue(null, NOW)).toBe(false);
  });
});

describe("homework mappers", () => {
  it("maps tutor homework status, overdue and completion", () => {
    expect(mapTutorHomework(tutorRow(), NOW)).toMatchObject({
      key: "tutor:h1",
      source: "tutor",
      status: "Assigned",
      tone: "info",
      detail: "Skill practice",
    });
    expect(mapTutorHomework(tutorRow({ due_on: "2026-11-01" }), NOW).status).toBe("Overdue");
    const done = mapTutorHomework(
      tutorRow({ status: "completed", completed_at: "2026-11-03T09:00:00Z", note: "Show work" }),
      NOW
    );
    expect(done).toMatchObject({
      status: "Completed",
      tone: "ok",
      completedAt: "2026-11-03T09:00:00Z",
      detail: "Skill practice. Show work",
    });
    expect(mapTutorHomework(tutorRow({ status: "cancelled" }), NOW).status).toBe("Cancelled");
  });

  it("maps question sets, checkpoints, cohort homework and assigned tests", () => {
    expect(
      mapCatalogAssignment({
        id: "c1",
        title: "Set A",
        catalog_skill_id: null,
        due_at: null,
        status: "draft",
        created_at: "2026-11-01T00:00:00Z",
      })
    ).toMatchObject({ source: "catalog", status: "Draft", completedAt: null, detail: null });
    expect(
      mapCheckpointAssignment({
        id: "k1",
        checkpoint_id: "rw-t1",
        reason: "Rushed",
        assigned_at: "2026-11-02T00:00:00Z",
        cooldown_override: true,
      })
    ).toMatchObject({ title: "Checkpoint rw-t1", status: "Cooldown lifted", detail: "Rushed" });
    expect(
      mapCohortHomework(
        {
          id: "w1",
          cohort_id: "co1",
          title: "Read chapter 2",
          body: null,
          assigned_at: "2026-11-03T00:00:00Z",
          due_at: "2026-11-09T00:00:00Z",
        },
        "Fall Saturday"
      )
    ).toMatchObject({ source: "cohort", detail: "Cohort: Fall Saturday", status: "Assigned" });
    expect(
      mapStudentAssignment({
        id: "t1",
        kind: "time_trial",
        section: "math",
        title: "Math trial",
        scheduled_for: "2026-11-12",
        unlocked_at: "2026-11-05T00:00:00Z",
        completed_at: null,
        created_at: "2026-11-04T00:00:00Z",
      })
    ).toMatchObject({ status: "Unlocked", detail: "Time trial, Math", dueOn: "2026-11-12" });
  });

  it("sorts newest assignment first with undated items last", () => {
    const a = mapTutorHomework(tutorRow({ id: "a", created_at: "2026-11-01T00:00:00Z" }), NOW);
    const b = mapTutorHomework(tutorRow({ id: "b", created_at: "2026-11-05T00:00:00Z" }), NOW);
    const c = { ...a, key: "x", assignedAt: null };
    expect(sortHomework([a, c, b]).map((i) => i.key)).toEqual(["tutor:b", "tutor:a", "x"]);
  });
});
