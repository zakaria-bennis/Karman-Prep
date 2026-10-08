// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LinkedParentStudent, WeeklyParentView } from "@/lib/parent/weekly-model";
import ParentWeeklyPortal from "./ParentWeeklyPortal";

vi.mock("@/components/shared/ThemeProvider", async () => {
  const React = await import("react");
  return {
    useTheme: () => {
      const [dark, setDark] = React.useState(true);
      return { palette: { dark }, toggleMode: () => setDark((value: boolean) => !value) };
    },
  };
});

afterEach(() => {
  cleanup();
});

const students: LinkedParentStudent[] = [
  { id: "student-a", clerk_id: "clerk-a", first_name: "Alex", last_name: "A" },
  { id: "student-b", clerk_id: "clerk-b", first_name: "Bo", last_name: "B" },
];
const summary: WeeklyParentView = {
  student: students[0],
  weekStart: "2026-10-05T00:00:00Z",
  weekEnd: "2026-10-12T00:00:00Z",
  completedPractice: { status: "ready", value: 2 },
  practiceSkills: {
    status: "ready",
    value: {
      improving: ["Algebra"],
      attention: ["Geometry and Trigonometry"],
      diagnosticDate: "2026-10-07T12:00:00Z",
    },
  },
  nextSession: { status: "ready", value: { startsAt: "2026-10-10T14:00:00Z" } },
  assignments: {
    status: "ready",
    value: [{ id: "post-a", title: "Review equations", dueAt: null }],
  },
};

function show(props: Partial<React.ComponentProps<typeof ParentWeeklyPortal>> = {}) {
  return render(
    <ParentWeeklyPortal students={students} selected={students[0]} summary={summary} {...props} />
  );
}

describe("parent weekly portal", () => {
  it("shows the linked child selector and clearly labels practice data", () => {
    show();
    expect(screen.getByRole("heading", { name: "Alex A’s week" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bo B" }).getAttribute("href")).toBe(
      "/dashboard/parent?student=student-b"
    );
    expect(screen.getByText(/These are not official SAT scores/)).toBeTruthy();
    expect(screen.getByText("Review equations")).toBeTruthy();
    expect(screen.getByText(/Posted work is not a completion record/)).toBeTruthy();
  });

  it("has honest no-link, error and unavailable states", () => {
    const view = show({ students: [], selected: null, summary: null });
    expect(screen.getByRole("heading", { name: "No students linked yet" })).toBeTruthy();
    view.rerender(<ParentWeeklyPortal students={[]} selected={null} summary={null} loadError />);
    expect(screen.getByRole("alert").textContent).toContain("unavailable");
    view.rerender(
      <ParentWeeklyPortal
        students={students}
        selected={students[0]}
        summary={{ ...summary, completedPractice: { status: "unavailable" } }}
      />
    );
    expect(screen.getByText("Practice activity is unavailable right now.")).toBeTruthy();
  });

  it("allows keyboard access to the theme control", async () => {
    const user = userEvent.setup();
    show();
    const toggle = screen.getByRole("button", { name: "Switch to light theme" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeTruthy();
    expect(document.querySelector("main")?.getAttribute("data-theme")).toBe("light");
  });
});
