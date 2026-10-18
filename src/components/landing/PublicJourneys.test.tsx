// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isSignedIn: false }) }));
vi.mock("@/components/shared/ThemedClerkWidgets", () => ({ ThemedUserButton: () => null }));
vi.mock("@/components/shared/ThemeToggle", () => ({
  ThemeToggle: () => <button>Appearance</button>,
}));
vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: ComponentProps<"img"> & { priority?: boolean }) =>
    createElement("img", props),
}));
import Navbar from "./Navbar";
import Hero from "./Hero";
import PlansPage from "@/app/plans/page";
import FreeDiagnosticPage from "@/app/free-diagnostic/page";
import { PRICING_TIERS } from "@/types";

afterEach(cleanup);
describe("public entry paths", () => {
  it("opens the public overview first and preserves the real diagnostic gate", () => {
    const hero = render(<Hero />);
    expect(screen.getByRole("link", { name: /Explore the free diagnostic/ })).toHaveAttribute(
      "href",
      "/free-diagnostic"
    );
    hero.unmount();
    render(<FreeDiagnosticPage />);
    expect(screen.getByRole("link", { name: /Start the free diagnostic/ })).toHaveAttribute(
      "href",
      "/diagnostic"
    );
    expect(screen.getByText(/Sign in when you’re ready/)).toBeInTheDocument();
  });
  it("keeps account entry available and closes mobile navigation with Escape and link activation", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/sign-in");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/auth/sign-up"
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = document.getElementById("mobile-navigation")!;
    const questions = within(menu).getByRole("link", { name: "Questions" });
    expect(questions).toHaveAttribute("href", "/questions");
    questions.focus();
    fireEvent.keyDown(questions, { key: "Escape" });
    expect(document.getElementById("mobile-navigation")).toBeNull();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(
      within(document.getElementById("mobile-navigation")!).getByRole("link", {
        name: "Plans",
      })
    );
    expect(document.getElementById("mobile-navigation")).toBeNull();
  });
  it("connects all four plan cards to real detail anchors without changing existing prices or offer IDs", () => {
    render(<PlansPage />);
    const cards = document.querySelector('[aria-label="Compare all four plans"]')!;
    expect(cards.querySelectorAll("a")).toHaveLength(4);
    for (const tier of PRICING_TIERS) {
      const link = within(cards as HTMLElement).getByRole("link", { name: new RegExp(tier.name) });
      expect(link).toHaveAttribute("href", `#${tier.id}`);
      expect(link).toHaveTextContent(tier.price);
      expect(link).toHaveTextContent(tier.period);
      expect(document.getElementById(tier.id)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: tier.cta })).toHaveAttribute(
        "href",
        `/auth/sign-up?tier=${tier.id}`
      );
    }
    expect(screen.queryByText(/24\/7|50.point|Elite Prepay/i)).not.toBeInTheDocument();
    expect(screen.getByText(/trial is offered on Seminar only/)).toBeInTheDocument();
  });
});
