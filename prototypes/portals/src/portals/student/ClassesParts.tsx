import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { TODAY, fmtDate } from "@/mock";
import { guaranteeStatus } from "./guarantee";
import { goTo } from "./nav";
import type { StudentView } from "./view";

/*
 * The blocks the cohort and the private screens share: the full-length tests
 * list and the guarantee status. The guarantee shows each requirement as a
 * count against its threshold and never restates the terms; the full terms
 * stay on the guarantee page.
 */
export function GuaranteeBlock({ v }: { v: StudentView }) {
  const g = guaranteeStatus(v.plan, v.student.id);
  if (!g) return null;
  return (
    <Panel as="section" aria-label="Guarantee status" className="p-4">
      <h2 className="text-section">Guarantee</h2>
      <p className={`pb-2 text-dense ${g.onTrack ? "text-positive" : "text-notice"}`}>
        {g.headline}
      </p>
      <List
        viewAll={
          <a
            href="https://karmanprep.com/guarantee"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-tap items-center font-semibold text-accent"
          >
            Full terms
          </a>
        }
      >
        {g.rows.map((r) => (
          <Row
            key={r.label}
            title={r.label}
            sub={{
              kind: "state",
              text: r.value,
              tone: r.tone === "notice" ? "negative" : r.tone === "positive" ? "positive" : "muted",
            }}
          />
        ))}
      </List>
    </Panel>
  );
}

export function TestsBlock({ v }: { v: StudentView }) {
  return (
    <Panel as="section" aria-label="Full-length tests" className="px-4 py-2">
      <h2 className="pb-1 pt-2 text-section">Full-length tests</h2>
      <List>
        {v.tests.map((t) => (
          <Row
            key={t.n}
            title={`Full-length test ${t.n}`}
            sub={{
              kind: t.score !== null ? "date" : "due",
              text:
                t.score !== null
                  ? `Taken ${fmtDate(t.date)}`
                  : t.date === TODAY
                    ? "Due today"
                    : `Due ${fmtDate(t.date)}`,
              tone: t.score === null && t.date === TODAY ? "negative" : "muted",
            }}
            trailing={t.score !== null ? t.score.toLocaleString("en-US") : undefined}
            onPress={() => goTo("test")}
          />
        ))}
      </List>
    </Panel>
  );
}
