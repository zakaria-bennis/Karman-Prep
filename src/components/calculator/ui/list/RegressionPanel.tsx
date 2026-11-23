// A typed regression row's results (RT-31, REG-CUSTOM-26, -34, REG-STATISTICS-2), laid out as the
// reference lays them out and in the table panel's type: Log Mode with its "?" note when log mode
// applies, then REGRESSION PARAMETERS ("?" "Parameters might not be exact" for an iterative fit) as
// a two-column grid of typeset `name=value`, then STATISTICS (R², an indented r, or RMSE with its
// "?") and RESIDUALS (e_k and a grey "plot") side by side, then the parameter warning. Every value
// is a focusable read-only static math field named as it is read, so Tab reaches each in order.
// "plot" adds the residual list to the source table as a computed column (D-33).

import type { JSX } from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { plotResiduals, residualTable, setLogMode } from "@/lib/calculator/core/api/row-commands";
import { formatParameterValue, formatStatisticValue } from "@/lib/calculator/regression/display";
import { latexToSpeech } from "../../math-field/speech";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { REGRESSION_NOTES, RegressionHelp } from "./RegressionHelp";
import { StaticMath } from "./StaticMath";

export const STATISTICS_HINT = "Has graph and regression. To access statistics, press Tab.";

/** `m=1.99` read as "m equals 1.99"; `R^{2}=-3.39` as "R squared equals negative 3.39". */
function Value(props: { name: string; said: string; latex: string }): JSX.Element {
  return (
    <StaticMath
      latex={`${props.name}=${props.latex}`}
      label={`${props.said} equals ${latexToSpeech(props.latex)}`}
      focusable
    />
  );
}

export function RegressionPanel({ row }: { row: RowView }): JSX.Element | null {
  const engine = useEngine();
  const { rows } = useEngineSnapshot(engine);
  const fit = row.regression?.result;
  const analysis = row.regression?.analysis;
  if (fit === null || fit === undefined || !fit.ok || analysis === undefined) return null;
  // RT-26: the table the residuals plot into, while it lacks the residual column.
  const source = residualTable(rows, analysis);
  const plotted = source?.columns?.some((c) => c.latex === fit.residualName) === true;
  const r2 = fit.r2 === null ? null : formatStatisticValue(fit.r2);
  return (
    <div className="kc-regression" data-regression="">
      {fit.logMode.available && (
        <div className="kc-tr-log kc-regression-log">
          <label>
            <input
              type="checkbox"
              checked={fit.logMode.on}
              onChange={() => setLogMode(engine, row.id, !fit.logMode.on)}
            />
            <span>Log Mode</span>
          </label>
          <RegressionHelp label="What is log mode?" note={REGRESSION_NOTES.log} />
        </div>
      )}
      {fit.params.length > 0 && (
        <section className="kc-regression-params" aria-label="Regression Parameters">
          <div className="kc-tr-title">
            Regression Parameters
            {!fit.isLinear && (
              <RegressionHelp
                label="Parameters might not be exact."
                note={REGRESSION_NOTES.exact}
              />
            )}
          </div>
          <div className="kc-regression-grid">
            {fit.params.map(({ name, value }) => (
              <Value
                key={name}
                name={name}
                said={latexToSpeech(name)}
                latex={formatParameterValue(value, 4)}
              />
            ))}
          </div>
        </section>
      )}
      <div className="kc-tr-footer">
        <section className="kc-tr-group" aria-label="Statistics">
          <div className="kc-tr-title">
            Statistics
            {r2 === null && fit.rmse !== null && (
              <RegressionHelp label="What is RMSE?" note={REGRESSION_NOTES.rmse} />
            )}
            {fit.r2 !== null && fit.r2 < 0 && (
              <RegressionHelp label="Why is this negative?" note={REGRESSION_NOTES.negative} />
            )}
          </div>
          {r2 !== null ? (
            <div className="kc-tr-stat" data-label="R2">
              {fit.r !== null ? (
                <Value name="r^{2}" said="r squared" latex={r2} />
              ) : (
                <Value name="R^{2}" said="R squared" latex={r2} />
              )}
            </div>
          ) : (
            fit.rmse !== null && (
              <div className="kc-tr-stat" data-label="RMSE">
                <Value name="RMSE" said="RMSE" latex={formatStatisticValue(fit.rmse)} />
              </div>
            )
          )}
          {fit.r !== null && (
            <div className="kc-tr-stat" data-label="r">
              <Value name="r" said="r" latex={formatStatisticValue(fit.r)} />
            </div>
          )}
        </section>
        <section className="kc-tr-group" aria-label="Residuals">
          <div className="kc-tr-title">Residuals</div>
          <div className="kc-tr-residual">
            <StaticMath
              latex={fit.residualName}
              label={latexToSpeech(fit.residualName)}
              focusable
            />
            {source !== undefined && !plotted && (
              <button
                type="button"
                className="kc-tr-plot"
                onClick={() => plotResiduals(engine, row.id)}
              >
                plot
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
