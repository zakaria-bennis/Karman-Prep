// A regression row's results (D-30, D-33, D-37; appendix F order): the Log mode checkbox when log
// mode applies, then "Regression parameters", then "Statistics" and "Residuals" side by side
// (stacked on narrow lists). Every value is a focusable read-only field named as it is read ("m
// equals 600"), so Tab reaches each in order (A11Y-10). Plot residuals adds the residual list to
// the source table as a computed column (D-33). A failed fit shows only the row's error.

import type { JSX } from "react";
import type { RowView } from "@/lib/calculator-v2/core/api/engine";
import { plotResiduals, setLogMode } from "@/lib/calculator-v2/core/api/row-commands";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { parameterValues, statisticValues, type ShownValue } from "./regression-text";
import { headerName } from "./table-model";

export const STATISTICS_HINT = "Has graph and regression. To access statistics, press Tab.";

function ValueField({ v }: { v: ShownValue }): JSX.Element {
  return (
    <input
      type="text"
      readOnly
      className="kc-regression-value"
      value={`${v.shown} = ${v.value}`}
      aria-label={v.spoken}
      size={Math.max(4, v.shown.length + v.value.length + 3)}
    />
  );
}

export function RegressionPanel({ row }: { row: RowView }): JSX.Element | null {
  const engine = useEngine();
  const { rows } = useEngineSnapshot(engine);
  const fit = row.regression?.result;
  const analysis = row.regression?.analysis;
  if (fit === null || fit === undefined || !fit.ok || analysis === undefined) return null;
  const observed = analysis.observed.kind === "id" ? analysis.observed.name : null;
  // D-33: the table the observations come from, while it lacks the residual column.
  const source = rows.find(
    (r) => r.type === "table" && r.columns?.some((c) => c.latex === observed)
  );
  const plotted = source?.columns?.some((c) => c.latex === analysis.residual) === true;
  const params = parameterValues(row);
  return (
    <div className="kc-regression" data-regression="">
      {fit.logMode.available && (
        <label className="kc-regression-log">
          <input
            type="checkbox"
            checked={fit.logMode.on}
            onChange={() => setLogMode(engine, row.id, !fit.logMode.on)}
          />
          <span>Log mode</span>
        </label>
      )}
      {params.length > 0 && (
        <section className="kc-regression-group" aria-label="Regression parameters">
          <h3 className="kc-regression-heading">Regression parameters</h3>
          {params.map((v) => (
            <ValueField key={v.key} v={v} />
          ))}
        </section>
      )}
      <div className="kc-regression-columns">
        <section className="kc-regression-group" aria-label="Statistics">
          <h3 className="kc-regression-heading">Statistics</h3>
          {statisticValues(row).map((v) => (
            <ValueField key={v.key} v={v} />
          ))}
        </section>
        <section className="kc-regression-group" aria-label="Residuals">
          <h3 className="kc-regression-heading">Residuals</h3>
          <span className="kc-regression-residual">{headerName(analysis.residual, 0)}</span>
          {source !== undefined && !plotted && (
            <button
              type="button"
              className="kc-regression-action"
              onClick={() => plotResiduals(engine, row.id)}
            >
              Plot residuals
            </button>
          )}
        </section>
      </div>
      {fit.approximate && <p className="kc-regression-note">Approximate fit</p>}
    </div>
  );
}
