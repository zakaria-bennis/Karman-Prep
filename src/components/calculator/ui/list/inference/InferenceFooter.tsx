// FN-59: the footer of a row whose value is an inference test, laid out as on live Desmos (College
// Board version, captured 2026-10-26; inference-view.ts): the stats form's argument names, then
// the Confidence Interval and Hypothesis Test sections (closed until opened), or for a chi-square
// test the Observed (Expected) table and the Hypothesis Test. A section header is a button with
// aria-expanded; the fields and the tails change the row's settings as undo steps
// (inference-commands.ts), and each diagram has its numerical outputs.

import { useId, type CSSProperties, type JSX, type ReactNode } from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { updateRowInference } from "@/lib/calculator/core/api/inference-commands";
import {
  DEFAULT_INFERENCE,
  type InferenceSettings,
  type InferenceTails,
} from "@/lib/calculator/core/api/inference-state";
import type { Inference } from "@/lib/calculator/core/lib/inference";
import { rowIconHex } from "@/lib/calculator/theme/roles";
import { useSkin } from "../../hooks/skin";
import { useEngine } from "../../hooks/use-engine";
import { ChiSquareTable } from "./ChiSquareTable";
import { IntervalDiagram, NullDistributionDiagram } from "./InferenceDiagrams";
import { InferenceField, useFieldNumber } from "./InferenceField";
import { InferenceOutputs, type OutputLine } from "./InferenceOutputs";
import { argumentCaption, inferenceView, type InferenceView } from "./inference-view";

const TAILS: readonly { value: InferenceTails; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "both", label: "Both" },
  { value: "right", label: "Right" },
];

function Caret(props: { open: boolean }): JSX.Element {
  return (
    <svg className="kc-inf-caret" viewBox="0 0 10 10" aria-hidden="true" data-open={props.open}>
      <path d="M3 1.5 8 5 3 8.5Z" />
    </svg>
  );
}

function Section(props: {
  title: string;
  open: boolean;
  onToggle(): void;
  children: ReactNode;
}): JSX.Element {
  const id = useId();
  return (
    <div className="kc-inf-section" role="group" aria-labelledby={`${id}-title`}>
      <button
        type="button"
        id={`${id}-title`}
        className="kc-inf-section-title"
        aria-expanded={props.open}
        aria-controls={`${id}-body`}
        onClick={props.onToggle}
      >
        <Caret open={props.open} />
        {props.title}
      </button>
      {props.open && (
        <div id={`${id}-body`} className="kc-inf-section-body">
          {props.children}
        </div>
      )}
    </div>
  );
}

