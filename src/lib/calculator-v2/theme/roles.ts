// Theme roles of the calculator v2 (01-interfaces-runtime.md section 6): the custom property maps
// and the TH-5 skin fallback.
import { SKIN_IDS, type SkinId } from "./skins";

export { ROLE_VARS, CURVE_VARS, FILL_ALPHA_VARS, CHROME_VARS, type ChromeRole } from "./vars";

/**
 * TH-5: the site theme id when it is one of the 12 skins, else Warm ivory or Observatory by
 * `prefers-color-scheme`.
 */
export function resolveSkinId(themeId: string | null | undefined, prefersDark: boolean): SkinId {
  if (isSkinId(themeId)) return themeId;
  return prefersDark ? "observatory" : "ivory";
}

function isSkinId(id: string | null | undefined): id is SkinId {
  return typeof id === "string" && (SKIN_IDS as readonly string[]).includes(id);
}
