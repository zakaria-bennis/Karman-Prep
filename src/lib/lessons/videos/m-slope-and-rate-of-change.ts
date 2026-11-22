// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (190 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-slope-and-rate-of-change-0dddccecb3.m4a",
  durations: [
    9.365, 8.315, 8.089, 6.954, 10.795, 2.658, 2.93, 7.837, 2.018, 3.705, 7.427, 9.055, 6.108,
    5.634, 8.694, 2.868, 15.625, 5.989, 8.232, 5.148, 6.975, 4.244, 12.575, 22.376, 6.485,
  ],
  narration: "ec0be0b8",
};

export default timing;
