// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (222 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-verb-forms-1117e953c1.m4a",
  durations: [
    11.358, 8.265, 7.702, 10.977, 10.654, 6.44, 2.756, 2.405, 5.48, 5.325, 5.488, 20.941, 2.813,
    7.431, 5.146, 7.433, 2.118, 19.541, 3.724, 6.921, 5.15, 11.314, 2.34, 22.665, 20.835, 6.774,
  ],
  narration: "4a968cea",
};

export default timing;
