// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (218 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-radical-and-rational-equations-cba9ff09af.m4a",
  durations: [
    11.352, 12.495, 6.29, 7.578, 9.194, 9.662, 2.674, 3.489, 4.916, 2.473, 4.459, 7.354, 7.43,
    9.801, 8.397, 13.644, 2.669, 8.523, 11.317, 10.023, 10.957, 2.667, 13.52, 29.898, 6.794,
  ],
  narration: "9f3408e5",
};

export default timing;
