import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { TopBar } from "@/design-system/components/TopBar";
import { BottomBar } from "@/design-system/components/BottomBar";
import { IconRail, type RailItem } from "@/design-system/components/IconRail";
import { Sheet } from "@/design-system/components/Sheet";
import { Row, List } from "@/design-system/components/Row";
import { useWidth } from "@/design-system/components/hooks";
import { GlassToggle } from "@/design-system/glass/GlassToggle";
import { useTheme } from "@/design-system/theme";
import { THEMES } from "@/design-system/themes";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import { SCHOOL } from "@/mock";
import { goScreen, hrefFor, type Role, type ScreenId } from "./nav";
import { useSchoolData } from "./data";

/**
 * The school portal's frame: a slim icon rail on desktop and iPad, a bottom
 * bar on phones (rule 52), one h1 per screen, one highlighted action in the
 * title row on desktop and in an opaque strip above the bottom bar on phones
 * (thumb reach, never over text, never under the home indicator). The admin
 * and the teacher get their own few destinations (Hick, Jakob: a rail and a
 * bottom bar like the apps they already use). Layouts fold by the shell's
 * measured width, so the gallery's framed phone folds too.
 */
const NAV: Record<Role, RailItem[]> = {
  admin: [
    { id: "overview", label: "Overview", icon: "home" },
    { id: "classes", label: "Classes", icon: "classes" },
    { id: "keys", label: "Seat keys", icon: "keys" },
    { id: "teachers", label: "Teachers", icon: "tutor" },
  ],
  teacher: [
    { id: "classes", label: "Classes", icon: "classes" },
    { id: "students", label: "Students", icon: "students" },
    { id: "practice", label: "Practice", icon: "book" },
  ],
};
const SEATS: RailItem = { id: "seats", label: "Seats and plan", icon: "school" };
const SETTINGS: RailItem = { id: "settings", label: "Settings", icon: "settings" };
const MORE: RailItem = { id: "more", label: "More", icon: "more" };
const ACTIVE: Record<ScreenId, string> = {
  portal: "overview",
  overview: "overview",
  classes: "classes",
  class: "classes",
  students: "students",
  student: "students",
  practice: "practice",
  keys: "keys",
  teachers: "teachers",
  seats: "seats",
};

export const LayoutCtx = createContext({ width: 1440, desktop: true, phone: false });
export const useLayout = () => useContext(LayoutCtx);

export function SchoolShell({
  screen,
  title,
  finding,
  primary,
  back,
  children,
}: {
  screen: ScreenId;
  title: string;
  /** The one finding, under the title: about the data, never about the interface. */
  finding?: ReactNode;
  /** The screen's one highlighted action. */
  primary?: ReactNode;
  back?: { label: string; to: ScreenId };
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const measured = useWidth(host);
  const width = measured || (typeof window !== "undefined" ? window.innerWidth : 1440);
  const desktop = width >= 700;
  const phone = width < 600;
  const [sheet, setSheet] = useState<null | "more" | "settings">(null);
  const data = useSchoolData();
  const main = NAV[data.role];
  const bottomRail = data.role === "admin" ? [SEATS, SETTINGS] : [SETTINGS];
  const bar = data.role === "admin" ? [...main, MORE] : [...main, SETTINGS];
  const active = ACTIVE[screen] ?? (data.role === "admin" ? "overview" : "classes");
  const nav = (id: string) => {
    if (id === "settings") setSheet("settings");
    else if (id === "more") setSheet("more");
    else goScreen(id as ScreenId);
  };
  const layout = { width, desktop, phone };
  return (
    <LayoutCtx.Provider value={layout}>
      <div
        ref={host}
        className="flex h-full w-full [&_[role=tab]:focus-visible]:outline-2 [&_[role=tab]:focus-visible]:outline-offset-2 [&_[role=tab]:focus-visible]:outline-accent"
      >
        {desktop ? (
          <IconRail items={main} bottom={bottomRail} active={active} onSelect={nav} />
        ) : null}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {phone ? (
            <div
              className="flex h-[54px] shrink-0 items-end px-7 pb-1.5 text-dense font-semibold"
              aria-hidden="true"
            >
              9:41
            </div>
          ) : null}
          {desktop ? null : (
            <TopBar
              title={title}
              leading={back ? "back" : "none"}
              onLeading={back ? () => goScreen(back.to) : undefined}
            />
          )}
          <main
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              desktop ? "px-6 py-6" : "px-4 pb-8 pt-4"
            )}
          >
            <div className="mx-auto w-full max-w-[1120px]">
              {desktop ? (
                <div className="mb-5 grid gap-2">
                  {back ? (
                    <a
                      href={hrefFor(back.to)}
                      className="inline-flex min-h-tap items-center gap-1 justify-self-start text-dense font-semibold text-accent"
                    >
                      <Icon name="chevronLeft" size={20} />
                      {back.label}
                    </a>
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-small text-muted">{SCHOOL.name}</p>
                      <h1 className="text-title">{title}</h1>
                      {finding ? (
                        <p className="mt-1 max-w-[70ch] text-body text-muted">{finding}</p>
                      ) : null}
                    </div>
                    {primary ? <div className="shrink-0 pt-4">{primary}</div> : null}
                  </div>
                </div>
              ) : finding ? (
                <p className="mb-4 text-body text-muted">{finding}</p>
              ) : null}
              {children}
            </div>
          </main>
          {!desktop && primary ? (
            <div className="flex shrink-0 justify-center border-t border-line bg-panel px-4 py-2">
              {primary}
            </div>
          ) : null}
          {desktop ? null : (
            <BottomBar items={bar} active={active} onSelect={nav} className="shrink-0 pb-5" />
          )}
        </div>
        <Sheet open={sheet === "more"} onClose={() => setSheet(null)} title="More">
          <List>
            <Row
              title="Seats and plan"
              leading={<Icon name="school" size={20} />}
              href={hrefFor("seats")}
              onPress={() => setSheet(null)}
            />
            <Row
              title="Settings"
              leading={<Icon name="settings" size={20} />}
              onPress={() => setSheet("settings")}
            />
          </List>
        </Sheet>
        <SettingsSheet
          open={sheet === "settings"}
          onClose={() => setSheet(null)}
          who={`${data.me.name}, ${data.role === "admin" ? "school admin" : "teacher"}`}
        />
      </div>
    </LayoutCtx.Provider>
  );
}

function SettingsSheet({ open, onClose, who }: { open: boolean; onClose(): void; who: string }) {
  const theme = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="grid gap-5">
        <p className="text-dense text-muted">
          Signed in as <span className="text-text">{who}</span> at {SCHOOL.name}.
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body font-medium">Dark mode</p>
            <p className="text-dense text-muted">
              {theme.theme ? "Your choice is remembered on this device." : "Following your device."}
            </p>
          </div>
          <GlassToggle checked={theme.dark} onChange={() => theme.toggleMode()} label="Dark mode" />
        </div>
        <div>
          <p className="mb-2 text-body font-medium">Account theme</p>
          <div className="grid grid-cols-6 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={t.name}
                aria-pressed={theme.resolved.id === t.id}
                onClick={() => theme.set({ theme: t.id }, true)}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-card border",
                  theme.resolved.id === t.id ? "border-accent" : "border-line"
                )}
                style={{ background: t.canvas }}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: t.accent }} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => theme.set({ theme: null }, true)}
            className="mt-2 min-h-tap text-dense font-semibold text-accent"
          >
            Follow my device
          </button>
        </div>
      </div>
    </Sheet>
  );
}
