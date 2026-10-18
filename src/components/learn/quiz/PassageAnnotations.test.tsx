// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PassageAnnotations, { AnnotationProvider } from "./PassageAnnotations";
import { restoreRange, selectionRange } from "./annotation-ranges";

const registry = new Map<string, Set<Range>>();
beforeEach(() => {
  registry.clear();
  vi.stubGlobal(
    "Highlight",
    class extends Set<Range> {
      constructor(...ranges: Range[]) {
        super(ranges);
      }
    }
  );
  vi.stubGlobal("CSS", { highlights: registry });
});
afterEach(() => vi.unstubAllGlobals());

function passage(id: string) {
  return (
    <AnnotationProvider>
      <PassageAnnotations questionId={id}>
        <p>
          Exact <i>source words</i> with <u>source emphasis</u> and 2/11.
        </p>
      </PassageAnnotations>
    </AnnotationProvider>
  );
}
function mark(kind: "Highlight" | "Underline", phrase = "source words") {
  const summary = screen.getByText("Choose text with the keyboard");
  if (!summary.closest("details")!.open) fireEvent.click(summary);
  fireEvent.change(screen.getByLabelText("Exact passage phrase"), { target: { value: phrase } });
  fireEvent.click(screen.getByRole("button", { name: "Find phrase" }));
  fireEvent.click(screen.getByRole("button", { name: kind }));
}

describe("local passage marking without source mutation", () => {
  it("keeps source formatting and numbers, restores each question's markings, and removes only the chosen kind", () => {
    const view = render(passage("first"));
    const before = view.container.querySelector("[data-annotation-text]")!.innerHTML;
    mark("Highlight");
    mark("Underline", "source emphasis");
    expect(
      [...registry.values()].flatMap((ranges) => [...ranges].map((r) => r.toString()))
    ).toEqual(expect.arrayContaining(["source words", "source emphasis"]));
    expect(view.container.querySelector("[data-annotation-text]")!.innerHTML).toBe(before);
    view.rerender(passage("second"));
    expect(screen.queryByText("Notes and markings")).toBeNull();
    expect([...registry.values()].every((ranges) => ranges.size === 0)).toBe(true);
    view.rerender(passage("first"));
    expect(screen.getByText("Notes and markings")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove underline", hidden: true }));
    expect(
      [...registry.values()].flatMap((ranges) => [...ranges].map((r) => r.toString()))
    ).toEqual(["source words"]);
    view.unmount();
    expect(registry.size).toBe(0);
  });
  it("keeps notes per question and rejects a phrase absent from the source", () => {
    const view = render(passage("first"));
    mark("Highlight");
    fireEvent.change(screen.getByLabelText("Note for this marking"), {
      target: { value: "Check this evidence." },
    });
    view.rerender(passage("second"));
    mark("Underline", "fabricated text");
    expect(screen.getByRole("button", { name: "Underline" })).toBeDisabled();
    view.rerender(passage("first"));
    expect(screen.getByLabelText("Note for this marking")).toHaveValue("Check this evidence.");
  });
  it("captures a selection across formatting nodes and fails closed after text changes", () => {
    const { container } = render(
      <div data-root>
        Before <i>source</i> words.
      </div>
    );
    const root = container.querySelector<HTMLElement>("[data-root]")!;
    const range = document.createRange();
    range.setStart(root.querySelector("i")!.firstChild!, 0);
    range.setEnd(root.lastChild!, 6);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const record = selectionRange(root, selection)!;
    expect(record.quote).toBe("source words");
    expect(restoreRange(root, record)?.toString()).toBe("source words");
    root.lastChild!.textContent = " changed.";
    expect(restoreRange(root, record)).toBeNull();
  });
});

it("does not apply old marks when the source changes under a reused question ID", () => {
  const show = (sourceKey: string) => (
    <AnnotationProvider>
      <PassageAnnotations questionId="same-id" sourceKey={sourceKey}>
        <p>Repeated source words remain, but the version changed.</p>
      </PassageAnnotations>
    </AnnotationProvider>
  );
  const view = render(show("version-a"));
  mark("Highlight");
  view.rerender(show("version-b"));
  expect(screen.queryByText("Notes and markings")).toBeNull();
  expect([...registry.values()].every((ranges) => ranges.size === 0)).toBe(true);
});

it("offers readable quoted markings when custom range painting is unsupported", () => {
  vi.stubGlobal("Highlight", undefined);
  render(passage("first"));
  mark("Underline");
  expect(screen.getByText(/This browser shows your markings/)).toBeTruthy();
  expect(screen.getByText("Notes and markings").closest("details")).toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Remove underline" })).toBeTruthy();
});
