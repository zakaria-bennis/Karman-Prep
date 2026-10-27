// FN-59: the inference wizard's forms (wizard-model.ts writes the rows), as live Desmos (College
// Board version) lays them out (captured 2026-10-26): a sample table under "SAMPLE 1" with a
// "+ SAMPLE 2 (optional)" button, Data and Stats tabs for the z and t tests, a growing table for
// the χ² tests, a distribution picker with its parameters, and a Create button that is offered once
// the required cells are filled. Each cell is a small math field; Enter in a sample cell creates.

import { useId, useState, type JSX } from "react";
import { InferenceField } from "./InferenceField";
import {
  DISTRIBUTIONS,
  distributionLatex,
  fitLatex,
  fitRows,
  fitTotalsDiffer,
  independenceLatex,
  independenceSize,
  sampleHeaders,
  sampleLatex,
  type SampleMode,
} from "./wizard-model";

export interface FormProps {
  onCreate(latex: string): void;
}

function CreateButton(props: {
  latex: string | null;
  label: string;
  onCreate(latex: string): void;
}): JSX.Element {
  return (
    <div className="kc-wiz-create">
      <button
        type="button"
        className="kc-wiz-create-button"
        disabled={props.latex === null}
        onClick={() => props.latex !== null && props.onCreate(props.latex)}
      >
        {props.label}
      </button>
    </div>
  );
}

const set = (cells: readonly string[], k: number, v: string) => {
  const next = [...cells];
  next[k] = v;
  return next;
};

