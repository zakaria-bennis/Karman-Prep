"use client";

// A dev-only look at the pictures behind the Schedule tab's next session, alone and large: each is
// a real photograph, painted, then brought to life (src/app/dev/shell/SchedulePhoto.tsx).
//   /dev/scenes               the lake in day, sunset and night
//   /dev/scenes?sky=sunrise   one light, large
//   /dev/scenes?photo=real    the plain photographs, the backup
import { notFound, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PhotoScene from "../shell/SchedulePhoto";
import type { Sky } from "../shell/scheduleData";
import { PHOTOS, plain } from "../shell/scenes/photos";

const SKIES: Sky[] = ["day", "sunset", "night"];

function Gallery() {
  const q = useSearchParams();
  const sky = q.get("sky");
  const one: Sky | null =
    sky === "night" || sky === "sunrise" || sky === "day" || sky === "sunset" ? sky : null;
  const real = q.get("photo") === "real";
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
          <PhotoScene
            photo={real ? plain(PHOTOS.lake[light]) : PHOTOS.lake[light]}
            night={light === "night"}
            className=""
          />
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
