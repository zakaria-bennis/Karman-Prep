// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (183 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-volume-and-surface-area-817d0a0f1a.m4a",
  durations: [
    13.256, 13.071, 8.289, 6.37, 9.242, 6.167, 2.876, 2.827, 3.771, 3.865, 4.497, 10.576, 7.376,
    4.856, 6.002, 2.351, 12.046, 7.737, 7.948, 6.591, 2.646, 12, 21.5, 7.356,
  ],
  narration: "850c97f3",
};

export default timing;
