import { Fragment, type ReactNode } from "react";

/**
 * The demo stems carry KaTeX-style $...$ math as the app writes them. The app
 * renders them with KaTeX; this prototype sets the math in the serif face with
 * real minus signs, stacked fractions and a square root, which is enough to
 * read every demo question. Nothing else is parsed.
 */
const SYMBOLS: [RegExp, string][] = [
  [/\\cdot/g, "·"],
  [/\\times/g, "×"],
  [/\\le\b/g, "≤"],
  [/\\ge\b/g, "≥"],
  [/\\ne\b/g, "≠"],
  [/\\pi/g, "π"],
  [/-/g, "−"],
  [/\\,/g, " "],
];

function tex(src: string, key: number): ReactNode {
  const out: ReactNode[] = [];
  let rest = src;
  let i = 0;
  while (rest.length) {
    const frac = rest.match(/^\\d?frac\{([^}]*)\}\{([^}]*)\}/);
    const sqrt = rest.match(/^\\sqrt\{([^}]*)\}/);
    const sup = rest.match(/^\^(\{([^}]*)\}|(\S))/);
    if (frac) {
      out.push(
        <span key={i} className="k-frac" role="math" aria-label={`${frac[1]} over ${frac[2]}`}>
          <span>{tex(frac[1], 0)}</span>
          <span>{tex(frac[2], 1)}</span>
        </span>
      );
      rest = rest.slice(frac[0].length);
    } else if (sqrt) {
      out.push(
        <span key={i} className="k-sqrt">
          <span aria-hidden="true">{"√"}</span>
          <span className="k-sqrt-body">{tex(sqrt[1], 0)}</span>
        </span>
      );
      rest = rest.slice(sqrt[0].length);
    } else if (sup) {
      out.push(<sup key={i}>{tex(sup[2] ?? sup[3], 0)}</sup>);
      rest = rest.slice(sup[0].length);
    } else {
      const n = rest.search(/\\d?frac|\\sqrt|\^/);
      const plain = n < 0 ? rest : rest.slice(0, n || 1);
      out.push(
        <Fragment key={i}>{SYMBOLS.reduce((s, [re, to]) => s.replace(re, to), plain)}</Fragment>
      );
      rest = rest.slice(plain.length);
    }
    i++;
  }
  return (
    <span key={key} className="k-math">
      {out}
    </span>
  );
}

/** Text with inline $...$ math; paragraphs split on blank lines, single breaks kept. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.startsWith("$") && p.endsWith("$") ? (
          tex(p.slice(1, -1), i)
        ) : (
          <Fragment key={i}>
            {p.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {line
                  .split(/(_{2,})/)
                  .map((seg, k) =>
                    /^_{2,}$/.test(seg) ? (
                      <span key={k} className="k-blank" aria-label="blank" />
                    ) : (
                      <Fragment key={k}>{seg}</Fragment>
                    )
                  )}
                {j < arr.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </Fragment>
        )
      )}
    </span>
  );
}

/** "A) is" to "is": the letter is drawn by the choice row. */
export const stripLetter = (option: string) => option.replace(/^[A-D]\)\s*/, "");
