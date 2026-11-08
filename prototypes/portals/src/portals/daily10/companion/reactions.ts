import { OUT, later, setMood, type Engine, type LookTarget } from "./engine";
import { bob, ears, happy, hide, hop, popOut, settle, signature, wake, wiggle } from "./moves";

/**
 * The companion's reactions (mascot.js R): a new question tucks it away; a right
 * answer pops it out with a happiness that grows with the streak; a miss is a small
 * "oh?", a kind nod and a look at the explanation, never a judgement; the results
 * get the biggest cheer. The look target is an element or a point, never an id.
 */
export function reactions(E: Engine) {
  const M = E.M;
  const look = (what: LookTarget) => {
    M.lookTarget = what;
  };
  return {
    arrive: () => hide(E),
    next: () => hide(E),
    picked: () => wake(E),
    correct(streak: number) {
      wake(E);
      popOut(E);
      const tier = Math.min(Math.max(streak, 1), 5);
      later(M, OUT, () => {
        happy(E, tier);
        ears(M, -12 - tier * 2, -12 - tier * 2, 500 + tier * 120);
        bob(M, 120 + tier * 14);
        if (tier >= 2) {
          M.s.peek.t = 1.06;
          later(M, 300, () => bob(M, 130));
        }
        if (tier >= 3) later(M, 560, () => signature(E));
        if (tier >= 4) {
          later(M, 260, () => wiggle(M, 6, 11, 105));
          later(M, 1500, () => {
            bob(M, 160);
            signature(E);
          });
        }
        if (tier >= 5) {
          // the finale: a burst of hide-and-seek through two more fresh spots
          later(M, 1300, () => hop(E));
          later(M, 1800, () => {
            happy(E, 5);
            bob(M, 150);
            signature(E);
          });
          later(M, 2600, () => hop(E));
          later(M, 3100, () => {
            happy(E, 5);
            bob(M, 160);
            wiggle(M, 4, 12, 100);
            signature(E);
          });
        }
      });
      settle(E, OUT + [0, 1300, 1700, 2200, 2900, 4300][tier]);
    },
    // not judging: a small "oh?" with a puzzled tilt, a gentle nod and a kind smile, then it reads along
    wrong(explanation: LookTarget = null) {
      wake(E);
      popOut(E);
      later(M, OUT, () => {
        setMood(E, "c");
        M.s.peek.t = 0.88;
        ears(M, 18, -8, 0);
        M.s.tilt.t = 12;
      });
      later(M, OUT + 900, () => {
        setMood(E, "k");
        M.s.tilt.t = 0;
        ears(M, -6, -6, 0);
        M.s.peek.t = 1;
        [0, 220, 440, 660].forEach((d, i) => later(M, d, () => (M.s.peek.t = i % 2 ? 1 : 0.9)));
      });
      later(M, OUT + 2100, () => {
        setMood(E, "n");
        ears(M, 0, 0, 0);
        look(explanation);
      });
      later(M, OUT + 3700, () => look(null));
    },
    results(perfect: boolean) {
      wake(E);
      popOut(E);
      later(M, OUT, () => {
        happy(E, perfect ? 5 : 3);
        bob(M, 170);
        ears(M, -14, -14, 600);
      });
      if (perfect)
        later(M, OUT + 700, () => {
          signature(E);
          later(M, 900, () => signature(E));
        });
      settle(E, OUT + (perfect ? 2800 : 1600));
    },
    doze() {
      if (M.mood !== "n" || !M.visible) return;
      M.dozing = true;
      setMood(E, "z");
      M.s.peek.t = 0.78;
      M.s.tilt.t = 9;
      ears(M, 18, 18, 0);
    },
    look,
  };
}
export type Reactions = ReturnType<typeof reactions>;
