import { useState } from "react";
import { cn } from "@/design-system/cn";
import { Panel } from "@/design-system/glass/Panel";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Stepper } from "@/design-system/components/Stepper";
import { Dropzone } from "@/design-system/components/Dropzone";
import { Row, List } from "@/design-system/components/Row";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { SAT_MARCH, SAT_MAY, FREE_TEST, fmtDate } from "@/mock";
import { StudentShell, withStudent } from "./Shell";
import { reader, suggestCohort, RETAKE_COPY, COHORT_SPLIT, type ReaderResult } from "./reader";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";

/*
 * Onboarding: which test, the score report as a photo or screenshot (never a
 * typed score), the target, then the diagnostic. The reader is the swappable
 * module in reader.ts; in the prototype its stub answers "waiting for a person
 * to read it", the gallery's error state shows a retake request, and the
 * long-time state shows a report already read. The image stays private.
 */
const DATES = [
  { date: "2026-12-05", label: "SAT" },
  { date: SAT_MARCH, label: "SAT" },
  { date: SAT_MAY, label: "SAT" },
  { date: "2027-06-05", label: "SAT" },
];
const TARGETS = [1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550, 1600];
const DEMO_READ: ReaderResult = {
  status: "read",
  test: "PSAT",
  date: "2025-10-15",
  total: 1180,
  rw: 600,
  math: 580,
};

function Onboarding() {
  const v = useStudentView();
  const [step, setStep] = useState(0);
  const [test, setTest] = useState<"SAT" | "PSAT">("SAT");
  const [date, setDate] = useState(v.satDate);
  const [target, setTarget] = useState(v.target);
  const [result, setResult] = useState<ReaderResult | null>(v.quiet ? null : DEMO_READ);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return setResult(null);
    setBusy(true);
    const r = v.error
      ? ({ status: "retake", reason: "blurry" } as ReaderResult)
      : await reader.read(file);
    setBusy(false);
    setResult(r);
  };

  const report = busy ? (
    <Skeleton.Text lines={2} />
  ) : !result ? (
    <p className="text-dense text-muted">
      No report yet? Skip this step. The diagnostic sets your score.
    </p>
  ) : result.status === "waiting" ? (
    <p className="text-body">Got it. A person reads it, and your scores show here within a day.</p>
  ) : result.status === "retake" ? (
    <p className="text-body text-negative">{RETAKE_COPY[result.reason]}</p>
  ) : (
    <div className="grid gap-2">
      <p className="text-body">
        {result.test} on {fmtDate(result.date, "long")}:{" "}
        <span className="tabular font-semibold">{result.total.toLocaleString("en-US")}</span>
        <span className="text-muted">
          {" "}
          (Reading and Writing {result.rw}, Math {result.math})
        </span>
      </p>
      <p className="text-dense text-muted">
        {suggestCohort(result.total) === "below"
          ? `That fits the cohort starting under ${COHORT_SPLIT.toLocaleString("en-US")}.`
          : `That fits the cohort starting at ${COHORT_SPLIT.toLocaleString("en-US")} and up.`}
      </p>
    </div>
  );

  const steps = [
    {
      id: "test",
      title: "Which test are you preparing for?",
      content: (
        <div className="grid gap-5">
          <GlassSegmented
            label="Test"
            value={test}
            onChange={(t) => setTest(t as "SAT" | "PSAT")}
            options={[
              { value: "SAT", label: "SAT" },
              { value: "PSAT", label: "PSAT" },
            ]}
          />
          <div role="radiogroup" aria-label="Test date" className="grid gap-2">
            {DATES.map((d) => (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={date === d.date}
                onClick={() => setDate(d.date)}
                className={cn(
                  "flex min-h-12 items-center justify-between rounded-card border px-4 text-left text-body",
                  date === d.date ? "border-accent bg-accent/10" : "border-line hover:border-border"
                )}
              >
                <span>{fmtDate(d.date, "long")}</span>
                <span className="text-dense text-muted">{d.label}</span>
              </button>
            ))}
          </div>
          <p className="text-dense text-muted">
            A free practice test runs {fmtDate(FREE_TEST, "long")}.
          </p>
        </div>
      ),
    },
    {
      id: "report",
      title: "Your score report",
      content: (
        <div className="grid gap-4">
          <p className="text-body">
            A photo or screenshot of your last SAT or PSAT score report. We read the scores from the
            picture; you never type them.
          </p>
          <Dropzone onFile={onFile} />
          {report}
        </div>
      ),
    },
    {
      id: "target",
      title: "Your target",
      content: (
        <div className="grid gap-4">
          <div role="radiogroup" aria-label="Target score" className="grid grid-cols-3 gap-2">
            {TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={target === t}
                onClick={() => setTarget(t)}
                className={cn(
                  "tabular min-h-tap rounded-pill border text-body font-semibold",
                  target === t
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line hover:border-border"
                )}
              >
                {t.toLocaleString("en-US")}
              </button>
            ))}
          </div>
          <Panel className="px-4 py-1">
            <List>
              <Row title="Test" trailing={`${test}, ${fmtDate(date)}`} />
              <Row
                title="Score report"
                trailing={
                  !result
                    ? "Skipped"
                    : result.status === "read"
                      ? result.total.toLocaleString("en-US")
                      : result.status === "waiting"
                        ? "Being read"
                        : "Retake needed"
                }
              />
              <Row title="Target" trailing={target.toLocaleString("en-US")} />
            </List>
          </Panel>
          <p className="text-dense text-muted">
            Next: the diagnostic, 35 questions in about 50 minutes.
          </p>
        </div>
      ),
    },
  ];

  return (
    <StudentShell screen="onboarding" title="Set up">
      <Panel className="mx-auto max-w-[560px] p-4 sm:p-6">
        {v.loading ? (
          <div className="grid gap-4">
            <Skeleton.Block height={4} />
            <Skeleton.Block height={28} width="70%" />
            <Skeleton.Text lines={3} />
          </div>
        ) : v.error && step !== 1 ? (
          <ErrorBlock what="your set-up" lastGood="9:14" onRetry={retry} />
        ) : (
          <Stepper
            steps={steps}
            current={step}
            onChange={setStep}
            onFinish={() => goTo("diagnostic")}
            finishLabel="Start the diagnostic"
          />
        )}
      </Panel>
    </StudentShell>
  );
}

export default withStudent(Onboarding);
