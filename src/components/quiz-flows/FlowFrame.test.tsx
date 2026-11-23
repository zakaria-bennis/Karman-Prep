// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/learn/quiz-shell/QuizWorld", () => ({ QuizWorld: () => null }));
vi.mock("@/components/portal/fonts", () => ({ portalFontVars: "" }));
import { FlowFrame, Message } from "./FlowFrame";
import { StageFrame } from "./StageFrame";

const user = { name: "Sam", email: null, streak: 4, nav: [], menu: [] };

describe("FlowFrame", () => {
  it("stands on the stage with the Library as the way back and the name as the heading", () => {
    const { container } = render(
      <FlowFrame user={user} title="Time trial">
        <p>Inside</p>
      </FlowFrame>
    );
    expect(container.querySelector("[data-flow-stage]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "/dashboard/student?page=library"
    );
    expect(screen.getByRole("heading", { level: 1, name: "Time trial" })).toBeInTheDocument();
    expect(screen.getByText("Inside")).toBeInTheDocument();
    // none of the old painted shell: no tabs, no streak, no skip link
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText("Skip to content")).toBeNull();
  });

  it("leaves the name out when there is none", () => {
    render(
      <FlowFrame user={user} title=" ">
        <p>Inside</p>
      </FlowFrame>
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("StageFrame", () => {
  it("takes its own way back and a second column", () => {
    render(
      <StageFrame back={{ href: "/x", label: "Exams" }} title="Exams" side={<p>Beside</p>}>
        <p>Main</p>
      </StageFrame>
    );
    expect(screen.getByRole("link", { name: "Exams" })).toHaveAttribute("href", "/x");
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Beside")).toBeInTheDocument();
  });
});

describe("Message", () => {
  it("shows the title, the text, the one button and the way back", () => {
    const start = vi.fn();
    render(
      <Message
        title="Take a break"
        text="Stand up."
        action={{ onClick: start, label: "Start Math" }}
        back={{ href: "/learn/tests", label: "Save and leave" }}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: "Take a break" })).toBeInTheDocument();
    expect(screen.getByText("Stand up.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Math" }));
    expect(start).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Save and leave" })).toHaveAttribute(
      "href",
      "/learn/tests"
    );
  });

  it("says it is busy while loading", () => {
    render(<Message title="Getting your questions ready" text="One moment." busy />);
    const heading = screen.getByRole("heading", { name: "Getting your questions ready" });
    expect(heading.closest("section")).toHaveAttribute("aria-busy", "true");
  });
});
