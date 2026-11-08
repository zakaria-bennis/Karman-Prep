import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWidth } from "@/design-system/components/hooks";
import { PlanProvider, usePlan } from "@/plans/PlanProvider";
import { LADDER, has, type BundleId, type PlanId } from "@/plans/plans";
import { useMockState, type MockState, type Parent, type Student } from "@/mock";
import { familyFor } from "./mock";

/**
 * The parent’s view: the family the gallery’s plan and state switches show,
 * the selected student (first open by default, switchable at the top), the
 * state flags, and navigation between the portal’s screens. The selected
 * student’s plan drives every screen through a nested PlanProvider, so a
 * parent with two students on two plans sees each one’s own plan. In the
 * locked demo state the screen’s bundle is taken away by moving the plan to
 * the lowest rung that lacks it, so no plan name is ever written here.
 */
export interface ParentView {
  state: MockState;
  parent: Parent;
  students: Student[];
  student: Student;
  /** The plan every screen reads; the student’s, or the locked demo’s rung. */
  plan: PlanId;
  loading: boolean;
  error: boolean;
  empty: boolean;
  locked: boolean;
  firstDay: boolean;
  query: URLSearchParams;
  select(id: string): void;
  go(screen: string, extra?: Record<string, string>): void;
}

const Ctx = createContext<ParentView | null>(null);

/* Layout is measured on the frame the portal is drawn in, never on the window,
   so a phone frame inside the gallery on a desktop lays out as a phone (window
   breakpoints would not). desktop (768 and up) gets the rail; wide (1024 and
   up) gets two columns. Every screen reads these inside the provider. */
const LayoutCtx = createContext({ desktop: false, wide: false });
export const useDesktop = () => useContext(LayoutCtx).desktop;
export const useWide = () => useContext(LayoutCtx).wide;

function readHash() {
  const [p, q = ""] = location.hash.replace(/^#\/?/, "").split("?");
  return { path: p.split("/").filter(Boolean), query: new URLSearchParams(q) };
}

function writeHash(path: string[], query: URLSearchParams) {
  const s = query.toString();
  location.hash = `#/${path.join("/")}${s ? `?${s}` : ""}`;
}

/** The screen the hash shows; the first screen when none is named. */
export function currentScreen(): string {
  const { path, query } = readHash();
  return query.get("screen") || (path[0] === "screen" ? path[2] : "") || "home";
}

/** Open another parent screen and keep every gallery switch. The role becomes parent so the gallery can find the screen. */
export function goScreen(id: string, extra: Record<string, string> = {}) {
  const { path, query } = readHash();
  query.set("screen", id);
  const role = query.get("role");
  if (role !== "parent" && role !== "admin") query.set("role", "parent");
  Object.entries(extra).forEach(([k, v]) => (v ? query.set(k, v) : query.delete(k)));
  writeHash(path[0] === "screen" ? ["screen", "parent", id] : path, query);
}

export function useHashQuery(): URLSearchParams {
  const [q, setQ] = useState(() => readHash().query);
  useEffect(() => {
    const on = () => setQ(readHash().query);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return q;
}

/** The lowest rung of the ladder that lacks a bundle, for the locked demo state. */
export function lockedPlanFor(bundle: BundleId): PlanId {
  return LADDER.find((p) => !has(p, bundle)) ?? LADDER[0];
}

export function ParentProvider({ lock, children }: { lock?: BundleId; children: ReactNode }) {
  const mock = useMockState();
  const gallery = usePlan();
  const query = useHashQuery();
  const host = useRef<HTMLDivElement>(null);
  const width = useWidth(host);
  const layout = useMemo(() => ({ desktop: width >= 768, wide: width >= 1024 }), [width]);
  const family = useMemo(() => familyFor(gallery.plan, mock.state), [gallery.plan, mock.state]);
  const wanted = query.get("student");
  const selectedId =
    wanted && family.students.some((s) => s.id === wanted) ? wanted : family.selectedId;
  const student = family.students.find((s) => s.id === selectedId) ?? family.students[0];
  const plan = mock.locked && lock ? lockedPlanFor(lock) : student.plan;
  const value = useMemo<ParentView>(
    () => ({
      state: mock.state,
      parent: family.parent,
      students: family.students,
      student,
      plan,
      loading: mock.loading,
      error: mock.error,
      empty: mock.empty,
      locked: mock.locked,
      firstDay: mock.state === "first-day",
      query,
      select: (id) => goScreen(currentScreen(), { student: id === family.selectedId ? "" : id }),
      go: goScreen,
    }),
    [mock, family, student, plan, query]
  );
  return (
    <div ref={host} className="h-full w-full">
      <LayoutCtx.Provider value={layout}>
        <Ctx.Provider value={value}>
          <PlanProvider plan={plan}>{children}</PlanProvider>
        </Ctx.Provider>
      </LayoutCtx.Provider>
    </div>
  );
}

export function useParent(): ParentView {
  const v = useContext(Ctx);
  if (!v) throw new Error("useParent needs a ParentProvider");
  return v;
}

/** A block’s own loading and error, so Retry on one block reloads that block alone. */
export function useBlock(): { loading: boolean; error: boolean; retry(): void } {
  const v = useParent();
  const [phase, setPhase] = useState<"idle" | "retrying" | "ok">("idle");
  useEffect(() => {
    if (phase !== "retrying") return;
    const t = setTimeout(() => setPhase("ok"), 900);
    return () => clearTimeout(t);
  }, [phase]);
  return {
    loading: v.loading || phase === "retrying",
    error: v.error && phase !== "ok",
    retry: () => setPhase("retrying"),
  };
}
