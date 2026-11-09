/* A section of the Settings page, with an id so links (the menu's "Plan and billing") land on it. */
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/portal";
import s from "./settings.module.css";

export default function SettingsCard({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`kp-card ${s.card}`} id={id} aria-labelledby={`${id}-title`}>
      <SectionHeader id={`${id}-title`} title={title} note={note} />
      {children}
    </section>
  );
}
