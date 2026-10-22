// The settings popover's Theme section (owner decision, 2026-10-22): Auto (the site or quiz theme),
// Classic and the 12 site skins, each a small swatch of our own drawing (the skin's paper with an
// accent dot) and its name, in two columns. It is a native radio group, so arrow keys move the
// choice as a radiogroup's do, Space picks the focused theme and so does Enter here; the choice
// applies at once and is remembered on the device (KarmanCalculator through ThemeChoiceContext).
// Only CSS variables and the shell's skin change, so the expressions and the view stay as they are.

import { createContext, useContext, useId, type CSSProperties, type JSX } from "react";
import {
  skinForChoice,
  themeChoiceName,
  THEME_CHOICES,
  type ThemeChoice,
} from "@/lib/calculator/theme/choice";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";

export interface ThemeChoiceValue {
  choice: ThemeChoice;
  choose(choice: ThemeChoice): void;
}

/** Provided by App from the shell store; absent (no Theme section) on harness pages. */
export const ThemeChoiceContext = createContext<ThemeChoiceValue | null>(null);

/** The swatch colours of a choice; Auto shows the skin it gives now. */
function swatchStyle(choice: ThemeChoice, siteTheme: string | undefined): CSSProperties {
  const { roles } = SKIN_COLORS[skinForChoice(choice, siteTheme)].normal;
  return {
    "--kc-swatch-paper": roles.paper,
    "--kc-swatch-accent": roles.accent,
    "--kc-swatch-edge": roles.boundary,
  } as CSSProperties;
}

export function ThemeSection(): JSX.Element | null {
  const theme = useContext(ThemeChoiceContext);
  const id = useId();
  if (theme === null) return null;
  const siteTheme = globalThis.document?.documentElement.dataset.theme;
  return (
    <div className="kc-settings-section kc-settings-theme">
      <div className="kc-settings-theme-title" id={`${id}-title`}>
        Theme
      </div>
      <div className="kc-theme-grid" role="radiogroup" aria-labelledby={`${id}-title`}>
        {THEME_CHOICES.map((choice) => (
          <label key={choice} className="kc-theme-option" data-theme-choice={choice}>
            <input
              type="radio"
              name={`${id}-theme`}
              value={choice}
              checked={theme.choice === choice}
              onChange={() => theme.choose(choice)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                theme.choose(choice);
              }}
            />
            <span
              className="kc-theme-swatch"
              aria-hidden="true"
              style={swatchStyle(choice, siteTheme)}
            />
            <span className="kc-theme-name">{themeChoiceName(choice)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
