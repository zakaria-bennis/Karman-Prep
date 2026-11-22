// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (207 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-trigonometric-ratios-3e86419ff5.m4a",
  durations: [
    14.078, 11.065, 10.633, 14.531, 12.658, 2.857, 2.807, 4.077, 4.697, 5.216, 12.724, 6.993,
    10.974, 5.999, 2.911, 10.973, 9.964, 5.033, 6.299, 2.904, 19.617, 22.566, 7.014,
  ],
  narration: "628a2f96",
};

export default timing;
