import type { ReactNode } from "react";
import { IconRail, type RailItem } from "@/design-system/components/IconRail";
import { BottomBar } from "@/design-system/components/BottomBar";
import { TopBar } from "@/design-system/components/TopBar";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import { useParent, useDesktop } from "./view";
import { StudentSwitcher } from "./StudentSwitcher";

/*
 * The parent portal’s shell: the slim icon rail on desktop and iPad, the
 * bottom bar on phones (rule 52), a 48px top bar with the screen’s name on
 * phones and a 24px noun title in the canvas on desktop, the student switcher
 * at the top when the parent has more than one student, one finding under the
 * title, and at most one highlighted action: in the title row on desktop,
 * on phones in the column's flow above the bottom bar within thumb reach
 * (Fitts), so the scroll area ends above it and it never sits on text being
 * read (rule 34).
 */
export const NAV: RailItem[] = [
  { id: "home", label: "Progress", icon: "home" },
  { id: "updates", label: "Updates", icon: "book" },
  { id: "schedule", label: "Schedule", icon: "calendar" },
  { id: "plan", label: "Plan", icon: "tokens" },
];
const SETTINGS: RailItem = { id: "settings", label: "Settings", icon: "settings" };
/** Screens opened from a nav item keep that item active. */
const PARENT_OF: Record<string, string> = { skills: "home", update: "updates" };

export interface ShellProps {
  screen: string;
  title: string;
  finding?: ReactNode;
  primary?: { label: string; onClick(): void; loading?: boolean } | null;
  back?: { label: string; to: string };
  /** A centred 864px column for a screen read like a document (the weekly update). */
  narrow?: boolean;
  children: ReactNode;
}

export { useDesktop, useWide } from "./view";

export function Shell({ screen, title, finding, primary, back, narrow, children }: ShellProps) {
  const v = useParent();
  const desktop = useDesktop();
  const active = PARENT_OF[screen] ?? screen;
  const switcher = v.students.length > 1 ? <StudentSwitcher fill={!desktop} /> : null;
  const action = primary ? (
    <GlassButton
      variant="primary"
      loading={primary.loading}
      onClick={primary.onClick}
      className={desktop ? undefined : "w-full"}
    >
      {primary.label}
    </GlassButton>
  ) : null;
  return (
    <div className="flex h-full w-full">
      {desktop ? (
        <IconRail items={NAV} bottom={[SETTINGS]} active={active} onSelect={(id) => v.go(id)} />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {desktop ? null : (
          <TopBar
            title={title}
            leading={back ? "back" : "none"}
            onLeading={back ? () => v.go(back.to) : undefined}
          />
        )}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full pb-8",
              desktop ? "px-8 pt-8" : "px-4 pt-4",
              narrow ? "max-w-[864px]" : "max-w-[1120px]"
            )}
          >
            {desktop ? (
              <div className="mb-6 grid gap-3">
                {back ? (
                  <button
                    type="button"
                    onClick={() => v.go(back.to)}
                    className="inline-flex min-h-tap items-center gap-1 justify-self-start text-dense font-semibold text-accent hover:underline"
                  >
                    <Icon name="chevronLeft" size={20} />
                    {back.label}
                  </button>
                ) : null}
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-title">{title}</h1>
                    {finding ? (
                      <p className="mt-1 max-w-[64ch] text-body text-muted">{finding}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {switcher}
                    {action}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 grid gap-3">
                {switcher}
                {finding ? <p className="text-body text-muted">{finding}</p> : null}
              </div>
            )}
            {children}
          </div>
        </main>
        {!desktop && action ? <div className="shrink-0 px-4 pb-2 pt-2">{action}</div> : null}
        {desktop ? null : (
          <BottomBar
            items={[...NAV, SETTINGS]}
            active={active}
            onSelect={(id) => v.go(id)}
            className="shrink-0"
          />
        )}
      </div>
    </div>
  );
}
