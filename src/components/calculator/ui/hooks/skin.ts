// The current skin for the calculator UI (01-interfaces-runtime.md section 8.1). 10's App provides it from
// resolveSkinId and re-provides it on every TH-15 change; harness-kit provides it on harness
// pages. 08's GraphPanel and 09's row swatches read it through resolveRowColor(row.color, skin).

import { createContext, useContext } from "react";
import type { SkinId } from "@/lib/calculator/theme/skins";

export const SkinContext = createContext<SkinId>("ivory");

export function useSkin(): SkinId {
  return useContext(SkinContext);
}
