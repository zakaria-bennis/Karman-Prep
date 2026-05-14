// ============================================================
// SessionRecap — parent-facing recap email after a 1:1 session.
//
// Renders the 8-field structured draft with the same Layout
// wrapper as BookingConfirmation. No greeting line per the
// status-email template spec — straight to the structured
// content. Sign-off is `Best regards, {tutorName}` (or the
// tutor's email_signature override).
// ============================================================

import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./_shared/Layout";

export interface SessionRecapProps {
  /** "individual" → 1:1, header says "{studentName} · {date}".
   *  "group"      → small_group/seminar, header says "{cohortName} · {date}". */
  sessionType: "individual" | "group";
  /** Required for individual sessions; ignored for groups. */
  studentName?: string;
  /** Required for group sessions; ignored for individuals. */
  cohortName?: string;
  sessionDate: string;
  tutorName: string;
  /** When non-empty, overrides the default `Best regards, {tutorName}` sign-off. */
  signatureOverride?: string | null;
  fields: {
    date_and_time_of_session: string;
    student_performance_progress: string;
    subjects_covered_during_session: string;
    specific_weak_points_or_mistakes: string;
    next_steps_homework_assigned: string;
    subjects_to_cover_next_session: string;
    homework_practice_before_next_session: string;
    date_and_time_of_next_session: string;
  };
}

const FIELD_LABELS: Array<[keyof SessionRecapProps["fields"], string]> = [
  ["date_and_time_of_session",              "Date and Time of Session"],
  ["student_performance_progress",          "Student Performance/Progress"],
  ["subjects_covered_during_session",       "Subjects Covered During the Session"],
  ["specific_weak_points_or_mistakes",      "Specific Weak Points or Mistakes to Review"],
  ["next_steps_homework_assigned",          "Next Steps Homework Assigned"],
  ["subjects_to_cover_next_session",        "Subjects to Cover Next Session"],
  ["homework_practice_before_next_session", "Homework/Practice to Complete Before Next Session"],
  ["date_and_time_of_next_session",         "Date and Time of Next Session"],
];

export function SessionRecap({
  sessionType,
  studentName,
  cohortName,
  sessionDate,
  tutorName,
  signatureOverride,
  fields,
}: SessionRecapProps) {
  const signature = (signatureOverride?.trim() || `Best regards,\n${tutorName}`).trim();
  const subtitle = sessionType === "group"
    ? `${cohortName ?? "Class session"} · ${sessionDate}`
    : `${studentName ?? "Student"} · ${sessionDate}`;
  const heading = sessionType === "group" ? "Class session recap" : "Session recap";
  const preview = sessionType === "group"
    ? `Class recap — ${cohortName ?? "session"} — ${sessionDate}`
    : `Session recap for ${studentName ?? "student"} — ${sessionDate}`;

  return (
    <Layout preview={preview}>
      <Heading style={{ color: "#0f172a", fontSize: 22, marginTop: 0, marginBottom: 4 }}>
        {heading}
      </Heading>
      <Text style={{ color: "#475569", fontSize: 14, margin: "0 0 24px 0" }}>
        {subtitle}
      </Text>

      <Section>
        {FIELD_LABELS.map(([key, label]) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <Text
              style={{
                color: "#1e293b",
                fontSize: 13,
                fontWeight: 700,
                margin: "0 0 4px 0",
                letterSpacing: "0.01em",
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                color: "#334155",
                fontSize: 15,
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {fields[key] || "—"}
            </Text>
          </div>
        ))}
      </Section>

      <Section
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <Text
          style={{
            color: "#0f172a",
            fontSize: 15,
            margin: 0,
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          {signature}
        </Text>
      </Section>

      <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 24, lineHeight: 1.5 }}>
        Reply to this email to reach {tutorName} directly.
      </Text>
    </Layout>
  );
}

export default SessionRecap;
