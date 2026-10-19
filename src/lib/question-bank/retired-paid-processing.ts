import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/supabase/queries/admin";

/** Retain the old URL contract without allocating jobs, uploads or model calls. */
export async function retiredPaidQuestionProcessing() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await requireRole(userId, ["admin"])))
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  return NextResponse.json(
    {
      error: "Automatic paid PDF processing is retired. Use the reviewed question import workflow.",
    },
    { status: 410, headers: { "cache-control": "no-store" } }
  );
}
