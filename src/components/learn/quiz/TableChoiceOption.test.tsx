// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableChoiceOption } from "./TableChoiceOption";

const table = {
  header_row: ["x", "y"],
  rows: [
    ["1", "69/10"],
    ["2", "63/10"],
    ["4", "51/10"],
  ],
};

describe("table answer choice", () => {
  it("keeps a complete native table outside buttons and selects by radio or table", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <TableChoiceOption
        id="choice-d"
        groupName="question-1"
        letter="D"
        table={table}
        selected={false}
        submitted={false}
        correct={false}
        onSelect={onSelect}
      />
    );
    const radio = screen.getByRole("radio", { name: "Choice D" });
    expect(radio.getAttribute("aria-describedby")).toBe("choice-d-table-summary");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(container.querySelectorAll("th[scope=col]")).toHaveLength(2);
    expect(container.querySelector("button table")).toBeNull();
    expect(container.textContent).toContain("x 1, y 69/10");
    fireEvent.click(radio);
    expect(onSelect).toHaveBeenCalledWith("D");
    fireEvent.click(screen.getByRole("figure", { name: "Choice D data table" }));
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("prevents answer changes after submission", () => {
    const onSelect = vi.fn();
    render(
      <TableChoiceOption
        id="choice-d-submitted"
        groupName="question-2"
        letter="D"
        table={table}
        selected={true}
        submitted={true}
        correct={true}
        onSelect={onSelect}
      />
    );
    const radio = screen.getByRole("radio", { name: "Choice D" }) as HTMLInputElement;
    expect(radio.disabled).toBe(true);
    expect(screen.getByText("D — correct")).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
