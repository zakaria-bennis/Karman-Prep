"use client";

import { useEffect, useRef, useState } from "react";
import { Pet, type PetHandle } from "@/components/rewards/companion/Pet";

/**
 * Karman the fox, guiding the intake (founder, 2026-11-13: start with Karman alone). He is the earnable fox
 * face from the quiz engine (rewards/animals.ts), never redrawn. Guiding the intake: he says one short line and gives a small cheer each time the line
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
      <div key={big ? "big-pets" : `${say}-pet`}>
        {mounted ? (
          <Pet ref={fox} animal="fox" size={big ? 132 : 64} />
        ) : (
          <span style={{ display: "block", width: big ? 132 : 64, height: big ? 141 : 68 }} />
        )}
      </div>
      <p className="ob-say" key={`${say}-line`} aria-live="polite">
        {say}
      </p>
    </div>
  );
}
