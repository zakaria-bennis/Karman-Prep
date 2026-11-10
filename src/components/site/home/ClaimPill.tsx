// The number in the headline: a solid shape that slams down once the words have arrived, with its lettering
// cut out of it so the painting shows through (painted.css, .claim-pill).
import type { ReactNode } from "react";

export default function ClaimPill({ children }: { children: ReactNode }) {
  return <span className="claim-pill">{children}</span>;
}
