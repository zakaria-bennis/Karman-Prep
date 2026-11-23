"use client";

// The signed-in student's data, handed down from the server (src/lib/portal/load.ts). With no
// student (the design page signed out) there is none, and each screen shows its stand-ins.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PortalData } from "@/lib/portal/data";
import { SKILLS, buildSkills, type Domain, type Section } from "./skills72";
import { STUDENTS, type Student, type StudentKey } from "./progressData";
import { STREAK } from "./rewardsData";

const Ctx = createContext<PortalData | null>(null);

export function PortalDataProvider({
  data,
  children,
}: {
  data: PortalData | null;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** The student's data, or null on the design page. */
export const usePortalData = () => useContext(Ctx);

/** The 72 skills in their domains, at the student's own levels (the stand-ins with no student). */
export function useSkills(): Record<Section, Domain[]> {
  const data = useContext(Ctx);
  return useMemo(() => (data ? buildSkills(data.skills) : SKILLS), [data]);
}

/** The student behind Progress and the Mistake Log: the signed-in one, or the made-up one picked by
 *  the design page's switches. */
export function useStudent(key: StudentKey): Student {
  const data = useContext(Ctx);
  return data?.student ?? STUDENTS[key];
}

/** Days in a row with the challenge question answered. */
export function useStreak(): number {
  return useContext(Ctx)?.streak ?? STREAK;
}

/** The longest run of days the student has kept the challenge going (14 on the design page). */
export function useBestStreak(): number {
  return useContext(Ctx)?.bestStreak ?? 14;
}

/** For an admin only: a skill's live practice questions, original and generated (null for students). */
export function useOriginCount(skill: string): { original: number; generated: number } | null {
  const admin = useContext(Ctx)?.generatedAdmin;
  if (!admin) return null;
  return admin.counts[skill] ?? { original: 0, generated: 0 };
}
