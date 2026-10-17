// @vitest-environment jsdom

// AR-7: the per-request calculator version provider, its hook default, and the
// learn layout and diagnostic page that mount it. The route files run as async
// server components; their server dependencies are mocked as in
// src/app/dashboard/student/layout.test.tsx.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

interface Builder {
  select(): Builder;
  eq(): Builder;
  maybeSingle(): Promise<{ data: null }>;
}

const mocks = vi.hoisted(() => {
  // The page queries `users`, then `subscriptions`; a null user skips the
  // `diagnostic_results` count.
  const builder: Builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: null }),
  };
  return { safeAuth: vi.fn(), resolveCalculatorVersion: vi.fn(), builder };
});
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mocks.safeAuth }));
vi.mock("@/lib/calculator-version", () => ({
  resolveCalculatorVersion: mocks.resolveCalculatorVersion,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/components/learn/LearnLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/diagnostic/DiagnosticClient", () => ({ default: () => <Probe /> }));
vi.mock("@/data/diagnostic-questions", () => ({ DIAGNOSTIC_QUESTIONS: [] }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ from: () => mocks.builder }),
}));

import LearnRouteLayout from "@/app/learn/layout";
import DiagnosticPage from "@/app/diagnostic/page";
import { CalculatorVersionProvider, useCalculatorVersion } from "./CalculatorVersion";

function Probe() {
  return <span data-testid="version">{useCalculatorVersion()}</span>;
}

const shown = () => screen.getByTestId("version").textContent;

beforeEach(() => {
  mocks.safeAuth.mockResolvedValue({ userId: "user_1" });
  mocks.resolveCalculatorVersion.mockResolvedValue("v2");
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("calculator version provider and route wrappers", () => {
  it("AR-7 useCalculatorVersion is v1 without a provider", () => {
    render(<Probe />);
    expect(shown()).toBe("v1");
  });

  it("AR-7 the version stays fixed for the life of the page when the provider re-renders", () => {
    const { rerender } = render(
      <CalculatorVersionProvider version="v2">
        <Probe />
      </CalculatorVersionProvider>
    );
    expect(shown()).toBe("v2");
    rerender(
      <CalculatorVersionProvider version="v1">
        <Probe />
      </CalculatorVersionProvider>
    );
    expect(shown()).toBe("v2");
  });

  it("AR-7 the learn layout wraps LearnLayout in the provider with the resolved version", async () => {
    const el = await LearnRouteLayout({ children: <Probe /> });
    expect(el.type).toBe(CalculatorVersionProvider);
    render(el);
    expect(shown()).toBe("v2");
  });

  it("AR-7 the learn layout redirects signed-out users before resolving the version", async () => {
    mocks.safeAuth.mockResolvedValue({ userId: null });
    await expect(LearnRouteLayout({ children: null })).rejects.toThrow("redirect:/auth/sign-in");
    expect(mocks.resolveCalculatorVersion).not.toHaveBeenCalled();
  });

  it("AR-7 the diagnostic page wraps DiagnosticClient in the provider with the resolved version", async () => {
    const el = await DiagnosticPage();
    expect(el.type).toBe(CalculatorVersionProvider);
    render(el);
    expect(shown()).toBe("v2");
  });
});
