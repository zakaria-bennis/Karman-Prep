import { useRef } from "react";
import { DeviceFrame, DEVICES, type Device } from "@/design-system/components/DeviceFrame";
import { useWidth } from "@/design-system/components/hooks";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Panel } from "@/design-system/glass/Panel";
import { Wordmark } from "@/design-system/components/Wordmark";
import { THEMES } from "@/design-system/themes";
import { PLANS, type PlanId } from "@/plans/plans";
import { BG_LABELS, BG_RECOMMENDED } from "@/design-system/backgrounds/alpha";
import { ROUTES, SWITCHES } from "./routes";
import type { Route, Settings } from "./hash";
import { Screen } from "./Stage";

const LABELS: Record<string, string> = {
  daily10: "Daily 10",
  private10: "Private 10",
  private20: "Private 20",
  "long-time": "Long-time user",
  "first-day": "First day",
  refract: "Refract (A)",
  frost: "Frost (B)",
  hanken: "Hanken Grotesk",
  plex: "IBM Plex",
  ipad: "iPad",
  narrow: "375",
  phone: "Phone",
};
const name = (v: string) => LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1);

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange(v: string): void;
}) {
  return (
    <label className="grid gap-1 text-dense">
      <span className="text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-tap rounded-control border border-border/70 bg-raised px-3 text-body text-text"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Start({
  route,
  go,
}: {
  route: Route;
  go: (path: string[], patch: Partial<Settings>) => void;
}) {
  const s = route.settings;
  const set = (patch: Partial<Settings>) => go([], patch);
  const host = useRef<HTMLDivElement>(null);
  const width = useWidth(host);
  const device = s.device as Device;
  const d = DEVICES[device];
  const frameW = d.w + (device === "desktop" ? 2 : device === "ipad" ? 36 : 20);
  const frameH = d.h + (device === "desktop" ? 38 : device === "ipad" ? 36 : 20);
  const scale = width ? Math.min(1, width / frameW) : 1;
  const screens = ROUTES.filter((r) => r.portal === s.portal);
  const seg = (k: keyof typeof SWITCHES, label: string) => (
    <div className="grid gap-1 text-dense">
      <span className="text-muted">{label}</span>
      <GlassSegmented
        label={label}
        fill
        value={s[k]}
        onChange={(v) => set({ [k]: v })}
        options={(SWITCHES[k] as readonly string[]).map((v) => ({ value: v, label: name(v) }))}
      />
    </div>
  );

  return (
    <div className="min-h-dvh text-text">
      <header className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="text-dense text-muted">portals gallery</span>
        </div>
        <a
          href="#/system"
          className="inline-flex min-h-tap items-center text-dense font-semibold text-accent"
        >
          Kitchen sink
        </a>
      </header>
      <div className="grid gap-6 px-5 pb-10 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel as="aside" className="grid content-start gap-4 p-4">
          <h1 className="text-section">Switches</h1>
          <Select
            label="Portal"
            value={s.portal}
            options={SWITCHES.portal.map((v) => ({ value: v, label: name(v) }))}
            onChange={(v) => set({ portal: v, screen: "" })}
          />
          <Select
            label="Screen"
            value={s.screen}
            options={[
              {
                value: "",
                label: screens.length
                  ? "First screen"
                  : "Sample screen (no screens registered yet)",
              },
              ...screens.map((r) => ({ value: r.id, label: r.title })),
            ]}
            onChange={(v) => set({ screen: v })}
          />
          <Select
            label="Role"
            value={s.role}
            options={SWITCHES.role.map((v) => ({ value: v, label: name(v) }))}
            onChange={(v) => set({ role: v })}
          />
          <Select
            label="Plan"
            value={s.plan}
            options={SWITCHES.plan.map((v) => ({
              value: v,
              label: `${PLANS[v as PlanId].name}${PLANS[v as PlanId].priceLabel ? `, ${PLANS[v as PlanId].priceLabel}` : ""}`,
            }))}
            onChange={(v) => set({ plan: v })}
          />
          <Select
            label="State"
            value={s.state}
            options={SWITCHES.state.map((v) => ({ value: v, label: name(v) }))}
            onChange={(v) => set({ state: v })}
          />
          {seg("device", "Device")}
          <Select
            label="Theme"
            value={s.theme}
            options={[
              { value: "", label: "Follow the mode" },
              ...THEMES.map((t) => ({ value: t.id, label: `${t.name} (${t.accentName})` })),
            ]}
            onChange={(v) => set({ theme: v })}
          />
          {seg("mode", "Mode")}
          {seg("type", "Type")}
          <Select
            label="Background"
            value={s.bg}
            options={SWITCHES.bg.map((v) => ({
              value: v,
              label: `${BG_LABELS[v]}${v === BG_RECOMMENDED ? " (recommended)" : ""}`,
            }))}
            onChange={(v) => set({ bg: v })}
          />
          {seg("glass", "Glass")}
          <p className="text-small text-muted">
            Every switch is in the address, so a link opens the same view. The theme switch
            overrides the mode; the mode follows the device by default.
          </p>
        </Panel>
        <div ref={host} className="min-w-0">
          <div style={{ width: frameW * scale, height: frameH * scale }}>
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: frameW,
                height: frameH,
              }}
            >
              <DeviceFrame device={device}>
                <Screen settings={s} />
              </DeviceFrame>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
