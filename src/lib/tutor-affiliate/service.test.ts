import { describe, expect, it } from "vitest";
import { createMemoryAffiliateDeps } from "@/test/tutor-affiliate-memory-store";
import { SeatLimitReachedError } from "./types";
import {
  activateAffiliateTutor,
  getAffiliateOverview,
  getStudentAffiliateStatus,
  leaveAffiliateTutor,
  redeemAffiliateCode,
  regenerateAffiliateCode,
  removeAffiliateStudent,
  resolveAffiliateManagement,
} from "./service";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const fixedBytes = (values: number[]) => () => Uint8Array.from(values);

function setup() {
  const deps = createMemoryAffiliateDeps();
  const tutor = deps.store.addUser({
    clerkId: "tutor_maya",
    role: "affiliate_tutor",
    firstName: "Maya",
    lastName: "Rivera",
  });
  const affiliate = deps.store.addAffiliate({ tutorUserId: tutor.id });
  deps.store.addCode(affiliate.id, "ABCD-EFGH");
  deps.setSubscription(tutor.id, "active");
  return { deps, tutor, affiliate };
}

type Deps = ReturnType<typeof setup>["deps"];

function addStudents(deps: Deps, count: number, prefix = "student") {
  return Array.from({ length: count }, (_, i) =>
    deps.store.addUser({ clerkId: `${prefix}_${i + 1}`, role: "student", firstName: `S${i + 1}` })
  );
}

function addOtherTutor(deps: Deps, code = "WXYZ-2345") {
  const tutor = deps.store.addUser({
    clerkId: "tutor_omar",
    role: "affiliate_tutor",
    firstName: "Omar",
  });
  const affiliate = deps.store.addAffiliate({ tutorUserId: tutor.id });
  deps.store.addCode(affiliate.id, code);
  deps.setSubscription(tutor.id, "active");
  return { tutor, affiliate };
}

async function join(deps: Deps, clerkId: string, code = "ABCD-EFGH") {
  return redeemAffiliateCode(deps, { studentClerkId: clerkId, rawCode: code }, NOW);
}

const grantFor = (deps: Deps, studentUserId: string) =>
  [...deps.activeGrants.values()].find((g) => g.studentUserId === studentUserId) ?? null;

