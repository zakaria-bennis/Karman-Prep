"use client";

// ============================================================
// "Create cohort" dialog on /admin/cohorts. Calls
// actionCreateCohort; the server action validates and caps the
// size per type (COHORT_TIER_CAP).
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import { COHORT_TIER_CAP, tierLabel } from "@/lib/scheduling/tiers";
import type { SatDateRow, TutorRow, CohortTier } from "@/lib/supabase/queries/cohorts";
import { actionCreateCohort } from "./actions";
import { formatSatDate, tutorDisplay } from "./format";

const TIERS: CohortTier[] = ["group", "small_group"];

export function CreateCohortDialog({
  satDates,
  tutors,
  onClose,
}: {
  satDates: SatDateRow[];
  tutors: TutorRow[];
  onClose: () => void;
}) {
  const [tier, setTier] = useState<CohortTier>("group");
  const [satDate, setSatDate] = useState<string>(satDates[0]?.test_date ?? "");
  const [tutorId, setTutorId] = useState<string>(tutors[0]?.id ?? "");
  const [maxSize, setMaxSize] = useState<number>(COHORT_TIER_CAP["group"]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [nameOverridden, setNameOverridden] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isPending]);

  // Suggested name: "<Type> · <SAT date> · <Tutor first name>"
  const suggestedName = useMemo(() => {
    const tutor = tutors.find((t) => t.id === tutorId);
    const tutorName = tutor?.first_name || tutor?.email?.split("@")[0] || "tutor";
    const niceDate = satDate ? formatSatDate(satDate) : "TBD";
    return `${tierLabel(tier)} · ${niceDate} · ${tutorName}`;
  }, [tier, satDate, tutorId, tutors]);

  // Use the suggestion unless the admin typed their own.
  const effectiveName = nameOverridden ? name : suggestedName;

  function onTierChange(next: CohortTier) {
    setTier(next);
    // Reset the size to that type's cap so the value is always allowed.
    setMaxSize(COHORT_TIER_CAP[next]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await actionCreateCohort({
          name: effectiveName,
          tier,
          sat_date: satDate,
          tutor_user_id: tutorId,
          max_size: maxSize,
          current_topic: currentTopic || null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create cohort");
      }
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "color-mix(in srgb, var(--sunk) 70%, transparent)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-cohort-title"
        className="wb"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          padding: 20,
          border: "1px solid var(--line)",
          borderRadius: 4,
          background: "var(--card)",
          gap: 14,
        }}
      >
        <div>
          <h2 id="create-cohort-title" style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600 }}>
            Create cohort
          </h2>
          <p className="wb-note" style={{ marginTop: 4 }}>
            One per type, SAT date and tutor. Students join through onboarding or from the cohort
            page.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="wb-field">
            <legend style={{ padding: 0, marginBottom: 4, color: "var(--mute)" }}>Type</legend>
            <div className="wb-tabs">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="wb-tab"
                  aria-pressed={tier === t}
                  aria-current={tier === t ? "page" : undefined}
                  onClick={() => onTierChange(t)}
                  style={{ background: "transparent", cursor: "pointer", font: "inherit" }}
                >
                  {tierLabel(t)}
                  <small>up to {COHORT_TIER_CAP[t]}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="wb-field">
            <span>SAT date</span>
            <select
              className="wb-select"
              value={satDate}
              onChange={(e) => setSatDate(e.target.value)}
              required
            >
              {satDates.map((d) => (
                <option key={d.test_date} value={d.test_date}>
                  {formatSatDate(d.test_date)}
                  {d.registration_deadline
                    ? ` · register by ${formatSatDate(d.registration_deadline)}`
                    : " · deadline not set"}
                </option>
              ))}
            </select>
          </label>

          <label className="wb-field">
            <span>Tutor</span>
            <select
              className="wb-select"
              value={tutorId}
              onChange={(e) => setTutorId(e.target.value)}
              required
            >
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {tutorDisplay(t)}
                </option>
              ))}
            </select>
          </label>

          <label className="wb-field">
            <span>Name</span>
            <input
              className="wb-input"
              type="text"
              value={effectiveName}
              onChange={(e) => {
                setName(e.target.value);
                setNameOverridden(true);
              }}
              required
              maxLength={120}
            />
            {!nameOverridden && <small className="wb-note">Suggested. Edit it to change.</small>}
          </label>

          <label className="wb-field">
            <span>Most students (up to {COHORT_TIER_CAP[tier]})</span>
            <input
              className="wb-input"
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(parseInt(e.target.value, 10) || 0)}
              min={1}
              max={COHORT_TIER_CAP[tier]}
              required
            />
          </label>

          <label className="wb-field">
            <span>Current topic (optional)</span>
            <input
              className="wb-input"
              type="text"
              value={currentTopic}
              onChange={(e) => setCurrentTopic(e.target.value)}
              placeholder="Linear functions"
              maxLength={200}
            />
          </label>

          {error && (
            <p role="alert" className="wb-alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="wb-btn" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="wb-btn" data-variant="primary" disabled={isPending}>
              {isPending ? "Creating…" : "Create cohort"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
