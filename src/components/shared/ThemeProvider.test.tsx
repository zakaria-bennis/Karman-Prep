// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  account: {
    user: null as null | {
      id: string;
      unsafeMetadata: Record<string, unknown>;
      reload: () => Promise<void>;
    },
    isLoaded: true,
  },
  save: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useUser: () => mock.account }));
vi.mock("@/app/appearance/actions", () => ({ saveThemePreference: mock.save }));
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
function Controls() {
  const { theme, setTheme, notice, saving } = useTheme();
  return (
    <>
      <output>{theme}</output>
      <button disabled={saving} onClick={() => setTheme("sage")}>
        Sage
      </button>
      <p>{notice}</p>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "observatory";
  document.documentElement.classList.add("dark");
  mock.account = {
    user: {
      id: "a",
      unsafeMetadata: { karmanTheme: "paper", existing: "keep" },
      reload: async () => {},
    },
    isLoaded: true,
  };
  mock.save.mockReset().mockResolvedValue(undefined);
});
describe("account theme persistence", () => {
  it("restores the account choice and saves only the selected ID", async () => {
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    );
    expect(screen.getByRole("status")).toHaveTextContent("paper");
    fireEvent.click(screen.getByText("Sage"));
    await waitFor(() => expect(screen.getByText("Saved to your account.")).toBeInTheDocument());
    expect(mock.save).toHaveBeenCalledWith("sage");
    expect(localStorage.getItem("karman-theme:a")).toBe("sage");
    expect(localStorage.getItem("karman-theme:active")).toBe("sage");
    expect(mock.account.user?.unsafeMetadata.existing).toBe("keep");
  });
  it("reports a sync failure without claiming an account save", async () => {
    mock.save.mockRejectedValue(new Error("Offline"));
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText("Sage"));
    await screen.findByText(/Account sync failed/);
    expect(document.documentElement.dataset.theme).toBe("sage");
    expect(screen.getByText("Sage")).toBeEnabled();
  });
  it("isolates accounts and restores a new account rather than the previous device choice", () => {
    const rendered = render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    );
    localStorage.setItem("karman-theme:a", "rose");
    mock.account = {
      user: { id: "b", unsafeMetadata: {}, reload: async () => {} },
      isLoaded: true,
    };
    rendered.rerender(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    );
    expect(document.documentElement.dataset.theme).toBe("observatory");
  });
  it("migrates the old visitor preference without assigning it to a signed-in account", () => {
    localStorage.setItem("karman-theme", "light");
    mock.account = { user: null, isLoaded: true };
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    );
    expect(document.documentElement.dataset.theme).toBe("ivory");
    fireEvent.click(screen.getByText("Sage"));
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("keeps the explicit device choice when account metadata is stale", () => {
    localStorage.setItem("karman-theme:a", "forest");
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    );
    expect(document.documentElement.dataset.theme).toBe("forest");
    expect(localStorage.getItem("karman-theme:active")).toBe("forest");
  });
  it("switches by keyboard and remembers the last palette in each mode", async () => {
    const user = userEvent.setup();
    mock.account = { user: null, isLoaded: true };
    localStorage.setItem("karman-theme:visitor", "sage");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const darkButton = screen.getByRole("button", { name: "Toggle light and dark mode" });
    await user.tab();
    expect(darkButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(document.documentElement.dataset.theme).toBe("observatory");
    expect(screen.getByRole("button", { name: "Toggle light and dark mode" })).toBeInTheDocument();
    await user.keyboard(" ");
    expect(document.documentElement.dataset.theme).toBe("sage");
    expect(localStorage.getItem("karman-theme:active")).toBe("sage");
  });
  it("lets a visitor switch while account loading and keeps that choice on load", async () => {
    mock.account = { user: null, isLoaded: false };
    const rendered = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle light and dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("ivory");
    mock.account = {
      user: { id: "a", unsafeMetadata: { karmanTheme: "paper" }, reload: async () => {} },
      isLoaded: true,
    };
    rendered.rerender(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    await waitFor(() => expect(mock.save).toHaveBeenCalledWith("ivory"));
    expect(document.documentElement.dataset.theme).toBe("ivory");
    expect(localStorage.getItem("karman-theme:a")).toBe("ivory");
  });
});
