// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (206 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-transitions-contrast-4792b4b6a7.m4a",
  durations: [
    11.049, 7.226, 9.042, 12.242, 12.356, 2.551, 1.77, 3.927, 3.745, 5.014, 17.817, 5.441, 6.371,
    5.15, 7.786, 2.591, 17.244, 4.053, 5.139, 7.636, 7.585, 2.577, 22.342, 18.866, 6.757,
  ],
  narration: "10f597ae",
};

export default timing;
