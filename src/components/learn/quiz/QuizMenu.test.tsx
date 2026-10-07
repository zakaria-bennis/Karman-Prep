// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizMenu } from "./QuizMenu";

describe("external calculator menu guidance", () => {
  it("explains the external practice workflow without an inactive transfer toggle", () => {
    render(<QuizMenu subject="math" realistic={false} />);
    expect(screen.getByText(/official SAT calculator opens in a new tab/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/timed exam/)).not.toBeInTheDocument();
  });
  it("gives realistic-exam guidance without claiming transfers", () => {
    render(<QuizMenu subject="math" realistic />);
    expect(screen.getByText(/Use this calculator alongside your timed exam/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("keeps appearance available in Reading/Writing without calculator guidance", () => {
    render(<QuizMenu subject="reading" realistic={false} />);
    expect(screen.queryByText(/official SAT calculator/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Appearance menu", { exact: true })).toBeInTheDocument();
  });
});
