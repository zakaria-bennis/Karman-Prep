// ============================================================
// Tutor affiliate plan — the decisions, over injected ports.
// Every caller passes identities resolved on the server; nothing
// here trusts a submitted role, tutor ID or seat count.
// ============================================================

import {
  affiliateAccess,
  affiliateCapabilities,
  generateAffiliateCode,
  normalizeAffiliateCode,
  seatSummary,
  type AffiliateAccess,
  type AffiliateCapability,
  type SeatSummary,
} from "./rules";
import {
  CodeTakenError,
  SeatLimitReachedError,
  StudentAlreadyLinkedError,
  type AffiliateDeps,
  type AffiliateLink,
  type AffiliateRecord,
  type AffiliateStore,
  type AffiliateUser,
  type TutorSubscription,
} from "./types";

type RandomBytes = (length: number) => Uint8Array;

/** "Maya R." — first name and last initial, never the email. */
export function tutorDisplayName(
  user: Pick<AffiliateUser, "firstName" | "lastName"> | null
): string {
  const first = user?.firstName?.trim();
  const last = user?.lastName?.trim();
  if (first && last) return `${first} ${last[0].toUpperCase()}.`;
  return first || "Your tutor";
}

async function tutorNameFor(store: AffiliateStore, affiliate: AffiliateRecord): Promise<string> {
  const [tutor] = await store.usersByIds([affiliate.tutorUserId]);
  return tutorDisplayName(tutor ?? null);
}

async function accessFor(
  deps: AffiliateDeps,
  affiliate: AffiliateRecord
): Promise<AffiliateAccess> {
  return affiliateAccess(await deps.billing.subscriptionFor(affiliate.tutorUserId));
}

/** End a link and take back the Practice grant it carried. */
async function endLinkAndGrant(
  deps: AffiliateDeps,
  link: AffiliateLink,
  removedBy: "tutor" | "student" | "admin",
  now: Date
): Promise<void> {
  await deps.store.endLink(link.id, removedBy, now.toISOString());
  await deps.grants.revoke({ studentUserId: link.studentUserId, redemptionId: link.id });
}

// ── Redeeming ─────────────────────────────────────────────────

export type RedeemResult =
  | { ok: true; status: "joined" | "already_joined" | "switched"; tutorName: string }
  | { ok: false; reason: "invalid_code" | "no_account" | "not_student" }
  | { ok: false; reason: "tutor_inactive" | "full" | "removed_by_tutor"; tutorName: string }
  | { ok: false; reason: "linked_elsewhere"; tutorName: string; currentTutorName: string };

