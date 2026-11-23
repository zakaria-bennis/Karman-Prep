// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (224 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-graphs-of-quadratics-995c1b0008.m4a",
  durations: [
    11.909, 10.384, 12.688, 11.163, 8.702, 2.673, 5.467, 4.379, 6.917, 4.702, 4.825, 12.723, 6.815,
    9.209, 13.132, 5.956, 2.07, 10.537, 8.536, 7.002, 10.429, 2.866, 15.439, 28.427, 6.884,
  ],
  narration: "052c8bb6",
};

export default timing;
