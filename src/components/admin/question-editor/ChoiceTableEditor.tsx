"use client";

import type { QuestionTableData } from "@/types/question-table";

const inputClass =
  "min-w-20 w-full rounded border border-bronze bg-night px-2 py-1.5 text-sm text-ivory focus:border-gold/40 focus:outline-none";

/** Small grid editor for a source table attached to one answer letter. */
export function ChoiceTableEditor({
  value,
  onChange,
}: {
  value: QuestionTableData;
  onChange: (table: QuestionTableData) => void;
}) {
  const headers = value.header_row ?? value.rows[0].map(() => "");
  const width = headers.length;

  function setHeader(index: number, text: string) {
    onChange({
      ...value,
      header_row: headers.map((header, i) => (i === index ? text : header)),
    });
  }
  function setCell(rowIndex: number, colIndex: number, text: string) {
    onChange({
      ...value,
      rows: value.rows.map((row, ri) =>
        ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? text : cell)) : row
      ),
    });
  }
  function addColumn() {
    if (width >= 8) return;
    onChange({
      ...value,
      header_row: [...headers, ""],
      rows: value.rows.map((row) => [...row, ""]),
    });
  }
  function removeColumn() {
    if (width <= 1) return;
    onChange({
      ...value,
      header_row: headers.slice(0, -1),
      rows: value.rows.map((row) => row.slice(0, -1)),
    });
  }
  return (
    <div className="mt-2 max-w-full rounded-lg border border-bronze bg-night/30 p-3">
      <p className="mb-2 text-xs text-taupe">
        Enter each source table cell. Keep the columns and rows in the exam’s order.
      </p>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[16rem] border-collapse text-left">
          <thead>
            <tr>
              {headers.map((header, ci) => (
                <th key={ci} scope="col" className="border border-bronze p-1">
                  <input
                    aria-label={`Column ${ci + 1} heading`}
                    value={header}
                    onChange={(e) => setHeader(ci, e.target.value)}
                    className={inputClass}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-bronze p-1">
                    <input
                      aria-label={`Row ${ri + 1}, column ${ci + 1}`}
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className={inputClass}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <button
          type="button"
          onClick={addColumn}
          disabled={width >= 8}
          className="text-gold-bright disabled:opacity-40"
        >
          Add column
        </button>
        <button
          type="button"
          onClick={removeColumn}
          disabled={width <= 1}
          className="text-taupe disabled:opacity-40"
        >
          Remove last column
        </button>
        <button
          type="button"
          onClick={() =>
            value.rows.length < 30 &&
            onChange({ ...value, rows: [...value.rows, Array(width).fill("")] })
          }
          disabled={value.rows.length >= 30}
          className="text-gold-bright disabled:opacity-40"
        >
          Add row
        </button>
        <button
          type="button"
          onClick={() =>
            value.rows.length > 1 && onChange({ ...value, rows: value.rows.slice(0, -1) })
          }
          disabled={value.rows.length <= 1}
          className="text-taupe disabled:opacity-40"
        >
          Remove last row
        </button>
      </div>
    </div>
  );
}
