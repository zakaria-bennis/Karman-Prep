// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (226 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-linear-inequalities-d60ba9059d.m4a",
  durations: [
    9.063, 13.972, 7.54, 12.752, 12.19, 5.882, 2.765, 2.252, 4.341, 9.981, 4.658, 8.619, 5.771,
    7.499, 11.029, 6.709, 3.89, 10.325, 4.916, 12.085, 7.528, 4.419, 9.576, 2.136, 12.834, 26.373,
    6.628,
  ],
  narration: "5a5e5565",
};

export default timing;
