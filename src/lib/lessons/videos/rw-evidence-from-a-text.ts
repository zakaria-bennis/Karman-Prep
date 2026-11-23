// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (231 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-evidence-from-a-text-53a72f4519.m4a",
  durations: [
    8.319, 10.624, 7.372, 8.332, 7.648, 2.55, 4.5, 3.556, 3.401, 5.292, 19.15, 5.258, 5.819, 9.336,
    12.105, 8.805, 18.528, 5.44, 5.703, 7.815, 12.133, 9.216, 23.691, 19.924, 6.661,
  ],
  narration: "79c7a8ff",
};

export default timing;
