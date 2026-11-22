// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (241 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-systems-in-context-e611277be8.m4a",
  durations: [
    10.48, 12.643, 12.554, 7.95, 9.283, 9.796, 3.182, 4.591, 5.109, 5.588, 7.831, 14.603, 4.631,
    4.733, 7.795, 10.445, 6.296, 2.638, 10.859, 7.61, 6.779, 3.223, 10.104, 2.599, 22.667, 29.389,
    7.445,
  ],
  narration: "3c48701b",
};

export default timing;
