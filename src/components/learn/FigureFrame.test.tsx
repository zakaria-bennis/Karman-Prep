// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FigureFrame from "./FigureFrame";
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" data-figure-theme="karman-v1"><rect width="100" height="100" fill="#070605"/><text x="10" y="20" fill="#f3ecdd">28</text></svg>';
const response = (body: string) => ({ ok: true, headers: new Headers(), text: async () => body });
afterEach(() => vi.unstubAllGlobals());
describe("SVG figure loading and question alignment", () => {
  it("replaces an external SVG image with sanitized theme-aware vector paint", async () => {
    const fetch = vi.fn().mockResolvedValue(response(svg));
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<FigureFrame src="/reviewed.svg" alt="Current triangle" />);
    await waitFor(() => expect(container.querySelector("svg rect")).not.toBeNull());
    expect(screen.getByRole("img", { name: "Current triangle" }).tagName.toLowerCase()).toBe("svg");
    expect(container.querySelector("svg rect")).toHaveAttribute(
      "fill",
      "var(--figure-background, #070605)"
    );
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
  });
  it("never lets a late previous-question response replace the current figure", async () => {
    let resolveFirst!: (value: ReturnType<typeof response>) => void;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce(response(svg.replace("28", "11")));
    vi.stubGlobal("fetch", fetch);
    const rendered = render(<FigureFrame src="/a.svg" alt="Question A" />);
    rendered.rerender(<FigureFrame src="/b.svg" alt="Question B" />);
    await waitFor(() =>
      expect(rendered.container.querySelector("svg text")).toHaveTextContent("11")
    );
    resolveFirst(response(svg));
    await Promise.resolve();
    expect(screen.queryByRole("img", { name: "Question A" })).not.toBeInTheDocument();
    expect(rendered.container.querySelector("svg text")).toHaveTextContent("11");
  });
  it("keeps an accessible image fallback when CORS or sanitizer blocks inline rendering", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("CORS")));
    render(<FigureFrame src="https://assets.example.test/a.svg" alt="Current diagram" />);
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Current diagram" })).toHaveAttribute(
        "src",
        "https://assets.example.test/a.svg"
      )
    );
  });
  it("does not recolor or refetch raster source figures", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<FigureFrame src="/source.png" alt="Original source colors" />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("img")).not.toHaveAttribute("style");
  });
});
