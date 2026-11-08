import { Suspense, lazy, useMemo, type ComponentType } from "react";
import { DeviceFrame, type Device } from "@/design-system/components/DeviceFrame";
import { Background } from "@/design-system/backgrounds/Background";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ConfettiLayer } from "@/design-system/components/Confetti";
import { ROUTES } from "./routes";
import type { Route, Settings } from "./hash";
import { SampleScreen } from "./SampleScreen";

const modules = import.meta.glob("../portals/**/*.tsx") as Record<
  string,
  () => Promise<{ default: ComponentType }>
>;

/** The screen for the current switches: a registered portal screen, or the sample when the portal has none yet. */
export function Screen({ settings }: { settings: Settings }) {
  const route =
    ROUTES.find(
      (r) =>
        r.portal === settings.portal &&
        (settings.screen ? r.id === settings.screen : true) &&
        r.roles.includes(settings.role as never)
    ) ?? ROUTES.find((r) => r.portal === settings.portal);
  const Comp = useMemo(() => {
    const loader = route ? modules[`../portals/${route.module}`] : null;
    return loader ? lazy(loader) : null;
  }, [route]);
  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas text-text">
      <Background hour={9} />
      <ConfettiLayer>
        <div className="relative z-[1] h-full">
          <Suspense
            fallback={
              <div className="p-5">
                <Skeleton.Text lines={4} />
              </div>
            }
          >
            {Comp ? <Comp /> : <SampleScreen />}
          </Suspense>
        </div>
      </ConfettiLayer>
    </div>
  );
}

/** #/screen/...: the screen alone, bare at the device's own viewport or inside the drawn frame. */
export function Stage({
  route,
}: {
  route: Route;
  go: (path: string[], patch: Partial<Settings>) => void;
}) {
  const s = route.settings;
  const device = s.device as Device;
  if (s.bare)
    return (
      <div className="h-dvh w-full">
        <DeviceFrame device={device} bare>
          <Screen settings={s} />
        </DeviceFrame>
      </div>
    );
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <DeviceFrame device={device}>
        <Screen settings={s} />
      </DeviceFrame>
    </div>
  );
}
