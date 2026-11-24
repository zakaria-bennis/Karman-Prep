// /dev/sign-in: on the local test copy only, pick who to be in one click, with no email, phone or
// code (founder, 2026-11-23: signing in locally asked for a phone number and a code). The pick is a
// cookie read by safeAuth (src/lib/auth/dev-auth.ts). Production builds return 404.
import { notFound } from "next/navigation";
import { isDevAuthBypassActive } from "@/lib/auth/dev-auth";

export const dynamic = "force-dynamic";

const PEOPLE: { id: string; name: string }[] = [
  { id: "dev_seed_student_free", name: "Student, Free" },
  { id: "dev_seed_student_practice", name: "Student, Practice" },
  { id: "dev_seed_student_pro", name: "Student, Pro" },
  { id: "dev_seed_student_cohort", name: "Student, Cohort" },
  { id: "dev_seed_student_private", name: "Student, Private" },
  { id: "dev_seed_parent_maya", name: "Parent (Maya)" },
  { id: "dev_seed_tutor_david", name: "Tutor (David)" },
  { id: "dev_seed_admin", name: "Admin" },
];

export default function DevSignIn() {
  if (process.env.NODE_ENV === "production" || !isDevAuthBypassActive()) notFound();
  return (
    <main
      style={{ maxWidth: 420, margin: "64px auto", padding: "0 16px", fontFamily: "system-ui" }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Test sign-in</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>Local copy only. Pick who to be.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {PEOPLE.map((p) => (
          <a
            key={p.id}
            href={`/dev/sign-in/as?who=${p.id}`}
            style={{
              display: "block",
              padding: "14px 16px",
              border: "1px solid #ccc",
              borderRadius: 12,
              color: "#111",
              textDecoration: "none",
              fontSize: 17,
            }}
          >
            {p.name}
          </a>
        ))}
      </div>
    </main>
  );
}
