import { describe, expect, it } from "vitest";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { redeemAffiliateCode, removeAffiliateStudent } from "./service";
import {
  createMemoryAffiliateDeps,
  createMemoryHomeworkStore,
} from "@/test/tutor-affiliate-memory-store";
import {
  assignHomework,
  cancelHomework,
  homeworkTarget,
  removeStudentAndCancelHomework,
} from "./homework";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const SKILL = CATALOG_SKILLS[0];
const DOMAIN = SKILL_DOMAINS[0];

async function setup() {
  const deps = createMemoryAffiliateDeps();
  const tutor = deps.store.addUser({
    clerkId: "tutor_maya",
    role: "affiliate_tutor",
    firstName: "Maya",
  });
  const affiliate = deps.store.addAffiliate({ tutorUserId: tutor.id });
  deps.store.addCode(affiliate.id, "ABCD-EFGH");
  deps.setSubscription(tutor.id, "active");
  const student = deps.store.addUser({ clerkId: "student_ava", role: "student", firstName: "Ava" });
  await redeemAffiliateCode(deps, { studentClerkId: student.clerkId, rawCode: "ABCD-EFGH" }, NOW);
  const homework = createMemoryHomeworkStore();
  return { deps: { ...deps, homework }, tutor, student, homework };
}

const assignment = (overrides: Partial<Parameters<typeof assignHomework>[1]> = {}) => ({
  actorClerkId: "tutor_maya",
  studentClerkId: "student_ava",
  kind: "skill_practice" as const,
  targetId: SKILL.id as string | null,
  dueOn: "2026-11-13",
  note: null as string | null,
  ...overrides,
});

describe("homework targets", () => {
  it("names a skill practice, a Domain quiz and a full-length test", () => {
    expect(homeworkTarget("skill_practice", SKILL.id)).toEqual({
      title: `Practice: ${SKILL.label}`,
    });
    expect(homeworkTarget("domain_quiz", DOMAIN.id)).toEqual({
      title: `Domain quiz: ${DOMAIN.label}`,
    });
    expect(homeworkTarget("full_length_test", null)).toEqual({
      title: "Full-length practice test",
    });
  });

  it("rejects unknown skills and Domains, and a target on a full-length test", () => {
    expect(homeworkTarget("skill_practice", "ma-skill-not-real")).toBeNull();
    expect(homeworkTarget("domain_quiz", SKILL.id)).toBeNull();
    expect(homeworkTarget("skill_practice", null)).toBeNull();
    expect(homeworkTarget("full_length_test", SKILL.id)).toBeNull();
  });
});

describe("assigning homework", () => {
  it("puts the work in the student's Homework with its due date", async () => {
    const { deps, tutor, student, homework } = await setup();
    const item = await assignHomework(deps, assignment({ note: "Before Thursday's call" }), NOW);
    expect(item).toMatchObject({
      studentUserId: student.id,
      assignedByUserId: tutor.id,
      kind: "skill_practice",
      targetId: SKILL.id,
      title: `Practice: ${SKILL.label}`,
      note: "Before Thursday's call",
      dueOn: "2026-11-13",
      status: "assigned",
    });
    expect(await homework.listForStudent(student.id)).toHaveLength(1);
  });

  it("refuses a tutor who doesn't have the student", async () => {
    const { deps } = await setup();
    const other = deps.store.addUser({ clerkId: "tutor_omar", role: "affiliate_tutor" });
    deps.store.addAffiliate({ tutorUserId: other.id });
    deps.setSubscription(other.id, "active");
    await expect(
      assignHomework(deps, assignment({ actorClerkId: "tutor_omar" }), NOW)
    ).rejects.toThrow("can't assign work");
  });

  it("refuses a tutor whose plan has lapsed", async () => {
    const { deps, tutor } = await setup();
    deps.setSubscription(tutor.id, "canceled");
    await expect(assignHomework(deps, assignment(), NOW)).rejects.toThrow("can't assign work");
  });

  it("refuses a due date in the past or more than a year away", async () => {
    const { deps } = await setup();
    await expect(assignHomework(deps, assignment({ dueOn: "2026-11-06" }), NOW)).rejects.toThrow(
      "due date"
    );
    await expect(assignHomework(deps, assignment({ dueOn: "2027-11-09" }), NOW)).rejects.toThrow(
      "due date"
    );
    expect((await assignHomework(deps, assignment({ dueOn: "2026-11-08" }), NOW)).dueOn).toBe(
      "2026-11-08"
    );
  });

  it("refuses an unknown target", async () => {
    const { deps } = await setup();
    await expect(
      assignHomework(deps, assignment({ kind: "domain_quiz", targetId: "nope" }), NOW)
    ).rejects.toThrow("Pick a skill");
  });
});

describe("cancelling and removal", () => {
  it("lets the tutor who assigned it cancel it", async () => {
    const { deps, student, homework } = await setup();
    const item = await assignHomework(deps, assignment(), NOW);
    await cancelHomework(deps, { actorClerkId: "tutor_maya", homeworkId: item.id }, NOW);
    expect((await homework.listForStudent(student.id))[0].status).toBe("cancelled");
  });

  it("won't let another tutor cancel it", async () => {
    const { deps } = await setup();
    const item = await assignHomework(deps, assignment(), NOW);
    deps.store.addUser({ clerkId: "tutor_omar", role: "affiliate_tutor" });
    await expect(
      cancelHomework(deps, { actorClerkId: "tutor_omar", homeworkId: item.id }, NOW)
    ).rejects.toThrow("not yours");
  });

  it("clears the tutor's open homework when the student is removed", async () => {
    const { deps, student, homework } = await setup();
    await assignHomework(deps, assignment(), NOW);
    await assignHomework(deps, assignment({ kind: "full_length_test", targetId: null }), NOW);
    await removeStudentAndCancelHomework(
      deps,
      { actorClerkId: "tutor_maya", studentUserId: student.id },
      NOW
    );
    const items = await homework.listForStudent(student.id);
    expect(items.map((i) => i.status)).toEqual(["cancelled", "cancelled"]);
    await expect(
      removeAffiliateStudent(deps, { actorClerkId: "tutor_maya", studentUserId: student.id }, NOW)
    ).rejects.toThrow("not in your group");
  });
});
