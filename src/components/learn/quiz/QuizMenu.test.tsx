// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizMenu } from "./QuizMenu";

describe("practice menu Desmos setting", () => {
  it("puts the setting in the menu and lets the student turn it off", () => {
    const onChange = vi.fn();
    render(
      <QuizMenu subject="math" transfersEnabled onTransfersChange={onChange} realistic={false} />
    );
    fireEvent.click(screen.getByText("Menu"));
    const toggle = screen.getByRole("checkbox", { name: "Desmos transfers" });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });
  it("locks transfers off in realistic exams even when practice preference is on", () => {
    const onChange = vi.fn();
    render(<QuizMenu subject="math" transfersEnabled onTransfersChange={onChange} realistic />);
    fireEvent.click(screen.getByText("Menu"));
    const toggle = screen.getByRole("checkbox", { name: "Desmos transfers" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toBeDisabled();
    expect(screen.getByText("Disabled during realistic timed exams.")).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });
});

it("keeps appearance available in Reading/Writing without a calculator-transfer entry", () => {
  render(
    <QuizMenu subject="reading" transfersEnabled onTransfersChange={() => {}} realistic={false} />
  );
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Appearance menu", { exact: true })).toBeInTheDocument();
});
