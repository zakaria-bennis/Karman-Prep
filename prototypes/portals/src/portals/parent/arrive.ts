import { useEffect, useState } from "react";
import { useReducedMotion } from "@/design-system/motion";

/**
 * True once the screen has drawn, so a bar can fill from zero to its value
 * and a figure can count up: motion where the eye should go. The entrance
 * fill is from Skills Progress Dashboard (21st.dev 19138, shadcnspace).
 * Under reduced motion it starts true, so everything is drawn at once.
 */
export function useArrived(delay = 120): boolean {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setOn(true);
      return;
    }
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [reduced, delay]);
  return on;
}
