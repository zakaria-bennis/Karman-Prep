"use client";

// ============================================================
// ChartFigureEditor — Desmos-style chart editor for the chart-
// review UI. Three input modes per series (equation, points,
// bars), live preview via ChartFigure on the right.
//
// The editor maintains a working copy of the ChartFigure as
// local state. On Save, the parent commits it via the server
// action. On Cancel, the parent discards.
//
// Layout
// ======
//   ┌──────────────┬──────────────┐
//   │  inputs      │   live SVG   │
//   │  - title     │   preview    │
//   │  - axes      │              │
//   │  - series    │              │
//   │  - add/del   │              │
//   ├──────────────┴──────────────┤
//   │  [Cancel]         [Save]    │
//   └─────────────────────────────┘
// ============================================================

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ChartFigure from "@/components/learn/ChartFigure";
import { parseEquation, parsePoints, parseBars } from "@/lib/chart/parse-input";
import type {
  ChartFigure as ChartFigureType,
  ChartKind,
  ChartSeries,
  FunctionSeries,
} from "@/types/chart";

interface Props {
  initial: ChartFigureType;
  subject?: string | null;
  onSave: (next: ChartFigureType) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export default function ChartFigureEditor({
  initial,
  subject,
  onSave,
  onCancel,
  saving = false,
}: Props) {
  const [draft, setDraft] = useState<ChartFigureType>(initial);

  function update<K extends keyof ChartFigureType>(key: K, value: ChartFigureType[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updateAxis(which: "x_axis" | "y_axis", patch: Partial<ChartFigureType["x_axis"]>) {
    setDraft((d) => ({ ...d, [which]: { ...d[which], ...patch } }));
  }

  function updateKind(kind: ChartKind) {
    setDraft((d) => {
      // When the kind changes, normalize the series shape so the
      // preview keeps rendering. e.g. switching from scatter to bar
      // converts the first series to an empty bar series.
      const nextSeries: ChartSeries[] = d.series.map((s) => convertSeries(s, kind));
      return { ...d, kind, series: nextSeries };
    });
  }

  function updateSeries(idx: number, patch: ChartSeries) {
    setDraft((d) => {
      const next = [...d.series];
      next[idx] = patch;
      return { ...d, series: next };
    });
  }

  function addSeries() {
    setDraft((d) => ({
      ...d,
      series: [...d.series, blankSeriesFor(d.kind)],
    }));
  }

  function removeSeries(idx: number) {
    setDraft((d) => ({
      ...d,
      series: d.series.filter((_, i) => i !== idx),
    }));
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
      {/* LEFT — inputs */}
      <div className="space-y-4">
        <Section label="Title">
          <input
            type="text"
            value={draft.title ?? ""}
            onChange={(e) => update("title", e.target.value || null)}
            placeholder="e.g. Hours studied vs. test score (optional)"
            className="w-full rounded-md border border-bronze bg-night px-3 py-1.5 text-sm text-ivory focus:border-gold/40 focus:outline-none"
          />
        </Section>

        <Section label="Chart kind">
          <div className="flex flex-wrap gap-2">
            {(["scatterplot", "line_graph", "bar_chart", "function_plot"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => updateKind(k)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold capitalize",
                  draft.kind === k
                    ? "border-gold/40 bg-gold/20 text-gold-bright"
                    : "border-bronze text-ivory hover:bg-surface-raised"
                )}
              >
                {k.replace("_", " ")}
              </button>
            ))}
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-3">
          <AxisFieldset
            label="X-axis"
            axis={draft.x_axis}
            allowCategories={draft.kind === "bar_chart"}
            onChange={(patch) => updateAxis("x_axis", patch)}
          />
          <AxisFieldset
            label="Y-axis"
            axis={draft.y_axis}
            allowCategories={false}
            onChange={(patch) => updateAxis("y_axis", patch)}
          />
        </div>

        <Section
          label="Series"
          action={
            <button
              type="button"
              onClick={addSeries}
              className="inline-flex items-center gap-1 rounded-md border border-bronze px-2 py-1 text-[11px] font-semibold text-ivory hover:bg-surface-raised"
            >
              <Plus className="h-3 w-3" /> Add series
            </button>
          }
        >
          <div className="space-y-3">
            {draft.series.map((s, i) => (
              <SeriesEditor
                key={i}
                index={i}
                series={s}
                chartKind={draft.kind}
                xAxisCategories={draft.x_axis.categories}
                canDelete={draft.series.length > 1}
                onChange={(next) => updateSeries(i, next)}
                onDelete={() => removeSeries(i)}
              />
            ))}
          </div>
        </Section>

        <label className="flex items-center gap-2 text-xs text-ivory">
          <input
            type="checkbox"
            checked={draft.show_grid}
            onChange={(e) => update("show_grid", e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Show grid lines
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-bronze pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-bronze px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-surface-raised disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-3 py-1.5 text-xs font-semibold text-success-bright hover:bg-success/25 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save chart"}
          </button>
        </div>
      </div>

      {/* RIGHT — live preview */}
      <div className="sticky top-4 self-start">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-taupe">
          Live preview
        </div>
        <div className="mt-2">
          <ChartFigure data={draft} subject={subject} />
        </div>
      </div>
    </div>
  );
}

// ── Section + AxisFieldset helpers ───────────────────────────

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ivory">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

function AxisFieldset({
  label,
  axis,
  allowCategories,
  onChange,
}: {
  label: string;
  axis: ChartFigureType["x_axis"];
  allowCategories: boolean;
  onChange: (patch: Partial<ChartFigureType["x_axis"]>) => void;
}) {
  const isCategorical = !!axis.categories;
  return (
    <fieldset className="space-y-1.5 rounded-lg border border-bronze bg-surface/40 p-3">
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
        {label}
      </legend>
      <input
        type="text"
        value={axis.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Label (e.g. Time)"
        className="w-full rounded border border-bronze bg-night px-2 py-1 text-xs text-ivory focus:border-gold/40 focus:outline-none"
      />
      {allowCategories && (
        <div className="flex items-center gap-1.5 text-[10px] text-taupe">
          <input
            type="checkbox"
            checked={isCategorical}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { categories: ["A", "B", "C"], min: null, max: null, tick_step: null }
                  : { categories: null, min: 0, max: 10, tick_step: 2 }
              )
            }
            className="h-3 w-3"
          />
          Use category labels (not a numeric axis)
        </div>
      )}
      {isCategorical ? (
        <input
          type="text"
          value={(axis.categories ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              categories: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="A, B, C"
          className="w-full rounded border border-bronze bg-night px-2 py-1 text-xs text-ivory focus:border-gold/40 focus:outline-none"
        />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          <NumberInput value={axis.min} placeholder="min" onChange={(v) => onChange({ min: v })} />
          <NumberInput value={axis.max} placeholder="max" onChange={(v) => onChange({ max: v })} />
          <NumberInput
            value={axis.tick_step}
            placeholder="step"
            onChange={(v) => onChange({ tick_step: v })}
          />
        </div>
      )}
    </fieldset>
  );
}

function NumberInput({
  value,
  placeholder,
  onChange,
}: {
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (raw === "") return onChange(null);
        const n = Number.parseFloat(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      placeholder={placeholder}
      className="rounded border border-bronze bg-night px-2 py-1 text-center text-xs text-ivory focus:border-gold/40 focus:outline-none"
    />
  );
}

// ── Per-series editor ────────────────────────────────────────

function SeriesEditor({
  series,
  chartKind,
  xAxisCategories,
  canDelete,
  onChange,
  onDelete,
}: {
  index: number;
  series: ChartSeries;
  chartKind: ChartKind;
  xAxisCategories: string[] | null;
  canDelete: boolean;
  onChange: (s: ChartSeries) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-bronze bg-surface/30 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          value={series.label ?? ""}
          onChange={(e) => onChange({ ...series, label: e.target.value || null })}
          placeholder="Series name (optional)"
          className="flex-1 rounded border border-bronze bg-night px-2 py-1 text-xs text-ivory focus:border-gold/40 focus:outline-none"
        />
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-error/40 px-2 py-1 text-[10px] font-semibold text-error-bright hover:bg-error/15"
            title="Remove this series"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {series.kind === "scatter" || series.kind === "line" ? (
        <PointsInput series={series} onChange={(points) => onChange({ ...series, points })} />
      ) : series.kind === "bar" ? (
        <BarsInput
          series={series}
          xAxisCategories={xAxisCategories}
          onChange={(bars) => onChange({ ...series, bars })}
        />
      ) : series.kind === "function" ? (
        <EquationInput series={series} onChange={(next) => onChange(next)} />
      ) : (
        <p className="mt-1.5 text-[11px] text-taupe">
          {series.kind === "boxplot" ? "Box-and-whisker" : "Pie"} data isn&apos;t editable in this
          form yet — edit the underlying JSON directly.
        </p>
      )}
      {/* Show a hint when chart_kind and series kind don't align —
          the editor coerces on kind change but a manually-added
          series might mismatch (e.g. a function plot with a scatter
          series). */}
      {!seriesMatchesChartKind(series, chartKind) && (
        <p className="mt-1.5 text-[10px] text-warning-bright">
          ⚠ Series kind ({series.kind}) doesn&apos;t match chart kind ({chartKind}). Switching the
          chart kind above will normalize.
        </p>
      )}
    </div>
  );
}

function PointsInput({
  series,
  onChange,
}: {
  series: { points: Array<[number, number]> };
  onChange: (points: Array<[number, number]>) => void;
}) {
  const [raw, setRaw] = useState(series.points.map((p) => `(${p[0]}, ${p[1]})`).join(", "));
  const result = useMemo(() => parsePoints(raw), [raw]);

  return (
    <div>
      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const parsed = parsePoints(e.target.value);
          if (parsed.ok) onChange(parsed.value);
        }}
        rows={3}
        placeholder="(1, 2), (3, 4), (5, 6)"
        className="w-full resize-y rounded border border-bronze bg-night px-2 py-1.5 font-mono text-xs text-ivory focus:border-gold/40 focus:outline-none"
      />
      {!result.ok && raw.trim() !== "" && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-error-bright">
          <AlertCircle className="h-3 w-3" /> {result.error}
        </p>
      )}
      {result.ok && (
        <p className="mt-1 text-[10px] text-taupe">
          {result.value.length} point{result.value.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function BarsInput({
  series,
  xAxisCategories,
  onChange,
}: {
  series: { bars: Array<{ category: string; value: number }> };
  xAxisCategories: string[] | null;
  onChange: (bars: Array<{ category: string; value: number }>) => void;
}) {
  const [raw, setRaw] = useState(series.bars.map((b) => `${b.category}: ${b.value}`).join(", "));
  const result = useMemo(() => parseBars(raw), [raw]);

  // Warn when bar categories don't match the x-axis categories.
  const mismatched = useMemo(() => {
    if (!result.ok || !xAxisCategories) return [];
    return result.value.map((b) => b.category).filter((c) => !xAxisCategories.includes(c));
  }, [result, xAxisCategories]);

  return (
    <div>
      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const parsed = parseBars(e.target.value);
          if (parsed.ok) onChange(parsed.value);
        }}
        rows={3}
        placeholder="A: 5, B: 3, C: 8"
        className="w-full resize-y rounded border border-bronze bg-night px-2 py-1.5 font-mono text-xs text-ivory focus:border-gold/40 focus:outline-none"
      />
      {!result.ok && raw.trim() !== "" && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-error-bright">
          <AlertCircle className="h-3 w-3" /> {result.error}
        </p>
      )}
      {mismatched.length > 0 && (
        <p className="mt-1 text-[10px] text-warning-bright">
          ⚠ These bar categories aren&apos;t on the x-axis: {mismatched.join(", ")}.
        </p>
      )}
    </div>
  );
}

function EquationInput({
  series,
  onChange,
}: {
  series: FunctionSeries;
  onChange: (next: FunctionSeries) => void;
}) {
  const [raw, setRaw] = useState(formatExpression(series.expression));
  const result = useMemo(() => parseEquation(raw), [raw]);

  return (
    <div>
      <input
        type="text"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const parsed = parseEquation(e.target.value);
          if (parsed.ok) onChange({ ...series, expression: parsed.value });
        }}
        placeholder="y = x^2 - 4x + 3"
        className="w-full rounded border border-bronze bg-night px-2 py-1.5 font-mono text-xs text-ivory focus:border-gold/40 focus:outline-none"
      />
      {!result.ok && raw.trim() !== "" && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-error-bright">
          <AlertCircle className="h-3 w-3" /> {result.error}
        </p>
      )}
      {result.ok && (
        <p className="mt-1 text-[10px] text-taupe">
          Matched: <span className="font-mono text-taupe">{result.value.kind}</span>
        </p>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function blankSeriesFor(kind: ChartKind): ChartSeries {
  switch (kind) {
    case "scatterplot":
      return { kind: "scatter", label: null, points: [] };
    case "line_graph":
      return { kind: "line", label: null, points: [] };
    case "bar_chart":
      return { kind: "bar", label: null, bars: [] };
    case "function_plot":
      return {
        kind: "function",
        label: null,
        expression: { kind: "linear", m: 1, b: 0 },
        domain: null,
      };
    case "boxplot":
      return { kind: "boxplot", label: null, boxes: [] };
    case "pie":
      return { kind: "pie", label: null, slices: [] };
  }
}

function seriesMatchesChartKind(series: ChartSeries, chartKind: ChartKind): boolean {
  if (chartKind === "scatterplot") return series.kind === "scatter";
  if (chartKind === "line_graph") return series.kind === "line";
  if (chartKind === "bar_chart") return series.kind === "bar";
  return series.kind === "function";
}

function convertSeries(s: ChartSeries, kind: ChartKind): ChartSeries {
  if (seriesMatchesChartKind(s, kind)) return s;
  // Preserve label across kind changes; reset data because the
  // shape doesn't carry over.
  return { ...blankSeriesFor(kind), label: s.label } as ChartSeries;
}

function formatExpression(expr: FunctionSeries["expression"]): string {
  if (expr.kind === "linear") {
    const b = expr.b === 0 ? "" : expr.b > 0 ? ` + ${expr.b}` : ` - ${Math.abs(expr.b)}`;
    return `y = ${expr.m}x${b}`;
  }
  if (expr.kind === "quadratic") {
    const bTerm = expr.b === 0 ? "" : expr.b > 0 ? ` + ${expr.b}x` : ` - ${Math.abs(expr.b)}x`;
    const cTerm = expr.c === 0 ? "" : expr.c > 0 ? ` + ${expr.c}` : ` - ${Math.abs(expr.c)}`;
    return `y = ${expr.a}x^2${bTerm}${cTerm}`;
  }
  if (expr.kind === "absolute_value") {
    const inside = expr.h === 0 ? "x" : expr.h > 0 ? `x - ${expr.h}` : `x + ${Math.abs(expr.h)}`;
    const k = expr.k === 0 ? "" : expr.k > 0 ? ` + ${expr.k}` : ` - ${Math.abs(expr.k)}`;
    return `y = ${expr.a === 1 ? "" : expr.a === -1 ? "-" : expr.a}|${inside}|${k}`;
  }
  return `y = ${expr.a} * ${expr.b}^x`;
}
