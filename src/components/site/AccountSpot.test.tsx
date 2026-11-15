// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn());
const openUserProfile = vi.hoisted(() => vi.fn());
const who = vi.hoisted(() => ({
  user: null as null | { firstName: string; hasImage: boolean; imageUrl: string },
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: who.user }),
  useClerk: () => ({ signOut, openUserProfile }),
}));

import AccountSpot from "./AccountSpot";

beforeEach(() => {
  signOut.mockReset();
  who.user = { firstName: "Mari", hasImage: false, imageUrl: "https://img.example/stand-in.png" };
});
afterEach(cleanup);

describe("the picture at the top right of the site", () => {
  it("shows the person's initial, not Clerk's stand-in picture", () => {
    const { container } = render(<AccountSpot label="Go to your portal" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Go to your portal" }).textContent).toBe("M");
  });

  it("shows their own picture when they have one, and their initial if it will not load", () => {
    who.user = { firstName: "Mari", hasImage: true, imageUrl: "https://img.example/mari.png" };
    const { container } = render(<AccountSpot label="Go to your portal" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://img.example/mari.png");
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
  });

  it("opens a menu with the portal and Sign out, which leads back to the home page", () => {
    render(<AccountSpot label="Go to your portal" />);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Go to your portal" }));
    expect(screen.getByRole("menuitem", { name: "Go to your portal" }).getAttribute("href")).toBe(
      "/dashboard/student"
    );
    expect(screen.getByRole("menuitem", { name: "Billing" }).getAttribute("href")).toBe("/billing");
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  it("closes on Escape", () => {
    render(<AccountSpot label="Go to your portal" />);
    fireEvent.click(screen.getByRole("button", { name: "Go to your portal" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
