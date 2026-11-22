// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (192 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-mean-median-and-spread-ab4512a70d.m4a",
  durations: [
    10.856, 9.455, 10.495, 5.915, 12.089, 2.646, 2.589, 4.532, 4.056, 4.655, 12.636, 7.54, 11.18,
    5.707, 8.798, 1.865, 10.513, 6.326, 7.359, 7.058, 2.171, 16.1, 21.584, 6.362,
  ],
  narration: "b18b017f",
};

export default timing;
