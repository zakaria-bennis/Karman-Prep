"use client";

// ============================================================
// PreviewClient — phase 2 shell.
//
// Layout:  [ top toolbar — filters · device · nav ]
//          [ sidebar | preview pane | side panel?  ]
//          [ bottom action bar — approve/flag/reject + toggles ]
//
// State persistence (localStorage, key = "karman.preview.v2"):
//   · filters     — subject / status / pdf / domain / hasFigure
//   · device      — mobile / tablet / desktop / full
//   · openPanels  — which side-panel chips were last open
//   · activeId    — last question the admin was looking at, so
//                   re-opening the page resumes where they were
//
// Selection (checkbox state) is NOT persisted — selections are
// per-session and stale across reloads.
// ============================================================

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import {
  actionApproveQuestion,
  actionFlagQuestion,
  actionSoftRejectQuestion,
  actionBulkApproveQuestions,
  actionBulkSoftRejectQuestions,
} from "@/app/admin/actions";
import { QuestionPreview } from "./QuestionPreview";
import { DeviceFrame, type DeviceWidth } from "./DeviceFrame";
import { PreviewSidebar } from "./PreviewSidebar";
import { PreviewToolbar, type FilterState } from "./PreviewToolbar";
import { PreviewActionBar, type PanelKey } from "./PreviewActionBar";
import { PreviewSidePanel } from "./PreviewSidePanel";

const LS_KEY = "karman.preview.v2";

interface PersistedState {
  filters?: Partial<FilterState>;
  device?: DeviceWidth;
  openPanels?: PanelKey[];
  activeId?: string | null;
}

const DEFAULT_FILTERS: FilterState = {
  subject: "all",
  status: "all",
  pdf: "all",
  domain: "all",
  hasFigure: "all",
};

