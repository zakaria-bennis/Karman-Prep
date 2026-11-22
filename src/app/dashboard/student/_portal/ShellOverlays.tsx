"use client";

// What lies over the portal now and then: the late-night offer of music (MusicOffer.tsx), the
// Upgrade sheet a locked thing opens (Upgrade.tsx) and a new student's first welcome (Welcome.tsx).
// The music waits while the welcome is up.
import MusicOffer from "./MusicOffer";
import Upgrade from "./Upgrade";
import Welcome from "./Welcome";

export function ShellOverlays({
  welcome,
  paid,
  offer,
  onWelcomed,
}: {
  welcome: boolean;
  /** The student has just paid (?welcome=1): the welcome celebrates. */
  paid: boolean;
  /** Counts each time the design page asks for the music offer again. */
  offer: number;
  onWelcomed: () => void;
}) {
  return (
    <>
      {!welcome && <MusicOffer key={offer} force={offer > 0} />}
      <Upgrade />
      {welcome && <Welcome paid={paid} onDone={onWelcomed} />}
    </>
  );
}
