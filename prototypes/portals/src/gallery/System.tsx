import { Wordmark } from "@/design-system/components/Wordmark";
import { Background } from "@/design-system/backgrounds/Background";
import { ConfettiLayer } from "@/design-system/components/Confetti";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { THEMES } from "@/design-system/themes";
import type { Route, Settings } from "./hash";
import { SWITCHES } from "./routes";
import { SystemTokens } from "./SystemTokens";
import { SystemGlass } from "./SystemGlass";
import { SystemIcons } from "./SystemIcons";
import { SystemComponents } from "./SystemComponents";
import { SystemForms } from "./SystemForms";
import { SystemData } from "./SystemData";

const SECTIONS = [
  ["tokens", "Tokens"],
  ["backgrounds", "Backgrounds"],
  ["glass", "Glass and panels"],
  ["icons", "Icons and marks"],
  ["components", "Components"],
  ["forms", "Welcome and onboarding"],
  ["data", "Data and navigation"],
] as const;

/** #/system: the kitchen sink. One h1, one left edge, every token, component and state. */
export function System({
  route,
  go,
}: {
  route: Route;
  go: (path: string[], patch: Partial<Settings>) => void;
}) {
  const s = route.settings;
  const set = (patch: Partial<Settings>) => go(["system"], patch);
  return (
    <div className="relative min-h-dvh text-text">
      <Background hour={9} />
      <ConfettiLayer>
        <div className="relative z-[1]">
          <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
            <a href="#/" className="flex items-center gap-3">
              <Wordmark />
              <span className="text-dense text-muted">design system</span>
            </a>
            <nav aria-label="Sections" className="flex flex-wrap gap-x-4 gap-y-1 text-dense">
              {SECTIONS.map(([id, label]) => (
                <a
                  key={id}
                  href={`#/system?${location.hash.split("?")[1] ?? ""}#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ block: "start" });
                  }}
                  className="inline-flex min-h-tap items-center font-semibold text-accent"
                >
                  {label}
                </a>
              ))}
            </nav>
          </header>
          <main className="mx-auto grid max-w-[1040px] gap-14 px-5 pb-20 pt-4 sm:px-8">
            <section className="grid gap-4">
              <h1 className="text-title">Karman portals design system</h1>
              <p className="max-w-[64ch] text-body text-muted">
                Every token, control and component the four portals are built from, in the current
                theme. The switches below are the same ones the gallery carries in its address.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1 text-dense">
                  <span className="text-muted">Theme</span>
                  <select
                    value={s.theme}
                    onChange={(e) => set({ theme: e.target.value })}
                    className="min-h-tap rounded-control border border-border/70 bg-raised px-3 text-body text-text"
                  >
                    <option value="">Follow the mode</option>
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.accentName})
                      </option>
                    ))}
                  </select>
                </label>
                {(["mode", "type", "glass"] as const).map((k) => (
                  <div key={k} className="grid gap-1 text-dense">
                    <span className="text-muted">
                      {k === "mode" ? "Mode" : k === "type" ? "Type" : "Glass recipe"}
                    </span>
                    <GlassSegmented
                      label={k}
                      fill
                      value={s[k]}
                      onChange={(v) => set({ [k]: v })}
                      options={(SWITCHES[k] as readonly string[]).map((v) => ({
                        value: v,
                        label:
                          v === "hanken"
                            ? "Hanken"
                            : v === "plex"
                              ? "Plex"
                              : v.charAt(0).toUpperCase() + v.slice(1),
                      }))}
                    />
                  </div>
                ))}
              </div>
            </section>
            <SystemTokens />
            <SystemGlass bg={s.bg} onBg={(bg) => set({ bg })} />
            <SystemIcons />
            <SystemComponents />
            <SystemForms />
            <SystemData />
          </main>
        </div>
      </ConfettiLayer>
    </div>
  );
}

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-4 gap-5">
      <div className="grid gap-1">
        <h2 className="text-title">{title}</h2>
        {intro ? <p className="max-w-[64ch] text-body text-muted">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Sub({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 ${className}`}>
      <h3 className="text-section">{title}</h3>
      {children}
    </div>
  );
}
