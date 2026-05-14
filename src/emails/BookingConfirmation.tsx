import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./_shared/Layout";

export interface BookingConfirmationProps {
  studentFirstName: string;
  tutorName: string;
  /** Pre-formatted in the recipient's timezone. */
  sessionDate: string;
  /** Pre-formatted with TZ abbreviation. */
  sessionTime: string;
  joinUrl: string;
}

export function BookingConfirmation({
  studentFirstName,
  tutorName,
  sessionDate,
  sessionTime,
  joinUrl,
}: BookingConfirmationProps) {
  return (
    <Layout preview={`Confirmed: ${sessionDate} with ${tutorName}`}>
      <Heading style={{ color: "#0f172a", fontSize: 22, marginTop: 0, marginBottom: 12 }}>
        Your session is confirmed
      </Heading>
      <Text style={{ color: "#334155", fontSize: 16, lineHeight: 1.5 }}>
        Hi {studentFirstName}, your SAT prep session with <strong>{tutorName}</strong> is locked in.
      </Text>

      <Section
        style={{
          backgroundColor: "#f1f5f9",
          borderRadius: 8,
          padding: "16px 20px",
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        <Text style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 600 }}>
          {sessionDate}
        </Text>
        <Text style={{ margin: "4px 0 0 0", color: "#475569", fontSize: 14 }}>{sessionTime}</Text>
      </Section>

      {joinUrl ? (
        <Section style={{ textAlign: "center", marginTop: 8, marginBottom: 8 }}>
          <Button
            href={joinUrl}
            style={{
              backgroundColor: "#3B82F6",
              color: "#ffffff",
              padding: "12px 32px",
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 16,
              display: "inline-block",
            }}
          >
            Join your session
          </Button>
        </Section>
      ) : null}

      <Text style={{ color: "#64748b", fontSize: 13, marginTop: 24 }}>
        Calendar invite (.ics) attached — one click to add this to your calendar.
      </Text>
    </Layout>
  );
}

export default BookingConfirmation;
