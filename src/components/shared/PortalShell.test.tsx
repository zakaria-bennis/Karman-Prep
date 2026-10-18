// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PortalShell from "./PortalShell";

let path = "/dashboard/student";
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("./ThemeSelector", () => ({ ThemeSelector: () => <button>Appearance</button> }));
afterEach(cleanup);

describe("role workspace navigation", () => {
  it("marks only the most specific student route current and keeps destination labels", () => {
    path = "/dashboard/student/quizzes/attempt";
    render(<PortalShell area="student">Saved answers</PortalShell>);
    const nav = within(screen.getByRole("navigation", { name: "Student workspace" }));
    expect(nav.getByRole("link", { name: "Quiz history" }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(nav.getByRole("link", { name: "Your week" }).getAttribute("aria-current")).toBeNull();
    expect(nav.getByRole("link", { name: "Daily practice" }).getAttribute("href")).toBe(
      "/learn/daily"
    );
    expect(
      screen.getByRole("button", { name: "Open navigation" }).getAttribute("aria-haspopup")
    ).toBe("dialog");
  });
  it("makes educator payment and scheduling destinations discoverable without changing actions", () => {
    path = "/tutor/settings/payment";
    render(<PortalShell area="tutor">Settings</PortalShell>);
    const nav = within(screen.getByRole("navigation", { name: "Educator workspace" }));
    expect(nav.getByRole("link", { name: "Payment settings" }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(nav.getByRole("link", { name: "Payouts" }).getAttribute("href")).toBe("/tutor/payouts");
    expect(nav.getByRole("link", { name: "Booking settings" }).getAttribute("href")).toBe(
      "/tutor/settings/booking"
    );
  });
  it("keeps rapid question review and operational jobs reachable in admin", () => {
    path = "/admin/questions/preview/rapid";
    render(<PortalShell area="admin">Questions</PortalShell>);
    const nav = within(screen.getByRole("navigation", { name: "Admin workspace" }));
    expect(nav.getByRole("link", { name: "Rapid student view" }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(
      nav.getByRole("link", { name: "Question preview" }).getAttribute("aria-current")
    ).toBeNull();
    expect(nav.getByRole("link", { name: "Import jobs" }).getAttribute("href")).toBe(
      "/admin/pdf-pipeline/jobs"
    );
  });
});
