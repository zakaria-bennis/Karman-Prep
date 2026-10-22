// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CalculatorLoaderProps } from "@/components/calculator/CalculatorLoader";
import type { QuizCalculatorHandle } from "@/components/calculator/host/quiz-host";

const loader = vi.hoisted(() => ({ props: [] as CalculatorLoaderProps[] }));
vi.mock("@/components/calculator/CalculatorLoader", () => ({
  CalculatorLoader: (props: CalculatorLoaderProps) => {
    loader.props.push(props);
    return <div data-testid="calculator-loader" />;
  },
}));

import CalculatorPage, { metadata, viewport } from "./page";
import { PublicCalculator } from "./PublicCalculator";
import sitemap from "../sitemap";
import robots from "../robots";

afterEach(() => {
  loader.props = [];
  vi.unstubAllGlobals();
});

describe("/calculator", () => {
  it("has its own title, description, canonical and Open Graph copy, and is indexable", () => {
    expect(metadata.title).toEqual({ absolute: "Free Graphing Calculator | Karman Prep" });
    expect(metadata.description).toMatch(/^A free online graphing calculator\./);
    expect(metadata.alternates?.canonical).toBe("/calculator");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      url: "/calculator",
      title: "Free Graphing Calculator | Karman Prep",
    });
    const copy = JSON.stringify(metadata);
    expect(copy).not.toMatch(/desmos|official|—/i);
  });

  it("declares a dark page, so a phone that darkens light pages leaves the calculator's own theme alone", () => {
    expect(viewport.colorScheme).toBe("dark");
  });

  it("shows one heading, the logo home link, one quiet practice link and the calculator", () => {
    render(<CalculatorPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Graphing calculator");
    expect(screen.getByRole("link", { name: "Karman Prep home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "SAT practice" })).toHaveAttribute(
      "href",
      "/questions"
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("button")).toBeNull(); // no sign-in prompt, no upsell
    expect(screen.getByTestId("calculator-loader")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/desmos|sign in|log in/i);
  });

  it("loads the calculator at once with Classic as its default theme and focuses row 1 for a mouse", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    render(<PublicCalculator />);
    const last = loader.props.at(-1)!;
    expect(last).toMatchObject({ active: true, defaultTheme: "classic" });
    expect(last.frame).toBe(screen.getByRole("region", { name: "Graphing calculator" }));
    expect(last.chromeSlot).not.toBeNull();
    const focusOnOpen = vi.fn();
    act(() => last.onHandle({ focusOnOpen } as unknown as QuizCalculatorHandle));
    expect(focusOnOpen).toHaveBeenCalledWith("keyboard");
  });

  it("only activates row 1 on a touch screen, so no keypad opens before a tap", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(pointer: coarse)",
      media: query,
    }));
    render(<PublicCalculator />);
    const focusOnOpen = vi.fn();
    act(() => loader.props.at(-1)!.onHandle({ focusOnOpen } as unknown as QuizCalculatorHandle));
    expect(focusOnOpen).toHaveBeenCalledWith("touch");
  });

  it("is in the sitemap, and robots points at it while keeping portals out", () => {
    expect(sitemap().map((entry) => new URL(entry.url).pathname)).toContain("/calculator");
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow;
    expect(disallow).toEqual(expect.arrayContaining(["/admin", "/dashboard", "/learn"]));
    expect(disallow).not.toContain("/calculator");
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
