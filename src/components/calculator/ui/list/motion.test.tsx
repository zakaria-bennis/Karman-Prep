// @vitest-environment jsdom
import { act, fireEvent, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { panelProps, renderEditor, rowItem } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";
import { useRowPresence } from "./row-presence";

afterEach(() => vi.useRealTimers());
const view = (id: string) => ({ id }) as RowView;

it("AN-5 new rows render enter for one commit and removed rows stay as exit until exitDone", () => {
  const seen: string[] = [];
  const { result, rerender } = renderHook(
    ({ rows }) => {
      const presence = useRowPresence(rows);
      seen.push(presence.items.map((i) => `${i.row.id}:${i.motion}`).join(" "));
      return presence;
    },
    { initialProps: { rows: [view("1"), view("2"), view("3")] } }
  );
  expect(seen[0]).toBe("1:idle 2:idle 3:idle");
  rerender({ rows: [view("1"), view("3"), view("4")] });
  expect(seen).toContain("1:idle 2:exit 3:idle 4:enter");
  expect(seen.at(-1)).toBe("1:idle 2:exit 3:idle 4:idle");
  act(() => result.current.exitDone("2"));
  expect(seen.at(-1)).toBe("1:idle 3:idle 4:idle");
});

it("AN-5 an exiting row is inert, unnumbered and removed after its exit duration", () => {
  vi.useFakeTimers();
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "y=2x", "y=3x"],
    durationMs: 100,
  });
  act(() => kit.engine.removeExpression({ id: "2" }));
  expect(rowItem("2")).toHaveAttribute("data-motion", "exit");
  expect(rowItem("2")).toHaveAttribute("aria-hidden", "true");
  expect(
    [...document.querySelectorAll("li:not([data-motion=exit]) .kc-row-number")].map(
      (n) => n.textContent
    )
  ).toEqual(["1", "2"]);
  act(() => vi.advanceTimersByTime(99));
  expect(document.querySelector('li[data-row-id="2"]')).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(document.querySelector('li[data-row-id="2"]')).toBeNull();
});

it("AN-3, EL-49 Collapse list and Expand list flip expressionsCollapsed at once and slide for their duration", () => {
  vi.useFakeTimers();
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x"],
    durationMs: 200,
  });
  const panel = document.querySelector(".kc-list-panel")!;
  fireEvent.click(screen.getByRole("button", { name: "Collapse list" }));
  expect(panel).toHaveAttribute("data-list-state", "collapsing");
  expect(kit.engine.settings.expressionsCollapsed).toBe(true); // the graph resizes on frame 1
  // Expand list mounts on the first frame, so its delayed fade-in starts with the slide.
  expect(screen.getByRole("button", { name: "Expand list" })).not.toHaveFocus();
  act(() => vi.advanceTimersByTime(199));
  expect(panel).toHaveAttribute("data-list-state", "collapsing");
  act(() => vi.advanceTimersByTime(1));
  expect(panel).toHaveAttribute("data-list-state", "collapsed");
  expect(screen.queryByRole("list", { name: "Expressions" })).toBeNull();
  expect(screen.getByRole("button", { name: "Expand list" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Expand list" }));
  expect(panel).toHaveAttribute("data-list-state", "expanding");
  expect(kit.engine.settings.expressionsCollapsed).toBe(false);
  act(() => vi.advanceTimersByTime(200));
  expect(panel).toHaveAttribute("data-list-state", "expanded");
  expect(screen.getByRole("button", { name: "Collapse list" })).toHaveFocus();
});
