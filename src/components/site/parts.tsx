// Small pieces every marketing page shares: the marigold button, the drawn iPhone, icons, the hero line
// that rises word by word, and the guarantee block (the home page, the guarantee page and pricing show it).
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { list, pairs, type CopySection } from "@/lib/marketing/site-copy";
import { ARROW_SVG, iconSvg, type IconName } from "./live/icons";
import { ROUTES } from "./routes";

/** Our own constant drawing markup (screens, drawings, icons). Never pass visitor input here. */
export function Drawn({
  html,
  className,
  as: Tag = "span",
  ...rest
}: {
  html: string;
  className?: string;
  as?: "span" | "div" | "figure";
  "aria-hidden"?: boolean;
}) {
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <Drawn html={iconSvg(name, className)} className="k-icon-wrap" aria-hidden />;
}

export function Arrow() {
  return <Drawn html={ARROW_SVG} className="k-arrow-wrap" aria-hidden />;
}

/** --d: the reveal's delay in seconds */
export const delay = (d: number) => ({ "--d": `${d}s` }) as CSSProperties;

/** The one highlighted button: marigold, black words, the arrow in a black circle. */
export function Btn({ label, href }: { label: string; href: string }) {
  return (
    <a className="btn" href={href}>
      <span className="lb">{label}</span>
      <span className="go">
        <Arrow />
      </span>
    </a>
  );
}

/** A plain text link with the small arrow. */
export function TextLink({ label, href }: { label: string; href: string }) {
  return (
    <a className="lk" href={href}>
      {label}
      <Arrow />
    </a>
  );
}

/** A button with its small note beside it. */
export function Action({
  f,
  href,
  className = "act",
  style,
}: {
  f: CopySection;
  href: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!f.button) return null;
  return (
    <div className={className} style={style}>
      <Btn label={f.button} href={href} />
      {f["button note"] ? <small>{f["button note"]}</small> : null}
    </div>
  );
}

/** The iPhone 17 Pro Max in Cosmic Orange, drawn in CSS (phone.css). */
export function Phone({ screen, left = false }: { screen: string; left?: boolean }) {
  return (
    <div className={`iphone${left ? "left" : ""}`}>
      <span className="rim" aria-hidden="true" />
      <span className="side" aria-hidden="true" />
      <div className="glass">
        <Drawn html={screen} className="scr-host" />
        <span className="island" aria-hidden="true" />
      </div>
    </div>
  );
}

/** The hero line, word by word, so it can rise in on arrival. */
export function Kinetic({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          <span className="w">
            <span style={{ "--i": i } as CSSProperties}>{word}</span>
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}

/** The guarantee: the promise, what the family gets for each result, both sides' rules and who it
 *  covers, all on the page, nothing in small print. */
export function GuaranteeBlock({ g, headId }: { g: CopySection; headId: string }) {
  const outcomes = pairs(g.outcomes);
  const covers = list(g.covers);
  const side = (title: string | undefined, items: string[], cls: string) =>
    items.length ? (
      <div className={`side-list ${cls} rv`}>
        <h3>{title}</h3>
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <>
      <div className="g-top">
        <div className="g-words">
          {g.eyebrow ? <p className="eyebrow rv">{g.eyebrow}</p> : null}
          {g.headline ? (
            <h2 className="rv" id={headId}>
              {g.headline}
            </h2>
          ) : null}
          {g.text ? <p className="lede rv">{g.text}</p> : null}
          {g.promise ? (
            <p className="g-promise rv" id={g.headline ? undefined : headId}>
              {g.promise}
            </p>
          ) : null}
          {g["promise note"] ? <p className="g-note rv">{g["promise note"]}</p> : null}
        </div>
        {outcomes.length ? (
          <dl className="outcomes rv">
            {outcomes.map(([r, w]) => (
              <div key={r}>
                <dt>{r}</dt>
                <dd>{w}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <div className="sides">
        {side(g["we do title"], list(g["we do"]), "")}
        {side(g["you do title"], list(g["you do"]), "you")}
      </div>
      <div className="g-foot rv">
        {covers.length ? (
          <p className="covers">
            {covers.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </p>
        ) : null}
        {g.claim ? <p className="claim">{g.claim}</p> : null}
        {g.link ? <TextLink label={g.link} href={ROUTES.guarantee} /> : null}
      </div>
    </>
  );
}

export function Eyebrow({ children }: { children?: ReactNode }) {
  return children ? <p className="eyebrow rv">{children}</p> : null;
}
