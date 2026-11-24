// Every page the site can show, for the Page Studio (/studio). One entry per screen: the marketing
// site, sign-up and start, the student portal and its quizzes, and the parent, tutor, school and
// admin portals. inventory.test.ts checks that every page file under src/app is listed here, so a
// new page cannot be missed.
//
// `path` is the address, with [params] where the page needs one. A param is filled from:
//   · `samples`: a fixed example from the site's own lists (a skill, a domain, exam 1), see samples.ts;
//   · or what the studio has seen while browsing (the parent's child, a cohort), learned from `from`.

export type Persona = "visitor" | "student" | "parent" | "tutor" | "teacher" | "admin";

export type AreaId =
  | "site"
  | "start"
  | "student"
  | "quiz"
  | "parent"
  | "tutor"
  | "school"
  | "admin";

/** A fixed example value for a param, resolved on the server (samples.ts). */
export type SampleKey = "subSkill" | "catalogSkill" | "skill72" | "domain" | "examForm" | "rwNode";

export interface StudioPage {
  /** Stable key: notes and review marks are kept against it. */
  id: string;
  area: AreaId;
  title: string;
  /** Address with [params], plus an optional query string. */
  path: string;
  /** The page file under src/app (for the coverage test). */
  file: string;
  /** Who should be looking. */
  as: Persona;
  /** Fixed examples for params. */
  samples?: Record<string, SampleKey>;
  /** Where to open first when a data param has not been seen yet. */
  from?: string;
  /** One short line: how to reach this state, or what it needs. */
  hint?: string;
  /** Only sends the visitor elsewhere: listed, skipped when flipping. */
  redirects?: string;
}

export const AREAS: ReadonlyArray<{ id: AreaId; label: string }> = [
  { id: "site", label: "Marketing site" },
  { id: "start", label: "Sign up and start" },
  { id: "student", label: "Student portal" },
  { id: "quiz", label: "Quizzes and tests" },
  { id: "parent", label: "Parent portal" },
  { id: "tutor", label: "Tutor portal" },
  { id: "school", label: "School portal" },
  { id: "admin", label: "Admin" },
];

/** Page files that are not part of the site anyone sees, with the reason. */
export const NOT_LISTED: ReadonlyArray<{ prefix: string; why: string }> = [
  {
    prefix: "src/app/dev/",
    why: "Design pages: only on a developer's computer, 404 on the live site",
  },
  { prefix: "src/app/studio/", why: "This review tool itself, for admins only" },
];

const S = "src/app/(site)";
const STU = "src/app/dashboard/student";
const PAR = "src/app/dashboard/parent";
const T = "src/app/tutor";
const A = "src/app/admin";

function site(id: string, title: string, path: string, dir: string, hint?: string): StudioPage {
  return {
    id: `site.${id}`,
    area: "site",
    title,
    path,
    file: `${S}${dir}/page.tsx`,
    as: "visitor",
    hint,
  };
}

function tab(id: string, title: string, hint?: string): StudioPage {
  return {
    id: `student.${id}`,
    area: "student",
    title,
    path: `/dashboard/student?page=${id}`,
    file: `${STU}/page.tsx`,
    as: "student",
    hint,
  };
}

function admin(
  id: string,
  title: string,
  dir: string,
  extra: Partial<StudioPage> = {}
): StudioPage {
  return {
    id: `admin.${id}`,
    area: "admin",
    title,
    path: `/admin${dir}`,
    file: `${A}${dir}/page.tsx`,
    as: "admin",
    ...extra,
  };
}

