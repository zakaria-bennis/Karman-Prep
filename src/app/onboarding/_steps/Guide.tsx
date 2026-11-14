"use client";

import { useEffect, useRef, useState } from "react";
import { Pet, type PetHandle } from "@/components/rewards/companion/Pet";
import type { AnimalId } from "@/lib/rewards/catalog";

/** The earnable companions from the quiz engine (rewards/animals.ts): faces, as the founder drew them.
 *  Karman the fox and Ollie the owl are his names (2026-11-13); the other four are suggestions until he
 *  confirms them. */
export const CREW: [AnimalId, string][] = [
  ["bunny", "Pip"],
  ["cat", "Mochi"],
  ["owl", "Ollie"],
  ["fox", "Karman"],
  ["bear", "Bruno"],
  ["wolf", "Scout"],
];

/**
 * Karman the fox, guiding the intake: he says one short line and gives a small cheer each time the line
 * changes. The visitor has the bird's view: the landscape is flown in the first person, so no bird is drawn. On the intake's "moments" (the hello, the gap, the plan being made) he stands alone with a large
 * line and no card.
 */
/** True once the page is running in the browser. A companion draws itself differently for touch and for a
 *  mouse, which the server cannot know, so each one is drawn only then. */
function useMounted() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on;
}

export function Guide({ say, big = false }: { say: string; big?: boolean }) {
  const fox = useRef<PetHandle>(null);
  const mounted = useMounted();
  useEffect(() => {
    fox.current?.cheer();
  }, [say, mounted]);
  return (
    <div className={big ? "ob-moment" : "ob-guide"}>
      <div key={big ? "big" : say}>
        {mounted ? (
          <>
            <Pet ref={fox} animal="fox" size={big ? 132 : 64} />
            {/* on the big moments Ollie the owl is there too */}
            {big ? <Pet animal="owl" size={104} /> : null}
          </>
        ) : (
          <span style={{ display: "block", width: big ? 132 : 64, height: big ? 141 : 68 }} />
        )}
      </div>
      <p className="ob-say" key={say} aria-live="polite">
        {say}
      </p>
    </div>
  );
}

/** The whole crew, cheering when the plan is shown. */
export function Crew() {
  const pets = useRef<(PetHandle | null)[]>([]);
  const mounted = useMounted();
  useEffect(() => {
    if (!mounted) return;
    const timers = CREW.map((_, i) => setTimeout(() => pets.current[i]?.cheer(), 250 + i * 130));
    return () => timers.forEach(clearTimeout);
  }, [mounted]);
  if (!mounted) return null;
  return (
    <div className="ob-crew" aria-hidden="true">
      {CREW.map(([animal], i) => (
        <Pet
          key={animal}
          ref={(p) => {
            pets.current[i] = p;
          }}
          animal={animal}
          size={animal === "fox" ? 64 : 48}
        />
      ))}
    </div>
  );
}
