// @vitest-environment jsdom

// ============================================================
// Component test — ImpersonationMenu.
//
// Behavior covered:
//   - Closed by default; clicking the "View as" button opens it.
//   - Three role options render in the menu.
//   - Clicking a role option fires actionSetImpersonation(role)
//     with the matching string.
//   - Clicking outside the menu closes it.
//
// actionSetImpersonation is stubbed so we don't try to reach a
// real server action from inside jsdom.
// ============================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImpersonationMenu from "./ImpersonationMenu";

const setImpersonationMock = vi.fn();
vi.mock("@/app/admin/impersonation-actions", () => ({
  actionSetImpersonation: (...args: unknown[]) => setImpersonationMock(...args),
}));

describe("ImpersonationMenu", () => {
  beforeEach(() => {
    setImpersonationMock.mockReset();
  });

  it("is closed by default — no menu role visible", () => {
    render(<ImpersonationMenu />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens when the View-as button is clicked", async () => {
    render(<ImpersonationMenu />);
    await userEvent.click(screen.getByRole("button", { name: /View as/i }));
    expect(screen.getByRole("menu")).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "student" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "tutor" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "parent" })).toBeVisible();
  });

  it("calls actionSetImpersonation with the chosen role", async () => {
    render(<ImpersonationMenu />);
    await userEvent.click(screen.getByRole("button", { name: /View as/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: "tutor" }));
    expect(setImpersonationMock).toHaveBeenCalledExactlyOnceWith("tutor");
  });

  it("closes when a role option is picked", async () => {
    render(<ImpersonationMenu />);
    await userEvent.click(screen.getByRole("button", { name: /View as/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: "student" }));
    // After selection, the menu unmounts.
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when the user clicks outside", async () => {
    render(
      <div>
        <ImpersonationMenu />
        <div data-testid="outside">somewhere else</div>
      </div>
    );
    await userEvent.click(screen.getByRole("button", { name: /View as/i }));
    expect(screen.getByRole("menu")).toBeVisible();
    await userEvent.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders the 'Real role stays admin' footer copy as a reassurance", async () => {
    render(<ImpersonationMenu />);
    await userEvent.click(screen.getByRole("button", { name: /View as/i }));
    expect(screen.getByText(/Real role stays admin/i)).toBeVisible();
  });
});
