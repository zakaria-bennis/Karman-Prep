import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./_shared/Layout";

export interface BookingRescheduleProps {
  studentFirstName: string;
  tutorName: string;
  oldSessionDate: string;
  oldSessionTime: string;
  newSessionDate: string;
  newSessionTime: string;
  joinUrl: string;
}

export function BookingReschedule(props: BookingRescheduleProps) {
  return (
    <Layout preview={`Rescheduled to ${props.newSessionDate} with ${props.tutorName}`}>
      <Heading style={{ color: "#0f172a", fontSize: 22, marginTop: 0, marginBottom: 12 }}>
        Your session has been rescheduled
      </Heading>
      <Text style={{ color: "#334155", fontSize: 16, lineHeight: 1.5 }}>
        Hi {props.studentFirstName}, your SAT prep session with <strong>{props.tutorName}</strong>{" "}
        has been moved.
      </Text>

      <Section style={{ marginTop: 16 }}>
        <Text
          style={{
            margin: 0,
            color: "#94a3b8",
            fontSize: 13,
            textDecoration: "line-through",
          }}
        >
          {props.oldSessionDate} · {props.oldSessionTime}
        </Text>
        <Section
          style={{
            backgroundColor: "#f1f5f9",
            borderRadius: 8,
            padding: "16px 20px",
            marginTop: 8,
          }}
        >
          <Text style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 600 }}>
            {props.newSessionDate}
          </Text>
          <Text style={{ margin: "4px 0 0 0", color: "#475569", fontSize: 14 }}>
            {props.newSessionTime}
          </Text>
        </Section>
      </Section>

      {props.joinUrl ? (
        <Section style={{ textAlign: "center", marginTop: 24 }}>
          <Button
            href={props.joinUrl}
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
            Join the new session
          </Button>
        </Section>
      ) : null}

      <Text style={{ color: "#64748b", fontSize: 13, marginTop: 24 }}>
        New calendar invite attached — your old one will be replaced when you accept.
      </Text>
    </Layout>
  );
}

export default BookingReschedule;
