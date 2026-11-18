// The things a character can wear: 100 of them, every one a thing of its own (founder, 2026-11-16:
// not the same thing again in another color). Forty for the head, twenty for the eyes, twenty for
// the neck and twenty for the side, drawn in code (accessoryHead.tsx, accessoryRest.tsx) against a
// few points measured on each face (accessoryKit.tsx), so each sits properly on all sixteen
// characters. A character wears one thing in each place.
// Every one on every face can be seen on one sheet at /dev/shell/sheet.
import { HEAD } from "./accessoryHead";
import { FITS, type Kind, type Slot } from "./accessoryKit";
import { EYES, NECK, SIDE } from "./accessoryRest";
import { Face, type FaceKind } from "./characters";

export type { Slot };
export const SLOTS: Record<Slot, string> = {
  head: "Head",
  eyes: "Eyes",
  neck: "Neck",
  side: "Side",
};

const KINDS: Kind[] = [...HEAD, ...EYES, ...NECK, ...SIDE];
export type Accessory = { id: string; name: string; slot: Slot };
export const ACCESSORIES: Accessory[] = KINDS.map((kind, i) => ({
  id: String(i),
  name: kind.name,
  slot: kind.slot,
}));
const byId = new Map(ACCESSORIES.map((a, i) => [a.id, KINDS[i]]));

/** What is worn: one thing, or none, in each place. */
export type Outfit = Partial<Record<Slot, string>>;
/** Drawn back to front: a scarf under a hat's brim, glasses over everything. */
const ORDER: Slot[] = ["neck", "side", "head", "eyes"];

/** A character with what it is wearing. */
export function Dressed({ face, outfit, size }: { face: FaceKind; outfit: Outfit; size: number }) {
  const worn = ORDER.map((slot) => outfit[slot]).filter((id): id is string => id !== undefined);
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        flex: "none",
        width: size,
        height: (size * 128) / 120,
      }}
    >
      <Face kind={face} size={size} />
      {worn.length > 0 && (
        <svg
          viewBox="-60 -112 120 128"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {worn.map((id) => (
            <g key={id}>{byId.get(id)?.draw(FITS[face])}</g>
          ))}
        </svg>
      )}
    </span>
  );
}
