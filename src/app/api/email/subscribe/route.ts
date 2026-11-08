// ============================================================
// POST /api/email/subscribe
// Public lead capture: coming-soon notify, newsletter, free practice
// test registration and program interest. Adds the email to the
// Resend audience (nurture drip) and records the lead, with its
// source, in `marketing_leads` so registrations can be followed up.
// Public endpoint — no auth required.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/integrations/resend/emails";
import { createAdminClient } from "@/lib/supabase/server";
import { emailSubscribeBodySchema } from "../schemas";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req: NextRequest) {
  try {
    const parsed = emailSubscribeBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { source, name, role } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    // Record the lead with its source. A failure here (for example the
    // table not existing yet because its migration has not been applied)
    // is logged but must not block the signup: the email still goes to
    // the Resend audience below.
    if (SUPABASE_CONFIGURED) {
      const { error } = await createAdminClient()
        .from("marketing_leads")
        .upsert(
          { email, source, name: name ?? null, role: role ?? null },
          { onConflict: "email,source", ignoreDuplicates: true }
        );
      if (error) console.error("[subscribe] Could not record lead:", error.message);
    }

    await addToWaitlist(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[subscribe] Error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
