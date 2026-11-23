// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (204 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-probability-dd9a268a05.m4a",
  durations: [
    12.086, 9.472, 7.562, 7.817, 10.214, 2.448, 5.136, 5.404, 4.739, 3.363, 14.718, 7.739, 5.183,
    6.032, 2.747, 23.478, 8.765, 4.908, 5.655, 3.361, 23.402, 23.455, 6.513,
  ],
  narration: "d6f90636",
};

export default timing;
