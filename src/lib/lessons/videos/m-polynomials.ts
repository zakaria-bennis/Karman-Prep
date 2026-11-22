// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (235 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-polynomials-a498515b8a.m4a",
  durations: [
    12.569, 14.711, 13.789, 5.386, 10.994, 10.883, 2.839, 5.032, 6.843, 4.76, 5.582, 14.699, 9.145,
    6.089, 5.034, 2.06, 11.792, 8.071, 12.704, 11.154, 9.747, 2.515, 21.02, 20.52, 6.984,
  ],
  narration: "b1a3ae19",
};

export default timing;
