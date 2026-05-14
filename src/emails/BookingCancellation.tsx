import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./_shared/Layout";

export type BookingCancellationTier = "group" | "small_group" | "private" | "elite";

export interface BookingCancellationProps {
  studentFirstName: string;
  tutorName: string;
  sessionDate: string;
  sessionTime: string;
  withinWindow: boolean;
  creditForfeited: boolean;
  planTier: BookingCancellationTier;
}

/** Per locked policy in project_tiers.md. */
function buildCreditMessage(p: BookingCancellationProps): string {
  if (!p.withinWindow) {
    return "This session was cancelled with more than 24 hours notice and no credit has been applied.";
  }
  if (p.planTier === "private" && p.creditForfeited) {
    return "This session was cancelled within 24 hours. Per our policy, the session payment has been retained and is not eligible for a refund or rebooking.";
  }
  if (p.planTier === "elite" && p.creditForfeited) {
    return "This session was cancelled within 24 hours and your session credit has been applied. You have one fewer session remaining this month.";
  }
  return "This session was cancelled within 24 hours. No credit was applied.";
}

export function BookingCancellation(props: BookingCancellationProps) {
  return (
    <Layout preview={`Cancelled: ${props.sessionDate} with ${props.tutorName}`}>
      <Heading style={{ color: "#0f172a", fontSize: 22, marginTop: 0, marginBottom: 12 }}>
        Your session has been cancelled
      </Heading>
      <Text style={{ color: "#334155", fontSize: 16, lineHeight: 1.5 }}>
        Hi {props.studentFirstName}, your SAT prep session with <strong>{props.tutorName}</strong>{" "}
        on {props.sessionDate} at {props.sessionTime} has been cancelled.
      </Text>

      <Section
        style={{
          backgroundColor: props.creditForfeited ? "#fef3c7" : "#ecfdf5",
          borderRadius: 8,
          padding: "16px 20px",
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            margin: 0,
            color: props.creditForfeited ? "#78350f" : "#065f46",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {buildCreditMessage(props)}
        </Text>
      </Section>

      <Text style={{ color: "#64748b", fontSize: 13, marginTop: 24 }}>
        Cancellation update (.ics) attached — your calendar will be cleared automatically.
      </Text>
    </Layout>
  );
}

export default BookingCancellation;
