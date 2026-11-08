// ============================================================
// Tutor affiliate plan — shared types and the three ports:
//   · AffiliateStore   — codes and links (./store.ts, Supabase)
//   · AffiliateBilling — the tutor's $199 subscription
//   · AffiliateGrants  — the student's free Practice plan
// Billing and grants belong to the pricing session's
// src/lib/plans/; ./plan-bridge.ts adapts them. Tests use
// in-memory versions (src/test/tutor-affiliate-memory-store.ts).
// ============================================================

export interface AffiliateUser {
  /** users.id (uuid) */
  id: string;
  clerkId: string;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

/** One row per affiliate tutor; the lock row for the seat cap. */
export interface AffiliateRecord {
  id: string;
  tutorUserId: string;
  seatLimit: number;
}

/** The tutor's tutor-affiliate subscription, as the pricing session stores it. */
export interface TutorSubscription {
  /** Stripe subscription status: active, trialing, past_due, canceled… */
  status: string;
  currentPeriodEnd: string | null;
}

export interface AffiliateCode {
  id: string;
  affiliateId: string;
  code: string;
  createdAt: string;
  retiredAt: string | null;
}

export type LinkRemover = "tutor" | "student" | "admin";

/** A redemption: the tutor-to-student link. */
export interface AffiliateLink {
  id: string;
  affiliateId: string;
  codeId: string;
  studentUserId: string;
  redeemedAt: string;
  removedAt: string | null;
  removedBy: LinkRemover | null;
  studentNoticeSeenAt: string | null;
}

/** The database refused a link because the tutor's seats are full. */
export class SeatLimitReachedError extends Error {
  constructor() {
    super("This tutor's group is full.");
    this.name = "SeatLimitReachedError";
  }
}

/** The database refused a link because the student already has one. */
export class StudentAlreadyLinkedError extends Error {
  constructor() {
    super("This student already belongs to a tutor's group.");
    this.name = "StudentAlreadyLinkedError";
  }
}

/** A freshly generated code collided with an existing one. */
export class CodeTakenError extends Error {
  constructor() {
    super("That code is already taken.");
    this.name = "CodeTakenError";
  }
}

export interface AffiliateStore {
  userByClerkId(clerkId: string): Promise<AffiliateUser | null>;
  usersByIds(ids: readonly string[]): Promise<AffiliateUser[]>;
  setUserRole(userId: string, role: "affiliate_tutor"): Promise<void>;

  affiliateById(id: string): Promise<AffiliateRecord | null>;
  affiliateByTutor(tutorUserId: string): Promise<AffiliateRecord | null>;
  /** The tutor's row, created on first use. */
  ensureAffiliate(tutorUserId: string): Promise<AffiliateRecord>;

  liveCodeByValue(code: string): Promise<AffiliateCode | null>;
  liveCodeForAffiliate(affiliateId: string): Promise<AffiliateCode | null>;
  /** Retire the live code (if any) and store `code` as the new live one. Throws CodeTakenError. */
  replaceLiveCode(affiliateId: string, code: string, at: string): Promise<AffiliateCode>;

  liveLinksForAffiliate(affiliateId: string): Promise<AffiliateLink[]>;
  liveLinkForStudent(studentUserId: string): Promise<AffiliateLink | null>;
  latestLinkForStudent(studentUserId: string): Promise<AffiliateLink | null>;
  tutorRemovedStudentFromCode(studentUserId: string, codeId: string): Promise<boolean>;
  /** Throws SeatLimitReachedError or StudentAlreadyLinkedError. */
  insertLink(input: {
    affiliateId: string;
    codeId: string;
    studentUserId: string;
    at: string;
  }): Promise<AffiliateLink>;
  endLink(linkId: string, removedBy: LinkRemover, at: string): Promise<void>;
  markNoticeSeen(linkId: string, at: string): Promise<void>;
}

export interface AffiliateBilling {
  subscriptionFor(tutorUserId: string): Promise<TutorSubscription | null>;
}

export interface AffiliateGrants {
  /** Give the student Practice, sponsored by the tutor. Idempotent per redemption. */
  grant(input: { studentUserId: string; tutorUserId: string; redemptionId: string }): Promise<void>;
  revoke(input: { studentUserId: string; redemptionId: string }): Promise<void>;
}

export interface AffiliateDeps {
  store: AffiliateStore;
  billing: AffiliateBilling;
  grants: AffiliateGrants;
}
