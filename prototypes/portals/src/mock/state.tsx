import { createContext, useContext, useMemo, type ReactNode } from "react";
import { studentById, type Student } from "./people";
import { NOW } from "./clock";

/**
 * The state switch every portal reads: empty, loading, error, locked,
 * first-day (Noah), long-time (Maya). A screen asks `useMockState()` and
 * renders its Skeleton, Empty, ErrorBlock or Locked accordingly.
 */
export type MockState = "empty" | "loading" | "error" | "locked" | "first-day" | "long-time";
export const MOCK_STATES: MockState[] = [
  "long-time",
  "first-day",
  "empty",
  "loading",
  "error",
  "locked",
];

interface MockContextValue {
  state: MockState;
  student: Student;
  now: Date;
  loading: boolean;
  error: boolean;
  empty: boolean;
  locked: boolean;
}

const Ctx = createContext<MockContextValue | null>(null);

export function MockProvider({
  state,
  studentId,
  children,
}: {
  state: MockState;
  studentId?: string;
  children: ReactNode;
}) {
  const value = useMemo<MockContextValue>(() => {
    const id =
      state === "first-day"
        ? "noah"
        : state === "long-time"
          ? (studentId ?? "maya")
          : (studentId ?? "maya");
    return {
      state,
      student: studentById(id),
      now: NOW,
      loading: state === "loading",
      error: state === "error",
      empty: state === "empty",
      locked: state === "locked",
    };
  }, [state, studentId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMockState(): MockContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMockState needs a MockProvider");
  return v;
}
