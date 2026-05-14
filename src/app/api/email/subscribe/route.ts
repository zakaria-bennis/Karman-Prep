// ============================================================
// POST /api/email/subscribe
// Captures visitor email for the nurture drip sequence.
// Public endpoint — no auth required.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/integrations/resend/emails";
import { emailSubscribeBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  try {
    const parsed = emailSubscribeBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await addToWaitlist(parsed.data.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[subscribe] Error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
