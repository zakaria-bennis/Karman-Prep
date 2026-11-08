// In-memory affiliate dependencies for unit tests. The store mirrors the
// database invariants from 20261108043000_tutor_affiliate.sql: one live
// code per tutor, one live link per student, and the per-tutor seat cap.
// Billing and grants stand in for the pricing session's src/lib/plans/.

import {
  CodeTakenError,
  SeatLimitReachedError,
  StudentAlreadyLinkedError,
  type AffiliateBilling,
  type AffiliateCode,
  type AffiliateDeps,
  type AffiliateGrants,
  type AffiliateLink,
  type AffiliateRecord,
  type AffiliateStore,
  type AffiliateUser,
  type TutorSubscription,
} from "@/lib/tutor-affiliate/types";
import type { HomeworkItem, HomeworkStore } from "@/lib/tutor-affiliate/homework";

export interface MemoryAffiliateStore extends AffiliateStore {
  addUser(input: Partial<AffiliateUser> & { clerkId: string; role: string }): AffiliateUser;
  addAffiliate(input: Partial<AffiliateRecord> & { tutorUserId: string }): AffiliateRecord;
  addCode(affiliateId: string, code: string): AffiliateCode;
  failNextInsertWith(error: Error): void;
  links: AffiliateLink[];
  users: AffiliateUser[];
}

export function createMemoryAffiliateStore(): MemoryAffiliateStore {
  const users: AffiliateUser[] = [];
  const affiliates: AffiliateRecord[] = [];
  const codes: AffiliateCode[] = [];
  const links: AffiliateLink[] = [];
  let nextInsertError: Error | null = null;
  let seq = 0;
  const id = (prefix: string) => `${prefix}-${++seq}`;

  return {
    users,
    links,
    addUser(input) {
      const user: AffiliateUser = {
        id: input.id ?? id("user"),
        clerkId: input.clerkId,
        role: input.role,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        email: input.email ?? `${input.clerkId}@example.test`,
      };
      users.push(user);
      return user;
    },
    addAffiliate(input) {
      const record: AffiliateRecord = {
        id: input.id ?? id("aff"),
        tutorUserId: input.tutorUserId,
        seatLimit: input.seatLimit ?? 50,
      };
      affiliates.push(record);
      return record;
    },
    addCode(affiliateId, code) {
      const row: AffiliateCode = {
        id: id("code"),
        affiliateId,
        code,
        createdAt: "2026-11-01T00:00:00.000Z",
        retiredAt: null,
      };
      codes.push(row);
      return row;
    },
    failNextInsertWith(error) {
      nextInsertError = error;
    },

    async userByClerkId(clerkId) {
      return users.find((u) => u.clerkId === clerkId) ?? null;
    },
    async usersByIds(ids) {
      return users.filter((u) => ids.includes(u.id));
    },
    async setUserRole(userId, role) {
      const user = users.find((u) => u.id === userId);
      if (user) user.role = role;
    },
    async affiliateById(affiliateId) {
      return affiliates.find((a) => a.id === affiliateId) ?? null;
    },
    async affiliateByTutor(tutorUserId) {
      return affiliates.find((a) => a.tutorUserId === tutorUserId) ?? null;
    },
    async ensureAffiliate(tutorUserId) {
      const existing = affiliates.find((a) => a.tutorUserId === tutorUserId);
      if (existing) return existing;
      const record: AffiliateRecord = { id: id("aff"), tutorUserId, seatLimit: 50 };
      affiliates.push(record);
      return record;
    },
    async liveCodeByValue(code) {
      return codes.find((c) => c.code === code && c.retiredAt === null) ?? null;
    },
    async liveCodeForAffiliate(affiliateId) {
      return codes.find((c) => c.affiliateId === affiliateId && c.retiredAt === null) ?? null;
    },
    async replaceLiveCode(affiliateId, code, at) {
      if (codes.some((c) => c.code === code)) throw new CodeTakenError();
      for (const c of codes) {
        if (c.affiliateId === affiliateId && c.retiredAt === null) c.retiredAt = at;
      }
      const row: AffiliateCode = {
        id: id("code"),
        affiliateId,
        code,
        createdAt: at,
        retiredAt: null,
      };
      codes.push(row);
      return row;
    },
    async liveLinksForAffiliate(affiliateId) {
      return links.filter((l) => l.affiliateId === affiliateId && l.removedAt === null);
    },
    async liveLinkForStudent(studentUserId) {
      return links.find((l) => l.studentUserId === studentUserId && l.removedAt === null) ?? null;
    },
    async latestLinkForStudent(studentUserId) {
      const mine = links.filter((l) => l.studentUserId === studentUserId);
      return mine.length ? mine[mine.length - 1] : null;
    },
    async tutorRemovedStudentFromCode(studentUserId, codeId) {
      return links.some(
        (l) =>
          l.studentUserId === studentUserId &&
          l.codeId === codeId &&
          (l.removedBy === "tutor" || l.removedBy === "admin")
      );
    },
    async insertLink(input) {
      if (nextInsertError) {
        const error = nextInsertError;
        nextInsertError = null;
        throw error;
      }
      if (links.some((l) => l.studentUserId === input.studentUserId && l.removedAt === null)) {
        throw new StudentAlreadyLinkedError();
      }
      const affiliate = affiliates.find((a) => a.id === input.affiliateId);
      const live = links.filter((l) => l.affiliateId === input.affiliateId && l.removedAt === null);
      if (!affiliate || live.length >= affiliate.seatLimit) throw new SeatLimitReachedError();
      const link: AffiliateLink = {
        id: id("link"),
        affiliateId: input.affiliateId,
        codeId: input.codeId,
        studentUserId: input.studentUserId,
        redeemedAt: input.at,
        removedAt: null,
        removedBy: null,
        studentNoticeSeenAt: null,
      };
      links.push(link);
      return link;
    },
    async endLink(linkId, removedBy, at) {
      const link = links.find((l) => l.id === linkId);
      if (link && link.removedAt === null) {
        link.removedAt = at;
        link.removedBy = removedBy;
      }
    },
    async markNoticeSeen(linkId, at) {
      const link = links.find((l) => l.id === linkId);
      if (link) link.studentNoticeSeenAt = at;
    },
  };
}

