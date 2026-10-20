// A typed regression row's results (RT-31, REG-CUSTOM-26, -34, REG-STATISTICS-2), laid out as the
// reference lays them out and in the table panel's type: Log Mode with its help link when log mode
// applies, then REGRESSION PARAMETERS ("?" "Parameters might not be exact" for an iterative fit) as
// a two-column grid of typeset `name=value`, then STATISTICS (R², an indented r, or RMSE with its
// "?") and RESIDUALS (e_k and a grey "plot") side by side, then the parameter warning. Every value
// is a focusable read-only static math field named as it is read, so Tab reaches each in order.
// "plot" adds the residual list to the source table as a computed column (D-33).

import type { JSX } from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { plotResiduals, setLogMode } from "@/lib/calculator/core/api/row-commands";
import { formatParameterValue, formatStatisticValue } from "@/lib/calculator/regression/display";
import { latexToSpeech } from "../../math-field/speech";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { StaticMath } from "./StaticMath";

export const STATISTICS_HINT = "Has graph and regression. To access statistics, press Tab.";

const LOG_HELP = "https://help.desmos.com/hc/en-us/articles/204349605";
const EXACT_HELP = "https://help.desmos.com/hc/en-us/articles/360042428612";
const RMSE_HELP = "https://help.desmos.com/hc/en-us/articles/4406972958733-Regressions";

function Help(props: { href: string; label: string }): JSX.Element {
  return (
    <a
      className="kc-tr-help"
      href={props.href}
      target="_blank"
      rel="noreferrer"
      aria-label={props.label}
      title={props.label}
    >
      ?
    </a>
  );
}

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
  const observed = analysis.observed.kind === "id" ? analysis.observed.name : null;
  // D-33: the table the observations come from, while it lacks the residual column.
  const source = rows.find(
    (r) => r.type === "table" && r.columns?.some((c) => c.latex === observed)
  );
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
          <Help href={LOG_HELP} label="Log mode help" />
        </div>
      )}
      {fit.params.length > 0 && (
        <section className="kc-regression-params" aria-label="Regression Parameters">
          <div className="kc-tr-title">
            Regression Parameters
            {!fit.isLinear && (
              <Help href={EXACT_HELP} label="Parameters might not be exact. Click to learn more." />
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
              <Help href={RMSE_HELP} label="What is RMSE? Click to learn more." />
            )}
            {fit.r2 !== null && fit.r2 < 0 && (
              <Help href={RMSE_HELP} label="Why is this negative? Click to learn more." />
            )}
          </div>
          {r2 !== null ? (
            <div className="kc-tr-stat" data-label="R2">
              <Value name="R^{2}" said="R squared" latex={r2} />
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
