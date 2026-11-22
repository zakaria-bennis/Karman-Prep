// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (198 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-advanced-vocabulary-3ffcefd0ec.m4a",
  durations: [
    10.726, 11.12, 5.003, 9.395, 8.028, 2.816, 2.397, 4.019, 2.409, 2.919, 19.164, 5.783, 4.457,
    8.947, 4.708, 2.157, 17.513, 6.973, 2.381, 9.763, 3.527, 2.041, 22.014, 23.105, 6.538,
  ],
  narration: "fe3c7edd",
};

export default timing;
