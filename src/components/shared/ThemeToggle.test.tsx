// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { ThemeToggle } from "./ThemeToggle";
import Navbar from "@/components/landing/Navbar";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isSignedIn: false }) }));
vi.mock("@/components/shared/ThemedClerkWidgets", () => ({ ThemedUserButton: () => null }));

let pathname = "/";
const theme = vi.hoisted(() => ({ toggleMode: vi.fn(), saving: false }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/components/shared/ThemeProvider", () => ({
  useTheme: () => theme,
}));

afterEach(() => {
  cleanup();
  theme.saving = false;
  vi.clearAllMocks();
});

describe("theme control readiness", () => {
  it("is disabled in server HTML and handles the first click after hydration exactly once", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ThemeToggle />);
    document.body.appendChild(container);
    const button = container.querySelector("button")!;
    expect(button).toBeDisabled();
    button.click();
    expect(theme.toggleMode).not.toHaveBeenCalled();

    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <ThemeToggle />);
      });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(theme.toggleMode).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });

  it("remains disabled while an account preference is saving", () => {
    theme.saving = true;
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Toggle light and dark mode" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(theme.toggleMode).not.toHaveBeenCalled();
  });
});

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
      "/calculator",
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
