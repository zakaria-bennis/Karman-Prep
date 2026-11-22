// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (184 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-ratios-and-proportions-53ad3a3745.m4a",
  durations: [
    9.217, 9.736, 8.402, 8.356, 11.127, 2.644, 4.542, 5.901, 2.376, 5.266, 10.227, 6.777, 9.383,
    5.113, 3.65, 2.853, 9.465, 5.997, 6.457, 4.796, 2.606, 19.417, 23.131, 6.752,
  ],
  narration: "3206903f",
};

export default timing;
