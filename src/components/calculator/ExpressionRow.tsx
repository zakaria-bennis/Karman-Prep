"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, Pause, Play, Plus, X } from "lucide-react";
import katex from "katex";
import type { Expression } from "@/lib/calculator/types";
import { COLORS } from "@/lib/calculator/types";
import type { RowResult } from "@/lib/calculator/scene";
import styles from "./engine.module.css";
const value = (n: number) => (Number.isFinite(n) ? Number(n.toPrecision(8)).toString() : "—");
export function ExpressionRow({
  row,
  index,
  result,
  active,
  onActive,
  onUpdate,
  onRemove,
  onAdd,
  onMissing,
  onFit,
  onMove,
  inputRef,
}: {
  row: Expression;
  index: number;
  result: RowResult;
  active: boolean;
  onActive: () => void;
  onUpdate: (patch: Partial<Expression>, group?: string) => void;
  onRemove: () => void;
  onAdd: () => void;
  onMissing: (names: string[]) => void;
  onFit: (type: string) => void;
  onMove: (direction: number) => void;
  inputRef: (node: HTMLTextAreaElement | null) => void;
}) {
  const [colorOpen, setColorOpen] = useState(false),
    [playing, setPlaying] = useState(false),
    [page, setPage] = useState(0);
  const slider = row.slider ?? { min: -10, max: 10, step: 0.1 };
  const current = useRef({ row, result, slider, onUpdate });
  current.current = { row, result, slider, onUpdate };
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const { result: r, slider: s, onUpdate: update } = current.current;
      if (!r.slider) return;
      const next = r.slider.value + s.step;
      update(
        { latex: `${r.slider.name}=${Number((next > s.max ? s.min : next).toPrecision(10))}` },
        `slider-${row.id}`
      );
    }, 60);
    return () => clearInterval(timer);
  }, [playing, row.id]);
  let preview = "";
  if (!active && row.latex && row.type !== "text" && row.type !== "folder") {
    try {
      preview = katex.renderToString(
        row.latex.replace(/(?<!\\)\b(sin|cos|tan|ln|log|sqrt)\(/g, "\\operatorname{$1}("),
        { throwOnError: false, strict: false, trust: false, output: "html" }
      );
    } catch {
      /* Raw text remains editable. */
    }
  }
  const columns = row.columns ?? [
    { latex: "x_1", values: ["", "", ""] },
    { latex: "y_1", values: ["", "", ""] },
  ];
  const count = Math.max(3, ...columns.map((c) => c.values?.length ?? 0));
  function cell(col: number, i: number, text: string) {
    onUpdate(
      {
        columns: columns.map((c, j) =>
          j === col
            ? {
                ...c,
                values: Array.from({ length: count }, (_, k) =>
                  k === i ? text : (c.values?.[k] ?? "")
                ),
              }
            : c
        ),
      },
      `cell-${row.id}-${col}-${i}`
    );
  }
  return (
    <article
      className={`${styles.row} ${active ? styles.activeRow : ""}`}
      data-expression-id={row.id}
    >
      <div className={styles.gutter}>
        <span>{index + 1}</span>
        <button
          className={styles.color}
          style={{ background: row.hidden ? "transparent" : row.color, borderColor: row.color }}
          aria-label={`${row.hidden ? "Show" : "Hide"} plot ${index + 1}`}
          onClick={() => onUpdate({ hidden: !row.hidden })}
        />
        <button
          className={styles.styleButton}
          aria-label={`Style row ${index + 1}`}
          aria-expanded={colorOpen}
          onClick={() => setColorOpen((v) => !v)}
        >
          <GripVertical size={14} />
        </button>
      </div>
      <div className={styles.rowContent}>
        {colorOpen && (
          <div className={styles.rowMenu}>
            {COLORS.map((color) => (
              <button
                key={color}
                style={{ background: color }}
                aria-label={`Color ${color}`}
                onClick={() => {
                  onUpdate({ color });
                  setColorOpen(false);
                }}
              />
            ))}
            <button onClick={() => onMove(-1)}>Move up</button>
            <button onClick={() => onMove(1)}>Move down</button>
          </div>
        )}
        {row.type === "table" ? (
          <>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    {columns.map((c, j) => (
                      <th key={j}>
                        <input
                          aria-label={`Table ${index + 1} column ${j + 1}`}
                          value={c.latex}
                          onChange={(e) =>
                            onUpdate({
                              columns: columns.map((c, k) =>
                                j === k ? { ...c, latex: e.target.value } : c
                              ),
                            })
                          }
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(30, count - page * 30) }, (_, offset) => {
                    const i = page * 30 + offset;
                    return (
                      <tr key={i}>
                        {columns.map((c, j) => (
                          <td key={j}>
                            <input
                              aria-label={`Table ${index + 1} row ${i + 1} column ${j + 1}`}
                              value={c.values?.[i] ?? ""}
                              onChange={(e) => cell(j, i, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.tableActions}>
              <button
                aria-label="Add table row"
                onClick={() => {
                  onUpdate({
                    columns: columns.map((c) => ({
                      ...c,
                      values: [...Array.from({ length: count }, (_, i) => c.values?.[i] ?? ""), ""],
                    })),
                  });
                  setPage(Math.floor(count / 30));
                }}
              >
                <Plus size={14} /> Row
              </button>
              {count > 30 && (
                <>
                  <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <span>
                    {page + 1}/{Math.ceil(count / 30)}
                  </span>
                  <button disabled={(page + 1) * 30 >= count} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </>
              )}
              <select aria-label="Add regression" value="" onChange={(e) => onFit(e.target.value)}>
                <option value="">Regression…</option>
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
                <option value="power">Power</option>
                <option value="constant">Constant</option>
              </select>
            </div>
          </>
        ) : (
          <>
            {row.type === "folder" && (
              <button
                className={styles.folderToggle}
                aria-label="Toggle folder"
                onClick={() => onUpdate({ collapsed: !row.collapsed })}
              >
                {row.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            <div className={styles.editor}>
              <textarea
                ref={inputRef}
                aria-label={
                  row.type === "text"
                    ? `Note ${index + 1}`
                    : row.type === "folder"
                      ? `Folder ${index + 1}`
                      : `Expression ${index + 1}`
                }
                value={row.latex ?? ""}
                placeholder={
                  row.type === "text"
                    ? "Type a note"
                    : row.type === "folder"
                      ? "Folder name"
                      : "Enter an expression"
                }
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                rows={1}
                className={preview ? styles.transparent : ""}
                onFocus={onActive}
                onChange={(e) =>
                  onUpdate({ latex: e.target.value.replace(/\n/g, "") }, `type-${row.id}`)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAdd();
                  }
                  if (e.key === "Backspace" && !row.latex) {
                    e.preventDefault();
                    onRemove();
                  }
                }}
              />
              {preview && (
                <div
                  className={styles.mathPreview}
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              )}
            </div>
            {result.slider && (
              <div className={styles.slider}>
                <button
                  aria-label={playing ? "Pause slider" : "Animate slider"}
                  onClick={() => setPlaying((v) => !v)}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <input
                  type="range"
                  aria-label={`Slider ${result.slider.name}`}
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={result.slider.value}
                  onChange={(e) =>
                    onUpdate(
                      { latex: `${result.slider!.name}=${e.target.value}` },
                      `slider-${row.id}`
                    )
                  }
                />
                <details>
                  <summary>Bounds</summary>
                  {(["min", "max", "step"] as const).map((key) => (
                    <label key={key}>
                      {key}
                      <input
                        type="number"
                        aria-label={`Slider ${key}`}
                        step="any"
                        value={slider[key]}
                        onChange={(e) => {
                          const next = { ...slider, [key]: Number(e.target.value) };
                          if (next.max > next.min && next.step > 0) onUpdate({ slider: next });
                        }}
                      />
                    </label>
                  ))}
                </details>
              </div>
            )}
            {result.value && (
              <output className={styles.result} aria-label={`Result ${index + 1}`}>
                {result.value}
              </output>
            )}
            {result.missing && (
              <div className={styles.missing}>
                Define {result.missing.join(", ")}
                <button onClick={() => onMissing(result.missing!)}>
                  Add slider{result.missing.length > 1 ? "s" : ""}
                </button>
              </div>
            )}
            {result.regression && (
              <div className={styles.regression} aria-label="Regression results">
                {Object.entries(result.regression.parameters).map(([name, n]) => (
                  <div key={name}>
                    {name} = {value(n)}
                  </div>
                ))}
                <hr />
                <div>R² = {value(result.regression.r2)}</div>
                <div title="Signed Pearson correlation; it is not the square root of R² for a general model.">
                  Pearson r = {value(result.regression.r)}
                </div>
                {result.regression.logMode && (
                  <p>Log mode · r and R² use transformed data; residuals use original units.</p>
                )}
                <div>RMSE = {value(result.regression.rmse)}</div>
                {!result.regression.converged && <p>Fit did not converge. Check this model.</p>}
                <details>
                  <summary>Residuals</summary>
                  <p>{result.regression.residuals.map(value).join(", ")}</p>
                </details>
              </div>
            )}
          </>
        )}
        {result.error && (
          <p className={styles.error} role="status">
            {result.error}
          </p>
        )}
      </div>
      <button className={styles.remove} aria-label={`Delete row ${index + 1}`} onClick={onRemove}>
        <X size={14} />
      </button>
    </article>
  );
}
