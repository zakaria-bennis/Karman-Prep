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

/** Private tutoring's late-cancel rule: under 24 hours counts as a used hour of the package. */
function buildCreditMessage(p: BookingCancellationProps): string {
  if (!p.withinWindow) {
    return "This session was cancelled with more than 24 hours' notice, so nothing was used.";
  }
  if ((p.planTier === "private" || p.planTier === "elite") && p.creditForfeited) {
    return "This session was less than 24 hours away when it was cancelled, so it counted as a used hour of your package.";
  }
  return "This session was cancelled within 24 hours. Nothing was used.";
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
        Cancellation update (.ics) attached. Your calendar will clear automatically.
      </Text>
    </Layout>
  );
}

export default BookingCancellation;
