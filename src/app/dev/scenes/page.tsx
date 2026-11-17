"use client";

// A gallery of the Schedule's painted scenes, to look at each place in each light while it is
// being painted. Not part of the product: it does not exist in production.
//   /dev/scenes?scene=lake            one place in day, sunset and night
//   /dev/scenes?scene=lake&sky=sunrise  one place, one light, large
//   /dev/scenes?photo=1               the real photographs of the lake, brought to life
import { notFound, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PhotoScene from "../shell/SchedulePhoto";
import Scene from "../shell/ScheduleScene";
import { PHOTOS, plain } from "../shell/scenes/photos";
import type { Sky } from "../shell/scheduleData";
import { SCENE_NAMES, type SceneName } from "../shell/scenes";

const SKIES: Sky[] = ["day", "sunset", "night"];

function Gallery() {
  const q = useSearchParams();
  const asked = q.get("scene") as SceneName | null;
  const scene = asked && SCENE_NAMES.includes(asked) ? asked : SCENE_NAMES[0];
  const sky = q.get("sky");
  const one: Sky | null =
    sky === "night" || sky === "sunrise" || sky === "day" || sky === "sunset" ? sky : null;
  return (
    <main style={{ display: "flex", gap: 8, padding: 8, background: "#111", minHeight: "100vh" }}>
      {(one ? [one] : SKIES).map((light) => (
        <div
          key={light}
          style={{
            position: "relative",
            width: one ? 800 : 400,
            height: one ? 800 : 400,
            flex: "none",
          }}
        >
          {q.get("photo") ? (
            <PhotoScene
              photo={q.get("photo") === "real" ? plain(PHOTOS.lake[light]) : PHOTOS.lake[light]}
              night={light === "night"}
              className=""
            />
          ) : (
            <Scene scene={scene} sky={light} className="" />
          )}
          <style>{`main canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:16px}`}</style>
        </div>
      ))}
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
