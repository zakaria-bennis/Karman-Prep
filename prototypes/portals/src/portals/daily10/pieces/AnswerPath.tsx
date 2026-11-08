import { Flame } from "@/design-system/marks";
import type { Answer } from "../mock";

/*
 * Ten answers on one path, in order: right ones filled, missed ones an open ring.
 * The line between two right answers lights up, so runs show at a glance, and
 * the run the set ended on is named above the row that holds it. Every dot is a
 * real 44px target that opens that question, with at least 8px between targets:
 * one row of ten on an iPad or desktop (34px dots), and under 560px two rows of
 * five (30px dots) joined by a short vertical tie, the second row running back
 * so 6 sits under 5 and the path never breaks.
 */
export function AnswerPath({
  answers,
  shown,
  runEnd,
  onPick,
  phone,
}: {
  answers: Answer[];
  shown: number;
  runEnd: number;
  onPick(n: number): void;
  phone: boolean;
}) {
  const n = answers.length;
  const per = phone ? Math.ceil(n / 2) : n;
  const d = phone ? 30 : 34;
  // the grid column of the k-th dot in a row (dot columns at odd positions, gaps between)
  const col = (k: number) => 2 * k + 1;
  // row 1 reads left to right, row 2 right to left (the path turns at the edge)
  const place = (i: number) => {
    const row = i < per ? 0 : 1;
    const k = row === 0 ? i : per - 1 - (i - per);
    return { row, k };
  };
  const dotRow = (row: number) => (phone ? (row === 0 ? 2 : 5) : 2);
  const runStart = n - runEnd;
  const runRow = place(Math.max(0, runStart)).row;
  const labelRow = phone ? (runRow === 0 ? 1 : 4) : 1;
  const labelCols = phone
    ? runRow === 0
      ? `${col(place(runStart).k)} / ${col(per - 1) + 1}`
      : `1 / ${col(place(runStart).k) + 1}`
    : `${col(runStart)} / ${col(n - 1) + 1}`;
  const lit = (i: number) => answers[i].ok && answers[i - 1].ok;
  return (
    <div
      className="apath grid w-full items-center"
      style={{
        gridTemplateColumns: `repeat(${per - 1}, 44px minmax(8px, 1fr)) 44px`,
        gridTemplateRows: phone ? "auto 44px 12px auto 44px" : "auto 44px",
        rowGap: phone ? 0 : 6,
        maxWidth: 620,
        marginInline: "auto",
      }}
    >
      {answers.map((a, i) => {
        const { row, k } = place(i);
        const turn = phone && i === per;
        return (
          <AnswerDot
            key={a.n}
            a={a}
            d={d}
            col={col(k)}
            row={dotRow(row)}
            on={i < shown}
            phone={phone}
            onPick={onPick}
            seg={
              i === 0
                ? null
                : turn
                  ? { col: col(k), row: "3 / 5", vertical: true, lit: lit(i) }
                  : { col: col(k) + (row === 0 ? -1 : 1), row: dotRow(row), lit: lit(i) }
            }
          />
        );
      })}
      {runEnd >= 3 ? (
        <div
          className={`ap-run inline-flex items-center gap-[5px] whitespace-nowrap pb-[6px] text-[13px] font-semibold text-text ${phone && runRow === 1 ? "justify-self-start" : "justify-self-end"}`}
          style={{ gridColumn: labelCols, gridRow: labelRow }}
          data-in={shown >= n ? "" : undefined}
        >
          <Flame size={13} />
          <span>Finished on {runEnd} in a row</span>
        </div>
      ) : null}
    </div>
  );
}

function AnswerDot({
  a,
  d,
  col,
  row,
  on,
  seg,
  onPick,
  phone,
}: {
  a: Answer;
  d: number;
  col: number;
  row: number;
  on: boolean;
  seg: { col: number; row: number | string; vertical?: boolean; lit: boolean } | null;
  onPick(n: number): void;
  phone: boolean;
}) {
  return (
    <>
      {seg ? (
        <i
          className={`ap-seg block rounded-[1px] ${seg.vertical ? "self-stretch justify-self-center" : ""}`}
          style={{
            gridColumn: seg.col,
            gridRow: seg.row,
            // the tie runs from dot 5 down past the run's label to dot 6
            ...(seg.vertical
              ? { width: seg.lit ? 4 : 2, margin: "-1px 0" }
              : { height: seg.lit ? 4 : 2, margin: "0 -1px" }),
            background: seg.lit ? "rgb(var(--k-accent))" : "rgb(var(--k-border))",
          }}
          data-in={on ? "" : undefined}
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        className="ap-n group relative grid h-11 w-11 place-items-center justify-self-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ gridColumn: col, gridRow: row }}
        data-in={on ? "" : undefined}
        aria-label={`Question ${a.n}, ${a.ok ? "right" : "missed"}. Open it`}
        onClick={() => onPick(a.n)}
      >
        <span
          className={`tabular grid place-items-center rounded-full border-2 font-semibold transition-colors group-hover:border-text ${phone ? "text-[12px]" : "text-[13px]"} ${
            a.ok ? "border-accent bg-accent text-accent-ink" : "text-text"
          }`}
          style={{
            width: d,
            height: d,
            borderColor: a.ok
              ? undefined
              : "color-mix(in srgb, rgb(var(--k-accent)) 70%, rgb(var(--k-border)))",
          }}
        >
          {a.n}
        </span>
      </button>
    </>
  );
}
