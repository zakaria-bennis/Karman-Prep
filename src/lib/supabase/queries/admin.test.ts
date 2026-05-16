import { describe, it, expect } from "vitest";
import { chooseEffectiveClerkId } from "./admin";

// ============================================================
// chooseEffectiveClerkId — pure decision logic extracted from
// resolveEffectiveClerkId. Covers every branch of the impersonation
// router that's used in ~58 places across the app for read-side
// scoping. Tests use plain inputs (no Supabase / cookie mocks).
// ============================================================

const ADMIN = "admin_real_123";
const STUDENT = "student_target_456";

describe("chooseEffectiveClerkId", () => {
  it("non-admin caller → real clerk id, no impersonation", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "student",
        targetUserId: "any-uuid",
        target: { clerk_id: STUDENT, role: "student" },
      })
    ).toEqual({
      clerkId: ADMIN,
      isImpersonating: false,
      realClerkId: null,
    });
  });

  it("admin with no cookie → real clerk id, no impersonation", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "admin",
        targetUserId: undefined,
        target: null,
      })
    ).toEqual({
      clerkId: ADMIN,
      isImpersonating: false,
      realClerkId: null,
    });
  });

  it("admin with cookie pointing to a deleted user → fall back to real", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "admin",
        targetUserId: "ghost-uuid",
        target: null,
      })
    ).toEqual({
      clerkId: ADMIN,
      isImpersonating: false,
      realClerkId: null,
    });
  });

  it("admin trying to impersonate another admin → refused, fall back to real", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "admin",
        targetUserId: "other-admin-uuid",
        target: { clerk_id: "other_admin", role: "admin" },
      })
    ).toEqual({
      clerkId: ADMIN,
      isImpersonating: false,
      realClerkId: null,
    });
  });

  it("admin impersonating a student → returns student's clerk id with realClerkId tracked", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "admin",
        targetUserId: "student-uuid",
        target: { clerk_id: STUDENT, role: "student" },
      })
    ).toEqual({
      clerkId: STUDENT,
      isImpersonating: true,
      realClerkId: ADMIN,
    });
  });

  it("admin impersonating a tutor → tutor clerk id with realClerkId tracked", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "admin",
        targetUserId: "tutor-uuid",
        target: { clerk_id: "tutor_target", role: "tutor" },
      })
    ).toEqual({
      clerkId: "tutor_target",
      isImpersonating: true,
      realClerkId: ADMIN,
    });
  });

  it("admin impersonating a parent → parent clerk id with realClerkId tracked", () => {
    expect(
      chooseEffectiveClerkId({
        realClerkId: ADMIN,
        realRole: "admin",
        targetUserId: "parent-uuid",
        target: { clerk_id: "parent_target", role: "parent" },
      })
    ).toEqual({
      clerkId: "parent_target",
      isImpersonating: true,
      realClerkId: ADMIN,
    });
  });

  it("user with no role (null) → treat as non-admin, no impersonation", () => {
    // Edge case: clerk id exists but no user row yet. Should never
    // be able to impersonate.
    expect(
      chooseEffectiveClerkId({
        realClerkId: "unknown_user",
        realRole: null,
        targetUserId: "any",
        target: { clerk_id: STUDENT, role: "student" },
      })
    ).toEqual({
      clerkId: "unknown_user",
      isImpersonating: false,
      realClerkId: null,
    });
  });
});
