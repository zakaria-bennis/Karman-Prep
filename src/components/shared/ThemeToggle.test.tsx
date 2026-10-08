// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import Navbar from "@/components/landing/Navbar";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isSignedIn: false }) }));
vi.mock("@/components/shared/ThemedClerkWidgets", () => ({ ThemedUserButton: () => null }));

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
      "/tutor/schedule",
      "/admin/users",
      "/learn",
      "/",
      "/faq",
      "/free-diagnostic",
      "/plans",
      "/questions",
    ]) {
      pathname = route;
      const view = render(<ThemeToggle floating />);
      expect(screen.queryByRole("button", { name: "Toggle light and dark mode" })).toBeNull();
      view.unmount();
    }
  });

  it.each(["/free-diagnostic", "/plans", "/questions"])(
    "avoids an extra fixed control when the root and Navbar compose on %s",
    (route) => {
      pathname = route;
      render(
        <>
          <Navbar />
          <ThemeToggle floating />
        </>
      );
      const controls = screen.getAllByRole("button", { name: "Toggle light and dark mode" });
      // Navbar has desktop/mobile alternatives; CSS chooses which is visible.
      expect(controls).toHaveLength(2);
      expect(controls.some((button) => button.classList.contains("fixed"))).toBe(false);
    }
  );

  it.each(["/auth/sign-in", "/auth/sign-up"])("keeps the floating control on %s", (route) => {
    pathname = route;
    render(<ThemeToggle floating />);
    expect(screen.getByRole("button", { name: "Toggle light and dark mode" })).toHaveClass("fixed");
  });
});
