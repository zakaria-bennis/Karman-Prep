import s from "@/components/student/student.module.css";

/** Skeleton while a set is drawn from the bank (rule 29). */
export default function Loading() {
  return (
    <div className={s.page} aria-busy="true" aria-label="Loading">
      <div className={s.skeleton} style={{ width: "55%", height: 40 }} />
      <div className={s.skeleton} style={{ width: "35%", height: 18 }} />
      <div className={s.panel} style={{ display: "grid", gap: 14 }}>
        {[90, 70, 100, 100, 100, 100].map((w, i) => (
          <div key={i} className={s.skeleton} style={{ width: `${w}%`, height: i < 2 ? 18 : 48 }} />
        ))}
      </div>
    </div>
  );
}
