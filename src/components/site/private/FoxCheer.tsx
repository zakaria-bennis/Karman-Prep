// The fox, celebrating: it jumps in with happy eyes and wiggling ears. Shown when a session or a call is
// booked, with confetti thrown over the card behind it. The fox is the approved mark
// (components/portal/Fox.tsx); the motion is in private.css (.fxc, .cft).
import { Fox } from "@/components/portal/Fox";

const COLORS = ["#2449b8", "#e2a23b", "#2e9e6b", "#d9614a", "#8f6bd9", "#f3c94b", "#3fb3c9"];
const PIECES = 34;

/** Paper confetti: thrown up and out from the middle, then fluttering down. Every piece's path is worked
 *  out from its number, so the server and the browser draw the same thing. */
export function Confetti() {
  return (
    <div className="cft" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const spread = 18 + ((i * 37) % 150);
        const strip = i % 3 === 0;
        return (
          <i
            key={i}
            style={
              {
                "--x": `${side * spread}px`,
                "--up": `${-(70 + ((i * 53) % 130))}px`,
                "--w": `${strip ? 5 : 9}px`,
                "--h": `${strip ? 16 : 9}px`,
                "--r": i % 5 === 0 ? "50%" : "2px",
                "--c": COLORS[i % COLORS.length],
                "--z": `${(i * 47) % 360}deg`,
                "--t": `${1.9 + ((i * 29) % 12) / 10}s`,
                "--f": `${0.5 + ((i * 17) % 7) / 10}s`,
                "--d": `${((i * 13) % 9) * 0.03}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

export default function FoxCheer() {
  return (
    <div className="fxc" aria-hidden="true">
      <Fox size={104} />
    </div>
  );
}