export async function redeemAffiliateCode(
  deps: AffiliateDeps,
  input: { studentClerkId: string; rawCode: string; switchTutor?: boolean },
  now: Date = new Date()
): Promise<RedeemResult> {
  const { store } = deps;
  const code = normalizeAffiliateCode(input.rawCode);
  if (!code) return { ok: false, reason: "invalid_code" };

  const student = await store.userByClerkId(input.studentClerkId);
  if (!student) return { ok: false, reason: "no_account" };
  if (student.role !== "student") return { ok: false, reason: "not_student" };

  const codeRow = await store.liveCodeByValue(code);
  if (!codeRow) return { ok: false, reason: "invalid_code" };
  const affiliate = await store.affiliateById(codeRow.affiliateId);
  if (!affiliate) return { ok: false, reason: "invalid_code" };
  const tutorName = await tutorNameFor(store, affiliate);

  if ((await accessFor(deps, affiliate)) !== "active") {
    return { ok: false, reason: "tutor_inactive", tutorName };
  }

  const existing = await store.liveLinkForStudent(student.id);
  if (existing?.affiliateId === affiliate.id) {
    return { ok: true, status: "already_joined", tutorName };
  }
  if (await store.tutorRemovedStudentFromCode(student.id, codeRow.id)) {
    return { ok: false, reason: "removed_by_tutor", tutorName };
  }
  // Check the cap before touching any existing link, so a student never
  // leaves one tutor for a group that turns out to be full.
  const live = await store.liveLinksForAffiliate(affiliate.id);
  if (live.length >= affiliate.seatLimit) return { ok: false, reason: "full", tutorName };

  let status: "joined" | "switched" = "joined";
  if (existing) {
    if (!input.switchTutor) {
      const current = await store.affiliateById(existing.affiliateId);
      const currentTutorName = current ? await tutorNameFor(store, current) : "another tutor";
      return { ok: false, reason: "linked_elsewhere", tutorName, currentTutorName };
    }
    await endLinkAndGrant(deps, existing, "student", now);
    status = "switched";
  }

  let link: AffiliateLink;
  try {
    link = await store.insertLink({
      affiliateId: affiliate.id,
      codeId: codeRow.id,
      studentUserId: student.id,
      at: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof SeatLimitReachedError) return { ok: false, reason: "full", tutorName };
    if (error instanceof StudentAlreadyLinkedError) {
      const winner = await store.liveLinkForStudent(student.id);
      if (winner?.affiliateId === affiliate.id) {
        return { ok: true, status: "already_joined", tutorName };
      }
      return {
        ok: false,
        reason: "linked_elsewhere",
        tutorName,
        currentTutorName: "another tutor",
      };
    }
    throw error;
  }

  try {
    await deps.grants.grant({
      studentUserId: student.id,
      tutorUserId: affiliate.tutorUserId,
      redemptionId: link.id,
    });
  } catch (error) {
    // Never leave a student linked (and holding a seat) without the plan.
    await store.endLink(link.id, "student", now.toISOString());
    throw error;
  }
  return { ok: true, status, tutorName };
}

export async function leaveAffiliateTutor(
  deps: AffiliateDeps,
  input: { studentClerkId: string },
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; reason: "not_linked" }> {
  const student = await deps.store.userByClerkId(input.studentClerkId);
  const link = student ? await deps.store.liveLinkForStudent(student.id) : null;
  if (!link) return { ok: false, reason: "not_linked" };
  await endLinkAndGrant(deps, link, "student", now);
  return { ok: true };
}

// ── Student-facing state ──────────────────────────────────────

export type StudentAffiliateStatus =
  | { state: "none" }
  | { state: "active" | "lapsed"; tutorName: string; joinedAt: string; linkId: string }
  | { state: "removed"; tutorName: string; removedAt: string; noticeSeen: boolean; linkId: string };

export async function getStudentAffiliateStatus(
  deps: AffiliateDeps,
  studentClerkId: string
): Promise<StudentAffiliateStatus> {
  const { store } = deps;
  const student = await store.userByClerkId(studentClerkId);
  if (!student) return { state: "none" };

  const live = await store.liveLinkForStudent(student.id);
  if (live) {
    const affiliate = await store.affiliateById(live.affiliateId);
    if (!affiliate) return { state: "none" };
    return {
      state: await accessFor(deps, affiliate),
      tutorName: await tutorNameFor(store, affiliate),
      joinedAt: live.redeemedAt,
      linkId: live.id,
    };
  }

  const latest = await store.latestLinkForStudent(student.id);
  if (latest?.removedAt && (latest.removedBy === "tutor" || latest.removedBy === "admin")) {
    const affiliate = await store.affiliateById(latest.affiliateId);
    return {
      state: "removed",
      tutorName: affiliate ? await tutorNameFor(store, affiliate) : "Your tutor",
      removedAt: latest.removedAt,
      noticeSeen: latest.studentNoticeSeenAt !== null,
      linkId: latest.id,
    };
  }
  return { state: "none" };
}

// ── Tutor rights over a student ───────────────────────────────

export interface AffiliateManagement {
  allowed: boolean;
  capabilities: ReadonlySet<AffiliateCapability>;
  access: AffiliateAccess | null;
  link: AffiliateLink | null;
  student: AffiliateUser | null;
}

const NO_RIGHTS: ReadonlySet<AffiliateCapability> = new Set();

/**
 * The single permission check for an affiliate tutor acting on a
 * student. A tutor reaches only students linked to their own code;
 * an admin reaches any linked student.
 */
export async function resolveAffiliateManagement(
  deps: AffiliateDeps,
  input: { actorClerkId: string; studentClerkId: string }
): Promise<AffiliateManagement> {
  const { store } = deps;
  const [actor, student] = await Promise.all([
    store.userByClerkId(input.actorClerkId),
    store.userByClerkId(input.studentClerkId),
  ]);
  const denied: AffiliateManagement = {
    allowed: false,
    capabilities: NO_RIGHTS,
    access: null,
    link: null,
    student,
  };
  if (!actor || !student || student.role !== "student") return denied;

  const link = await store.liveLinkForStudent(student.id);
  if (!link) return denied;
  const affiliate = await store.affiliateById(link.affiliateId);
  if (!affiliate) return denied;

  if (actor.role === "admin") {
    const access = await accessFor(deps, affiliate);
    return { allowed: true, capabilities: affiliateCapabilities("active"), access, link, student };
  }
  if (actor.role === "affiliate_tutor" && affiliate.tutorUserId === actor.id) {
    const access = await accessFor(deps, affiliate);
    return { allowed: true, capabilities: affiliateCapabilities(access), access, link, student };
  }
  return denied;
}

export async function removeAffiliateStudent(
  deps: AffiliateDeps,
  input: { actorClerkId: string; studentUserId: string },
  now: Date = new Date()
): Promise<{ affiliateId: string }> {
  const { store } = deps;
  const notYours = new Error("This student is not in your group.");
  const actor = await store.userByClerkId(input.actorClerkId);
  const link = await store.liveLinkForStudent(input.studentUserId);
  if (!actor || !link) throw notYours;

  if (actor.role === "admin") {
    await endLinkAndGrant(deps, link, "admin", now);
    return { affiliateId: link.affiliateId };
  }
  const affiliate =
    actor.role === "affiliate_tutor" ? await store.affiliateByTutor(actor.id) : null;
  if (!affiliate || affiliate.id !== link.affiliateId) throw notYours;
  // Removal stays allowed while lapsed (affiliateCapabilities keeps "remove").
  await endLinkAndGrant(deps, link, "tutor", now);
  return { affiliateId: affiliate.id };
}

async function issueCode(
  store: AffiliateStore,
  affiliateId: string,
  now: Date,
  randomBytes?: RandomBytes
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateAffiliateCode(randomBytes);
    try {
      await store.replaceLiveCode(affiliateId, code, now.toISOString());
      return code;
    } catch (error) {
      if (!(error instanceof CodeTakenError)) throw error;
    }
  }
  throw new Error("Couldn't make a new code. Please try again.");
}

