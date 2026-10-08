// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
vi.mock("server-only", () => ({}));
import {
  PRIVATE_Q283_QUESTION_ID,
  PRIVATE_Q283_SVG,
  PRIVATE_Q283_SVG_SHA256,
} from "@/lib/question-bank/private-q283-svg";
import FigureFrame from "./FigureFrame";

const src = `/admin/questions/student-view/${PRIVATE_Q283_QUESTION_ID}/figure/${PRIVATE_Q283_SVG_SHA256}?payload_sha256=${"a".repeat(64)}`;
afterEach(() => vi.unstubAllGlobals());
describe("authenticated private figure in the actual student renderer", () => {
  it("fetches the extensionless private route with same-origin cookies and sanitizes the exact corrected vector", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Length": "11459" }),
      text: async () => PRIVATE_Q283_SVG,
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<FigureFrame src={src} alt="Corrected Q283 figure" />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(fetch.mock.calls[0][0]).toBe(src);
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "same-origin" });
    expect(screen.getByRole("img", { name: "Corrected Q283 figure" }).tagName).toBe("svg");
    expect(container.querySelector("svg rect")).toHaveAttribute(
      "fill",
      "var(--figure-background, #070605)"
    );
    expect(
      container.querySelector("svg path[d='M51.0 264.3728222996516L321.0 292.16027874564463']")
    ).not.toBeNull();
    expect(container.querySelectorAll("svg circle")).toHaveLength(2);
    expect(container.querySelector("svg style")).toBeNull();
    expect(container.querySelector("svg metadata")).toBeNull();
  });
  it("inserts no SVG after the protected request is denied", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<FigureFrame src={src} alt="Held private figure" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByRole("img")).toHaveAttribute("src", src);
  });
});
