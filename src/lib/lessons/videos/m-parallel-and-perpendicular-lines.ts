// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (187 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-parallel-and-perpendicular-lines-a0ccdc578c.m4a",
  durations: [
    10.59, 7.634, 6.578, 11.469, 6.251, 2.647, 3.764, 4.677, 6.435, 3.35, 11.548, 9.047, 5.5, 7.209,
    7.203, 3.04, 8.087, 4.875, 4.925, 6.425, 8.366, 3.98, 15.224, 21.44, 6.251,
  ],
  narration: "5e43533d",
};

export default timing;
