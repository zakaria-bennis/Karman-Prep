// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ChallengeMoment from "./ChallengeMoment";
import CourseChooser, { type ChooserCourse } from "./CourseChooser";
import { CHALLENGE_CLOSED_KEY, COURSE_PICK_KEY, challengeMoment } from "./moment";

const courses: ChooserCourse[] = [
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

describe("Library course choice", () => {
  it("asks first, then turns the pick into the toggle and shows that course", async () => {
    render(
      <CourseChooser courses={courses} views={views} initial={null} waitForChallenge={false} />
    );
    expect(screen.getByRole("heading", { name: "What are we studying?" })).toBeTruthy();
    expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Reading and Writing/ }));

    await waitFor(() => expect(screen.getByRole("group", { name: "Course" })).toBeTruthy());
    expect(screen.getByRole("button", { name: /Reading and Writing/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Reading course").closest("[hidden]")).toBeNull();
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBe(
      `${new Date().toDateString()}|reading-writing`
    );

    fireEvent.click(screen.getByRole("button", { name: /Math/, pressed: false }));
    expect(screen.getByRole("button", { name: /Math/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Math course").closest("[hidden]")).toBeNull();
  });

  it("skips the choice for a pick kept today, but asks again on a new day", async () => {
    sessionStorage.setItem(COURSE_PICK_KEY, `${new Date().toDateString()}|math`);
    const { unmount } = render(
      <CourseChooser courses={courses} views={views} initial={null} waitForChallenge={false} />
    );
    await waitFor(() => expect(screen.getByRole("group", { name: "Course" })).toBeTruthy());
    unmount();

    sessionStorage.setItem(COURSE_PICK_KEY, "Mon Jan 01 2001|math");
    render(
      <CourseChooser courses={courses} views={views} initial={null} waitForChallenge={false} />
    );
    expect(screen.getByRole("heading", { name: "What are we studying?" })).toBeTruthy();
  });

  it("a ?subject= link picks straight away", () => {
    render(<CourseChooser courses={courses} views={views} initial="math" waitForChallenge />);
    expect(screen.queryByRole("heading", { name: "What are we studying?" })).toBeNull();
    expect(screen.getByRole("button", { name: /Math/, pressed: true })).toBeTruthy();
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

describe("Library course choice, painted options (?hero=)", () => {
  it.each(["a", "b", "c"] as const)(
    "option %s always asks, and its pick still becomes the toggle",
    async (hero) => {
      /* A pick kept today does not skip the choice, so each option can be seen again. */
      sessionStorage.setItem(COURSE_PICK_KEY, `${new Date().toDateString()}|math`);
      render(
        <CourseChooser
          courses={courses}
          views={views}
          initial={null}
          waitForChallenge={false}
          hero={hero}
        />
      );
      expect(screen.getByRole("heading", { name: "What are we studying?" })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Math/ })).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Reading and Writing/ }));

      await waitFor(() => expect(screen.getByRole("group", { name: "Course" })).toBeTruthy());
      expect(
        screen.getByRole("button", { name: /Reading and Writing/, pressed: true })
      ).toBeTruthy();
      expect(screen.getByText("Reading course").closest("[hidden]")).toBeNull();
    }
  );
});
