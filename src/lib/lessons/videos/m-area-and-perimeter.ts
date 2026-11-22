// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (196 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-area-and-perimeter-980100822b.m4a",
  durations: [
    12.177, 9.716, 7.353, 9.292, 7.547, 2.495, 4.376, 4.598, 3.938, 3.481, 14.053, 8.872, 3.97,
    6.815, 3.144, 2.631, 15.34, 6.498, 7.68, 7.471, 2.136, 20.037, 26.284, 6.126,
  ],
  narration: "817c57f9",
};

export default timing;
