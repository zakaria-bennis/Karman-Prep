import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useToast } from "@/design-system/components/Toast";
import { Icon } from "@/design-system/icons";
import { fmtDate, studentById } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { SPLIT_SCORE, tutorStudentById } from "../mock";
import { queueName, type ReportUpload } from "../mock-work";
import { markEntered, useStore } from "../store";
import { ReportImage } from "../components/ReportImage";
import { Initials } from "../components/Initials";
import { Block, clock, score } from "./common";
import { useLayout } from "../shell";
import { cn } from "@/design-system/cn";

/**
 * Score reports: uploads waiting for a person to read the photo and enter the
 * score, until the reader has its key. Inbox triage on desktop (the list at
 * 320px, the open report beside it); one region at a time on phones. The
 * entered total suggests the cohort by the 1250 split. Two blocks, Waiting
 * (the queue, with its count) and Entered, so a title is true of its rows.
 */
const field =
  "tabular h-11 w-full rounded-control border border-border/70 bg-surface px-3 text-body text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const timeOf = (iso: string) => {
  const [d, t] = iso.split("T");
  const [h, m] = t.split(":").map(Number);
  return `${fmtDate(d)}, ${clock(h + m / 60)}`;
};
const hueOf = (id: string) => tutorStudentById(id)?.hue ?? studentById(id).hue;

export default function Queue() {
  const data = useTutorData();
  const toast = useToast();
  const { entered } = useStore();
  const status = (r: ReportUpload) => (entered[r.id] ? "entered" : r.status);
  const waiting = data.queue.filter((r) => status(r) === "waiting");
  const done = data.queue.filter((r) => status(r) === "entered");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pushed, setPushed] = useState(false);
  const open = data.queue.find((r) => r.id === openId) ?? waiting[0] ?? done[0] ?? null;
  const finding = !data.queue.length
    ? "Nothing waiting. Students upload a photo of a score report at onboarding."
    : waiting.length
      ? `${waiting.length} waiting. ${queueName(waiting[0].studentId)}'s ${waiting[0].claimed} came in ${timeOf(waiting[0].uploadedAt).replace(fmtDate(waiting[0].uploadedAt.slice(0, 10)), waiting[0].uploadedAt.startsWith("2026-10-31") ? "today" : fmtDate(waiting[0].uploadedAt.slice(0, 10)))}.`
      : "Nothing waiting. Every report has been read.";

  const row = (r: ReportUpload) => (
    <Row
      key={r.id}
      title={`${queueName(r.studentId)}, ${r.claimed}`}
      sub={
        status(r) === "entered"
          ? { kind: "state", text: "Entered", tone: "positive" }
          : { kind: "date", text: `Uploaded ${timeOf(r.uploadedAt)}` }
      }
      leading={<Initials initial={queueName(r.studentId)[0]} hue={hueOf(r.studentId)} size={24} />}
      selected={open?.id === r.id}
      onPress={() => {
        setOpenId(r.id);
        setPushed(true);
      }}
    />
  );
  const list = (
    <div className="grid gap-5">
      <Block
        title="Waiting"
        loading={data.loading}
        error={data.error}
        what="the queue"
        onRetry={() =>
          toast.push({
            title: "Still can't load the queue",
            detail: "Last updated 9:14 am.",
            kind: "error",
          })
        }
        padded={false}
        aside={`${waiting.length}`}
      >
        <div className="px-4 pb-1">
          {waiting.length ? (
            <List>{waiting.map(row)}</List>
          ) : (
            <Empty
              title="Nothing waiting"
              detail="Uploads appear here the moment a student adds a photo."
              className="my-2"
            />
          )}
        </div>
      </Block>
      {done.length ? (
        <Block title="Entered" loading={data.loading} padded={false} aside={`${done.length}`}>
          <div className="px-4 pb-1">
            <List>{done.map(row)}</List>
          </div>
        </Block>
      ) : null}
    </div>
  );

  return (
    <TutorShell screen="queue" title="Score reports" finding={finding}>
      {({ desktop }) => (
        <div className={desktop ? "grid grid-cols-[320px_minmax(0,1fr)] gap-6" : "grid gap-5"}>
          {desktop || !pushed || !open ? list : null}
          <div className={!desktop && (!pushed || !open) ? "hidden" : ""}>
            {open ? (
              <ReportDetail
                key={open.id}
                r={open}
                entered={!!entered[open.id] || open.status === "entered"}
                onBack={() => setPushed(false)}
                onSave={(e) => {
                  markEntered(open.id, e);
                  toast.push({
                    title: `${queueName(open.studentId)}'s score saved`,
                    detail: `${e.type} ${e.rw + e.math}. The Karman predicted score updates from it.`,
                    kind: "success",
                  });
                }}
                onAsk={() =>
                  toast.push({ title: `Asked ${queueName(open.studentId)} for a clearer photo` })
                }
                loading={data.loading}
              />
            ) : (
              <Panel className="grid min-h-[200px] place-items-center px-4 py-6 text-dense text-muted">
                Choose a report to read it.
              </Panel>
            )}
          </div>
        </div>
      )}
    </TutorShell>
  );
}

