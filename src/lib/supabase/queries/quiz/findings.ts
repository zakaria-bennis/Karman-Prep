// ============================================================
// Inspector-UI selectors and mutations for question_findings.
//
// Populated by scripts/question-audit/ingest-findings.mjs from
// audit-out/audit-report.json (deterministic) + grader-report.json
// (LLM). Read by /admin/questions/inspect to power the worklist
// + per-question detail pages.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";

export type FindingSeverity = "BLOCKING" | "WARNING" | "NOTICE";
export type FindingSource = "auditor" | "grader";

export interface QuestionFinding {
  id: string;
  question_id: string;
  source: FindingSource;
  severity: FindingSeverity;
  category: string;
  code: string;
  message: string;
  value: string | null;
  detail: Record<string, unknown> | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_note: string | null;
  created_at: string;
}

/** One row of the Inspector worklist: a question + its findings
 *  rolled up to severity counts. */
export interface InspectorRow {
  question_id: string;
  source_pdf: string | null;
  source_page: number | null;
  domain: string | null;
  concept_slug: string | null;
  import_status: string | null;
  is_live: boolean | null;
  question_text: string;
  blocking_count: number;
  warning_count: number;
  notice_count: number;
  total_count: number;
  worst_severity: FindingSeverity;
  // Newest finding's category — gives a one-glance hint of what's wrong.
  latest_category: string | null;
}

export interface InspectorFilter {
  severity?: FindingSeverity;
  source?: FindingSource;
  category?: string;
  source_pdf?: string;
  domain?: string;
  include_resolved?: boolean;
  // Free-text search against question_text. Slow on large tables;
  // we use ILIKE so it's bound to a prefix-match index when possible.
  q?: string;
}

const SEVERITY_RANK = { BLOCKING: 3, WARNING: 2, NOTICE: 1 } as const;

/** The worklist — one row per question that has at least one finding
 *  matching the filter. Sorted by worst severity descending, then
 *  total count descending. Used by /admin/questions/inspect. */
export async function selectInspectorWorklist(
  filter: InspectorFilter = {}
): Promise<InspectorRow[]> {
  const supabase = createAdminClient();

  // Build the findings filter
  let fq = supabase.from("question_findings").select("question_id, severity, category, source");
  if (!filter.include_resolved) fq = fq.is("resolved_at", null);
  if (filter.severity) fq = fq.eq("severity", filter.severity);
  if (filter.source) fq = fq.eq("source", filter.source);
  if (filter.category) fq = fq.eq("category", filter.category);

  const { data: findings, error } = await fq;
  if (error) throw error;

  // Aggregate per question_id
  const agg = new Map<
    string,
    { blocking: number; warning: number; notice: number; latest: string }
  >();
  for (const f of findings ?? []) {
    if (!agg.has(f.question_id)) {
      agg.set(f.question_id, { blocking: 0, warning: 0, notice: 0, latest: f.category });
    }
    const a = agg.get(f.question_id)!;
    if (f.severity === "BLOCKING") a.blocking++;
    else if (f.severity === "WARNING") a.warning++;
    else a.notice++;
    a.latest = f.category;
  }

  if (agg.size === 0) return [];

  // Pull matching quiz_questions
  let qq = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, domain, concept_slug, import_status, is_live, question_text"
    )
    .in("id", [...agg.keys()]);
  if (filter.source_pdf) qq = qq.eq("source_pdf", filter.source_pdf);
  if (filter.domain) qq = qq.eq("domain", filter.domain);
  if (filter.q) qq = qq.ilike("question_text", `%${filter.q}%`);

  const { data: questions, error: qerr } = await qq;
  if (qerr) throw qerr;

  const rows: InspectorRow[] = (questions ?? []).map((q) => {
    const a = agg.get(q.id)!;
    const worst: FindingSeverity =
      a.blocking > 0 ? "BLOCKING" : a.warning > 0 ? "WARNING" : "NOTICE";
    return {
      question_id: q.id,
      source_pdf: q.source_pdf,
      source_page: q.source_page,
      domain: q.domain,
      concept_slug: q.concept_slug,
      import_status: q.import_status,
      is_live: q.is_live,
      question_text: q.question_text,
      blocking_count: a.blocking,
      warning_count: a.warning,
      notice_count: a.notice,
      total_count: a.blocking + a.warning + a.notice,
      worst_severity: worst,
      latest_category: a.latest,
    };
  });

  rows.sort((a, b) => {
    const sa = SEVERITY_RANK[a.worst_severity];
    const sb = SEVERITY_RANK[b.worst_severity];
    if (sa !== sb) return sb - sa;
    return b.total_count - a.total_count;
  });

  return rows;
}

