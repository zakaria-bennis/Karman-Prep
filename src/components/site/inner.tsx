// The sections the inner pages are built from (ported from the mock's pages.js): the opening with its
// drawing or photo, rows of label and text (a grid, joined steps or a timeline), a text card, a list of
// statements, the guarantee and the close. Every word comes from site-copy.ts.
import type { ReactNode } from "react";
import { list, pairs, section, type CopySection } from "@/lib/marketing/site-copy";
import { Action, delay, GuaranteeBlock, Icon } from "./parts";

function Head({ f, children }: { f: CopySection; children?: ReactNode }) {
  return (
    <div className="i-head">
      {f.headline ? <h2 className="rv">{f.headline}</h2> : null}
      {f.text ? (
        <p className="lede rv" style={delay(0.08)}>
          {f.text}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Facts({ f }: { f: CopySection }) {
  const items = pairs(f.facts);
  if (!items.length) return null;
  return (
    <dl
      className={`i-facts rv${items.some(([a]) => a.length > 6) ? "words" : ""}`}
      style={delay(0.24)}
    >
      {items.map(([a, b]) => (
        <div key={a}>
          <dt>{a}</dt>
          <dd>{b}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The opening: words on one side, the page's drawing, photo or form at the outer edge. */
export function InnerHero({
  n,
  href,
  side,
  faq = false,
}: {
  n: number;
  href: string;
  side?: ReactNode;
  faq?: boolean;
}) {
  const f = section(n);
  return (
    <section className={`i-hero${faq ? "i-faqhero" : ""}`} data-light id={`s-${n}`}>
      <div className="in">
        <div className="i-words">
          {f.eyebrow ? <p className="eyebrow rv">{f.eyebrow}</p> : null}
          <h1 className="rv" style={delay(0.04)}>
            {f.headline}
          </h1>
          {f.text ? (
            <p className="lede rv" style={delay(0.08)}>
              {f.text}
            </p>
          ) : null}
          <Action f={f} href={href} className="act rv" style={delay(0.16)} />
        </div>
        {side}
      </div>
      <Facts f={f} />
    </section>
  );
}

/** label = text pairs, as a grid, as steps joined by a line, or as a timeline. */
export function Rows({
  n,
  style = "grid",
  after,
  id,
}: {
  n: number;
  style?: "grid" | "steps" | "time";
  after?: ReactNode;
  id?: string;
}) {
  const f = section(n);
  const items = pairs(f.rows);
  const body =
    style === "steps" ? (
      <ol className="i-steps">
        {items.map(([a, b], k) => (
          <li className="rv" style={delay(k * 0.08)} key={a}>
            <b>{a}</b>
            <span>{b}</span>
          </li>
        ))}
      </ol>
    ) : style === "time" ? (
      <ol className="i-time">
        {items.map(([a, b], k) => (
          <li
            className={`rv${k === items.length - 1 ? "last" : ""}`}
            style={delay(k * 0.06)}
            key={a}
          >
            <b>{a}</b>
            <span>{b}</span>
          </li>
        ))}
      </ol>
    ) : (
      <dl className="i-grid">
        {items.map(([a, b], k) => (
          <div className="rv" style={delay(k * 0.05)} key={a}>
            <dt>{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
    );
  return (
    <section className={`i-sec${style === "steps" ? "" : "rows"}`} data-light id={id ?? `s-${n}`}>
      <div className="in">
        <Head f={f} />
        {body}
        {after}
      </div>
    </section>
  );
}

/** A heading and text, with an optional proof line and a card beside them. */
export function TextCard({ n, children }: { n: number; children?: ReactNode }) {
  const f = section(n);
  return (
    <section className="i-sec" data-light id={`s-${n}`}>
      <div className="in i-split">
        <Head f={f}>{f.proof ? <p className="i-proof rv">{f.proof}</p> : null}</Head>
        {f["card title"] ? (
          <aside className="i-card rv" style={delay(0.12)}>
            <Icon name="plus" />
            <b>{f["card title"]}</b>
            <p>{f["card text"]}</p>
          </aside>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/** A list of plain statements; "no" marks the things we refuse. */
export function Statements({ n, mark = "check" }: { n: number; mark?: "check" | "no" }) {
  const f = section(n);
  return (
    <section className="i-sec" data-light id={`s-${n}`}>
      <div className="in i-split">
        <Head f={f} />
        <ul className={`i-list ${mark}`}>
          {list(f.list).map((x, k) => (
            <li className="rv" style={delay(k * 0.05)} key={x}>
              {mark === "no" ? <Icon name="plus" /> : <i className="mk" />}
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The guarantee block on black, with its own id so "How the guarantee works" can jump to it. */
export function GuaranteeSection({
  id = "guarantee",
  override,
}: {
  id?: string;
  override?: Partial<CopySection>;
}) {
  const g = { ...section(8), ...override } as CopySection;
  return (
    <section className="panel guarantee dark" id={id} aria-labelledby={`${id}-h`}>
      <div className="in">
        <GuaranteeBlock g={g} headId={`${id}-h`} />
      </div>
    </section>
  );
}

/** The close: a heading, text, the objection and one button (or a form beside it). */
export function Close({ n, href, children }: { n: number; href?: string; children?: ReactNode }) {
  const f = section(n);
  return (
    <section className="i-close" id={`s-${n}`}>
      <div className="in">
        {f.headline ? <h2 className="rv">{f.headline}</h2> : null}
        {f.text ? (
          <p className="lede rv" style={delay(0.08)}>
            {f.text}
          </p>
        ) : null}
        {f.objection ? <p className="i-obj rv">{f.objection}</p> : null}
        {href ? <Action f={f} href={href} className="act rv" style={delay(0.16)} /> : null}
        {children}
      </div>
    </section>
  );
}
