// FN-59: a chi-square test's Observed (Expected) section, as on live Desmos (College Board version,
// captured 2026-10-26): Expected (ticked), Contributions and Totals checkboxes over a table of the
// observed counts, each with its expected count in parentheses; Contributions marks each cell with
// a bar in the row colour whose strength is the cell's share of the largest (O − E)²/E; Totals adds
// a Total row (and column for a test of independence). Columns are Group 1, Group 2, …, rows Group
// A, Group B, …; a goodness of fit test is one Count column. A goodness of fit test whose expected
// counts do not add up to the observed total says so above the sections.

import { type JSX, type ReactNode } from "react";
import type { InferenceSettings } from "@/lib/calculator/core/api/inference-state";
import type { Inference } from "@/lib/calculator/core/lib/inference";
import { diagramValue, shownText } from "./inference-format";
import { chiTable } from "./inference-view";

const ROW_NAME = (r: number) => `Group ${String.fromCharCode(65 + (r % 26))}`;
const plain = (v: number) => shownText(diagramValue(v));

function Check(props: {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}): JSX.Element {
  return (
    <label className="kc-inf-check">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

export function ChiSquareTable(props: {
  inference: Inference;
  settings: InferenceSettings;
  onChange(patch: Partial<InferenceSettings>): void;
  section(children: ReactNode): JSX.Element;
}): JSX.Element | null {
  const t = chiTable(props.inference);
  if (t === null) return null;
  const s = props.settings;
  const gof = t.columns === 1 && props.inference.data.family === "chigof";
  const rows = Array.from({ length: t.rows }, (_, r) => r);
  const cols = Array.from({ length: t.columns }, (_, c) => c);
  const colTotal = (c: number) => rows.reduce((sum, r) => sum + t.observed(r, c), 0);
  const rowTotal = (r: number) => cols.reduce((sum, c) => sum + t.observed(r, c), 0);
  const grand = cols.reduce((sum, c) => sum + colTotal(c), 0);
  const cell = (r: number, c: number) => {
    const share = t.maxContribution > 0 ? t.contribution(r, c) / t.maxContribution : 0;
    return (
      <td key={c}>
        {s.contributions && (
          <span
            className="kc-inf-contribution"
            style={{ opacity: Number.isFinite(share) ? 0.15 + 0.85 * share : 0 }}
            aria-hidden="true"
          />
        )}
        <span className="kc-inf-count">{plain(t.observed(r, c))}</span>
        {s.expected && <span className="kc-inf-expected"> ({plain(t.expected(r, c))})</span>}
        {s.contributions && (
          <span className="kc-visually-hidden">, contribution {plain(t.contribution(r, c))}</span>
        )}
      </td>
    );
  };
  return (
    <>
      {t.totalsDiffer && (
        <p className="kc-inf-warning" role="note">
          Expected and observed totals don&apos;t match.
        </p>
      )}
      {props.section(
        <>
          <div className="kc-inf-checks">
            <Check
              label="Expected"
              checked={s.expected}
              onChange={(v) => props.onChange({ expected: v })}
            />
            <Check
              label="Contributions"
              checked={s.contributions}
              onChange={(v) => props.onChange({ contributions: v })}
            />
            <Check
              label="Totals"
              checked={s.totals}
              onChange={(v) => props.onChange({ totals: v })}
            />
          </div>
          <div className="kc-inf-table-scroll">
            <table className="kc-inf-table">
              <thead>
                <tr>
                  {!gof && <td />}
                  {gof ? (
                    <th scope="col">Count</th>
                  ) : (
                    cols.map((c) => (
                      <th key={c} scope="col">
                        Group {c + 1}
                      </th>
                    ))
                  )}
                  {s.totals && !gof && <th scope="col">Total</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r}>
                    {!gof && <th scope="row">{ROW_NAME(r)}</th>}
                    {cols.map((c) => cell(r, c))}
                    {s.totals && !gof && <td className="kc-inf-total">{plain(rowTotal(r))}</td>}
                  </tr>
                ))}
                {s.totals && (
                  <tr>
                    {!gof && <th scope="row">Total</th>}
                    {cols.map((c) => (
                      <td key={c} className="kc-inf-total">
                        {gof && <span className="kc-visually-hidden">Total </span>}
                        {plain(colTotal(c))}
                      </td>
                    ))}
                    {!gof && <td className="kc-inf-total">{plain(grand)}</td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
