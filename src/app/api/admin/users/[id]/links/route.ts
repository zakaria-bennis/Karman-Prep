// ============================================================
// GET /api/admin/users/:id/links
// Returns the students currently linked to a parent.
// Admin-only; gated via real role (not impersonated).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchLinkedStudentsForParent } from "@/lib/supabase/queries/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const role = await fetchUserRole(userId);
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await context.params;
  try {
    const students = await fetchLinkedStudentsForParent(id);
    return NextResponse.json({ students });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
