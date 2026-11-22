// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (195 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-exponential-functions-0670e8a1dd.m4a",
  durations: [
    9.663, 10.106, 7.091, 7.772, 13.774, 6.61, 2.634, 3.255, 5.381, 4.099, 5.535, 9.74, 5.19, 7.492,
    6.278, 4.004, 13.557, 7.317, 6.379, 7.854, 2.455, 15.208, 27.041, 6.479,
  ],
  narration: "0a436f36",
};

export default timing;