function SampleTable(props: {
  title: string;
  headers: readonly string[];
  cells: readonly string[];
  onCell(k: number, latex: string): void; // a functional update: edits can outrun renders
  onEnter(): void;
  autoFocus: boolean;
}): JSX.Element {
  return (
    <div className="kc-wiz-sample">
      <div className="kc-wiz-sample-title">{props.title}</div>
      <table className="kc-wiz-table">
        <thead>
          <tr>
            {props.headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {props.headers.map((h, k) => (
              <td key={h}>
                <InferenceField
                  latex={props.cells[k] ?? ""}
                  placeholder=""
                  label={`${props.title} ${h}`}
                  onChange={(v) => props.onCell(k, v)}
                  onEnter={props.onEnter}
                  autoFocus={props.autoFocus && k === 0}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The z-test, t-test and z-test for proportions forms. */
export function SampleForm(props: FormProps & { kind: "z" | "t" | "zprop" }): JSX.Element {
  const [mode, setMode] = useState<SampleMode>("data");
  const [first, setFirst] = useState<string[]>([]);
  const [second, setSecond] = useState<string[] | null>(null);
  const [focusSecond, setFocusSecond] = useState(false);
  const headers = sampleHeaders(props.kind, mode);
  const latex = sampleLatex(props.kind, mode, first, second);
  const create = () => latex !== null && props.onCreate(latex);
  const tabs = useId();
  return (
    <>
      {props.kind !== "zprop" && (
        <div className="kc-wiz-tabs" role="radiogroup" aria-label="Enter samples as">
          {(["data", "stats"] as const).map((m) => (
            <label key={m} className="kc-wiz-tab">
              <input
                type="radio"
                name={tabs}
                checked={mode === m}
                onChange={() => {
                  setMode(m);
                  setFirst([]);
                  setSecond(second === null ? null : []);
                }}
              />
              <span>{m === "data" ? "Data" : "Stats"}</span>
            </label>
          ))}
        </div>
      )}
      <div className="kc-wiz-body">
        <SampleTable
          key={`1-${mode}`}
          title="Sample 1"
          headers={headers}
          cells={first}
          onCell={(k, v) => setFirst((c) => set(c, k, v))}
          onEnter={create}
          autoFocus
        />
        {second === null ? (
          <button
            type="button"
            className="kc-wiz-add-sample"
            onClick={() => {
              setSecond([]);
              setFocusSecond(true);
            }}
          >
            <span aria-hidden="true">+</span> Sample 2{" "}
            <span className="kc-wiz-optional">(optional)</span>
          </button>
        ) : (
          <SampleTable
            key={`2-${mode}`}
            title="Sample 2"
            headers={headers}
            cells={second}
            onCell={(k, v) => setSecond((c) => set(c ?? [], k, v))}
            onEnter={create}
            autoFocus={focusSecond}
          />
        )}
      </div>
      <CreateButton latex={latex} label="Create Test" onCreate={props.onCreate} />
    </>
  );
}

const COLUMN = (c: number) => `Group ${c + 1}`;
const ROW = (r: number) => `Group ${String.fromCharCode(65 + (r % 26))}`;

/** The χ² test for independence: a table that grows a row and a column as it fills. */
export function IndependenceForm(props: FormProps): JSX.Element {
  const [grid, setGrid] = useState<string[][]>([]);
  const size = independenceSize(grid);
  const write = (r: number, c: number, v: string) =>
    setGrid((g) => {
      const next = g.map((row) => [...row]);
      while (next.length <= r) next.push([]);
      next[r][c] = v;
      return next;
    });
  const latex = independenceLatex(grid);
  return (
    <>
      <div className="kc-wiz-body">
        <div className="kc-wiz-grid-scroll">
          <table className="kc-wiz-table kc-wiz-grid">
            <thead>
              <tr>
                <td />
                {Array.from({ length: size.cols }, (_, c) => (
                  <th key={c} scope="col">
                    {COLUMN(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: size.rows }, (_, r) => (
                <tr key={r}>
                  <th scope="row">{ROW(r)}</th>
                  {Array.from({ length: size.cols }, (_, c) => (
                    <td key={c}>
                      <InferenceField
                        latex={grid[r]?.[c] ?? ""}
                        placeholder=""
                        label={`${ROW(r)}, ${COLUMN(c)}`}
                        onChange={(v) => write(r, c, v)}
                        onEnter={() => latex !== null && props.onCreate(latex)}
                        autoFocus={r === 0 && c === 0}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CreateButton latex={latex} label="Create Test" onCreate={props.onCreate} />
    </>
  );
}

/** The χ² goodness of fit test: Observed and Expected (optional) columns that grow. */
export function FitForm(props: FormProps): JSX.Element {
  const [observed, setObserved] = useState<string[]>([]);
  const [expected, setExpected] = useState<string[]>([]);
  const rows = fitRows(observed, expected);
  const latex = fitLatex(observed, expected);
  const columns = [
    { header: "Observed", cells: observed, setCells: setObserved },
    { header: "Expected (optional)", cells: expected, setCells: setExpected },
  ];
  return (
    <>
      <div className="kc-wiz-body">
        <table className="kc-wiz-table kc-wiz-grid">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {columns.map((col, c) => (
                  <td key={col.header}>
                    <InferenceField
                      latex={col.cells[r] ?? ""}
                      placeholder=""
                      label={`${col.header} ${r + 1}`}
                      onChange={(v) => col.setCells((cells) => set(cells, r, v))}
                      onEnter={() => latex !== null && props.onCreate(latex)}
                      autoFocus={r === 0 && c === 0}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {fitTotalsDiffer(observed, expected) && (
          <p className="kc-inf-warning" role="status">
            Expected and observed totals don&apos;t match.
          </p>
        )}
      </div>
      <CreateButton latex={latex} label="Create Test" onCreate={props.onCreate} />
    </>
  );
}

/** A probability distribution: a picker and its parameters, with Desmos's defaults greyed. */
export function DistributionForm(props: FormProps): JSX.Element {
  const [index, setIndex] = useState(0);
  const [cells, setCells] = useState<string[]>([]);
  const choice = DISTRIBUTIONS[index];
  const latex = distributionLatex(choice, cells);
  return (
    <>
      <div className="kc-wiz-body">
        <select
          className="kc-wiz-select"
          aria-label="Distribution"
          value={choice.name}
          onChange={(e) => {
            setIndex(DISTRIBUTIONS.findIndex((d) => d.name === e.currentTarget.value));
            setCells([]);
          }}
        >
          {DISTRIBUTIONS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.label}
            </option>
          ))}
        </select>
        <table className="kc-wiz-table" key={choice.name}>
          <thead>
            <tr>
              {choice.fields.map((f) => (
                <th key={f.header} scope="col">
                  {f.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {choice.fields.map((f, k) => (
                <td key={f.header}>
                  <InferenceField
                    latex={cells[k] ?? ""}
                    placeholder={f.placeholder}
                    label={f.header}
                    onChange={(v) => setCells((c) => set(c, k, v))}
                    onEnter={() => latex !== null && props.onCreate(latex)}
                    autoFocus={k === 0}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <CreateButton latex={latex} label="Create Distribution" onCreate={props.onCreate} />
    </>
  );
}
