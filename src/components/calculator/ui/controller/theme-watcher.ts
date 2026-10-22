// TH-15 live theme: a MutationObserver on the page root (`data-theme`, `class`) and media-query
// listeners for contrast and forced colours. The skin is always resolveSkinId(root.dataset.theme),
// so the calculator follows the quiz's site theme, light and dark alike, and is "classic" when no
// site theme applies. A prefers-contrast or forced-colors change keeps the skin and bumps
// `revision` by one, so the shell re-applies its roles and repaints without toggling Reverse
// contrast (S-4). A host that pins a skin (the public /calculator page pins "classic") keeps that
// skin whatever the site theme is, and still gets the contrast and forced-colour revisions.

import { resolveSkinId } from "@/lib/calculator/theme/roles";
import type { SkinId } from "@/lib/calculator/theme/skins";
import { watchMediaQuery, type MediaQuerySource, type Watch } from "./media";

export interface ThemeState {
  skin: SkinId;
  revision: number;
}

const CONTRAST_QUERY = "(prefers-contrast: more)";
const FORCED_COLORS_QUERY = "(forced-colors: active)";

/** Calls `on` with the re-resolved state after every root mutation batch and media change. */
export function watchTheme(
  root: HTMLElement,
  m: MediaQuerySource,
  on: (s: ThemeState) => void,
  pinned?: SkinId
): Watch<ThemeState> {
  let revision = 0;
  const state = (): ThemeState => ({
    skin: pinned ?? resolveSkinId(root.dataset.theme),
    revision,
  });
  const emit = () => on(state());
  const bumpRevision = () => {
    revision += 1;
    emit();
  };

  const watches = [
    watchMediaQuery(m, CONTRAST_QUERY, bumpRevision),
    watchMediaQuery(m, FORCED_COLORS_QUERY, bumpRevision),
  ];
  const observer = new MutationObserver(emit);
  if (pinned === undefined) {
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
  }

  return {
    initial: state(),
    dispose() {
      observer.disconnect();
      for (const watch of watches) watch.dispose();
    },
  };
}