describe("redeeming a tutor code", () => {
  it("joins an active tutor's group and grants Practice", async () => {
    const { deps, tutor } = setup();
    const [student] = addStudents(deps, 1);
    expect(await join(deps, student.clerkId)).toEqual({
      ok: true,
      status: "joined",
      tutorName: "Maya R.",
    });
    expect(grantFor(deps, student.id)).toEqual({
      studentUserId: student.id,
      tutorUserId: tutor.id,
    });
  });

  it("accepts the code in any case and spacing", async () => {
    const { deps } = setup();
    const [student] = addStudents(deps, 1);
    expect((await join(deps, student.clerkId, " abcd efgh ")).ok).toBe(true);
  });

  it("rejects malformed, unknown and retired codes", async () => {
    const { deps } = setup();
    const [student] = addStudents(deps, 1);
    expect(await join(deps, student.clerkId, "nope")).toEqual({
      ok: false,
      reason: "invalid_code",
    });
    expect(await join(deps, student.clerkId, "ZZZZ-ZZZZ")).toEqual({
      ok: false,
      reason: "invalid_code",
    });
    await regenerateAffiliateCode(
      deps,
      { tutorClerkId: "tutor_maya" },
      NOW,
      fixedBytes([9, 9, 9, 9, 9, 9, 9, 9])
    );
    expect(await join(deps, student.clerkId)).toEqual({ ok: false, reason: "invalid_code" });
    expect((await join(deps, student.clerkId, "KKKK-KKKK")).ok).toBe(true);
  });

  it("turns students away while the tutor's plan has lapsed", async () => {
    const { deps, tutor } = setup();
    deps.setSubscription(tutor.id, "canceled");
    const [student] = addStudents(deps, 1);
    expect(await join(deps, student.clerkId)).toEqual({
      ok: false,
      reason: "tutor_inactive",
      tutorName: "Maya R.",
    });
    expect(grantFor(deps, student.id)).toBeNull();
  });

  it("admits the 50th student and turns away the 51st", async () => {
    const { deps, affiliate } = setup();
    const students = addStudents(deps, 51);
    for (const student of students.slice(0, 50)) {
      expect((await join(deps, student.clerkId)).ok).toBe(true);
    }
    expect(await join(deps, students[50].clerkId)).toEqual({
      ok: false,
      reason: "full",
      tutorName: "Maya R.",
    });
    expect((await deps.store.liveLinksForAffiliate(affiliate.id)).length).toBe(50);
    expect(deps.activeGrants.size).toBe(50);
  });

  it("frees a seat and the grant when a student leaves", async () => {
    const { deps } = setup();
    const students = addStudents(deps, 51);
    for (const student of students.slice(0, 50)) await join(deps, student.clerkId);
    expect(await leaveAffiliateTutor(deps, { studentClerkId: students[0].clerkId }, NOW)).toEqual({
      ok: true,
    });
    expect(grantFor(deps, students[0].id)).toBeNull();
    expect((await join(deps, students[50].clerkId)).ok).toBe(true);
  });

  it("reports a seat race lost at the database as full", async () => {
    const { deps } = setup();
    const [student] = addStudents(deps, 1);
    deps.store.failNextInsertWith(new SeatLimitReachedError());
    expect(await join(deps, student.clerkId)).toEqual({
      ok: false,
      reason: "full",
      tutorName: "Maya R.",
    });
    expect(grantFor(deps, student.id)).toBeNull();
  });

  it("undoes the link when the Practice grant can't be written", async () => {
    const { deps, affiliate } = setup();
    const [student] = addStudents(deps, 1);
    deps.grants.grant = async () => {
      throw new Error("plan service down");
    };
    await expect(join(deps, student.clerkId)).rejects.toThrow("plan service down");
    expect((await deps.store.liveLinksForAffiliate(affiliate.id)).length).toBe(0);
  });

  it("treats a second redemption by the same student as already joined", async () => {
    const { deps, affiliate } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    expect(await join(deps, student.clerkId)).toEqual({
      ok: true,
      status: "already_joined",
      tutorName: "Maya R.",
    });
    expect((await deps.store.liveLinksForAffiliate(affiliate.id)).length).toBe(1);
  });

  it("asks before moving a student from another tutor, then switches", async () => {
    const { deps, tutor, affiliate } = setup();
    const other = addOtherTutor(deps);
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId, "WXYZ-2345");

    expect(await join(deps, student.clerkId)).toEqual({
      ok: false,
      reason: "linked_elsewhere",
      tutorName: "Maya R.",
      currentTutorName: "Omar",
    });
    expect(
      await redeemAffiliateCode(
        deps,
        { studentClerkId: student.clerkId, rawCode: "ABCD-EFGH", switchTutor: true },
        NOW
      )
    ).toEqual({ ok: true, status: "switched", tutorName: "Maya R." });
    expect((await deps.store.liveLinksForAffiliate(other.affiliate.id)).length).toBe(0);
    expect((await deps.store.liveLinksForAffiliate(affiliate.id)).length).toBe(1);
    expect(grantFor(deps, student.id)?.tutorUserId).toBe(tutor.id);
    expect(deps.activeGrants.size).toBe(1);
  });

  it("keeps a removed student out of the same code until the tutor makes a new one", async () => {
    const { deps, tutor } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    await removeAffiliateStudent(
      deps,
      { actorClerkId: tutor.clerkId, studentUserId: student.id },
      NOW
    );
    expect(await join(deps, student.clerkId)).toEqual({
      ok: false,
      reason: "removed_by_tutor",
      tutorName: "Maya R.",
    });
    await regenerateAffiliateCode(
      deps,
      { tutorClerkId: tutor.clerkId },
      NOW,
      fixedBytes([10, 10, 10, 10, 10, 10, 10, 10])
    );
    expect((await join(deps, student.clerkId, "LLLL-LLLL")).ok).toBe(true);
  });

  it.each(["affiliate_tutor", "tutor", "parent", "admin"])("refuses a %s account", async (role) => {
    const { deps } = setup();
    const user = deps.store.addUser({ clerkId: `someone_${role}`, role });
    expect(await join(deps, user.clerkId)).toEqual({ ok: false, reason: "not_student" });
  });

  it("asks a visitor without an account to sign up first", async () => {
    const { deps } = setup();
    expect(await join(deps, "unknown_clerk")).toEqual({ ok: false, reason: "no_account" });
  });
});

