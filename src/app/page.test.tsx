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
  it("puts the free diagnostic before account entry and keeps truthful public destinations", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    for (const link of screen.getAllByRole("link", { name: /Explore the free diagnostic/i })) {
      expect(link).toHaveAttribute("href", "/free-diagnostic");
    }
    expect(screen.getByRole("link", { name: "Inferences" })).toHaveAttribute(
      "href",
      "/learn/practice/rw-skill-inferences"
    );
    expect(screen.queryByRole("link", { name: /Create an account/i })).toBeNull();
    expect(screen.queryByText(/A starting point, not a score prediction/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(
      /2,400|\+285|4\.9\/5|real students|sample lesson/i
    );
    expect(screen.queryByRole("button", { name: /Play sample lesson/i })).toBeNull();
  });

  it("describes the product without a score result claim in page metadata", () => {
    expect(metadata.description).not.toMatch(/guarantee|score improvement|predicted/i);
  });

  it("states current eligibility and separates prospective course-fee protection from existing terms", () => {
    render(<GuaranteePage />);
    expect(
      screen.getByText(/No current standard checkout offer is configured as eligible/)
    ).toBeTruthy();
    expect(screen.getByText(/Existing purchases keep their purchase-time terms/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /12-Week Course-Fee Protection/ })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/No fine print/i);
  });
});
