// Headline text for the painted home page. Headlines are set in Young Serif, but numbers never are
// (founder, 2026-11-08): every run of digits is wrapped so it stays in Hanken Grotesk (painted.css, .num).
import { Fragment, type CSSProperties, type ReactNode } from "react";

const NUMBER = /([+$]?\d[\d,.]*%?)/;

/** A headline's text with its numbers marked. */
export function nums(text: string): ReactNode[] {
  return text.split(NUMBER).map((bit, i) =>
    i % 2 ? (
      <span className="num" key={i}>
        {bit}
      </span>
    ) : (
      bit
    )
  );
}

/** The opening line, word by word, so it can rise in on arrival (film.css, .w). */
/** `from` continues the stagger when a headline is set in several pieces. */
export function HeadWords({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          <span className="w">
            <span style={{ "--i": from + i } as CSSProperties}>{nums(word)}</span>
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}