export const STUDIO_PAGES: readonly StudioPage[] = [
  // ── Marketing site ───────────────────────────────────────────
  site("home", "Home", "/", ""),
  site("program", "The program", "/program", "/program"),
  site("private", "Private tutoring", "/private-tutoring", "/private-tutoring"),
  site("test", "Free practice test", "/free-practice-test", "/free-practice-test"),
  site("pricing", "Pricing", "/pricing", "/pricing"),
  site("guarantee", "Guarantee", "/guarantee", "/guarantee"),
  site("faq", "FAQ", "/faq", "/faq"),
  site("about", "About", "/about", "/about"),
  site("research", "Research", "/research", "/research"),
  site("schools", "For schools", "/schools", "/schools"),
  site("tutors", "For tutors", "/for-tutors", "/for-tutors"),
  site("call", "Book a free call", "/call", "/call"),
  site("reserve", "Reserve a cohort seat", "/reserve", "/reserve"),
  site(
    "reserve-pay",
    "Reserve: pay",
    "/reserve/pay",
    "/reserve/pay",
    "Opens from a seat you reserved; alone it returns to Reserve"
  ),
  site(
    "reserve-welcome",
    "Reserve: welcome",
    "/reserve/welcome",
    "/reserve/welcome",
    "The page after paying for a seat"
  ),
  site("privacy", "Privacy policy", "/privacy", "/privacy"),
  site("terms", "Terms", "/terms", "/terms"),
  site("refunds", "Refunds", "/refunds", "/refunds"),
  site("cookies", "Cookies", "/cookies", "/cookies"),
  site("missing", "Page not found", "/this-page-does-not-exist", "/[...missing]"),
  {
    id: "site.coming-soon",
    area: "site",
    title: "Coming soon (signed-out visitors)",
    path: "/coming-soon",
    file: "src/app/coming-soon/page.tsx",
    as: "visitor",
  },

  // ── Sign up and start ────────────────────────────────────────
  {
    id: "start.sign-in",
    area: "start",
    title: "Sign in",
    path: "/auth/sign-in",
    file: "src/app/auth/sign-in/[[...sign-in]]/page.tsx",
    as: "visitor",
    hint: "Signed in, it may send you on to your portal",
  },
  {
    id: "start.sign-up",
    area: "start",
    title: "Sign up",
    path: "/auth/sign-up",
    file: "src/app/auth/sign-up/[[...sign-up]]/page.tsx",
    as: "visitor",
    hint: "Signed in, it may send you on to your portal",
  },
  {
    id: "start.onboarding",
    area: "start",
    title: "Onboarding",
    path: "/onboarding",
    file: "src/app/onboarding/page.tsx",
    as: "student",
  },
  {
    id: "start.questionnaire",
    area: "start",
    title: "Questionnaire (after paying)",
    path: "/onboarding/questionnaire",
    file: "src/app/onboarding/questionnaire/page.tsx",
    as: "student",
    hint: "Only for Cohort and Private students",
  },
  {
    id: "start.join",
    area: "start",
    title: "Join with a code",
    path: "/join",
    file: "src/app/join/page.tsx",
    as: "student",
  },
  {
    id: "start.join-class",
    area: "start",
    title: "Join a class",
    path: "/join/class",
    file: "src/app/join/class/page.tsx",
    as: "student",
  },
  {
    id: "start.join-code",
    area: "start",
    title: "Join: invite link",
    path: "/join/[code]",
    file: "src/app/join/[code]/page.tsx",
    as: "student",
    hint: "Needs a real invite code: type it in the address bar",
  },
  {
    id: "start.join-parent",
    area: "start",
    title: "Parent invite link",
    path: "/join/parent/[token]",
    file: "src/app/join/parent/[token]/page.tsx",
    as: "parent",
    hint: "Needs a real parent invite: type it in the address bar",
  },
  {
    id: "start.billing",
    area: "start",
    title: "Plans and billing",
    path: "/billing",
    file: "src/app/billing/page.tsx",
    as: "parent",
    hint: "A student is sent to Settings, Plan",
  },
  {
    id: "start.tutor-start",
    area: "start",
    title: "Become a tutor",
    path: "/tutors/start",
    file: "src/app/tutors/start/page.tsx",
    as: "visitor",
  },
  {
    id: "start.tutor-welcome",
    area: "start",
    title: "Tutor welcome",
    path: "/tutors/welcome",
    file: "src/app/tutors/welcome/page.tsx",
    as: "tutor",
  },

  // ── Student portal ───────────────────────────────────────────
  tab("library", "Library"),
  tab("progress", "Progress"),
  tab("mistakes", "Mistake Log"),
  tab("rewards", "Rewards"),
  tab("homework", "Homework", "Cohort and Private plans"),
  tab("schedule", "Schedule", "Private plan"),
  tab("chat", "Chat", "Cohort and Private plans"),
  tab("account", "Account and Settings"),
  {
    id: "student.welcome",
    area: "student",
    title: "Welcome (first visit)",
    path: "/dashboard/student?welcome=1",
    file: `${STU}/page.tsx`,
    as: "student",
  },
  {
    id: "student.scholarship",
    area: "student",
    title: "Scholarship",
    path: "/dashboard/student/scholarship",
    file: `${STU}/scholarship/page.tsx`,
    as: "student",
  },

  // ── Quizzes and tests ────────────────────────────────────────
  {
    id: "quiz.set",
    area: "quiz",
    title: "Skill set (8 questions)",
    path: "/learn/set/[skillId]",
    file: "src/app/learn/set/[skillId]/page.tsx",
    as: "student",
    samples: { skillId: "subSkill" },
  },
  {
    id: "quiz.practice",
    area: "quiz",
    title: "Skill practice",
    path: "/learn/practice/[skillId]",
    file: "src/app/learn/practice/[skillId]/page.tsx",
    as: "student",
    samples: { skillId: "catalogSkill" },
  },
  {
    id: "quiz.strategy",
    area: "quiz",
    title: "Strategy quiz",
    path: "/learn/strategy/[skillId]",
    file: "src/app/learn/strategy/[skillId]/page.tsx",
    as: "student",
    samples: { skillId: "skill72" },
  },
  {
    id: "quiz.domain",
    area: "quiz",
    title: "Domain quiz",
    path: "/learn/domain/[domainId]",
    file: "src/app/learn/domain/[domainId]/page.tsx",
    as: "student",
    samples: { domainId: "domain" },
  },
  {
    id: "quiz.daily-ten",
    area: "quiz",
    title: "Daily 10",
    path: "/learn/daily-ten",
    file: "src/app/learn/daily-ten/page.tsx",
    as: "student",
  },
  {
    id: "quiz.daily",
    area: "quiz",
    title: "Daily challenge",
    path: "/learn/daily",
    file: "src/app/learn/daily/page.tsx",
    as: "student",
  },
  {
    id: "quiz.diagnostic",
    area: "quiz",
    title: "Diagnostic",
    path: "/learn/diagnostic",
    file: "src/app/learn/diagnostic/page.tsx",
    as: "student",
  },
  {
    id: "quiz.time-trial",
    area: "quiz",
    title: "Time trial",
    path: "/learn/time-trial",
    file: "src/app/learn/time-trial/page.tsx",
    as: "student",
  },
  {
    id: "quiz.tests",
    area: "quiz",
    title: "Full-length exams",
    path: "/learn/tests",
    file: "src/app/learn/tests/page.tsx",
    as: "student",
  },
  {
    id: "quiz.exam",
    area: "quiz",
    title: "Full-length exam",
    path: "/learn/exam/[form]",
    file: "src/app/learn/exam/[form]/page.tsx",
    as: "student",
    samples: { form: "examForm" },
    hint: "Opens on Saturdays, or with an Exam pass or the admin test switch",
  },
  {
    id: "quiz.lesson",
    area: "quiz",
    title: "Lesson (older skill map)",
    path: "/learn/reading/[nodeId]",
    file: "src/app/learn/[subject]/[nodeId]/page.tsx",
    as: "student",
    samples: { nodeId: "rwNode" },
  },
  {
    id: "quiz.history",
    area: "quiz",
    title: "Earlier learning history",
    path: "/learn/history",
    file: "src/app/learn/history/page.tsx",
    as: "student",
  },
  {
    id: "quiz.calculator",
    area: "quiz",
    title: "Calculator",
    path: "/calculator",
    file: "src/app/calculator/page.tsx",
    as: "student",
  },
  {
    id: "quiz.learn",
    area: "quiz",
    title: "Learn (old address)",
    path: "/learn",
    file: "src/app/learn/page.tsx",
    as: "student",
    redirects: "Library",
  },
  {
    id: "quiz.math",
    area: "quiz",
    title: "Math map (old address)",
    path: "/learn/math",
    file: "src/app/learn/math/page.tsx",
    as: "student",
    redirects: "Library",
  },
  {
    id: "quiz.reading",
    area: "quiz",
    title: "Reading map (old address)",
    path: "/learn/reading",
    file: "src/app/learn/reading/page.tsx",
    as: "student",
    redirects: "Library",
  },
  {
    id: "quiz.old-test",
    area: "quiz",
    title: "Practice test (old address)",
    path: "/learn/test/1",
    file: "src/app/learn/test/[form]/page.tsx",
    as: "student",
    redirects: "Full-length exams",
  },

  // ── Parent portal ────────────────────────────────────────────
  {
    id: "parent.home",
    area: "parent",
    title: "Parent home",
    path: "/dashboard/parent",
    file: `${PAR}/page.tsx`,
    as: "parent",
    hint: "With one child it opens that child's week",
  },
  {
    id: "parent.child",
    area: "parent",
    title: "Child's week",
    path: "/dashboard/parent/[studentId]",
    file: `${PAR}/[studentId]/page.tsx`,
    as: "parent",
    from: "/dashboard/parent",
  },
  {
    id: "parent.progress",
    area: "parent",
    title: "Child's progress",
    path: "/dashboard/parent/[studentId]/progress",
    file: `${PAR}/[studentId]/progress/page.tsx`,
    as: "parent",
    from: "/dashboard/parent",
  },
  {
    id: "parent.report",
    area: "parent",
    title: "Daily report",
    path: "/dashboard/parent/[studentId]/report",
    file: `${PAR}/[studentId]/report/page.tsx`,
    as: "parent",
    from: "/dashboard/parent",
  },
  {
    id: "parent.sessions",
    area: "parent",
    title: "Sessions",
    path: "/dashboard/parent/[studentId]/sessions",
    file: `${PAR}/[studentId]/sessions/page.tsx`,
    as: "parent",
    from: "/dashboard/parent",
  },
  {
    id: "parent.messages",
    area: "parent",
    title: "Messages",
    path: "/dashboard/parent/[studentId]/messages",
    file: `${PAR}/[studentId]/messages/page.tsx`,
    as: "parent",
    from: "/dashboard/parent",
  },
  {
    id: "parent.billing",
    area: "parent",
    title: "Billing",
    path: "/dashboard/parent/[studentId]/billing",
    file: `${PAR}/[studentId]/billing/page.tsx`,
    as: "parent",
    from: "/dashboard/parent",
  },
  {
    id: "parent.link",
    area: "parent",
    title: "Link a student",
    path: "/dashboard/parent/link",
    file: `${PAR}/link/page.tsx`,
    as: "parent",
  },
  {
    id: "parent.settings",
    area: "parent",
    title: "Parent settings",
    path: "/dashboard/parent/settings",
    file: `${PAR}/settings/page.tsx`,
    as: "parent",
  },

  // ── Tutor portal ─────────────────────────────────────────────
  {
    id: "tutor.home",
    area: "tutor",
    title: "Tutor home",
    path: "/tutor",
    file: `${T}/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.briefing",
    area: "tutor",
    title: "Briefing",
    path: "/tutor/briefing",
    file: `${T}/(staff)/briefing/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.schedule",
    area: "tutor",
    title: "Schedule",
    path: "/tutor/schedule",
    file: `${T}/(staff)/schedule/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.cohort",
    area: "tutor",
    title: "Cohort",
    path: "/tutor/cohort/[id]",
    file: `${T}/(staff)/cohort/[id]/page.tsx`,
    as: "tutor",
    from: "/tutor",
  },
  {
    id: "tutor.status-draft",
    area: "tutor",
    title: "Session status draft",
    path: "/tutor/sessions/[id]/status-draft",
    file: `${T}/(staff)/sessions/[id]/status-draft/page.tsx`,
    as: "tutor",
    from: "/tutor/schedule",
  },
  {
    id: "tutor.earnings",
    area: "tutor",
    title: "Earnings",
    path: "/tutor/earnings",
    file: `${T}/(staff)/earnings/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.earnings-data",
    area: "tutor",
    title: "Earnings data",
    path: "/tutor/earnings/data",
    file: `${T}/(staff)/earnings/data/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.payouts",
    area: "tutor",
    title: "Payouts",
    path: "/tutor/payouts",
    file: `${T}/(staff)/payouts/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.settings",
    area: "tutor",
    title: "Tutor settings",
    path: "/tutor/settings",
    file: `${T}/(staff)/settings/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.booking",
    area: "tutor",
    title: "Booking settings",
    path: "/tutor/settings/booking",
    file: `${T}/(staff)/settings/booking/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.payment",
    area: "tutor",
    title: "Payment settings",
    path: "/tutor/settings/payment",
    file: `${T}/(staff)/settings/payment/page.tsx`,
    as: "tutor",
  },
  {
    id: "tutor.student",
    area: "tutor",
    title: "A student",
    path: "/tutor/[studentId]",
    file: `${T}/[studentId]/page.tsx`,
    as: "tutor",
    from: "/tutor",
  },
  {
    id: "tutor.student-briefing",
    area: "tutor",
    title: "A student's briefing",
    path: "/tutor/[studentId]/briefing",
    file: `${T}/[studentId]/briefing/page.tsx`,
    as: "tutor",
    from: "/tutor",
  },
  {
    id: "tutor.student-answers",
    area: "tutor",
    title: "A student's answers",
    path: "/tutor/[studentId]/answers",
    file: `${T}/[studentId]/answers/page.tsx`,
    as: "tutor",
    from: "/tutor",
  },
  {
    id: "tutor.student-practice",
    area: "tutor",
    title: "A student's practice",
    path: "/tutor/[studentId]/practice/[sessionId]",
    file: `${T}/[studentId]/practice/[sessionId]/page.tsx`,
    as: "tutor",
    from: "/tutor/[studentId]",
  },
  {
    id: "tutor.billing",
    area: "tutor",
    title: "Affiliate billing",
    path: "/tutor/billing",
    file: `${T}/billing/page.tsx`,
    as: "tutor",
    hint: "Affiliate tutors only",
  },

  // ── School portal ────────────────────────────────────────────
  {
    id: "school.home",
    area: "school",
    title: "School home",
    path: "/school",
    file: "src/app/school/page.tsx",
    as: "teacher",
  },
  {
    id: "school.class",
    area: "school",
    title: "A class",
    path: "/school/classes/[classId]",
    file: "src/app/school/classes/[classId]/page.tsx",
    as: "teacher",
    from: "/school",
  },
  {
    id: "school.billing",
    area: "school",
    title: "School billing",
    path: "/school/billing",
    file: "src/app/school/billing/page.tsx",
    as: "teacher",
  },

  // ── Admin ────────────────────────────────────────────────────
  admin("home", "Admin home", ""),
  admin("users", "People", "/users"),
  admin("plans", "Plans", "/plans"),
  admin("scholarship", "Scholarship", "/scholarship"),
  admin("scholarship-one", "A scholarship application", "/scholarship/[id]", {
    from: "/admin/scholarship",
  }),
  admin("bank", "Question bank", "/bank"),
  admin("bank-one", "A bank question", "/bank/[id]", { from: "/admin/bank" }),
  admin("cohorts", "Cohorts", "/cohorts"),
  admin("cohort", "A cohort", "/cohorts/[id]", { from: "/admin/cohorts" }),
  admin("crm", "CRM", "/crm"),
  admin("crm-one", "A CRM contact", "/crm/[id]", { from: "/admin/crm" }),
  admin("messages", "Messages", "/messages"),
  admin("thread", "A family's messages", "/messages/[parentId]/[studentId]", {
    from: "/admin/messages",
  }),
  admin("students", "Students", "/students"),
  admin("student", "A student", "/students/[clerkId]", { from: "/admin/students" }),
  admin("tutors", "Tutors", "/tutors"),
  admin("affiliates", "Affiliate tutors", "/affiliates"),
  admin("schools", "Schools", "/schools"),
  admin("revenue", "Revenue", "/revenue"),
  admin("analytics", "Analytics", "/analytics"),
  admin("moderation", "Moderation", "/moderation"),
  admin("jobs", "Background jobs", "/jobs"),
  admin("generated", "Generated questions", "/generated"),
  admin("curriculum", "Curriculum", "/curriculum"),
  admin("curriculum-node", "A curriculum node", "/curriculum/[nodeId]", {
    from: "/admin/curriculum",
  }),
  admin("pdf-jobs", "Import jobs", "/pdf-pipeline/jobs"),
  admin("pdf-job", "An import job", "/pdf-pipeline/jobs/[id]", {
    from: "/admin/pdf-pipeline/jobs",
  }),
  admin("q-dashboard", "Question overview", "/questions/dashboard"),
  admin("q-review", "Review questions", "/questions/review"),
  admin("q-import", "Import questions", "/questions/import"),
  admin("q-preview", "Question preview", "/questions/preview"),
  admin("q-rapid", "Rapid preview", "/questions/preview/rapid"),
  admin("q-inspect", "Question inspector", "/questions/inspect"),
  admin("q-inspect-one", "Inspect one question", "/questions/inspect/[id]", {
    from: "/admin/questions/inspect",
  }),
  admin("q-student-view", "A question as students see it", "/questions/student-view/[id]", {
    from: "/admin/questions/inspect",
  }),
  admin("q-rejected", "Rejected questions", "/questions/rejected"),
  admin("q-archive", "Archived questions", "/questions/archive"),
  admin("q-chart", "Chart review", "/questions/chart-review"),
  admin("q-geometry", "Geometry review", "/questions/geometry-review"),
];

/** The pages worth flipping through (not the old addresses that only send you on). */
export const FLIP_PAGES: readonly StudioPage[] = STUDIO_PAGES.filter((p) => !p.redirects);

export function pageById(id: string): StudioPage | undefined {
  return STUDIO_PAGES.find((p) => p.id === id);
}
