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
  actionGetChangedFieldsSet,
} from "@/app/admin/actions";
import { actionUpdatePreviewQuestion } from "@/app/admin/inspector-edit-actions";
import { QuestionPreview, type PreviewEditProps } from "./QuestionPreview";
import { DeviceFrame, type DeviceWidth } from "./DeviceFrame";
import { PreviewSidebar } from "./PreviewSidebar";
import { PreviewToolbar, type FilterState } from "./PreviewToolbar";
import { PreviewActionBar, type PanelKey } from "./PreviewActionBar";
import { PreviewSidePanel } from "./PreviewSidePanel";
import { useKeyboardShortcuts, type Shortcut } from "./useKeyboardShortcuts";
import { KeyboardCheatSheet } from "./KeyboardCheatSheet";

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
  // Cheat-sheet overlay state. Triggered by `?` or the help
  // button in the top toolbar; dismissed by Escape or click-out.
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  // Map of questionId → Set<field> for the [edited] chip render.
  // Lazy-loaded the first time a question becomes current; cached in
  // this map so re-visits during the same session don't refetch.
  const [editedFieldsByQId, setEditedFieldsByQId] = useState<Map<string, Set<string>>>(new Map());

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

  // ── Load edited-fields set when the current question changes ──
  // Cached per-question so revisits don't refetch. Errors are
  // silent — the [edited] chip just won't appear, which is the
  // same fallback as "no edits yet" and not user-actionable.
  useEffect(() => {
    if (!current) return;
    if (editedFieldsByQId.has(current.id)) return;
    let cancelled = false;
    (async () => {
      try {
        const fields = await actionGetChangedFieldsSet(current.id);
        if (cancelled) return;
        setEditedFieldsByQId((prev) => {
          const next = new Map(prev);
          next.set(current.id, new Set(fields));
          return next;
        });
      } catch {
        // Swallow — chip absence is harmless.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current, editedFieldsByQId]);

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

  // ── Inline-edit save handler ──────────────────────────────
  // Translates a (field, value) pair into the inspector-edit
  // action's input shape. Only handles the text-ish fields wired
  // in phase 3; categorical fields + choice text come in 3.5.
  const handleFieldSave = useCallback(
    async (field: string, value: string) => {
      if (!current) throw new Error("No current question.");
      const editPayload: Record<string, unknown> = { questionId: current.id };
      const TEXT_FIELDS = [
        "question_text",
        "explanation_text",
        "desmos_strategy",
        "hint",
        "passage",
        "passage_intro",
        "passage_a",
        "passage_b",
      ] as const;
      if (!(TEXT_FIELDS as readonly string[]).includes(field)) {
        throw new Error(`Field "${field}" not editable in phase 3.`);
      }
      editPayload[field] = value;
      await actionUpdatePreviewQuestion(
        editPayload as unknown as Parameters<typeof actionUpdatePreviewQuestion>[0]
      );
      // Mark this field as edited so the chip shows up without
      // waiting for a refetch. The actual history list still
      // loads lazily on chip click.
      setEditedFieldsByQId((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(current.id) ?? []);
        set.add(field);
        next.set(current.id, set);
        return next;
      });
      // Refresh server data so the rendered text reflects the new value.
      refresh();
    },
    [current, refresh]
  );

  const editProps: PreviewEditProps | undefined = current
    ? {
        questionId: current.id,
        editedFields: editedFieldsByQId.get(current.id) ?? new Set(),
        onSave: handleFieldSave,
      }
    : undefined;

  // ── Keyboard shortcuts ────────────────────────────────────
  // Built once per render — useMemo keeps the array stable so
  // useKeyboardShortcuts' effect doesn't re-register on every
  // keystroke. Handlers close over current state, which is fine
  // because the array recomputes when those deps change.
  //
  // Flag (S) and Reject (D) intentionally fire WITHOUT a note:
  // Flag will throw server-side because note is required, but
  // that surfaces as a banner error which is the right hint to
  // "click the flag button to type a note." Reject is recoverable
  // (soft delete) so firing without a reason is fine.
  const shortcuts: Shortcut[] = useMemo(() => {
    const list: Shortcut[] = [
      // Navigation
      {
        key: "ArrowLeft",
        handler: () => jump(-1),
        description: "Previous question",
        group: "Navigation",
      },
      {
        key: "ArrowRight",
        handler: () => jump(1),
        description: "Next question",
        group: "Navigation",
      },
      // Actions
      { key: "a", handler: () => handleApprove(), description: "Approve", group: "Actions" },
      {
        key: "s",
        handler: () =>
          setBanner({
            kind: "err",
            text: "Flag needs a note — click the Flag button to type one.",
          }),
        description: "Flag (opens note input — use the button to type)",
        group: "Actions",
      },
      {
        key: "d",
        handler: () => handleReject(""),
        description: "Reject (soft, recoverable from /rejected)",
        group: "Actions",
      },
      // Panels
      {
        key: "1",
        handler: () => togglePanel("desmos"),
        description: "Toggle Desmos panel",
        group: "Panels",
      },
      {
        key: "2",
        handler: () => togglePanel("hints"),
        description: "Toggle Hints panel",
        group: "Panels",
      },
      {
        key: "3",
        handler: () => togglePanel("explanations"),
        description: "Toggle Explanations panel",
        group: "Panels",
      },
      {
        key: "p",
        handler: () => togglePanel("pdf"),
        description: "Toggle PDF panel",
        group: "Panels",
      },
      {
        key: "g",
        handler: () => togglePanel("grader"),
        description: "Toggle Grader panel",
        group: "Panels",
      },
      // View — device frame
      {
        key: "Shift+M",
        handler: () => setDevice("mobile"),
        description: "Mobile viewport (375px)",
        group: "View",
      },
      {
        key: "Shift+T",
        handler: () => setDevice("tablet"),
        description: "Tablet viewport (768px)",
        group: "View",
      },
      {
        key: "Shift+K",
        handler: () => setDevice("desktop"),
        description: "Desktop viewport (1440px)",
        group: "View",
      },
      {
        key: "Shift+F",
        handler: () => setDevice("full"),
        description: "Full-width (no frame)",
        group: "View",
      },
      // Help
      {
        key: "?",
        handler: () => setCheatSheetOpen((o) => !o),
        description: "Show / hide this cheat sheet",
        group: "Help",
      },
      {
        key: "Escape",
        handler: () => setCheatSheetOpen(false),
        description: "Close cheat sheet",
        group: "Help",
        fireInInputs: true,
      },
    ];
    return list;
    // Handlers close over the latest state via the function
    // references themselves — fresh handler instances per render.
    // No deps array needed beyond the handlers we reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts(shortcuts);

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
        onOpenCheatSheet={() => setCheatSheetOpen(true)}
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
                    <QuestionPreview q={current} edit={editProps} />
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
            edit={editProps}
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

      <KeyboardCheatSheet
        open={cheatSheetOpen}
        shortcuts={shortcuts}
        onClose={() => setCheatSheetOpen(false)}
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
