// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("intro=3") }));
import ChallengeMoment from "./ChallengeMoment";
import LibraryStage, { type StageCourse } from "./LibraryStage";
import SkyToGround from "./intros/1-sky-to-ground/SkyToGround";
import type { IntroDef, IntroProps } from "./intros/registry";
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

function StubIntro({ onChoose, percents }: IntroProps) {
  return (
    <div>
      <p>Stub intro {percents.math}%</p>
      <button type="button" onClick={() => onChoose("math")}>
        Choose math
      </button>
      <button type="button" onClick={() => onChoose("rw")}>
        Choose reading
      </button>
    </div>
  );
}
const stubIntros: IntroDef[] = [
  { id: 1, name: "Stub one", Component: StubIntro },
  { id: 3, name: "Stub three", Component: StubIntro },
];

describe("Library stage: an intro, then the shared end state", () => {
  const stage = (
    initial: "math" | "reading-writing" | null = null,
    intro: number | null = null
  ) => (
    <LibraryStage
      courses={courses}
      views={views}
      side={<p>Practice modes</p>}
      initial={initial}
      intro={intro}
      intros={stubIntros}
      waitForChallenge={false}
    />
  );

  it("plays the intro with the box closed; onChoose opens the box on that course", async () => {
    render(stage());
    await screen.findByText("Stub intro 25%");
    expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Choose reading" }));

    await waitFor(() => expect(screen.getByText("Reading course").closest("[hidden]")).toBeNull());
    expect(screen.getByRole("button", { name: /Reading and Writing/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Practice modes").closest("[hidden]")).toBeNull();
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBe("reading-writing");

    fireEvent.click(screen.getByRole("button", { name: /Math/, pressed: false }));
    expect(screen.getByText("Math course").closest("[hidden]")).toBeNull();
  });

  it("Close goes back to the intro's start and forgets the pick", async () => {
    sessionStorage.setItem(COURSE_PICK_KEY, "math");
    render(stage());
    await waitFor(() => expect(screen.getByText("Math course").closest("[hidden]")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Close the course/ }));
    await screen.findByText("Stub intro 25%");
    expect(screen.getByText("Math course").closest("[hidden]")).toBeTruthy();
    expect(sessionStorage.getItem(COURSE_PICK_KEY)).toBeNull();
  });

  it("with ?intro the kept pick is ignored, and the picker lists the intros", async () => {
    sessionStorage.setItem(COURSE_PICK_KEY, "math");
    render(stage(null, 3));
    await screen.findByText("Stub intro 25%");
    const picker = screen.getByRole("navigation", { name: "Opening animations" });
    expect(picker.querySelectorAll("a")).toHaveLength(2);
    expect(picker.querySelector('a[aria-current="true"]')?.getAttribute("href")).toContain(
      "intro=3"
    );
  });

  it("a ?subject= link opens that course straight away", () => {
    render(stage("math"));
    expect(screen.getByRole("button", { name: /Math/, pressed: true })).toBeTruthy();
    expect(screen.getByText("Math course").closest("[hidden]")).toBeNull();
  });
});

describe("Intro 1, Sky to ground", () => {
  const props = (onChoose = vi.fn()) => ({
    percents: { math: 25, rw: 50 },
    time: "day" as const,
    reducedMotion: true,
    onChoose,
  });
  const half = (name: RegExp) =>
    screen.getAllByRole("button", { name }).find((b) => b.hasAttribute("data-slug")) as HTMLElement;

  it("a first tap shows a half, the second chooses it", async () => {
    const onChoose = vi.fn();
    render(<SkyToGround {...props(onChoose)} />);
    const math = half(/Math/);
    fireEvent.pointerDown(math, { pointerType: "touch" });
    fireEvent.click(math);
    expect(math.hasAttribute("data-on")).toBe(true);
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.pointerDown(math, { pointerType: "touch" });
    fireEvent.click(math);
    await waitFor(() => expect(onChoose).toHaveBeenCalledWith("math"));
  });

  it("keyboard focus lights a half; Escape on the way down turns back", async () => {
    const onChoose = vi.fn();
    render(<SkyToGround {...props(onChoose)} />);
    const rw = half(/Reading and Writing/);
    act(() => rw.focus());
    expect(rw.hasAttribute("data-on")).toBe(true);
    fireEvent.click(rw);
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await new Promise((r) => setTimeout(r, 600));
    expect(onChoose).not.toHaveBeenCalled();
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

    // The Escape listener attaches in an effect; under a busy CI runner it can lag the dialog.
    await waitFor(() => {
      act(() => {
        fireEvent.keyDown(document, { key: "Escape" });
      });
      expect(localStorage.getItem(CHALLENGE_CLOSED_KEY)).toBe("2026-11-08");
    });
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
