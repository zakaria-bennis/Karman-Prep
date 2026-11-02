// The real QuizEngine (src/components/learn/QuizEngine.tsx and everything under it), built as a
// static bundle for the Quiet home page. Copied from the engine harness
// (.impeccable/mocks/redesign/engine/README.md); only this entry differs:
//   - the theme follows the page: ?theme= on load, then {karmanTheme} messages from the parent;
//   - a page-side stylesheet hides the controls that do nothing on a marketing page
//     (calculator, theme toggle, settings, menu, close, bookmark, flag, cross-out, transfer).
//     Highlight, the scratch pad, the timer with Hide Timer, Submit and Show explanations stay.
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { QuizProvider } from "@/contexts/QuizContext";
import QuizEngine from "@/components/learn/QuizEngine";
import { applyTheme, findTheme, SITE_THEMES, themeStyleSheet } from "@/lib/themes/palettes";
import "@/app/globals.css";
import "./embed.css";
import { poolFor } from "./questions";

const sheet = document.createElement("style");
sheet.setAttribute("data-theme-sheet", "");
sheet.textContent = themeStyleSheet();
document.head.append(sheet);

const params = new URLSearchParams(location.search);
function setTheme(id: string | null) {
  const theme = findTheme(id) ?? SITE_THEMES[0];
  try {
    localStorage.setItem("karman-theme:visitor", theme.id);
  } catch {
    /* fine */
  }
  applyTheme(theme);
}
setTheme(params.get("theme"));
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin) return;
  const id = e.data && typeof e.data === "object" ? e.data.karmanTheme : null;
  if (typeof id === "string") setTheme(id);
});

// Controls with no stable attribute are hidden by their visible label, after every render.
const HIDE_TEXT = new Set(["Previous", "Next", "Next question", "Finish", "Finish quiz", "Menu"]);
function hideExtras() {
  document.querySelectorAll<HTMLElement>("button, summary").forEach((el) => {
    const label = (el.textContent ?? "").trim();
    if (!HIDE_TEXT.has(label) && !label.startsWith("See results")) return;
    const target = el.tagName === "SUMMARY" ? (el.parentElement as HTMLElement) : el;
    if (target.style.display !== "none") target.style.display = "none";
  });
}
new MutationObserver(hideExtras).observe(document.body, { childList: true, subtree: true });

const { node } = poolFor(params.get("q") ?? "adv-3");

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <QuizProvider>
      <QuizEngine node={node} onClose={() => {}} onGoToNext={null} />
    </QuizProvider>
  </ThemeProvider>
);
