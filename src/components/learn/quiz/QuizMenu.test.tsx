// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizMenu } from "./QuizMenu";

describe("external calculator menu guidance", () => {
  it("explains the external practice workflow without an inactive transfer toggle", () => {
    render(<QuizMenu subject="math" realistic={false} />);
    expect(screen.getByText(/original calculator works here/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Question animations" })).toBeInTheDocument();
    expect(screen.queryByText(/timed exam/)).not.toBeInTheDocument();
  });
  it("keeps legacy realistic practice guidance accurate without claiming a full exam", () => {
    render(<QuizMenu subject="math" realistic />);
    expect(screen.queryByText(/timed exam/)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Question animations" })).toBeInTheDocument();
  });
  it("keeps appearance available in Reading/Writing without calculator guidance", () => {
    render(<QuizMenu subject="reading" realistic={false} />);
    expect(screen.queryByText(/official SAT calculator/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Appearance menu", { exact: true })).toBeInTheDocument();
  });
});
