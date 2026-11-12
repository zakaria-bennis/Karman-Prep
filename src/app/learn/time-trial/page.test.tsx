// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIME_TRIAL } from "@/lib/student/quiz-routes";

const m = vi.hoisted(() => ({ status: vi.fn(), user: vi.fn() }));
vi.mock("@/components/quiz-flows/load-user", () => ({ loadFlowUser: m.user }));
vi.mock("@/lib/assembler/time-trial-run", async () => {
  const { z } = await import("zod");
  return { loadTrialStatus: m.status, trialSectionSchema: z.enum(["reading", "math"]) };
});
vi.mock("@/components/quiz-flows/FlowFrame", () => ({
  FlowFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/quiz-flows/TrialPicker", () => ({
  TrialPicker: ({ status }: { status: { section: string }[] }) => (
    <p>Picker: {status.map((s) => s.section).join(", ")}</p>
  ),
}));
vi.mock("@/components/quiz-flows/Flows", () => ({
  TimeTrialFlow: (p: {
    section: string;
    resumable: boolean;
    standing: { round: number; multiplier: number };
  }) => (
    <p>
      Flow {p.section} round {p.standing.round} at {p.standing.multiplier}
      {p.resumable ? " (resume)" : ""}
    </p>
  ),
}));
import Page from "./page";

const open = (query: Record<string, string> = {}) =>
  Page({ searchParams: Promise.resolve(query) }).then((el) => render(el));

beforeEach(() => {
  vi.clearAllMocks();
  m.user.mockResolvedValue({ clerkId: "student-1", user: { name: "Sam" } });
  m.status.mockResolvedValue([
    { section: "reading", standing: { round: 3, multiplier: 1.15 }, open: false, last: null },
    { section: "math", standing: { round: 1, multiplier: 1.25 }, open: true, last: null },
  ]);
});

describe("/learn/time-trial", () => {
  it("is open in the portal's quiz routes", () => {
    expect(TIME_TRIAL).toEqual({ path: "/learn/time-trial", ready: true });
  });
  it("shows the section picker with no section", async () => {
    await open();
    expect(m.status).toHaveBeenCalledWith("student-1");
    expect(screen.getByText("Picker: reading, math")).toBeInTheDocument();
  });
  it("ignores an unknown section and shows the picker", async () => {
    await open({ section: "science" });
    expect(screen.getByText("Picker: reading, math")).toBeInTheDocument();
  });
  it("opens the section's next round at the student's pace", async () => {
    await open({ section: "reading" });
    expect(screen.getByText("Flow reading round 3 at 1.15")).toBeInTheDocument();
  });
  it("resumes an open round", async () => {
    await open({ section: "math", again: "123" });
    expect(screen.getByText("Flow math round 1 at 1.25 (resume)")).toBeInTheDocument();
  });
});
