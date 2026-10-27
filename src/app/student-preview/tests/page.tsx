import Link from "next/link";
import { CB_MODULE, formatClock } from "@/lib/student/time-trial";
import { TestsIcon } from "@/components/student/icons";
import s from "@/components/student/student.module.css";

const minutes = 2 * CB_MODULE.reading.seconds + 2 * CB_MODULE.math.seconds + 600;

export default function TestsPreview() {
  return (
    <div className={s.page}>
      <h1 className={s.h1}>Full-length tests</h1>
      <section className={s.panel}>
        <div className={s.sectionHead}>
          <h2 className={s.h2} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TestsIcon size={20} /> Full-length practice test
          </h2>
        </div>
        <p className={s.fact}>
          4 modules · 98 questions · <strong>{Math.round(minutes / 60)} minutes</strong> with a{" "}
          {formatClock(600)} break
        </p>
        <div className={s.heroActions} style={{ marginTop: 18 }}>
          <Link href="/student-preview/tests/run" className={s.primary}>
            Start the test
          </Link>
        </div>
      </section>
      <section className={s.panel}>
        <h2 className={s.h2}>Diagnostic</h2>
        <p className={s.fact} style={{ marginTop: 6 }}>
          35 questions · taken once
        </p>
        <div className={s.heroActions} style={{ marginTop: 14 }}>
          <Link href="/diagnostic" className={s.glassButton}>
            Open the diagnostic
          </Link>
        </div>
      </section>
    </div>
  );
}
