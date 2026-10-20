// A table's regression panel (RT-28 to RT-32, REG-MODELS-1 to -23), drawn as the reference draws
// it: the header row (the colour icon that hides and shows the curve, the model dropdown, "for"
// and the y column picker when several columns qualify, ⋮), then EQUATION with its Export to the
// expression list icon and the typeset equation, the parameter warning, Log Mode (exponential,
// logarithmic and power), STATISTICS (R² always; r and "r is undefined" for Linear only; "R² is
// undefined" when y has no spread) and RESIDUALS (e_k with "plot", then a Zoom Fit icon). A data
// or logarithmic-x error replaces everything below the header with a warning icon.

import { useContext, type CSSProperties, type JSX } from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";
import type { StoredRow } from "@/lib/calculator/core/api/document";
import { fitPoints } from "@/lib/calculator/core/data/fit-view";
import {
  exportRegressionEquation,
  plotTableResiduals,
  regressionEligibility,
  residualColumnIndex,
  setTableRegressionColumn,
  setTableRegressionHidden,
  setTableRegressionLogMode,
  setTableRegressionType,
} from "@/lib/calculator/core/api/table-regression-commands";
import { tableStatisticsLines } from "@/lib/calculator/regression/table-fit";
import { TABLE_MODELS, TABLE_MODEL_SPECS } from "@/lib/calculator/regression/table-models";
import { rowIconHex } from "@/lib/calculator/theme/roles";
import { ColourKindGlyph, ZoomFitGlyph } from "../../icons/list";
import { latexToSpeech } from "../../math-field/speech";
import { FocusContext } from "../focus/focus-controller";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { RegressionOptionsMenu } from "./RegressionOptionsMenu";
import { RegressionSelect } from "./RegressionSelect";
import { StaticMath } from "./StaticMath";

const CUSTOM_HELP = "https://help.desmos.com/hc/en-us/articles/4406972958733-Regressions";
const LOG_HELP = "https://help.desmos.com/hc/en-us/articles/204349605";
const WARNING_HELP = "https://help.desmos.com/hc/en-us/articles/360042942771";

/** "R squared equals 0.9415", "r is undefined", in the list's own speech style. */
const statSpeech = (label: "R2" | "r", value: string | null) =>
  `${label === "R2" ? "R squared" : "r"} ${value === null ? "is undefined" : `equals ${latexToSpeech(value)}`}`;

function ModelFooter(): JSX.Element {
  return (
    <p>
      Make a custom regression model in a new line using <span className="kc-tr-tilde">~</span>.{" "}
      <a href={CUSTOM_HELP} target="_blank" rel="noreferrer">
        Learn how
      </a>
      .
    </p>
  );
}

