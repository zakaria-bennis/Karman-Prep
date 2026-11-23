// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (263 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-notes-writing-for-a-goal-1959b6b63f.m4a",
  durations: [
    14.12, 7.185, 9.657, 11.062, 11.513, 3.026, 5.846, 2.718, 3.761, 3.67, 28.518, 6.149, 5.212,
    5.081, 9.016, 6.531, 32.243, 5.961, 3.837, 8.243, 5.978, 7.38, 35.918, 23.607, 7.256,
  ],
  narration: "ea1804b9",
};

export default timing;