function Tails(props: { value: InferenceTails; onChange(t: InferenceTails): void }): JSX.Element {
  const name = useId();
  return (
    <div className="kc-inf-line">
      <span className="kc-inf-label" id={`${name}-label`}>
        Tails:
      </span>
      <div className="kc-inf-tails" role="radiogroup" aria-labelledby={`${name}-label`}>
        {TAILS.map((t) => (
          <label key={t.value} className="kc-inf-tail-option">
            <input
              type="radio"
              name={name}
              value={t.value}
              checked={props.value === t.value}
              onChange={() => props.onChange(t.value)}
            />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function intervalLines(view: InferenceView): OutputLine[] {
  const r = view.interval!;
  return [
    { output: "lower", label: "Lower bound", value: r.lower },
    { output: "upper", label: "Upper bound", value: r.upper },
    { output: "estimate", label: "Point estimate", value: r.estimate },
    { output: "stderr", label: "Standard error", value: r.stderr },
    { output: "dof", label: "Degrees of freedom", value: view.symbol === "t" ? r.dof : NaN },
  ];
}

function testLines(view: InferenceView): OutputLine[] {
  const t = view.test!;
  const p: OutputLine = { output: "p", label: "p-value", value: view.p };
  if (view.chiSquare) {
    return [
      { output: "dof", label: "Degrees of freedom", value: t.dof },
      { output: "score", label: "χ²", value: t.score },
      p,
    ];
  }
  const score: OutputLine = { output: "score", label: `${view.symbol}-score`, value: t.score };
  return view.symbol === "t"
    ? [score, { output: "dof", label: "Degrees of freedom", value: t.dof }, p]
    : [score, p];
}

export function InferenceFooter(props: { row: RowView }): JSX.Element | null {
  const { row } = props;
  const engine = useEngine();
  const skin = useSkin();
  const settings: InferenceSettings = row.inference ?? DEFAULT_INFERENCE;
  const hypothesis = useFieldNumber(engine, settings.hypothesis);
  const level = useFieldNumber(engine, settings.level);
  if (row.value?.type !== "inference") return null;
  const inf: Inference = row.value.value;
  const view = inferenceView(inf, settings.tails, hypothesis, level);
  const color = rowIconHex(row.color, skin);
  const rootStyle = { "--kc-inf-color": color } as CSSProperties;
  const set = (patch: Partial<InferenceSettings>, typing = false) =>
    updateRowInference(engine, row.id, patch, typing);
  const caption = inf.stage === "object" ? argumentCaption(row.latex) : null;

  const intervalBox =
    view.interval === null ? null : (
      <div className="kc-inf-box">
        <IntervalDiagram view={view} />
        <InferenceOutputs
          rowId={row.id}
          stage={inf.stage}
          settings={settings}
          lines={intervalLines(view)}
          title="Confidence interval outputs"
        />
      </div>
    );
  const testBox =
    view.test === null ? null : (
      <div className="kc-inf-box">
        <NullDistributionDiagram view={view} color={color} />
        <InferenceOutputs
          rowId={row.id}
          stage={inf.stage}
          settings={settings}
          lines={testLines(view)}
          title="Hypothesis test outputs"
        />
      </div>
    );

  if (inf.stage === "interval")
    return (
      <div className="kc-inf" style={rootStyle}>
        {intervalBox}
      </div>
    );
  if (inf.stage === "test") {
    return (
      <div className="kc-inf" style={rootStyle}>
        <Tails value={settings.tails} onChange={(tails) => set({ tails })} />
        {testBox}
      </div>
    );
  }
  return (
    <div className="kc-inf" style={rootStyle}>
      {caption !== null && <div className="kc-inf-caption">{caption}</div>}
      {view.chiSquare ? (
        <ChiSquareTable
          inference={inf}
          settings={settings}
          onChange={(patch) => set(patch)}
          section={(children) => (
            <Section
              title="Observed (Expected)"
              open={settings.tableOpen}
              onToggle={() => set({ tableOpen: !settings.tableOpen })}
            >
              {children}
            </Section>
          )}
        />
      ) : (
        <Section
          title="Confidence Interval"
          open={settings.confidenceOpen}
          onToggle={() => set({ confidenceOpen: !settings.confidenceOpen })}
        >
          <div className="kc-inf-line">
            <span className="kc-inf-label">Confidence level:</span>
            <InferenceField
              latex={settings.level}
              placeholder="0.95"
              label="Confidence level"
              onChange={(latex) => set({ level: latex }, true)}
            />
          </div>
          {intervalBox}
        </Section>
      )}
      <Section
        title="Hypothesis Test"
        open={settings.testOpen}
        onToggle={() => set({ testOpen: !settings.testOpen })}
      >
        {!view.chiSquare && (
          <>
            <div className="kc-inf-line">
              <span className="kc-inf-label">Null hypothesis:</span>
              <NullName latex={view.nullName} />
              <InferenceField
                latex={settings.hypothesis}
                placeholder={String(view.defaultNull)}
                label="Null hypothesis value"
                onChange={(latex) => set({ hypothesis: latex }, true)}
              />
            </div>
            <Tails value={settings.tails} onChange={(tails) => set({ tails })} />
          </>
        )}
        {testBox}
      </Section>
    </div>
  );
}

/** μ =, μ₁ − μ₂ =, p =, p₁ − p₂ =, in the math font. */
function NullName(props: { latex: string }): JSX.Element {
  const two = props.latex.includes("_{1}");
  const letter = props.latex.startsWith("\\mu") ? "μ" : "p";
  return (
    <span className="kc-inf-null-name" aria-hidden="true">
      <var>{letter}</var>
      {two && (
        <>
          <sub>1</sub> − <var>{letter}</var>
          <sub>2</sub>
        </>
      )}{" "}
      =
    </span>
  );
}
