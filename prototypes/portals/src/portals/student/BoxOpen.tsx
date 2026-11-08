import { useEffect, useRef, useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { useConfetti } from "@/design-system/components/Confetti";
import {
  MysteryBox,
  Medal,
  AccessoryIcon,
  ACCESSORY_NAMES,
  type AccessoryId,
} from "@/design-system/marks";
import { TextLink } from "./Shell";

/*
 * Opening a mystery box: the box rocks, then the prize card arrives with the
 * medal, the accessory's name, "Earned today" and two choices, wear it or
 * keep it for later (never worn by itself). The reveal is the centred card of
 * Achievement Unlocked (21st.dev 13045, trophyso): badge, date pill, name,
 * description, one primary; its modal backdrop, share button and Lucide
 * icons were left out. The confetti is the prize burst, off under reduced
 * motion.
 */
export function BoxOpen({
  prize,
  onWear,
  onKeep,
}: {
  prize: AccessoryId;
  onWear(): void;
  onKeep(): void;
}) {
  const [phase, setPhase] = useState<"rock" | "reveal">("rock");
  const card = useRef<HTMLDivElement>(null);
  const { fire } = useConfetti();
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("reveal"), reduced ? 0 : 950);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase === "reveal" && card.current) fire("prize", card.current);
  }, [phase, fire]);
  if (phase === "rock")
    return (
      <div
        className="grid justify-items-center py-6"
        aria-live="polite"
        aria-label="Opening the box"
      >
        <MysteryBox size={140} className="k-box-open" />
      </div>
    );
  return (
    <div ref={card} className="k-reveal grid justify-items-center gap-3 py-4 text-center">
      <Medal size={44} />
      <AccessoryIcon id={prize} size={96} />
      <p className="text-dense text-muted">Earned today</p>
      <p className="text-title">{ACCESSORY_NAMES[prize]}</p>
      <p className="text-body text-muted">For the fox. Wear it now or keep it in the wardrobe.</p>
      <div className="flex flex-col items-center gap-3 pt-1">
        <GlassButton variant="primary" onClick={onWear}>
          Wear it
        </GlassButton>
        <TextLink onClick={onKeep}>Keep it for later</TextLink>
      </div>
    </div>
  );
}
