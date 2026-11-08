/* A card on the account page with an id, so the account menu's links land on it. */
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/portal";
import s from "./account.module.css";

export default function AccountCard({
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
