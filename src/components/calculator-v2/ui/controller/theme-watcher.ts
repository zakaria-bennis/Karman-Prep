// TH-15 live theme: a MutationObserver on the page root (`data-theme`, `class`) and media-query
// listeners for the colour scheme, contrast and forced colours. The skin is always
// resolveSkinId(root.dataset.theme ?? null, prefersDark) (TH-5). A prefers-contrast or
// forced-colors change keeps the skin and bumps `revision` by one, so the shell re-applies its
// roles and repaints without toggling Reverse contrast (S-4).

import { resolveSkinId } from "@/lib/calculator-v2/theme/roles";
import type { SkinId } from "@/lib/calculator-v2/theme/skins";
import { watchMediaQuery, type MediaQuerySource, type Watch } from "./media";

export interface ThemeState {
  skin: SkinId;
  revision: number;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CONTRAST_QUERY = "(prefers-contrast: more)";
const FORCED_COLORS_QUERY = "(forced-colors: active)";

/** Calls `on` with the re-resolved state after every root mutation batch and media change. */
export function watchTheme(
  root: HTMLElement,
  m: MediaQuerySource,
  on: (s: ThemeState) => void
): Watch<ThemeState> {
  let prefersDark = false;
  let revision = 0;
  const state = (): ThemeState => ({
    skin: resolveSkinId(root.dataset.theme ?? null, prefersDark),
    revision,
  });
  const emit = () => on(state());
  const bumpRevision = () => {
    revision += 1;
    emit();
  };

  const dark = watchMediaQuery(m, DARK_QUERY, (matches) => {
    prefersDark = matches;
    emit();
  });
  prefersDark = dark.initial;
  const watches = [
    dark,
    watchMediaQuery(m, CONTRAST_QUERY, bumpRevision),
    watchMediaQuery(m, FORCED_COLORS_QUERY, bumpRevision),
  ];
  const observer = new MutationObserver(emit);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });

  return {
    initial: state(),
    dispose() {
      observer.disconnect();
      for (const watch of watches) watch.dispose();
    },
  };
}