function ReportDetail({
  r,
  entered,
  onBack,
  onSave,
  onAsk,
  loading,
}: {
  r: ReportUpload;
  entered: boolean;
  onBack(): void;
  onSave(e: { type: string; date: string; rw: number; math: number }): void;
  onAsk(): void;
  loading: boolean;
}) {
  const { desktop } = useLayout();
  const name = queueName(r.studentId);
  const seed = r.entered ?? r.shows;
  const [type, setType] = useState<string>(seed.type);
  const [date, setDate] = useState(seed.date);
  const [rw, setRw] = useState(String(seed.rw));
  const [math, setMath] = useState(String(seed.math));
  const total = (Number(rw) || 0) + (Number(math) || 0);
  const valid =
    Number(rw) >= 200 && Number(rw) <= 800 && Number(math) >= 200 && Number(math) <= 800 && !!date;
  return (
    <Block
      title={`${name}, ${r.claimed}`}
      loading={loading}
      padded={false}
      aside={
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "inline-flex min-h-tap items-center gap-1 font-semibold text-accent",
            desktop && "hidden"
          )}
        >
          <Icon name="chevronLeft" size={20} />
          Back
        </button>
      }
    >
      <div className={cn("grid gap-4 px-4 pb-4", desktop && "grid-cols-2")}>
        {loading ? <Skeleton.Block height={240} /> : <ReportImage r={r} name={name} />}
        <div className="grid content-start gap-3">
          <p className="text-dense text-muted">
            Enter what the report shows. Private: only you and the admin see the photo.
          </p>
          <GlassSegmented
            label="Test"
            options={[
              { value: "SAT", label: "SAT" },
              { value: "PSAT", label: "PSAT" },
            ]}
            value={type}
            onChange={setType}
            fill
          />
          <label className="grid gap-1.5 text-dense font-medium">
            Test date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={field}
              disabled={entered}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-dense font-medium">
              Reading and Writing
              <input
                inputMode="numeric"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                className={field}
                disabled={entered}
              />
            </label>
            <label className="grid gap-1.5 text-dense font-medium">
              Math
              <input
                inputMode="numeric"
                value={math}
                onChange={(e) => setMath(e.target.value)}
                className={field}
                disabled={entered}
              />
            </label>
          </div>
          <p className="tabular text-body">
            Total <span className="text-kpi font-medium">{score(total)}</span>
            {total ? (
              <span className="text-dense text-muted">
                {" "}
                · fits a cohort {total < SPLIT_SCORE ? "under" : "at or above"} {SPLIT_SCORE}
              </span>
            ) : null}
          </p>
          {entered ? (
            <p className="text-dense font-semibold text-positive" role="status">
              Entered. {name}'s baseline is {score(total)}.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onAsk}
                className="min-h-tap text-dense font-semibold text-accent"
              >
                Ask for a clearer photo
              </button>
              <GlassButton
                variant="primary"
                disabled={!valid}
                onClick={() => onSave({ type, date, rw: Number(rw), math: Number(math) })}
              >
                Save the score
              </GlassButton>
            </div>
          )}
        </div>
      </div>
    </Block>
  );
}
