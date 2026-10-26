// Small pieces every marketing page shares: the marigold button, the drawn iPhone, icons, the hero line
// that rises word by word.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { CopySection } from "@/lib/marketing/site-copy";
import { MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { ARROW_SVG, iconSvg, type IconName } from "./live/icons";

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

/** The iPhone 17 Pro in Cosmic Orange, drawn in CSS (phone.css). */
export function Phone({ screen }: { screen: string }) {
  return (
    <div className="iphone">
      <span className="btns" aria-hidden="true" />
      <div className="glass">
        <Drawn html={screen} className="scr-host" />
        <span className="island" aria-hidden="true" />
        <span className="home" aria-hidden="true" />
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

/** The class's paid seats as a row of rings, the held ones filled, with the words beside them. The count
 *  comes from offer.ts (paidSeatsTaken), so it only ever shows real seats. */
export function Seats({ label, className = "" }: { label?: string; className?: string }) {
  if (!label) return null;
  return (
    <p className={`seats ${className}`}>
      <span className="seat-row" aria-hidden="true">
        {Array.from({ length: MP.paidSeats }, (_, k) => (
          <i
            key={k}
            className={k < MP.paidSeatsTaken ? "held" : ""}
            style={{ "--k": k } as CSSProperties}
          />
        ))}
      </span>
      {label}
    </p>
  );
}

export function Eyebrow({ children }: { children?: ReactNode }) {
  return children ? <p className="eyebrow rv">{children}</p> : null;
}