export default function PreviewClient({ initial }: { initial: QuizQuestionWithChoices[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Persisted bits ────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [device, setDevice] = useState<DeviceWidth>("full");
  const [openPanels, setOpenPanels] = useState<Set<PanelKey>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ── Non-persisted bits ────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState({ approve: false, flag: false, reject: false });
  const [bulkPending, setBulkPending] = useState({ approving: false, rejecting: false });
  const [banner, setBanner] = useState<
    { kind: "ok"; text: string } | { kind: "err"; text: string } | null
  >(null);

  // ── Hydrate from localStorage on mount ────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.filters) setFilters({ ...DEFAULT_FILTERS, ...parsed.filters });
        if (parsed.device) setDevice(parsed.device);
        if (parsed.openPanels) setOpenPanels(new Set(parsed.openPanels));
        if (parsed.activeId) setActiveId(parsed.activeId);
      }
    } catch {
      // localStorage unavailable / corrupt — fall through to defaults.
    }
    setHydrated(true);
  }, []);

  // ── Persist whenever the persistable state changes ────────
  useEffect(() => {
    if (!hydrated) return; // skip first render (still default state)
    try {
      const toStore: PersistedState = {
        filters,
        device,
        openPanels: Array.from(openPanels),
        activeId,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(toStore));
    } catch {
      // Quota exceeded / private mode — silently drop.
    }
  }, [hydrated, filters, device, openPanels, activeId]);

  // ── Derived: filter options + filtered list ───────────────
  const pdfOptions = useMemo(
    () => Array.from(new Set(initial.map((q) => q.source_pdf || "(unknown)"))).sort(),
    [initial]
  );
  const domainOptions = useMemo(
    () => Array.from(new Set(initial.map((q) => q.domain || "(unknown)"))).sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    return initial.filter((q) => {
      if (filters.subject !== "all" && q.subject !== filters.subject) return false;
      if (filters.status !== "all" && q.import_status !== filters.status) return false;
      if (filters.pdf !== "all" && (q.source_pdf || "(unknown)") !== filters.pdf) return false;
      if (filters.domain !== "all" && (q.domain || "(unknown)") !== filters.domain) return false;
      if (filters.hasFigure === "yes" && !q.image_url) return false;
      if (filters.hasFigure === "no" && q.image_url) return false;
      return true;
    });
  }, [initial, filters]);

  // ── Active question lookup ────────────────────────────────
  // Prefer the persisted activeId if it's still in the filtered set,
  // else fall back to index 0. This makes filter changes graceful:
  // if the admin's current question still matches the new filter,
  // they stay on it; otherwise they jump to the start of the new set.
  const currentIndex = useMemo(() => {
    if (activeId) {
      const i = filtered.findIndex((q) => q.id === activeId);
      if (i >= 0) return i;
    }
    return filtered.length > 0 ? 0 : -1;
  }, [filtered, activeId]);

  const current = currentIndex >= 0 ? filtered[currentIndex] : null;

  // Keep activeId in sync with the rendered question — important for
  // the case where the persisted activeId fell out of the filter set
  // and we silently moved to index 0.
  useEffect(() => {
    if (current && current.id !== activeId) setActiveId(current.id);
    if (!current && activeId !== null) setActiveId(null);
  }, [current, activeId]);

  // ── Action handlers ───────────────────────────────────────
  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  function selectQuestion(id: string) {
    setActiveId(id);
  }

  function jump(delta: number) {
    if (filtered.length === 0) return;
    const i = currentIndex < 0 ? 0 : currentIndex;
    const next = Math.max(0, Math.min(filtered.length - 1, i + delta));
    setActiveId(filtered[next]?.id ?? null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allSelected = filtered.length > 0 && filtered.every((q) => prev.has(q.id));
      if (allSelected) return new Set();
      return new Set(filtered.map((q) => q.id));
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  function togglePanel(key: PanelKey) {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function changeFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    // Filter change can render the current activeId off-screen; the
    // currentIndex memo will fall back to index 0 on the next render.
    // Selection is cleared so a stale "N selected" badge doesn't lie.
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSelectedIds(new Set());
  }

  async function handleApprove() {
    if (!current) return;
    setPending((p) => ({ ...p, approve: true }));
    setBanner(null);
    try {
      await actionApproveQuestion(current.id);
      setBanner({ kind: "ok", text: "Approved." });
      refresh();
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Approve failed.",
      });
    } finally {
      setPending((p) => ({ ...p, approve: false }));
    }
  }

  async function handleFlag(note: string) {
    if (!current) return;
    setPending((p) => ({ ...p, flag: true }));
    setBanner(null);
    try {
      await actionFlagQuestion(current.id, note);
      setBanner({ kind: "ok", text: `Flagged: "${note.slice(0, 80)}"` });
      refresh();
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Flag failed.",
      });
    } finally {
      setPending((p) => ({ ...p, flag: false }));
    }
  }

  async function handleReject(reason: string) {
    if (!current) return;
    setPending((p) => ({ ...p, reject: true }));
    setBanner(null);
    try {
      const r = await actionSoftRejectQuestion(current.id, reason || undefined);
      if (r.rejected) {
        // Move to the next question before refreshing, so the admin
        // doesn't see the rejected row flash back in.
        const nextId = filtered[currentIndex + 1]?.id ?? filtered[currentIndex - 1]?.id ?? null;
        setActiveId(nextId);
        setBanner({
          kind: "ok",
          text: "Sent to recovery bin — undo via /admin/questions/rejected",
        });
        refresh();
      } else {
        setBanner({ kind: "err", text: "Reject failed — row not found." });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Reject failed.",
      });
    } finally {
      setPending((p) => ({ ...p, reject: false }));
    }
  }

  async function handleBulkApprove() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Approve ${ids.length} question${ids.length === 1 ? "" : "s"}?`)) return;
    setBulkPending((p) => ({ ...p, approving: true }));
    setBanner(null);
    try {
      const r = await actionBulkApproveQuestions(ids);
      setBanner({
        kind: r.errored === 0 ? "ok" : "err",
        text: `Approved ${r.approved}${r.errored > 0 ? ` · ${r.errored} errored` : ""}`,
      });
      clearSelection();
      refresh();
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Bulk approve failed.",
      });
    } finally {
      setBulkPending((p) => ({ ...p, approving: false }));
    }
  }

  async function handleBulkReject() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Reject ${ids.length} question${ids.length === 1 ? "" : "s"}?\n\n` +
          `Each is recoverable from /admin/questions/rejected.`
      )
    )
      return;
    setBulkPending((p) => ({ ...p, rejecting: true }));
    setBanner(null);
    try {
      const r = await actionBulkSoftRejectQuestions(ids);
      setBanner({
        kind: r.errored === 0 ? "ok" : "err",
        text: `Rejected ${r.rejected}${r.errored > 0 ? ` · ${r.errored} errored` : ""}`,
      });
      clearSelection();
      refresh();
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Bulk reject failed.",
      });
    } finally {
      setBulkPending((p) => ({ ...p, rejecting: false }));
    }
  }

  // ── Render ────────────────────────────────────────────────
  const hasSidePanel = openPanels.size > 0 && current;

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PreviewToolbar
        filters={filters}
        pdfOptions={pdfOptions}
        domainOptions={domainOptions}
        device={device}
        currentIndex={currentIndex < 0 ? 0 : currentIndex}
        totalCount={filtered.length}
        onChangeFilter={changeFilter}
        onChangeDevice={setDevice}
        onPrev={() => jump(-1)}
        onNext={() => jump(1)}
        onClearFilters={clearFilters}
      />

      {banner && (
        <div
          className={cn(
            "flex items-start gap-2 border-b px-4 py-1.5 text-xs",
            banner.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200"
              : "border-rose-500/30 bg-rose-500/[0.06] text-rose-200"
          )}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">{banner.text}</div>
          <button onClick={() => setBanner(null)} className="text-xs opacity-70 hover:opacity-100">
            dismiss
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3 px-4 py-3",
          // Three-column layout when the side panel is open; two
          // otherwise. The side panel COMPRESSES the preview pane
          // (rather than overlaying it) per the design decision in
          // the planning rounds.
          hasSidePanel ? "grid-cols-[16rem_minmax(0,1fr)_18rem]" : "grid-cols-[16rem_minmax(0,1fr)]"
        )}
      >
        <PreviewSidebar
          questions={filtered}
          activeId={current?.id ?? null}
          selectedIds={selectedIds}
          bulkPending={bulkPending}
          onSelectQuestion={selectQuestion}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onClearSelection={clearSelection}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
        />

        <main className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          {current ? (
            <>
              <MetadataStrip question={current} />
              <div className="min-h-0 flex-1 overflow-hidden">
                <DeviceFrame width={device}>
                  <div className="h-full overflow-y-auto">
                    <QuestionPreview q={current} />
                  </div>
                </DeviceFrame>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center px-6 py-10 text-center text-sm text-slate-400">
              No question selected.
            </div>
          )}
        </main>

        {hasSidePanel && current && (
          <PreviewSidePanel
            question={current}
            openPanels={openPanels}
            onClose={(k) => togglePanel(k)}
          />
        )}
      </div>

      <PreviewActionBar
        pending={pending}
        openPanels={openPanels}
        onApprove={handleApprove}
        onFlag={handleFlag}
        onReject={handleReject}
        onTogglePanel={togglePanel}
      />
    </div>
  );
}

function MetadataStrip({ question: q }: { question: QuizQuestionWithChoices }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800 bg-slate-900/60 px-5 py-2 font-mono text-[11px] text-slate-400">
      <span className="text-slate-500">id:</span>
      <span className="max-w-[14rem] truncate text-slate-300">{q.id}</span>
      <span className="text-slate-500">pdf:</span>
      <span className="text-slate-300">
        {q.source_pdf ?? "—"} p{q.source_page ?? "—"}
      </span>
      <span className="text-slate-500">slug:</span>
      <span className="text-slate-300">{q.concept_slug ?? "—"}</span>
      <span className="text-slate-500">domain:</span>
      <span className="text-slate-300">{q.domain ?? "—"}</span>
      <span className="text-slate-500">level:</span>
      <span className="text-slate-300">{q.difficulty_level ?? "—"}</span>
      <span
        className={cn(
          "ml-auto rounded px-1.5 font-bold",
          q.import_status === "needs_review"
            ? "bg-amber-500/15 text-amber-300"
            : "bg-emerald-500/15 text-emerald-300"
        )}
      >
        {q.import_status ?? "ok"}
      </span>
    </div>
  );
}