describe("when a tutor's plan lapses", () => {
  it("tells the student their tutor's plan ended, and clears it when the tutor restarts", async () => {
    const { deps, tutor } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);

    deps.setSubscription(tutor.id, "past_due");
    expect(await getStudentAffiliateStatus(deps, student.clerkId)).toMatchObject({
      state: "lapsed",
      tutorName: "Maya R.",
    });

    deps.setSubscription(tutor.id, "active");
    expect(await getStudentAffiliateStatus(deps, student.clerkId)).toMatchObject({
      state: "active",
    });
  });

  it("treats a tutor with no subscription row as lapsed", async () => {
    const { deps, tutor } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    deps.setSubscription(tutor.id, null);
    expect((await getStudentAffiliateStatus(deps, student.clerkId)).state).toBe("lapsed");
  });

  it("drops a removed student to Free and tells them once", async () => {
    const { deps, tutor } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    await removeAffiliateStudent(
      deps,
      { actorClerkId: tutor.clerkId, studentUserId: student.id },
      NOW
    );

    expect(grantFor(deps, student.id)).toBeNull();
    expect(await getStudentAffiliateStatus(deps, student.clerkId)).toMatchObject({
      state: "removed",
      tutorName: "Maya R.",
      noticeSeen: false,
    });
  });

  it("shows nothing after a student leaves on their own", async () => {
    const { deps } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    await leaveAffiliateTutor(deps, { studentClerkId: student.clerkId }, NOW);
    expect(await getStudentAffiliateStatus(deps, student.clerkId)).toEqual({ state: "none" });
  });
});

describe("who may manage a student", () => {
  it("lets a tutor manage only their own students", async () => {
    const { deps, tutor } = setup();
    const other = addOtherTutor(deps);
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);

    const mine = await resolveAffiliateManagement(deps, {
      actorClerkId: tutor.clerkId,
      studentClerkId: student.clerkId,
    });
    expect(mine.allowed).toBe(true);
    expect(mine.capabilities.has("assign")).toBe(true);

    const theirs = await resolveAffiliateManagement(deps, {
      actorClerkId: other.tutor.clerkId,
      studentClerkId: student.clerkId,
    });
    expect(theirs.allowed).toBe(false);
    expect(theirs.capabilities.size).toBe(0);
  });

  it("leaves a lapsed tutor the roster and removal, not progress or homework", async () => {
    const { deps, tutor } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    deps.setSubscription(tutor.id, "unpaid");

    const result = await resolveAffiliateManagement(deps, {
      actorClerkId: tutor.clerkId,
      studentClerkId: student.clerkId,
    });
    expect(result.allowed).toBe(true);
    expect([...result.capabilities].sort()).toEqual(["remove", "view_roster"]);
  });

  it("lets an admin manage any linked student", async () => {
    const { deps } = setup();
    const admin = deps.store.addUser({ clerkId: "admin_z", role: "admin" });
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    const result = await resolveAffiliateManagement(deps, {
      actorClerkId: admin.clerkId,
      studentClerkId: student.clerkId,
    });
    expect(result.allowed).toBe(true);
    expect(result.capabilities.has("remove")).toBe(true);
  });

  it.each(["student", "parent", "tutor"])("gives a %s no rights over the group", async (role) => {
    const { deps } = setup();
    const actor = deps.store.addUser({ clerkId: `actor_${role}`, role });
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);
    const result = await resolveAffiliateManagement(deps, {
      actorClerkId: actor.clerkId,
      studentClerkId: student.clerkId,
    });
    expect(result.allowed).toBe(false);
  });

  it("refuses to remove another tutor's student", async () => {
    const { deps, affiliate } = setup();
    const other = addOtherTutor(deps);
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);

    await expect(
      removeAffiliateStudent(
        deps,
        { actorClerkId: other.tutor.clerkId, studentUserId: student.id },
        NOW
      )
    ).rejects.toThrow("not in your group");
    expect((await deps.store.liveLinksForAffiliate(affiliate.id)).length).toBe(1);
    expect(grantFor(deps, student.id)).not.toBeNull();
  });

  it("needs an active plan to make a new code, and keeps students linked", async () => {
    const { deps, tutor, affiliate } = setup();
    const [student] = addStudents(deps, 1);
    await join(deps, student.clerkId);

    const fresh = await regenerateAffiliateCode(
      deps,
      { tutorClerkId: tutor.clerkId },
      NOW,
      fixedBytes([31, 30, 29, 28, 27, 26, 25, 24])
    );
    expect(fresh).toBe("9876-5432");
    expect((await deps.store.liveLinksForAffiliate(affiliate.id)).length).toBe(1);

    deps.setSubscription(tutor.id, "canceled");
    await expect(
      regenerateAffiliateCode(deps, { tutorClerkId: tutor.clerkId }, NOW)
    ).rejects.toThrow("plan is not active");
  });
});

