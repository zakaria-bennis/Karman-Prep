// The seeded accounts this copy's database really has, for Settings' "Test accounts". Server only, and
// only on the local test copy (the callers check isDevAuthBypassActive).
import { createAdminClient } from "@/lib/supabase/server";
import type { TestAccount } from "./test-accounts";

const ORDER = ["student", "parent", "tutor", "affiliate_tutor", "admin"];
const KIND: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  affiliate_tutor: "Tutor, affiliate",
  admin: "Admin",
};

export async function testAccounts(): Promise<TestAccount[]> {
  const { data } = await createAdminClient()
    .from("users")
    .select("clerk_id, role, first_name")
    .like("clerk_id", "dev\\_seed\\_%")
    .limit(60);
  return (data ?? [])
    .sort(
      (a, b) =>
        ORDER.indexOf(a.role) - ORDER.indexOf(b.role) || a.clerk_id.localeCompare(b.clerk_id)
    )
    .map((u) => {
      // "dev_seed_student_mid" reads as "Student, mid"
      const kind = KIND[u.role] ?? u.role;
      const rest = u.clerk_id
        .replace(/^dev_seed_/, "")
        .replace(new RegExp(`^${u.role}_?`), "")
        .replaceAll("_", " ");
      return { id: u.clerk_id, name: rest ? `${kind}, ${rest}` : kind };
    });
}