export async function regenerateAffiliateCode(
  deps: AffiliateDeps,
  input: { tutorClerkId: string },
  now: Date = new Date(),
  randomBytes?: RandomBytes
): Promise<string> {
  const tutor = await deps.store.userByClerkId(input.tutorClerkId);
  const affiliate = tutor ? await deps.store.affiliateByTutor(tutor.id) : null;
  if (!affiliate) throw new Error("You don't have the tutor plan yet.");
  if (!affiliateCapabilities(await accessFor(deps, affiliate)).has("regenerate_code")) {
    throw new Error("Your plan is not active, so the code can't change.");
  }
  return issueCode(deps.store, affiliate.id, now, randomBytes);
}

// ── Tutor overview ────────────────────────────────────────────

export interface AffiliateOverview {
  affiliate: AffiliateRecord;
  subscription: TutorSubscription | null;
  access: AffiliateAccess;
  capabilities: ReadonlySet<AffiliateCapability>;
  code: string | null;
  seats: SeatSummary;
  students: Array<{ link: AffiliateLink; student: AffiliateUser }>;
}

export async function getAffiliateOverview(
  deps: AffiliateDeps,
  tutorClerkId: string
): Promise<AffiliateOverview | null> {
  const { store } = deps;
  const tutor = await store.userByClerkId(tutorClerkId);
  const affiliate = tutor ? await store.affiliateByTutor(tutor.id) : null;
  if (!affiliate) return null;

  const [subscription, codeRow, links] = await Promise.all([
    deps.billing.subscriptionFor(affiliate.tutorUserId),
    store.liveCodeForAffiliate(affiliate.id),
    store.liveLinksForAffiliate(affiliate.id),
  ]);
  const users = await store.usersByIds(links.map((l) => l.studentUserId));
  const byId = new Map(users.map((u) => [u.id, u]));
  const access = affiliateAccess(subscription);

  return {
    affiliate,
    subscription,
    access,
    capabilities: affiliateCapabilities(access),
    code: codeRow?.code ?? null,
    seats: seatSummary(links.length, affiliate.seatLimit),
    students: links
      .flatMap((link) => {
        const student = byId.get(link.studentUserId);
        return student ? [{ link, student }] : [];
      })
      .sort((a, b) => a.link.redeemedAt.localeCompare(b.link.redeemedAt)),
  };
}

// ── Activation after checkout ─────────────────────────────────

export type ActivationResult =
  | { ok: true }
  | { ok: false; reason: "no_account" | "not_paid" | "wrong_account" };

/**
 * Once the tutor-affiliate subscription is paid, a new (student-role)
 * account becomes an affiliate tutor and gets its first code.
 * Idempotent: running it again changes nothing.
 */
export async function activateAffiliateTutor(
  deps: AffiliateDeps,
  input: { clerkId: string },
  now: Date = new Date(),
  randomBytes?: RandomBytes
): Promise<ActivationResult> {
  const { store } = deps;
  const user = await store.userByClerkId(input.clerkId);
  if (!user) return { ok: false, reason: "no_account" };
  if (user.role !== "student" && user.role !== "affiliate_tutor") {
    return { ok: false, reason: "wrong_account" };
  }
  if (affiliateAccess(await deps.billing.subscriptionFor(user.id)) !== "active") {
    return { ok: false, reason: "not_paid" };
  }
  if (user.role === "student") await store.setUserRole(user.id, "affiliate_tutor");
  const affiliate = await store.ensureAffiliate(user.id);
  if (!(await store.liveCodeForAffiliate(affiliate.id))) {
    await issueCode(store, affiliate.id, now, randomBytes);
  }
  return { ok: true };
}
