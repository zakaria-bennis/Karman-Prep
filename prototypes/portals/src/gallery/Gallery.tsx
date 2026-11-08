import {
  ThemeProvider,
  type BgVariant,
  type GlassRecipe,
  type Mode,
  type TypeFace,
} from "@/design-system/theme";
import { PlanProvider } from "@/plans/PlanProvider";
import type { PlanId } from "@/plans/plans";
import { MockProvider, type MockState } from "@/mock/state";
import { ToastProvider } from "@/design-system/components/Toast";
import { useHash } from "./hash";
import { Start } from "./Start";
import { System } from "./System";
import { Stage } from "./Stage";

/**
 * The gallery: #/ is the start page with the switches, #/system the kitchen
 * sink, #/screen/<portal>/<id> one screen. Every switch lives in the hash so a
 * screenshot script can open any combination; the theme provider takes the
 * hash's theme, mode, type, background and glass as its initial values.
 */
export function Gallery() {
  const [route, go] = useHash();
  const s = route.settings;
  const key = `${s.theme}|${s.mode}|${s.type}|${s.bg}|${s.glass}`;
  return (
    <ThemeProvider
      key={key}
      initial={{
        theme: s.theme || null,
        mode: s.mode as Mode,
        type: s.type as TypeFace,
        bg: s.bg as BgVariant,
        glass: s.glass as GlassRecipe,
      }}
    >
      <PlanProvider plan={s.plan as PlanId}>
        <MockProvider state={s.state as MockState}>
          <ToastProvider>
            {route.path[0] === "system" ? (
              <System route={route} go={go} />
            ) : route.path[0] === "screen" ? (
              <Stage route={route} go={go} />
            ) : (
              <Start route={route} go={go} />
            )}
          </ToastProvider>
        </MockProvider>
      </PlanProvider>
    </ThemeProvider>
  );
}