describe("activating the $199 plan", () => {
  it("turns a new account into an affiliate tutor with a code once the plan is paid", async () => {
    const deps = createMemoryAffiliateDeps();
    const user = deps.store.addUser({ clerkId: "new_tutor", role: "student", firstName: "Lee" });
    deps.setSubscription(user.id, "active");

    expect(
      await activateAffiliateTutor(
        deps,
        { clerkId: "new_tutor" },
        NOW,
        fixedBytes([0, 0, 0, 0, 1, 1, 1, 1])
      )
    ).toEqual({ ok: true });
    expect(user.role).toBe("affiliate_tutor");
    const overview = await getAffiliateOverview(deps, "new_tutor");
    expect(overview).toMatchObject({ access: "active", code: "AAAA-BBBB" });
    expect(overview?.seats).toEqual({ used: 0, limit: 50, remaining: 50, full: false });
  });

  it("is safe to run twice", async () => {
    const deps = createMemoryAffiliateDeps();
    const user = deps.store.addUser({ clerkId: "new_tutor", role: "student" });
    deps.setSubscription(user.id, "trialing");
    await activateAffiliateTutor(
      deps,
      { clerkId: "new_tutor" },
      NOW,
      fixedBytes([0, 0, 0, 0, 1, 1, 1, 1])
    );
    await activateAffiliateTutor(
      deps,
      { clerkId: "new_tutor" },
      NOW,
      fixedBytes([2, 2, 2, 2, 3, 3, 3, 3])
    );
    expect((await getAffiliateOverview(deps, "new_tutor"))?.code).toBe("AAAA-BBBB");
  });

  it("waits while the first payment hasn't gone through", async () => {
    const deps = createMemoryAffiliateDeps();
    const user = deps.store.addUser({ clerkId: "pending_tutor", role: "student" });
    deps.setSubscription(user.id, "incomplete");
    expect(await activateAffiliateTutor(deps, { clerkId: "pending_tutor" }, NOW)).toEqual({
      ok: false,
      reason: "not_paid",
    });
    expect(user.role).toBe("student");
  });

  it.each(["parent", "tutor"])("won't turn a %s account into an affiliate tutor", async (role) => {
    const deps = createMemoryAffiliateDeps();
    const user = deps.store.addUser({ clerkId: "someone", role });
    deps.setSubscription(user.id, "active");
    expect(await activateAffiliateTutor(deps, { clerkId: "someone" }, NOW)).toEqual({
      ok: false,
      reason: "wrong_account",
    });
    expect(user.role).toBe(role);
  });
});