/** All findings for a single question, ordered by severity desc.
 *  Used by the detail page. */
export async function selectFindingsForQuestion(
  questionId: string,
  opts: { include_resolved?: boolean } = {}
): Promise<QuestionFinding[]> {
  const supabase = createAdminClient();
  let q = supabase.from("question_findings").select("*").eq("question_id", questionId);
  if (!opts.include_resolved) q = q.is("resolved_at", null);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as QuestionFinding[];
  rows.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  return rows;
}

/** Inspector summary counts — used in the header bar. */
export interface InspectorSummary {
  total_findings: number;
  questions_with_findings: number;
  blocking: number;
  warning: number;
  notice: number;
  unique_codes: number;
}

export async function selectInspectorSummary(): Promise<InspectorSummary> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("question_findings")
    .select("question_id, severity, code")
    .is("resolved_at", null);
  if (error) throw error;
  const rows = data ?? [];
  const qids = new Set<string>();
  const codes = new Set<string>();
  let blocking = 0,
    warning = 0,
    notice = 0;
  for (const r of rows) {
    qids.add(r.question_id);
    codes.add(r.code);
    if (r.severity === "BLOCKING") blocking++;
    else if (r.severity === "WARNING") warning++;
    else notice++;
  }
  return {
    total_findings: rows.length,
    questions_with_findings: qids.size,
    blocking,
    warning,
    notice,
    unique_codes: codes.size,
  };
}

// ── Recent activity (audit diff) ────────────────────────────
// "What changed since last X?" — counts of findings created or
// resolved in the past 24h / 7d. Renders as a small bar above the
// Inspector worklist so the admin can spot a fresh audit run at
// a glance + measure triage progress (resolutions outpacing new
// findings = winning).

export interface RecentActivity {
  /** Hours covered by the snapshot (24 or 168). */
  hours: number;
  /** Findings created (any source) within the window. */
  new_findings: number;
  new_blocking: number;
  new_warning: number;
  new_notice: number;
  /** Findings resolved within the window. */
  resolved_findings: number;
  /** Net change: new - resolved. Positive = backlog growing. */
  net_change: number;
}

export async function selectRecentActivity(hours: number): Promise<RecentActivity> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  // Two parallel queries — much cheaper than fetching every finding
  // and filtering in app code.
  const [createdRes, resolvedRes] = await Promise.all([
    supabase.from("question_findings").select("severity").gte("created_at", since),
    supabase.from("question_findings").select("id").gte("resolved_at", since),
  ]);
  if (createdRes.error) throw createdRes.error;
  if (resolvedRes.error) throw resolvedRes.error;

  let blocking = 0,
    warning = 0,
    notice = 0;
  for (const f of createdRes.data ?? []) {
    if (f.severity === "BLOCKING") blocking++;
    else if (f.severity === "WARNING") warning++;
    else notice++;
  }
  const newTotal = (createdRes.data ?? []).length;
  const resolvedTotal = (resolvedRes.data ?? []).length;
  return {
    hours,
    new_findings: newTotal,
    new_blocking: blocking,
    new_warning: warning,
    new_notice: notice,
    resolved_findings: resolvedTotal,
    net_change: newTotal - resolvedTotal,
  };
}

/** A single row + its choices + its findings — for the detail page. */
export async function selectQuestionForInspection(questionId: string): Promise<{
  question: QuizQuestionWithChoices;
  findings: QuestionFinding[];
} | null> {
  const supabase = createAdminClient();
  const { data: q, error } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw error;
  if (!q) return null;
  const findings = await selectFindingsForQuestion(questionId);
  return { question: q as QuizQuestionWithChoices, findings };
}

