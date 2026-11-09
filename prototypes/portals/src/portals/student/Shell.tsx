import { useRef, useState, type ComponentType, type ReactNode } from "react";
import "./student.css";
import { TopBar } from "@/design-system/components/TopBar";
import { BottomBar } from "@/design-system/components/BottomBar";
import { IconRail } from "@/design-system/components/IconRail";
import { Sheet } from "@/design-system/components/Sheet";
import { Row, List } from "@/design-system/components/Row";
import { Icon } from "@/design-system/icons";
import { useWidth } from "@/design-system/components/hooks";
import { MockProvider, useMockState } from "@/mock/state";
import { PlanProvider, usePlan } from "@/plans/PlanProvider";
import { LADDER } from "@/plans/plans";
import { BAR, RAIL, RAIL_BOTTOM, goTo, sectionOf, type StudentScreen } from "./nav";
import { PlanSheetProvider } from "./PlanSheet";
import { STUDENT_BY_PLAN } from "./mock";

/*
 * The student shell: a slim icon rail on desktop and iPad (rule 52), a bottom
 * bar of five on phones, one 48px top bar with the screen's name as the h1 and
 * at most one action. The product is named in the rail's mark and in the menu
 * sheet. The patterns are the ones students know from the apps they use every
 * day (Jakob's law): a rail, a tab bar, a sheet for the rest.
 */
export function StudentShell({
  screen,
  title,
  action,
  back,
  children,
  wide = false,
  bare = false,
  bar = true,
}: {
  screen: StudentScreen;
  title: string;
  action?: ReactNode;
  /** A sub-screen (a question set, a test module) shows Back instead of the menu. */
  back?: () => void;
  children: ReactNode;
  /** Let the content use the full width (the question screen). */
  wide?: boolean;
  /** No rail and no bar: a focused flow such as a test module. */
  bare?: boolean;
  /** Keep the rail but drop the phone bar: a question screen with its own action bar. */
  bar?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const width = useWidth(host);
  const desktop = width >= 768;
  const [menu, setMenu] = useState(false);
  const { name } = usePlan();
  const active = sectionOf(screen);
  const select = (id: string) => goTo(id as StudentScreen);

  return (
    <div ref={host} className="flex h-full w-full">
      {desktop && !bare ? (
        <IconRail items={RAIL} bottom={RAIL_BOTTOM} active={active} onSelect={select} />
      ) : null}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          leading={back ? "back" : desktop || bare ? "none" : "menu"}
          onLeading={back ?? (() => setMenu(true))}
          action={action}
        />
        <main
          className={
            wide
              ? "min-h-0 flex-1 overflow-y-auto"
              : "min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-6 lg:px-8"
          }
        >
          <div className={wide ? "h-full" : "mx-auto w-full max-w-[1120px]"}>{children}</div>
        </main>
        {desktop || bare || !bar ? null : (
          <BottomBar
            items={BAR}
            active={active}
            onSelect={select}
            className="absolute inset-x-0 bottom-0"
          />
        )}
      </div>
      <Sheet open={menu} onClose={() => setMenu(false)} title="Karman">
        <p className="pb-3 text-dense text-muted">{name}</p>
        <List>
          {[...RAIL, ...RAIL_BOTTOM].map((it) => (
            <Row
              key={it.id}
              title={it.label}
              leading={<Icon name={it.icon} size={20} />}
              selected={it.id === active}
              onPress={() => {
                setMenu(false);
                select(it.id);
              }}
            />
          ))}
        </List>
      </Sheet>
    </div>
  );
}

/**
 * Every student route is wrapped here. The student follows the plan the
 * gallery shows (Noah on Free, Lin on Platform, Sofia on Plus, Ava in the
 * cohort, Theo on a school seat, Maya on Private), so each plan's screens
 * carry that student's honest numbers. The gallery's "locked" state shows the
 * screen as the plan with the most locks sees it, with the gallery's student,
 * so every locked panel and its one upgrade action can be reviewed.
 */
export function withStudent(Screen: ComponentType): ComponentType {
  return function StudentRoute() {
    const { locked, state } = useMockState();
    const { plan } = usePlan();
    const inner = (
      <PlanSheetProvider>
        <Screen />
      </PlanSheetProvider>
    );
    if (locked) return <PlanProvider plan={LADDER[0]}>{inner}</PlanProvider>;
    return (
      <MockProvider state={state} studentId={STUDENT_BY_PLAN[plan]}>
        {inner}
      </MockProvider>
    );
  };
}

/** One text link, the quiet action beside the screen's one highlighted button. */
export function TextLink({
  children,
  onClick,
  href,
  className = "",
}: {
  children: ReactNode;
  onClick?(): void;
  href?: string;
  className?: string;
}) {
  const cls = `inline-flex min-h-tap min-w-tap items-center text-body font-semibold text-accent ${className}`;
  return href ? (
    <a href={href} className={cls} onClick={onClick}>
      {children}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
