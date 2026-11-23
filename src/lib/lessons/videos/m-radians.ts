// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (171 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-radians-c53aefa295.m4a",
  durations: [
    8.964, 7.68, 11.806, 10.453, 11.495, 3.175, 4.81, 5.324, 4.934, 6.915, 8.444, 4.13, 3.022,
    9.794, 13.992, 5.407, 4.07, 2.1, 11.896, 25.137, 7.24,
  ],
  narration: "0a195975",
};

export default timing;
