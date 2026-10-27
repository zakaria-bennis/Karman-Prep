"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { buildStudentHome, type SkillView, type StudentHomeInput } from "@/lib/student/home-model";
import { useMergedInput, useLiveNow } from "./preview-store";
import { Legend, SkillList, SkillSheet } from "./SkillSky";
import s from "./student.module.css";

export function SkillsPage({
  input,
  nowMs,
  base,
}: {
  input: StudentHomeInput;
  nowMs: number;
  base: string;
}) {
  const now = useLiveNow(nowMs);
  const home = buildStudentHome(useMergedInput(input), now, base);
  const [open, setOpen] = useState<SkillView | null>(null);
  return (
    <div className={s.page}>
      <h1 className={s.h1}>Skills</h1>
      <Legend />
      <section className={s.panel}>
        <SkillList home={home} onOpen={setOpen} />
      </section>
      <AnimatePresence>
        {open && (
          <SkillSheet
            skill={open}
            base={base}
            subject={open.id.startsWith("ma-") ? "math" : "reading"}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
