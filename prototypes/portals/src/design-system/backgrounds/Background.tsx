import { useTheme, type BgVariant } from "../theme";
import { Sky } from "./Sky";
import { Ruled } from "./Ruled";
import { Contour } from "./Contour";
import { Grain } from "./Grain";

/**
 * The background world behind a screen (rule 49, now one of four options).
 * Place it first inside a `relative` container; it fills the container, sits
 * under the content, never takes pointer events and stops under reduced motion.
 */
export function Background({ variant, hour }: { variant?: BgVariant; hour?: number }) {
  const theme = useTheme();
  const v = variant ?? theme.bg;
  if (v === "sky") return <Sky />;
  if (v === "ruled") return <Ruled />;
  if (v === "grain") return <Grain hour={hour} />;
  return <Contour />;
}

export { BG_LABELS, BG_RECOMMENDED, BG_MAX_ALPHA } from "./alpha";
