import { cn } from "@/design-system/cn";

/*
 * Initials: a person as a stable initial on a pale tint of their own hue
 * (identity, never data; people listed together sit 60 degrees apart). The
 * stacked form is ported from Avatar Stack (21st.dev 28355, shadcnspace): the
 * overlap, the ring in the surface colour and the +N overflow count; its Radix
 * avatar and photo slots were not used, since people in the app are initials.
 */
export function Initials({
  initial,
  hue,
  size = 32,
  className,
  title,
}: {
  initial: string;
  hue: number;
  size?: 24 | 32 | 40;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-text",
        size === 24 ? "text-small" : "text-dense",
        className
      )}
      style={{ width: size, height: size, background: `hsl(${hue} 55% 50% / 0.22)` }}
      aria-hidden={title ? undefined : true}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {initial}
    </span>
  );
}

export function InitialsStack({
  people,
  max = 5,
  size = 24,
  className,
}: {
  people: { initial: string; hue: number; name: string }[];
  max?: number;
  size?: 24 | 32;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <span
      className={cn(
        "inline-flex items-center [&>*]:-ml-1.5 [&>*]:ring-2 [&>*]:ring-panel first:[&>*]:ml-0",
        className
      )}
      aria-label={people.map((p) => p.name).join(", ")}
      role="img"
    >
      {shown.map((p) => (
        <Initials key={p.name} initial={p.initial} hue={p.hue} size={size} />
      ))}
      {more > 0 ? (
        <span
          className="grid place-items-center rounded-full bg-raised text-small font-semibold text-text"
          style={{ width: size, height: size }}
        >
          +{more}
        </span>
      ) : null}
    </span>
  );
}
