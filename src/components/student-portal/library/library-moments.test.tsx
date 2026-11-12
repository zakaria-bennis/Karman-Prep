// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ChallengeMoment from "./ChallengeMoment";
import LibraryStage, { type StageCourse } from "./LibraryStage";
import { CHALLENGE_CLOSED_KEY, COURSE_PICK_KEY, challengeMoment } from "./moment";

const courses: StageCourse[] = [
  { slug: "math", name: "SAT Math", progress: 0.25 },
  { slug: "reading-writing", name: "SAT Reading and Writing", progress: 0.5 },
];
const views = {
  math: <p>Math course</p>,
  "reading-writing": <p>Reading course</p>,
};

function shell() {
  const el = document.createElement("div");
  el.className = "kp-shell";
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
  challengeMoment.reset();
});

describe("Library opening: the sky split in two, then the box", () => {
  const stage = (initial: "math" | "reading-writing" | null = null) => (
    <LibraryStage
      courses={courses}
      views={views}
      side={<p>Practice modes</p>}
      initial={initial}
      waitForChallenge={false}
    />
  );
  const half = (name: RegExp) =>
    screen.getAllByRole("button", { name }).find((b) => b.hasAttribute("data-slug")) as HTMLElement;

  it("starts with the box closed, then a pick opens it with that course and the toggle", async () => {
    render(stage());
    expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy();
    expect(screen.getByText("Practice modes").closest("[hidden]")).toBeTruthy();

    fireEvent.click(half(/Reading and Writing/));

    await waitFor(() => expect(screen.getByText("Reading course").closest("[hidden]")).toBeNull());
    expect(screen.getByRole("group", { name: "Course" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reading and Writing/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Practice modes").closest("[hidden]")).toBeNull();
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBe("reading-writing");

    fireEvent.click(screen.getByRole("button", { name: /Math/, pressed: false }));
    expect(screen.getByRole("button", { name: /Math/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Math course").closest("[hidden]")).toBeNull();
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBe("math");
  });

  it("the close button goes back to the paintings and forgets the pick", async () => {
    sessionStorage.setItem(COURSE_PICK_KEY, "math");
    render(stage());
    await waitFor(() => expect(screen.getByText("Math course").closest("[hidden]")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /Close the course/ }));

    await waitFor(() => expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy());
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBeNull();
  });

  it("Escape on the way down turns back up to the sky", async () => {
    render(stage());
    fireEvent.click(half(/Math/));
    await waitFor(() => expect(screen.getByText("Math course").closest("[hidden]")).toBeNull());
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy());
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBeNull();
  });

  it("on a touch screen the first tap shows a half and the second opens it", async () => {
    render(stage());
    const math = half(/Math/);
    fireEvent.pointerDown(math, { pointerType: "touch" });
    fireEvent.click(math);
    expect(math.hasAttribute("data-on")).toBe(true);
    expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy();

    fireEvent.pointerDown(math, { pointerType: "touch" });
    fireEvent.click(math);
    await waitFor(() => expect(screen.getByText("Math course").closest("[hidden]")).toBeNull());
  });

  it("keyboard focus brings a half to life, like pointing at it", () => {
    render(stage());
    const reading = half(/Reading and Writing/);
    act(() => reading.focus());
    expect(reading.hasAttribute("data-on")).toBe(true);
    act(() => reading.blur());
    expect(reading.hasAttribute("data-on")).toBe(false);
  });

  it("a ?subject= link opens that course straight away", () => {
    render(stage("math"));
    expect(screen.getByRole("button", { name: /Math/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Math course").closest("[hidden]")).toBeNull();
  });
});

describe("Challenge moment", () => {
  it("opens when today's questions aren't done, and closing hides it for the day", async () => {
    shell();
    render(<ChallengeMoment href="/learn/daily" day="2026-11-08" answered={0} />);
    const dialog = await screen.findByRole("dialog", { name: "Today’s Challenge" });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole("link", { name: /Start the Challenge/ }).getAttribute("href")).toBe(
      "/learn/daily"
    );
    expect(challengeMoment.settled()).toBe(false);
    /* The window listens for Escape from the moment it stops the page behind from scrolling,
       which is a beat after it appears. */
    await waitFor(() => expect(document.documentElement.style.overflow).toBe("hidden"));

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(localStorage.getItem(CHALLENGE_CLOSED_KEY)).toBe("2026-11-08");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(challengeMoment.settled()).toBe(true);
  });

  it("stays shut once closed today or when both questions are answered", async () => {
    shell();
    localStorage.setItem(CHALLENGE_CLOSED_KEY, "2026-11-08");
    const { unmount } = render(
      <ChallengeMoment href="/learn/daily" day="2026-11-08" answered={0} />
    );
    await waitFor(() => expect(challengeMoment.settled()).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    localStorage.clear();
    render(<ChallengeMoment href="/learn/daily" day="2026-11-08" answered={2} />);
    await waitFor(() => expect(challengeMoment.settled()).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
