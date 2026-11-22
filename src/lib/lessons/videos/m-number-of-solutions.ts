// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (182 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-number-of-solutions-e58724cac4.m4a",
  durations: [
    11.498, 9.063, 6.277, 8.257, 14.206, 2.96, 3.909, 4.547, 5.74, 4.19, 8.4, 6.606, 5.557, 3.616,
    7.733, 2.502, 11.915, 5.289, 4.482, 5.012, 4.613, 2.284, 13.525, 23.109, 6.894,
  ],
  narration: "d4f03fbf",
};

export default timing;
