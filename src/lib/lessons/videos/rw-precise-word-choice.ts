// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (201 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-precise-word-choice-69144a0622.m4a",
  durations: [
    12.388, 8.459, 9.019, 8.878, 6.548, 2.484, 1.771, 4.945, 2.723, 3.967, 19.674, 9.474, 4.222,
    9.653, 2.088, 20.104, 7.567, 1.977, 8.323, 2.143, 24.919, 22.798, 6.701,
  ],
  narration: "46190c0f",
};

export default timing;
