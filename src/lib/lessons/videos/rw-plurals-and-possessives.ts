// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (201 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-plurals-and-possessives-473da2d5c0.m4a",
  durations: [
    10.118, 7.7, 8.354, 8.399, 9.542, 2.571, 3.019, 3.709, 5.908, 6.314, 18.45, 6.645, 3.531, 5.234,
    8.338, 2.053, 18.087, 5.532, 5.92, 6.846, 3.051, 2.408, 23.912, 18.641, 6.25,
  ],
  narration: "4651a72c",
};

export default timing;
