"use client";
// ?skill=<one of the 72> opens that skill's page in the Library (its lesson, then an 8-question skill
// set): the full-length exam's Reinforce links land here (founder, 2026-11-22 round 2).
import { useEffect } from "react";
import { skill72 } from "@/lib/skills/ids72";
import { everySkill, type Found } from "./progressBreakdowns";

export type { Found };

export function useSkillLink(asked: string | null, open: (found: Found) => void) {
  useEffect(() => {
    const name = asked && skill72(asked)?.name;
    const found = name && everySkill.find((f) => f.skill.name === name);
    if (found) open(found);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);
}
