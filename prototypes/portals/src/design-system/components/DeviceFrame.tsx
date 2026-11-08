import type { ReactNode } from "react";
import { cn } from "../cn";

/*
 * DeviceFrame: the sizes screens ship at, drawn in code. Phone is the iPhone 17
 * Pro Max at 440 by 956 points with a thin bezel and the Dynamic Island (rule
 * 58); narrow is the same frame at 375 by 812 for the width check; iPad is 834
 * by 1194; desktop is a 1440 by 900 window. `bare` drops the chrome and lets
 * the screen fill its host, for screenshots at the device's own viewport.
 */
export type Device = "phone" | "narrow" | "ipad" | "desktop";
export const DEVICES: Record<Device, { w: number; h: number; label: string }> = {
  phone: { w: 440, h: 956, label: "iPhone 17 Pro Max" },
  narrow: { w: 375, h: 812, label: "375 wide" },
  ipad: { w: 834, h: 1194, label: "iPad" },
  desktop: { w: 1440, h: 900, label: "Desktop" },
};

export function DeviceFrame({
  device,
  bare = false,
  children,
  className,
}: {
  device: Device;
  bare?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const d = DEVICES[device];
  if (bare)
    return (
      <div className={cn("relative h-full w-full overflow-hidden bg-canvas", className)}>
        {children}
      </div>
    );
  if (device === "desktop")
    return (
      <div
        className={cn("overflow-hidden rounded-[10px] border border-line bg-raised", className)}
        style={{ width: d.w + 2, height: d.h + 38 }}
      >
        <div className="flex h-9 items-center gap-1.5 px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-border/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-border/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-border/70" />
          <span className="ml-3 h-5 flex-1 rounded-chip bg-canvas/70" />
        </div>
        <div className="relative overflow-hidden bg-canvas" style={{ width: d.w, height: d.h }}>
          {children}
        </div>
      </div>
    );
  const phone = device !== "ipad";
  const bezel = phone ? 10 : 18;
  const radius = phone ? 58 : 26;
  return (
    <div
      className={cn("relative bg-[#121212]", className)}
      style={{
        width: d.w + bezel * 2,
        height: d.h + bezel * 2,
        borderRadius: radius,
        padding: bezel,
        boxShadow: "inset 0 0 0 2px #2a2a2a",
      }}
    >
      <div
        className="relative overflow-hidden bg-canvas"
        style={{ width: d.w, height: d.h, borderRadius: radius - bezel }}
      >
        {children}
        {phone ? (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[11px] z-[70] h-[37px] w-[126px] -translate-x-1/2 rounded-pill bg-[#0a0a0a]"
          />
        ) : null}
      </div>
    </div>
  );
}
