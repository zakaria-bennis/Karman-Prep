"use client";

// The signed-in student's data, handed down from the server (src/lib/portal/load.ts). With no
// student (the design page signed out) there is none, and each screen shows its stand-ins.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PortalData } from "@/lib/portal/data";
import { SKILLS, buildSkills, type Domain, type Section } from "./skills72";

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