export interface MemoryAffiliateDeps extends AffiliateDeps {
  store: MemoryAffiliateStore;
  /** Set (or clear with null) a tutor's tutor-affiliate subscription status. */
  setSubscription(tutorUserId: string, status: string | null): void;
  /** Practice grants currently held, by redemption id. */
  activeGrants: Map<string, { studentUserId: string; tutorUserId: string }>;
}

export function createMemoryAffiliateDeps(): MemoryAffiliateDeps {
  const store = createMemoryAffiliateStore();
  const subscriptions = new Map<string, TutorSubscription>();
  const activeGrants = new Map<string, { studentUserId: string; tutorUserId: string }>();

  const billing: AffiliateBilling = {
    async subscriptionFor(tutorUserId) {
      return subscriptions.get(tutorUserId) ?? null;
    },
  };
  const grants: AffiliateGrants = {
    async grant(input) {
      activeGrants.set(input.redemptionId, {
        studentUserId: input.studentUserId,
        tutorUserId: input.tutorUserId,
      });
    },
    async revoke(input) {
      activeGrants.delete(input.redemptionId);
    },
  };

  return {
    store,
    billing,
    grants,
    activeGrants,
    setSubscription(tutorUserId, status) {
      if (status === null) subscriptions.delete(tutorUserId);
      else
        subscriptions.set(tutorUserId, {
          status,
          currentPeriodEnd: "2026-12-08T12:00:00.000Z",
          cancelAtPeriodEnd: false,
        });
    },
  };
}

export function createMemoryHomeworkStore(): HomeworkStore {
  const items: HomeworkItem[] = [];
  let seq = 0;
  return {
    async insert(input) {
      const item: HomeworkItem = {
        ...input,
        id: `hw-${++seq}`,
        status: "assigned",
        completedAt: null,
        cancelledAt: null,
        createdAt: input.createdAt,
      };
      items.push(item);
      return item;
    },
    async byId(id) {
      return items.find((i) => i.id === id) ?? null;
    },
    async listForStudent(studentUserId) {
      return items.filter((i) => i.studentUserId === studentUserId);
    },
    async cancel(id, at) {
      const item = items.find((i) => i.id === id && i.status === "assigned");
      if (item) {
        item.status = "cancelled";
        item.cancelledAt = at;
      }
    },
    async cancelOpenFromAssigner(studentUserId, assignedByUserId, at) {
      let count = 0;
      for (const item of items) {
        if (
          item.studentUserId === studentUserId &&
          item.assignedByUserId === assignedByUserId &&
          item.status === "assigned"
        ) {
          item.status = "cancelled";
          item.cancelledAt = at;
          count += 1;
        }
      }
      return count;
    },
  };
}
