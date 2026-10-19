// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizMenu } from "./QuizMenu";

describe("quiz menu calculator guidance", () => {
  it("explains how to open the calculator and transfer math in Math", () => {
    render(<QuizMenu subject="math" />);
    expect(screen.getByText(/Transfer to Calculator/)).toBeInTheDocument();
    expect(screen.getByText(/clear on every question change/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Question animations" })).toBeInTheDocument();
    expect(screen.queryByText(/timed exam/)).not.toBeInTheDocument();
  });
  it("keeps appearance available in Reading/Writing without calculator guidance", () => {
    render(<QuizMenu subject="reading" />);
    expect(screen.queryByText(/Transfer to Calculator/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Appearance menu", { exact: true })).toBeInTheDocument();
  });
});
