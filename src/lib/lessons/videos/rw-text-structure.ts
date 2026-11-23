// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (238 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-text-structure-90768d6285.m4a",
  durations: [
    12.003, 10.677, 8.325, 6.359, 8.947, 2.757, 3.677, 3.281, 2.765, 4.45, 24.877, 4.875, 8.221,
    3.824, 12.964, 6.299, 22.61, 4.788, 7.403, 3.539, 10.559, 5.176, 27.881, 25.165, 6.51,
  ],
  narration: "4813c3a2",
};

export default timing;