export function TableRegression(props: {
  row: RowView;
  stored: Pick<StoredRow, "columns" | "regression">;
}): JSX.Element | null {
  const { row, stored } = props;
  const engine = useEngine();
  const skin = useSkin();
  const focus = useContext(FocusContext);
  const { geometry, settings, viewport } = useEngineSnapshot(engine);
  const r = stored.regression;
  if (r === undefined) return null;
  const result = row.table?.result?.regression;
  const fit =
    result !== undefined && result.y === r.y && result.type === r.type ? result.fit : null;
  const columns = stored.columns ?? [];
  const candidates = regressionEligibility(row).candidates;
  const ys = candidates.includes(r.y) ? candidates : [...candidates, r.y].sort((a, b) => a - b);
  const residualColumn = residualColumnIndex(stored);
  const plotted = geometry.get(row.id);
  const residualSeries =
    plotted?.kind === "table" ? plotted.series.find((s) => s.column === residualColumn) : undefined;
  const residualFit = residualSeries === undefined ? null : fitPoints([residualSeries.coords]);
  const zoomWouldMove =
    residualFit !== null &&
    !settings.lockViewport &&
    ["left", "right", "bottom", "top"].some((k) => {
      const key = k as keyof typeof viewport;
      const span =
        k === "left" || k === "right"
          ? viewport.right - viewport.left
          : viewport.top - viewport.bottom;
      return Math.abs(residualFit[key] - viewport[key]) > span / 100;
    });
  const failed = fit !== null && !fit.ok ? fit.message : null;
  const iconHex = rowIconHex(r.color, skin);
  return (
    <div className="kc-tr" data-table-regression="">
      <div className="kc-tr-header">
        {failed !== null ? (
          <span className="kc-tr-warning" role="img" aria-label={failed} title={failed}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2.5 23 21.5H1Z" fill="currentColor" />
              <path d="M11 9h2v6.5h-2zM11 17h2v2h-2z" className="kc-tr-warning-mark" />
            </svg>
          </span>
        ) : (
          <button
            type="button"
            className="kc-row-tab kc-tr-icon"
            aria-label={r.hidden ? "Show Regression" : "Hide Regression"}
            aria-pressed={!r.hidden}
            style={{ "--kc-row-color": iconHex } as CSSProperties}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTableRegressionHidden(engine, row.id, !r.hidden)}
          >
            {!r.hidden && <ColourKindGlyph kind="wave" />}
          </button>
        )}
        <RegressionSelect
          id={`${row.id}-model`}
          className="kc-tr-model"
          value={r.type}
          options={TABLE_MODELS.map((t) => ({ value: t, label: TABLE_MODEL_SPECS[t].label }))}
          onPick={(t) => setTableRegressionType(engine, row.id, t)}
          footer={<ModelFooter />}
        />
        {ys.length > 1 && (
          <>
            <span className="kc-tr-for">for</span>
            <RegressionSelect
              id={`${row.id}-y`}
              className="kc-tr-column"
              value={r.y}
              buttonLabel={`Regression column: ${latexToSpeech(columns[r.y]?.latex ?? "")}`}
              options={ys.map((j) => ({
                value: j,
                label: latexToSpeech(columns[j]?.latex ?? ""),
                content: <StaticMath latex={columns[j]?.latex ?? ""} label="" />,
              }))}
              onPick={(j) => setTableRegressionColumn(engine, row.id, j)}
            />
          </>
        )}
        <RegressionOptionsMenu
          tableId={row.id}
          stored={stored}
          onDeleted={() => focus?.focusRow(row.id, "end")}
        />
      </div>
      {fit !== null && fit.ok && (
        <>
          <div className="kc-tr-title kc-tr-equation-title">
            Equation
            <button
              type="button"
              className="kc-tr-insert"
              aria-label="Export to the expression list"
              title="Export to the expression list"
              onClick={() => exportRegressionEquation(engine, row.id)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M2.5 2.5h8v3M2.5 2.5v11h11v-6M6 10l7-7M9 3h4v4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
            </button>
          </div>
          <StaticMath
            latex={fit.equation}
            label={`Regression Equation: ${latexToSpeech(fit.equation)}`}
            className="kc-tr-equation"
            focusable
          />
          {fit.parameterWarning && (
            <p className="kc-tr-param-warning">
              Some parameters may be too large or small to represent accurately.{" "}
              <a href={WARNING_HELP} target="_blank" rel="noreferrer">
                Learn more.
              </a>
            </p>
          )}
          {fit.logMode.available && (
            <div className="kc-tr-log">
              <label>
                <input
                  type="checkbox"
                  checked={fit.logMode.on}
                  onChange={() => setTableRegressionLogMode(engine, row.id, !fit.logMode.on)}
                />
                <span>Log Mode</span>
              </label>
              <a
                className="kc-tr-help"
                href={LOG_HELP}
                target="_blank"
                rel="noreferrer"
                aria-label="Log mode help"
                title="Log mode help"
              >
                ?
              </a>
            </div>
          )}
          <div className="kc-tr-footer">
            <section className="kc-tr-group" aria-label="Statistics">
              <div className="kc-tr-title">Statistics</div>
              {tableStatisticsLines(r.type, fit.statistics).map((line) => (
                <div key={line.label} className="kc-tr-stat" data-label={line.label}>
                  <StaticMath
                    latex={
                      (line.label === "R2" ? "R^{2}" : "r") +
                      (line.value === null ? "" : `=${line.value}`)
                    }
                    label={statSpeech(line.label, line.value)}
                    focusable
                  />
                  {line.value === null && <span className="kc-tr-undefined"> is undefined</span>}
                </div>
              ))}
            </section>
            <section className="kc-tr-group" aria-label="Residuals">
              <div className="kc-tr-title">Residuals</div>
              <div className="kc-tr-residual">
                <StaticMath
                  latex={result!.residualName}
                  label={latexToSpeech(result!.residualName)}
                  focusable
                />
                {residualColumn < 0 ? (
                  <button
                    type="button"
                    className="kc-tr-plot"
                    onClick={() => plotTableResiduals(engine, row.id)}
                  >
                    plot
                  </button>
                ) : (
                  residualFit !== null &&
                  zoomWouldMove && (
                    <button
                      type="button"
                      className="kc-tr-zoom"
                      aria-label="Zoom Fit"
                      title="Zoom Fit"
                      onClick={() => engine.setMathBounds(residualFit)}
                    >
                      <ZoomFitGlyph size={16} />
                    </button>
                  )
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
