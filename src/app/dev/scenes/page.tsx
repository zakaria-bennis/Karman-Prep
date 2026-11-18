"use client";

// A dev-only look at the pictures behind the Schedule tab's next session, alone and large: each is
// a real photograph, painted, then brought to life (src/app/dev/shell/SchedulePhoto.tsx).
//   /dev/scenes                     the first place in every light it has, and the list of places
//   /dev/scenes?place=beach         another place
//   /dev/scenes?place=beach&sky=night  one picture, large
//   /dev/scenes?photo=real          the plain photographs, the backup
import { notFound, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PhotoScene from "../shell/SchedulePhoto";
import type { Sky } from "../shell/scheduleData";
import { PLACES, PLACE_NAMES, plain, type Picture, type Place } from "../shell/scenes/photos";

const SKIES: Sky[] = ["sunrise", "day", "sunset", "night"];

function Gallery() {
  const q = useSearchParams();
  const asked = q.get("place") as Place | null;
  // one place at a time: a browser keeps only so many moving pictures alive at once
  const places = [asked && PLACE_NAMES.includes(asked) ? asked : PLACE_NAMES[0]];
  const sky = q.get("sky") as Sky | null;
  const skies = sky && SKIES.includes(sky) ? [sky] : SKIES;
  const real = q.get("photo") === "real";
  const large = places.length === 1 && skies.length === 1;
  const size = large ? 800 : 340;
  return (
    <main style={{ display: "grid", gap: 8, padding: 8, background: "#111", minHeight: "100vh" }}>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "600 14px sans-serif" }}>
        {PLACE_NAMES.map((name) => (
          <a
            key={name}
            href={`?place=${name}${real ? "&photo=real" : ""}`}
            style={{ color: name === places[0] ? "#fff" : "#9aa" }}
          >
            {name}
          </a>
        ))}
      </nav>
      {places.map((place) => (
        <div key={place} style={{ display: "flex", gap: 8 }}>
          {skies.map((light) => {
            const picture: Picture | undefined = (PLACES[place] as Partial<Record<Sky, Picture>>)[
              light
            ];
            return (
              <div key={light} style={{ position: "relative", width: size, height: size * 0.85 }}>
                {picture && (
                  <PhotoScene
                    photo={real ? plain(picture) : picture}
                    night={light === "night"}
                    className=""
                  />
                )}
                <b
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 8,
                    color: "#fff",
                    font: "600 13px sans-serif",
                    textShadow: "0 1px 3px #000",
                  }}
                >
                  {place} {light}
                </b>
              </div>
            );
          })}
        </div>
      ))}
      <style>{`main canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:14px}`}</style>
    </main>
  );
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Gallery />
    </Suspense>
  );
}
