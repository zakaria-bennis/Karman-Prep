// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (205 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-scatterplots-d038d4c49b.m4a",
  durations: [
    10.92, 10.015, 6.09, 6.408, 8.334, 8.781, 2.492, 3.523, 3.89, 3.929, 6.545, 16.333, 6.221,
    5.329, 6.912, 2.694, 20.785, 7.531, 7.149, 9.034, 2.595, 20.87, 22.133, 6.322,
  ],
  narration: "7e38e717",
};

export default timing;