// ── Quality Dashboard data ────────────────────────────────
// Aggregate view of finding counts cut by severity / code /
// source_pdf / domain. Drives /admin/questions/dashboard.
//
// Snapshot-style: one round-trip pulls every open finding (+ joined
// quiz_questions row metadata) and we aggregate locally. For a
// question bank of ~5k rows × ~10 findings each that's 50k rows —
// well within a single Supabase response and roundtrips fast.
// When the bank grows to 100k+ this should move to a materialized
// view, but for the current scale local aggregation is the
// least-moving-parts solution.

export interface QualityDashboardData {
  /** Top counts to display at the top of the page. */
  totals: {
    total_findings: number;
    open: number;
    resolved: number;
    blocking_open: number;
    warning_open: number;
    notice_open: number;
    questions_affected: number;
    questions_clean: number;
    unique_codes: number;
  };
  /** Top 10 finding codes by open-count, with severity for color. */
  top_codes: Array<{
    code: string;
    category: string;
    severity: FindingSeverity;
    open: number;
    resolved: number;
  }>;
  /** Findings grouped by source_pdf (test batch). Ordered by open count. */
  by_source_pdf: Array<{
    source_pdf: string;
    open: number;
    blocking: number;
    questions_affected: number;
    total_questions: number;
  }>;
  /** Findings grouped by SAT domain. */
  by_domain: Array<{
    domain: string;
    open: number;
    blocking: number;
    questions_affected: number;
  }>;
  /** Findings grouped by source (auditor vs grader). */
  by_source: Array<{
    source: FindingSource;
    open: number;
    resolved: number;
  }>;
}

