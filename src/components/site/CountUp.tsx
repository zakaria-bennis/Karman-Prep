// A number on a marketing page that counts up to its value when its section arrives (audience.css, .cu),
// like the portals' Num. The real number stays in the page: it is what is read aloud, copied, and shown
// with reduced motion or when the landscape is held still. Anything that isn't a plain whole number (with
// an optional sign, $ or %) is shown as written.
import type { CSSProperties } from "react";
import { countParts } from "@/components/portal/count";

export default function CountUp({
  children,
  className = "num",
}: {
  children: string | number;
  className?: string;
}) {
  const parts = countParts(children);
  if (!parts) return <b className={className}>{children}</b>;
  return (
    <b
      className={`${className} cu`}
      data-pre={parts.pre || undefined}
      data-post={parts.post || undefined}
      style={{ "--to": parts.value } as CSSProperties}
    >
      <span>{children}</span>
    </b>
  );
}
