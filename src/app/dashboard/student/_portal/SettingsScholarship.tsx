"use client";

// Settings, Scholarship (Cohort students only): the rules in a line, where each claim stands, and the
// upload of the official SAT score report. Figures come from COHORT_SCHOLARSHIP in offer.ts. The old
// /dashboard/student/scholarship page opens this folder. The design page shows an empty stand-in.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { COHORT_SCHOLARSHIP, formatPrice } from "@/lib/marketing/offer";
import { actionScholarship, actionSubmitScholarship } from "@/lib/portal/scholarship-actions";
import { claimLine, type ScholarshipClaim } from "@/lib/portal/settings-rules";
import { usePortalData } from "./portalData";
import { Group, Row, Say } from "./settingsControls";
import styles from "./settings.module.css";

const MAX_MB = 10;
type Loaded = { cohorts: { id: string; name: string }[]; claims: ScholarshipClaim[] };
const STAND_IN: Loaded = { cohorts: [{ id: "stand-in", name: "January cohort" }], claims: [] };

function Upload({
  cohorts,
  again,
  onSent,
}: {
  cohorts: Loaded["cohorts"];
  again: boolean;
  onSent: () => void;
}) {
  const real = usePortalData() !== null;
  const form = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ tone: "done" | "problem"; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const send = async (data: FormData) => {
    setSaid(null);
    const file = data.get("report");
    if (file instanceof File && file.size > MAX_MB * 1024 * 1024)
      return setSaid({ tone: "problem", text: `The file is larger than ${MAX_MB} MB.` });
    if (!real) return setSaid({ tone: "done", text: "Uploaded. We'll check it and email you." });
    setBusy(true);
    const r = await actionSubmitScholarship(data).catch(() => null);
    setBusy(false);
    if (!r || !r.ok)
      return setSaid({
        tone: "problem",
        text: r && !r.ok ? r.error : "The upload didn't go through.",
      });
    form.current?.reset();
    setFileName(null);
    setSaid({ tone: "done", text: "Uploaded. We'll check it and email you." });
    onSent();
  };

  return (
    <Group title={again ? "Send a new report" : "Send your report"}>
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          void send(new FormData(e.currentTarget));
        }}
      >
        {cohorts.length === 1 ? (
          <input type="hidden" name="cohortId" value={cohorts[0].id} />
        ) : (
          <label className={styles.field}>
            <span>Cohort</span>
            <select name="cohortId" required>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={styles.twin}>
          <label className={styles.field}>
            <span>Total score</span>
            <input
              name="declaredTotalScore"
              type="number"
              inputMode="numeric"
              min={400}
              max={1600}
              step={10}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Test date</span>
            <input name="declaredTestDate" type="date" max={today} required />
          </label>
        </div>
        <label className={styles.file}>
          <b>Choose PDF</b>
          <span>{fileName ?? `Your score report, up to ${MAX_MB} MB`}</span>
          <input
            name="report"
            type="file"
            accept="application/pdf,.pdf"
            required
            onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
          />
        </label>
        <label className={styles.check}>
          <input name="confirm" type="checkbox" required />
          <span>This is my official College Board score report, downloaded and not changed.</span>
        </label>
        {said && <Say tone={said.tone}>{said.text}</Say>}
        <div className={styles.pair}>
          <button type="submit" className={styles.go} disabled={busy}>
            {busy ? "Uploading" : "Upload report"}
          </button>
        </div>
      </form>
    </Group>
  );
}

export function Scholarship() {
  const real = usePortalData() !== null;
  const [loaded, setLoaded] = useState<Loaded | null>(real ? null : STAND_IN);
  const [problem, setProblem] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!real) return;
    let live = true;
    actionScholarship({})
      .then((r) => {
        if (!live) return;
        if (r.ok) setLoaded({ cohorts: r.cohorts, claims: r.claims });
        else setProblem(r.error);
      })
      .catch(() => live && setProblem("This didn't load. Try again in a moment."));
    return () => {
      live = false;
    };
  }, [real, round]);

  const won = (cohortId: string) =>
    loaded?.claims.some(
      (k) => k.cohortId === cohortId && (k.status === "approved" || k.status === "paid")
    );
  const open = loaded?.cohorts.filter((c) => !won(c.id)) ?? [];

  return (
    <>
      <Group>
        <p className={styles.words}>
          The top official SAT score in each cohort wins {formatPrice(COHORT_SCHOLARSHIP.amount)}:
          your {formatPrice(COHORT_SCHOLARSHIP.refund)} back plus a{" "}
          {formatPrice(COHORT_SCHOLARSHIP.meritBonus)} merit bonus. Send your official score report
          within {COHORT_SCHOLARSHIP.claimDays} days of your scores coming out.{" "}
          <Link href="/terms#cohort-scholarship">Read the rules</Link>
        </p>
      </Group>
      {problem && <Say tone="problem">{problem}</Say>}
      {loaded && loaded.claims.length > 0 && (
        <Group title="Your claims">
          {loaded.claims.map((claim) => {
            const line = claimLine(
              claim,
              loaded.cohorts.find((c) => c.id === claim.cohortId)?.name ?? "your cohort"
            );
            return <Row key={claim.id} name={line.title} note={line.body} />;
          })}
        </Group>
      )}
      {loaded && loaded.cohorts.length === 0 && (
        <Group>
          <Row
            name="For cohort students"
            note="Once you're in a cohort, you send your score report here after your official SAT."
          />
        </Group>
      )}
      {loaded && open.length > 0 && (
        <Upload
          cohorts={open}
          again={loaded.claims.some((k) => open.some((c) => c.id === k.cohortId))}
          onSent={() => setRound((n) => n + 1)}
        />
      )}
    </>
  );
}
