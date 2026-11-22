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
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-sentence-boundaries-970f5a6e91.m4a",
  durations: [
    11.606, 11.18, 8.637, 12.589, 12.18, 2.523, 3.751, 2.795, 6.065, 4.265, 19.79, 5.744, 6.213,
    7.671, 8.239, 2.616, 19.025, 4.442, 6.666, 8.215, 8.119, 2.317, 24.199, 25.528, 6.702,
  ],
  narration: "fe851ff0",
};

export default timing;
