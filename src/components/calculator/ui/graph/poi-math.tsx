// A coordinate label's math (POI-TRACE-17, POI-TRACE-19): `\left(X,\ Y\right)` typeset as static
// MathQuill markup, so it picks up the row fields' math styles: brackets that stretch to the
// content, π fractions, plain fractions (the label's fraction form), m×10^e and undefined. Hidden from assistive technology; the label's
// accessible name carries the text.

import type { CoordinateParts, FormattedCoordinate } from "@/lib/calculator/poi/format";
import type { FormattedLabel } from "@/lib/calculator/poi/format";

// The parenthesis outlines of the vendored MathQuill build (vendor/mathquill, SVG_SYMBOLS).
const PAREN_VIEWBOX = "3 0 106 186";
const PAREN_PATH = {
  l: "M85 0 A61 101 0 0 0 85 186 L75 186 A75 101 0 0 1 75 0",
  r: "M24 0 A61 101 0 0 1 24 186 L34 186 A75 101 0 0 0 34 0",
} as const;
const PAREN_WIDTH = ".55em";

const MINUS = "−";

/** A unary minus as MathQuill writes one (an empty class), so math-field.css gives it the
 *  reference's 2 px of air each side: "−2" in a label is 15.7 px + 10.3 px wide on Desmos. */
function Minus(): JSX.Element {
  return <span className="">{MINUS}</span>;
}

function Digits({ text }: { text: string }): JSX.Element {
  return (
    <>
      {[...text].map((c, i) =>
        c === "-" ? (
          <Minus key={i} />
        ) : (
          <span key={i} className="mq-digit">
            {c}
          </span>
        )
      )}
    </>
  );
}

function Pi({ n }: { n: number }): JSX.Element {
  return (
    <>
      {n !== 1 && <Digits text={String(n)} />}
      <span className="mq-nonSymbola">π</span>
    </>
  );
}

/** A stacked fraction as MathQuill writes one. */
function Fraction({ num, den }: { num: JSX.Element; den: number }): JSX.Element {
  return (
    <span className="mq-fraction mq-non-leaf">
      <span className="mq-numerator">{num}</span>
      <span className="mq-denominator">
        <Digits text={String(den)} />
      </span>
      <span style={{ display: "inline-block", width: 0 }}>{"\u200b"}</span>
    </span>
  );
}

function Coordinate({ parts }: { parts: CoordinateParts }): JSX.Element {
  switch (parts.kind) {
    case "undefined":
      return <span className="mq-roman mq-font">undefined</span>;
    case "number":
      return <Digits text={parts.text} />;
    case "pi":
      return (
        <>
          {parts.negative && <Minus />}
          {parts.d === 1 ? <Pi n={parts.n} /> : <Fraction num={<Pi n={parts.n} />} den={parts.d} />}
        </>
      );
    case "fraction":
      return (
        <>
          {parts.negative && <Minus />}
          <Fraction num={<Digits text={String(parts.n)} />} den={parts.d} />
        </>
      );
    case "scientific":
      return (
        <>
          <Digits text={parts.mantissa} />
          <span className="mq-binary-operator">×</span>
          <Digits text="10" />
          <span className="mq-supsub mq-non-leaf mq-sup-only">
            <span className="mq-sup">
              <Digits text={parts.exponent} />
            </span>
          </span>
        </>
      );
  }
}

function Paren({ side }: { side: "l" | "r" }): JSX.Element {
  return (
    <span style={{ width: PAREN_WIDTH }} className={`mq-scaled mq-bracket-${side} mq-paren`}>
      <svg preserveAspectRatio="none" viewBox={PAREN_VIEWBOX}>
        <path d={PAREN_PATH[side]} />
      </svg>
    </span>
  );
}

/** The label's `(X, Y)` as MathQuill-styled static math. */
export function PoiMath({ label }: { label: FormattedLabel }): JSX.Element {
  const coordinate = (c: FormattedCoordinate) => <Coordinate parts={c.parts} />;
  return (
    <span className="mq-math-mode kc-poi-math" aria-hidden="true">
      <span className="mq-root-block">
        <span className="mq-non-leaf mq-bracket-container">
          <Paren side="l" />
          <span
            style={{ marginLeft: PAREN_WIDTH, marginRight: PAREN_WIDTH }}
            className="mq-bracket-middle mq-non-leaf"
          >
            {coordinate(label.x)}
            <span className="mq-comma">,</span>
            <span>{" "}</span>
            {coordinate(label.y)}
          </span>
          <Paren side="r" />
        </span>
      </span>
    </span>
  );
}
