// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (206 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-transitions-adding-on-8d282d6522.m4a",
  durations: [
    13.996, 11.342, 9.249, 9.546, 9.553, 2.711, 3.08, 3.992, 5.249, 4.416, 16.64, 4.089, 5.704,
    5.056, 7.826, 2.221, 16.144, 3.347, 5.429, 5.224, 8.114, 2.308, 21.408, 23.215, 6.457,
  ],
  narration: "6d5a751f",
};

export default timing;
