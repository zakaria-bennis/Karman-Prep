// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (224 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-main-purpose-229d1d8300.m4a",
  durations: [
    7.958, 5.91, 7.984, 11.212, 12.093, 2.693, 3.551, 3.417, 4.616, 3.887, 22.891, 4.984, 5.794,
    5.071, 8.18, 8.096, 23.366, 4.958, 5.151, 3.887, 10.04, 6.284, 27.198, 18.279, 6.755,
  ],
  narration: "549f811b",
};

export default timing;
