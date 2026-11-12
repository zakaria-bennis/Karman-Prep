// The legal pages (terms, refunds, privacy, cookies) in the home page's world (founder, 2026-11-12), on the
// SAT Program page's frame like About and the FAQ: the title and its first line straight on the mist, beside
// a contents card whose numbered entries jump to each part; then the text itself on one rounded cream card
// (near-black at night), in one readable column. The legal words stay exactly as each page writes them; this
// is only the frame. Styles: legal.css.
import type { CSSProperties, ReactNode } from "react";

export type LegalPart = { id: string; title: string };

export default function LegalFrame({
  title,
  intro,
  contents,
  children,
}: {
  title: string;
  /** The page's first line(s) under the title. */
  intro: ReactNode;
  /** Each part of the text, in order, for the contents card. */
  contents: LegalPart[];
  /** The text: the page's own sections. */
  children: ReactNode;
}) {
  return (
    <>
      <section className="pg-hero lg-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in">
          <div className="pg-say">
            <h1>{title}</h1>
            <div className="lg-intro">{intro}</div>
          </div>
          <nav className="co-card lg-index" aria-label="Contents">
            <p>Contents</p>
            <ol>
              {contents.map((c, k) => (
                <li key={c.id} style={{ "--k": k } as CSSProperties}>
                  <a href={`#${c.id}`}>
                    <span>{c.title.replace(/^\d+\.\s*/, "")}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>
      <section className="sect pg-sect co-tall lg-sect" aria-label={title}>
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in">
          <article className="co-card legal">{children}</article>
        </div>
      </section>
    </>
  );
}
