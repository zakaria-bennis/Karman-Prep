// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountMenu from "./AccountMenu";

afterEach(cleanup);

const items = [
  { label: "Settings", icon: "settings" as const, href: "/dashboard/student/settings" },
  { label: "Invite a parent", icon: "invite" as const, href: "/dashboard/student/invite-parent" },
  { label: "Sign out", icon: "signout" as const, quiet: true, onSelect: vi.fn() },
];

function open() {
  render(<AccountMenu name="Maya" detail="maya@example.com" items={items} />);
  fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
  return screen.getByRole("menu", { name: "Account" });
}

describe("account menu", () => {
  it("drops down a list: name and email, one row per item, Sign out last", () => {
    const menu = open();
    expect(menu.textContent).toContain("Maya");
    expect(menu.textContent).toContain("maya@example.com");
    const rows = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(rows).toEqual(["Settings", "Invite a parent", "Sign out"]);
    expect(menu.querySelector(".kp-menu-grid, .kp-tile")).toBeNull();
    expect(screen.getByRole("separator")).toBeTruthy();
  });

  it("moves with the arrow keys and closes on Escape", () => {
    const menu = open();
    const rows = screen.getAllByRole("menuitem");
    rows[0].focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(rows[2]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
