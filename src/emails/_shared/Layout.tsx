// ============================================================
// Shared layout for all React Email templates.
// Light theme, inline styles, conservative HTML — email clients
// hate everything fancy. Brand color (Karman blue) only on
// header + buttons.
// ============================================================

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif";

export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: FONT, backgroundColor: "#f8fafc", margin: 0, padding: "32px 0" }}>
        <Container
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "32px",
            backgroundColor: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <Section>
            <Text
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#3B82F6",
                margin: "0 0 24px 0",
                letterSpacing: "0.08em",
              }}
            >
              STRATA
            </Text>
          </Section>
          {children}
          <Hr style={{ borderColor: "#e2e8f0", marginTop: 32, marginBottom: 16 }} />
          <Text style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
            Karman · SAT Tutoring
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
