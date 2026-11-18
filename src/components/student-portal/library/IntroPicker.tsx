"use client";

/*
 * The founder's picker for the Library's opening animations (2026-11-08): shown only when the
 * address has `?intro=N`, small, at the bottom right. Each number links to that intro, keeping
 * the rest of the address (for example `paint-time=night`). Intros not built yet are left out.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { IntroDef } from "./intros/registry";
import styles from "./stage.module.css";

export default function IntroPicker({ intros, current }: { intros: IntroDef[]; current: number }) {
  const params = useSearchParams();
  const href = (id: number) => {
    const q = new URLSearchParams(params?.toString() ?? "");
    q.set("intro", String(id));
    q.delete("subject");
    return `?${q.toString()}`;
  };
  return (
    <nav className={styles.picker} aria-label="Opening animations">
      <ol>
        {[...intros]
          .sort((a, b) => a.id - b.id)
          .map((d) => (
            <li key={d.id}>
              <Link
                href={href(d.id)}
                aria-current={d.id === current ? "true" : undefined}
                title={d.name}
                scroll={false}
              >
                <span className={styles.pickerId}>{d.id}</span>
                <span className={styles.pickerName}>{d.name}</span>
              </Link>
            </li>
          ))}
      </ol>
    </nav>
  );
}
