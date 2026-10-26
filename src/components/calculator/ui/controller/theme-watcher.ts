// TH-15 live theme: a MutationObserver on the page root (`data-theme`, `class`) and media-query
// listeners for contrast and forced colours. The skin is skinForChoice(choice, root.dataset.theme):
// with the "auto" choice the calculator follows the quiz's site theme, light and dark alike, and is
// "classic" when no site theme applies; any other choice (the student's theme picker, or the
// host's default, Classic on /calculator) keeps that skin whatever the site theme is. setChoice
// switches at once. A prefers-contrast or forced-colors change keeps the skin and bumps `revision`
// by one, so the shell re-applies its roles and repaints (S-4).
// The OS colour scheme plays no part.

import { skinForChoice, type ThemeChoice } from "@/lib/calculator/theme/choice";
import type { SkinId } from "@/lib/calculator/theme/skins";
import { watchMediaQuery, type MediaQuerySource, type Watch } from "./media";

export interface ThemeState {
  choice: ThemeChoice;
  skin: SkinId;
  revision: number;
}

export interface ThemeWatch extends Watch<ThemeState> {
  /** Applies a new choice at once; `on` hears the new state when it differs. */
  setChoice(choice: ThemeChoice): void;
}

const CONTRAST_QUERY = "(prefers-contrast: more)";
const FORCED_COLORS_QUERY = "(forced-colors: active)";

/** Calls `on` with the re-resolved state after every root mutation batch and media change. */
export function watchTheme(
  root: HTMLElement,
  m: MediaQuerySource,
  on: (s: ThemeState) => void,
  initialChoice: ThemeChoice
): ThemeWatch {
  let revision = 0;
  let choice = initialChoice;
  const state = (): ThemeState => ({
    choice,
    skin: skinForChoice(choice, root.dataset.theme),
    revision,
  });
  let last = state();
  const emit = () => {
    const next = state();
    if (next.choice === last.choice && next.skin === last.skin && next.revision === last.revision)
      return;
    last = next;
    on(next);
  };
  const bumpRevision = () => {
    revision += 1;
    emit();
  };

  const watches = [
    watchMediaQuery(m, CONTRAST_QUERY, bumpRevision),
    watchMediaQuery(m, FORCED_COLORS_QUERY, bumpRevision),
  ];
  const observer = new MutationObserver(emit);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });

  return {
    initial: last,
    setChoice(next) {
      choice = next;
      emit();
    },
    dispose() {
      observer.disconnect();
      for (const watch of watches) watch.dispose();
    },
  };
}
