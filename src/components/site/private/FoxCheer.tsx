// The fox, celebrating: it jumps in with happy eyes and wiggling ears while paper bits fly out behind it.
// Shown when a session or a call is booked. The fox is the approved mark (components/portal/Fox.tsx); the
// motion is in private.css (.fxc).
import { Fox } from "@/components/portal/Fox";

const BITS = 12;

export default function FoxCheer() {
  return (
    <div className="fxc" aria-hidden="true">
      {Array.from({ length: BITS }, (_, i) => (
        <i key={i} style={{ "--n": i } as React.CSSProperties} />
      ))}
      <Fox size={104} />
    </div>
  );
}
