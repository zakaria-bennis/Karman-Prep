// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/components/shared/ThemeProvider", () => ({
  useTheme: () => ({ toggleMode: vi.fn(), saving: false }),
}));

afterEach(cleanup);

describe("floating theme control", () => {
  it("stays clear of student and parent portals, whose layouts supply theme controls", () => {
    for (const route of [
      "/dashboard/student",
      "/dashboard/student/schedule",
      "/dashboard/parent",
      "/dashboard/parent/child-id",
    ]) {
      pathname = route;
      const view = render(<ThemeToggle floating />);
      expect(screen.queryByRole("button", { name: "Toggle light and dark mode" })).toBeNull();
      view.unmount();
    }
  });

  it("remains available on routes without a portal theme control", () => {
    pathname = "/learn";
    render(<ThemeToggle floating />);
    expect(screen.getByRole("button", { name: "Toggle light and dark mode" })).toBeTruthy();
  });
});
