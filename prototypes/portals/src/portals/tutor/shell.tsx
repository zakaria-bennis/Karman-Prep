import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { TopBar } from "@/design-system/components/TopBar";
import { BottomBar } from "@/design-system/components/BottomBar";
import { IconRail, type RailItem } from "@/design-system/components/IconRail";
import { Sheet } from "@/design-system/components/Sheet";
import { Row, List } from "@/design-system/components/Row";
import { useWidth } from "@/design-system/components/hooks";
import { useToast } from "@/design-system/components/Toast";
import { GlassToggle } from "@/design-system/glass/GlassToggle";
import { useTheme } from "@/design-system/theme";
import { THEMES } from "@/design-system/themes";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import { goScreen, type ScreenId } from "./nav";
import { useTutorData } from "./data";
import { useStore } from "./store";
import { ME } from "./mock";

/**
 * The tutor portal's frame: a slim icon rail on desktop and iPad, a bottom bar
 * on phones (rule 52), one h1 per screen, one highlighted action placed in the
 * title row on desktop and in an opaque strip above the bottom bar on phones
 * (within thumb reach, never over text being read, never under the home
 * indicator). Score reports, earnings and settings sit at the rail's foot and
 * behind More on phones. Layouts fold by the shell's measured width, so the
 * gallery's framed phone folds too.
 */
const MAIN: RailItem[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "students", label: "Students", icon: "students" },
  { id: "cohorts", label: "Cohorts", icon: "classes" },
  { id: "homework", label: "Homework", icon: "book" },
  { id: "schedule", label: "Schedule", icon: "calendar" },
];
const ACTIVE: Record<ScreenId, string> = {
  portal: "today",
  today: "today",
  students: "students",
  student: "students",
  notes: "students",
  update: "students",
  guarantee: "students",
  cohorts: "cohorts",
  class: "cohorts",
  homework: "homework",
  schedule: "schedule",
  queue: "queue",
  earnings: "earnings",
};

export const LayoutCtx = createContext({ width: 1440, desktop: true, phone: false });
export const useLayout = () => useContext(LayoutCtx);

export function TutorShell({
  screen,
  title,
  finding,
  primary,
  children,
}: {
  screen: ScreenId;
  title: string;
  /** The one finding, under the title: about the data, never about the interface. */
  finding?: ReactNode;
  /** The screen's one highlighted action. */
  primary?: ReactNode;
  /** The screen, or a function of the measured layout for screens that fold at the top level. */
  children:
    | ReactNode
    | ((layout: { width: number; desktop: boolean; phone: boolean }) => ReactNode);
}) {
  const host = useRef<HTMLDivElement>(null);
  const measured = useWidth(host);
  const width = measured || (typeof window !== "undefined" ? window.innerWidth : 1440);
  const desktop = width >= 700;
  const phone = width < 600;
  const [sheet, setSheet] = useState<null | "more" | "settings">(null);
  const data = useTutorData();
  const { entered } = useStore();
  const count = data.queue.filter((r) => r.status === "waiting" && !entered[r.id]).length;
  const bottom: RailItem[] = [
    { id: "queue", label: "Score reports", icon: "upload", count },
    { id: "earnings", label: "Earnings", icon: "tokens" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  const nav = (id: string) => {
    if (id === "settings") setSheet("settings");
    else goScreen(id as ScreenId);
  };
  const layout = { width, desktop, phone };
  const body = typeof children === "function" ? children(layout) : children;
  return (
    <LayoutCtx.Provider value={layout}>
      <div ref={host} className="flex h-full w-full">
        {desktop ? (
          <IconRail items={MAIN} bottom={bottom} active={ACTIVE[screen]} onSelect={nav} />
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
              leading="none"
              action={
                <button
                  type="button"
                  aria-label={count ? `More, ${count} score reports waiting` : "More"}
                  onClick={() => setSheet("more")}
                  className="grid h-11 w-11 place-items-center rounded-card text-text"
                >
                  <Icon name="more" size={24} />
                </button>
              }
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
                <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-title">{title}</h1>
                    {finding ? (
                      <p className="mt-1 max-w-[70ch] text-body text-muted">{finding}</p>
                    ) : null}
                  </div>
                  {primary ? <div className="shrink-0">{primary}</div> : null}
                </div>
              ) : finding ? (
                <p className="mb-4 text-body text-muted">{finding}</p>
              ) : null}
              {body}
            </div>
          </main>
          {!desktop && primary ? (
            <div className="flex shrink-0 justify-center border-t border-line bg-panel px-4 py-2">
              {primary}
            </div>
          ) : null}
          {desktop ? null : (
            <BottomBar
              items={MAIN}
              active={ACTIVE[screen]}
              onSelect={nav}
              className="shrink-0 pb-5"
            />
          )}
        </div>
        <Sheet open={sheet === "more"} onClose={() => setSheet(null)} title="More">
          <List>
            <Row
              title="Score reports"
              sub={count ? { kind: "state", text: `${count} waiting for a reader` } : undefined}
              leading={<Icon name="upload" size={20} />}
              onPress={() => {
                setSheet(null);
                goScreen("queue");
              }}
            />
            <Row
              title="Earnings and payouts"
              leading={<Icon name="tokens" size={20} />}
              onPress={() => {
                setSheet(null);
                goScreen("earnings");
              }}
            />
            <Row
              title="Settings"
              leading={<Icon name="settings" size={20} />}
              onPress={() => setSheet("settings")}
            />
          </List>
        </Sheet>
        <SettingsSheet open={sheet === "settings"} onClose={() => setSheet(null)} />
      </div>
    </LayoutCtx.Provider>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const theme = useTheme();
  const toast = useToast();
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="grid gap-5">
        <p className="text-dense text-muted">
          Signed in as <span className="text-text">{ME.name}</span>, tutor.
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
        <div>
          <p className="text-body font-medium">Availability</p>
          <p className="text-dense text-muted">Students book from the hours you open in Cal.com.</p>
          <button
            type="button"
            onClick={() => toast.push({ title: "Cal.com opens in a new tab in the app" })}
            className="min-h-tap text-dense font-semibold text-accent"
          >
            Open Cal.com
          </button>
        </div>
      </div>
    </Sheet>
  );
}
