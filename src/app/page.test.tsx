// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    h1: ({ children }: React.PropsWithChildren) => <h1>{children}</h1>,
    p: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  },
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/landing/ConstellationBackground", () => ({ default: () => null }));
vi.mock("@/components/landing/Navbar", () => ({ default: () => null }));
vi.mock("@/components/landing/HowItWorks", () => ({ default: () => null }));
vi.mock("@/components/landing/Pricing", () => ({ default: () => null }));
vi.mock("@/components/landing/EmailCapture", () => ({ default: () => null }));
vi.mock("@/components/landing/Footer", () => ({ default: () => null }));

import HomePage, { metadata } from "./page";
import GuaranteePage from "./guarantee/page";

describe("public landing entry", () => {
  it("names the SAT audience and sends visitors to real account and diagnostic paths", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Know what to practice next/i })
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Create an account/i }).getAttribute("href")).toBe(
      "/auth/sign-up"
    );
    expect(screen.getByRole("link", { name: /Explore the diagnostic/i }).getAttribute("href")).toBe(
      "#sample-quiz"
    );
    expect(screen.getByText(/The diagnostic requires sign-in/)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /A starting point, not a score prediction/i })
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /2,400|\+285|4\.9\/5|real students|sample lesson/i
    );
    expect(screen.queryByRole("button", { name: /Play sample lesson/i })).toBeNull();
  });

  it("describes the product without a score result claim in page metadata", () => {
    expect(metadata.description).not.toMatch(/guarantee|score improvement|predicted/i);
  });

  it("shows material guarantee conditions instead of promising no fine print", () => {
    render(<GuaranteePage />);
    expect(screen.getByText(/required diagnostic, 16 paid weeks/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/No fine print/i);
  });
});
