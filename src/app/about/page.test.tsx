// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/landing/Navbar", () => ({ default: () => null }));
vi.mock("@/components/landing/Footer", () => ({ default: () => null }));

import AboutPage from "./page";

describe("About page", () => {
  it("describes available paths without outcome or founder-ownership claims", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", { name: /SAT practice with a clearer reason/i })
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Explore the diagnostic/i }).getAttribute("href")).toBe(
      "/diagnostic"
    );
    expect(screen.getByRole("link", { name: /Email Karman support/i }).getAttribute("href")).toBe(
      "mailto:support@karmanprep.com"
    );
    expect(document.body.textContent).not.toMatch(/\+285|2,400|94%|1,200|Nabil|predicted score/i);
  });
});
