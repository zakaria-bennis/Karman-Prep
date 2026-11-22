// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (200 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-units-and-conversions-62b50739b8.m4a",
  durations: [
    7.745, 10.356, 9.124, 8.077, 10.835, 2.557, 2.599, 4.887, 5.959, 3.44, 10.652, 4.23, 14.422,
    12.698, 2.724, 15.231, 11.003, 6.171, 6.57, 4.039, 15.275, 24.896, 6.389,
  ],
  narration: "4cee78ae",
};

export default timing;
