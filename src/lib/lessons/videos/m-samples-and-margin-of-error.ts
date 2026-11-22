// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (221 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-samples-and-margin-of-error-0b3ad680cd.m4a",
  durations: [
    12.324, 10.051, 8.852, 10.131, 7.68, 4.019, 2.444, 4.084, 5.401, 5.087, 6.956, 14.09, 7.8,
    12.513, 10, 5.851, 14.415, 7.28, 9.533, 8.212, 2.633, 22.283, 22.983, 6.221,
  ],
  narration: "25a607f7",
};

export default timing;