export async function selectQualityDashboardData(): Promise<QualityDashboardData> {
  const supabase = createAdminClient();

  // 1. Pull every finding (open + resolved). Two columns each side
  //    so the join stays cheap.
  const { data: findings, error: fErr } = await supabase
    .from("question_findings")
    .select("question_id, source, severity, category, code, resolved_at");
  if (fErr) throw fErr;
  const allFindings = findings ?? [];

  // 2. Pull every quiz_questions row that has at least one finding +
  //    the columns we aggregate on.
  const qids = [...new Set(allFindings.map((f) => f.question_id))];
  const { data: questions, error: qErr } =
    qids.length > 0
      ? await supabase.from("quiz_questions").select("id, source_pdf, domain").in("id", qids)
      : { data: [], error: null };
  if (qErr) throw qErr;
  const qById = new Map(
    (questions ?? []).map((q) => [q.id, { source_pdf: q.source_pdf, domain: q.domain }])
  );

  // 3. Also pull total question count per source_pdf (for the
  //    "questions affected / total" denominator).
  const { data: allQuestions, error: aqErr } = await supabase
    .from("quiz_questions")
    .select("source_pdf");
  if (aqErr) throw aqErr;
  const totalsByPdf = new Map<string, number>();
  for (const q of allQuestions ?? []) {
    if (!q.source_pdf) continue;
    totalsByPdf.set(q.source_pdf, (totalsByPdf.get(q.source_pdf) ?? 0) + 1);
  }

  // ── Aggregate ──
  let open = 0,
    resolved = 0,
    blockingOpen = 0,
    warningOpen = 0,
    noticeOpen = 0;
  const questionsAffected = new Set<string>();
  const uniqueCodes = new Set<string>();
  // (code → {severity, category, open, resolved})
  type CodeAgg = {
    code: string;
    category: string;
    severity: FindingSeverity;
    open: number;
    resolved: number;
  };
  const byCode = new Map<string, CodeAgg>();
  // (source_pdf → {open, blocking, qids})
  const byPdf = new Map<string, { open: number; blocking: number; qids: Set<string> }>();
  const byDomain = new Map<string, { open: number; blocking: number; qids: Set<string> }>();
  const bySource = new Map<FindingSource, { open: number; resolved: number }>();

  for (const f of allFindings) {
    const isOpen = !f.resolved_at;
    uniqueCodes.add(f.code);
    if (isOpen) {
      open++;
      questionsAffected.add(f.question_id);
      if (f.severity === "BLOCKING") blockingOpen++;
      else if (f.severity === "WARNING") warningOpen++;
      else noticeOpen++;
    } else {
      resolved++;
    }
    // by_code
    if (!byCode.has(f.code)) {
      byCode.set(f.code, {
        code: f.code,
        category: f.category,
        severity: f.severity as FindingSeverity,
        open: 0,
        resolved: 0,
      });
    }
    const c = byCode.get(f.code)!;
    if (isOpen) c.open++;
    else c.resolved++;

    // by_source
    if (!bySource.has(f.source as FindingSource)) {
      bySource.set(f.source as FindingSource, { open: 0, resolved: 0 });
    }
    const s = bySource.get(f.source as FindingSource)!;
    if (isOpen) s.open++;
    else s.resolved++;

    // by_source_pdf + by_domain — only for open findings
    if (isOpen) {
      const q = qById.get(f.question_id);
      const pdf = q?.source_pdf ?? "(no source_pdf)";
      if (!byPdf.has(pdf)) byPdf.set(pdf, { open: 0, blocking: 0, qids: new Set() });
      const pa = byPdf.get(pdf)!;
      pa.open++;
      if (f.severity === "BLOCKING") pa.blocking++;
      pa.qids.add(f.question_id);

      const domain = q?.domain ?? "(no domain)";
      if (!byDomain.has(domain)) byDomain.set(domain, { open: 0, blocking: 0, qids: new Set() });
      const da = byDomain.get(domain)!;
      da.open++;
      if (f.severity === "BLOCKING") da.blocking++;
      da.qids.add(f.question_id);
    }
  }

  const topCodes = [...byCode.values()].sort((a, b) => b.open - a.open).slice(0, 10);

  const bySourcePdf = [...byPdf.entries()]
    .map(([source_pdf, v]) => ({
      source_pdf,
      open: v.open,
      blocking: v.blocking,
      questions_affected: v.qids.size,
      total_questions: totalsByPdf.get(source_pdf) ?? v.qids.size,
    }))
    .sort((a, b) => b.open - a.open);

  const byDomainArr = [...byDomain.entries()]
    .map(([domain, v]) => ({
      domain,
      open: v.open,
      blocking: v.blocking,
      questions_affected: v.qids.size,
    }))
    .sort((a, b) => b.open - a.open);

  const bySourceArr: QualityDashboardData["by_source"] = [];
  for (const [source, v] of bySource.entries()) {
    bySourceArr.push({ source, open: v.open, resolved: v.resolved });
  }
  bySourceArr.sort((a, b) => b.open - a.open);

  const totalQuestions = allQuestions?.length ?? 0;
  return {
    totals: {
      total_findings: allFindings.length,
      open,
      resolved,
      blocking_open: blockingOpen,
      warning_open: warningOpen,
      notice_open: noticeOpen,
      questions_affected: questionsAffected.size,
      questions_clean: Math.max(0, totalQuestions - questionsAffected.size),
      unique_codes: uniqueCodes.size,
    },
    top_codes: topCodes,
    by_source_pdf: bySourcePdf,
    by_domain: byDomainArr,
    by_source: bySourceArr,
  };
}

/** Distinct values for filter dropdowns. */
export async function selectInspectorFilterOptions(): Promise<{
  source_pdfs: string[];
  categories: string[];
}> {
  const supabase = createAdminClient();
  const [pdfs, cats] = await Promise.all([
    supabase
      .from("question_findings")
      .select("question_id")
      .is("resolved_at", null)
      .then(async ({ data }) => {
        if (!data?.length) return [];
        const ids = [...new Set(data.map((d) => d.question_id))];
        const { data: qs } = await supabase
          .from("quiz_questions")
          .select("source_pdf")
          .in("id", ids)
          .not("source_pdf", "is", null);
        return [...new Set((qs ?? []).map((q) => q.source_pdf as string))].sort();
      }),
    supabase
      .from("question_findings")
      .select("category")
      .is("resolved_at", null)
      .then(({ data }) => [...new Set((data ?? []).map((d) => d.category))].sort()),
  ]);
  return { source_pdfs: pdfs, categories: cats };
}
