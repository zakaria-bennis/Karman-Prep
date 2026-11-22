// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (211 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-nonlinear-systems-e7482c508e.m4a",
  durations: [
    7.629, 13.567, 8.993, 9.296, 8.451, 2.844, 2.485, 2.808, 3.78, 2.848, 5.103, 13.6, 7.288, 5.371,
    9.209, 8.903, 2.512, 13.165, 7.347, 11.95, 7.142, 4.867, 2.236, 17.321, 25.576, 6.677,
  ],
  narration: "ed32b5fe",
};

export default timing;
