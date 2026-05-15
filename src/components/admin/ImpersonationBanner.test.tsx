// @vitest-environment jsdom

// ============================================================
// Component test — ImpersonationBanner.
//
// Covers the prop matrix the banner has to handle:
//   - generic role-only impersonation (no userName): shows the
//     role as the prominent label.
//   - granular per-user impersonation (audit issue #17): shows
//     the userName as the prominent label and the role as a
//     pill.
//   - exit (×) button always renders + is reachable by its
//     accessible label.
//
// The actionClearImpersonation server action is stubbed — these
// tests only assert what the banner renders, not the redirect.
// ============================================================

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ImpersonationBanner from "./ImpersonationBanner";

// The banner imports a server-action. In a DOM-only render it'd
// blow up trying to talk to Next. Stub it out.
vi.mock("@/app/admin/impersonation-actions", () => ({
  actionClearImpersonation: vi.fn(),
}));

describe("ImpersonationBanner", () => {
  it("renders role-only mode with the role as the prominent label", () => {
    render(<ImpersonationBanner role="student" />);
    expect(screen.getByText("Admin viewing as")).toBeVisible();
    expect(screen.getByText("student")).toBeVisible();
  });

  it("renders granular mode with userName as the prominent label and role as a pill", () => {
    render(<ImpersonationBanner role="student" userName="Mid Student" />);
    expect(screen.getByText("Admin viewing as")).toBeVisible();
    expect(screen.getByText("Mid Student")).toBeVisible();
    // Role still rendered, just demoted to the pill.
    expect(screen.getByText("student")).toBeVisible();
  });

  it("falls back to role-only when userName is null", () => {
    render(<ImpersonationBanner role="tutor" userName={null} />);
    expect(screen.getByText("tutor")).toBeVisible();
    // No second occurrence of the role text (no pill).
    expect(screen.getAllByText("tutor")).toHaveLength(1);
  });

  it("renders an accessible exit button regardless of mode", () => {
    render(<ImpersonationBanner role="parent" userName="Jane" />);
    expect(screen.getByRole("button", { name: /Exit impersonation/i })).toBeVisible();
  });

  it("does not crash on a very long userName (regression guard)", () => {
    const longName = "A".repeat(120);
    render(<ImpersonationBanner role="student" userName={longName} />);
    expect(screen.getByText(longName)).toBeVisible();
  });
});
