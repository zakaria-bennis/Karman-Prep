// ============================================================
// POST /api/email/subscribe
// Captures visitor email for the nurture drip sequence.
// Public endpoint — no auth required.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/resend/emails";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    await addToWaitlist(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[subscribe] Error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
