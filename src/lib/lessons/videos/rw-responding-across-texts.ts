// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (245 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-responding-across-texts-66974cde83.m4a",
  durations: [
    7.308, 10.896, 9.039, 11.216, 7.703, 2.244, 4.122, 4.622, 3.622, 3.819, 28.153, 5.354, 5.766,
    7.006, 9.973, 6.367, 28.801, 4.144, 5.553, 6.029, 9.436, 6.855, 29.984, 20.92, 5.931,
  ],
  narration: "4ee754d6",
};

export default timing;
