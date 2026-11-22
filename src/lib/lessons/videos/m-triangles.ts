// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (226 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-triangles-0dc448f6ed.m4a",
  durations: [
    8.956, 10.159, 7.627, 10.365, 17.599, 2.714, 4.883, 5.037, 4.046, 3.221, 14.924, 5.597, 10.081,
    9.81, 2.004, 15.419, 9.964, 9.781, 6.031, 6.877, 2.195, 25.471, 25.983, 6.97,
  ],
  narration: "50a2ef20",
};

export default timing;
