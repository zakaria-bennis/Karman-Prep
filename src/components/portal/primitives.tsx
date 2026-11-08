/*
 * The building blocks inside the painted shell. Server-safe: no hooks, no client state.
 * Rules (founder, 2026-11-07 and 2026-11-08): one main button per screen (Cta), progress is
 * always a Ring, skills are always squares (SkillSquares), numbers are Hanken Grotesk with
 * lining, even-width figures (Num), boxes and cards have 4px corners.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Chevron } from "./icons";

/**
 * The tinted, squared-off box: left of center, full height on desktop, the same on every tab.
 * `children` is the main column; `side` adds a second column from 1100px wide.
 */
export function Panel({
  children,
  side,
  banner,
  label,
}: {
  children: ReactNode;
  side?: ReactNode;
  banner?: ReactNode;
  /** Names the box for screen readers when the page has several regions. */
  label?: string;
}) {
  return (
    <section
      className="kp-panel"
      data-columns={side ? 2 : 1}
      data-paint-keepout=""
      aria-label={label}
    >
      {banner}
      <div className="kp-p-main">{children}</div>
      {side && <div className="kp-p-side">{side}</div>}
    </section>
  );
}

/** A dismissible or informational strip across the top of the box. */
export function Banner({ children }: { children: ReactNode }) {
  return <div className="kp-banner">{children}</div>;
}

/** A card inside the box. `tone="late"` warms the border for overdue work. */
export function Card({
  children,
  tone,
  label,
  id,
}: {
  children: ReactNode;
  tone?: "late";
  label?: string;
  /** An anchor, so links can land on the card. */
  id?: string;
}) {
  return (
    <section className="kp-card" data-tone={tone} aria-label={label} id={id}>
      {children}
    </section>
  );
}

/** A card or section heading with an optional small count or note on the right. */
export function SectionHeader({
  title,
  note,
  as: Tag = "h2",
  id,
}: {
  title: ReactNode;
  note?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className="kp-sec-h">
      <Tag id={id}>{title}</Tag>
      {note !== undefined && note !== null && <small>{note}</small>}
    </div>
  );
}

/**
 * One line in a list: a title, an optional second line (only for a date, a due time or a state
 * the person needs, design rule 51) and an optional right-hand value.
 */
export function Row({
  title,
  sub,
  right,
  rightTone,
  href,
  leading,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  rightTone?: "late";
  href?: string;
  /** A ring or square shown before the title. */
  leading?: ReactNode;
}) {
  const body = (
    <>
      {leading}
      <span style={leading ? { flex: 1 } : undefined}>
        <b>{title}</b>
        {sub && <small>{sub}</small>}
      </span>
      {right !== undefined && <span data-tone={rightTone}>{right}</span>}
    </>
  );
  const style = leading ? { justifyContent: "flex-start", gap: 14 } : undefined;
  return href ? (
    <Link className="kp-row" href={href} style={style}>
      {body}
    </Link>
  ) : (
    <div className="kp-row" style={style}>
      {body}
    </div>
  );
}

/** A text link with a small chevron: the way to every action except the one main button. */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="kp-more" href={href}>
      {children}
    </Link>
  );
}

type CtaProps = { children: ReactNode } & (
  | { href: string; onClick?: never; type?: never; disabled?: never }
  | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
);

/** The one highlighted main button on a screen (design rule 35). It always carries a chevron. */
export function Cta(props: CtaProps) {
  if (props.href !== undefined) {
    return (
      <Link className="kp-cta" href={props.href}>
        <span>{props.children}</span>
        <Chevron />
      </Link>
    );
  }
  const { children, href: _href, type = "button", ...rest } = props;
  return (
    <button className="kp-cta" type={type} {...rest}>
      <span>{children}</span>
      <Chevron />
    </button>
  );
}

/** A number in Hanken Grotesk with lining, even-width figures. Young Serif is never used for numbers. */
export function Num({ children, big = false }: { children: ReactNode; big?: boolean }) {
  return <span className={big ? "kp-big" : "kp-num"}>{children}</span>;
}

export interface LegendItem {
  label: string;
  value?: ReactNode;
  color: string;
}

/** A small key for rings and squares: a colored square, a label, and an optional count. */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="kp-legend">
      {items.map((it) => (
        <li key={it.label}>
          <i style={{ background: it.color }} aria-hidden="true" />
          {it.label}
          {it.value !== undefined && <b>{it.value}</b>}
        </li>
      ))}
    </ul>
  );
}

/** A handwritten note from a tutor (Caveat), signed. */
export function TutorNote({ from, children }: { from: string; children: ReactNode }) {
  return (
    <figure className="kp-note">
      <span className="kp-who" aria-hidden="true">
        {from.slice(0, 1)}
      </span>
      <blockquote>
        <p>{children}</p>
        <figcaption>{from}</figcaption>
      </blockquote>
    </figure>
  );
}
