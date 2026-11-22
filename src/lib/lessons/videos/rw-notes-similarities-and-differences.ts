// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (250 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-notes-similarities-and-differences-de124cddf8.m4a",
  durations: [
    9.913, 11.83, 5.991, 6.496, 7.512, 2.232, 5.228, 2.665, 5.054, 3.59, 32.496, 4.188, 6.063,
    6.439, 6.288, 8.369, 31.146, 5.226, 5.112, 7.112, 5.085, 7.68, 36.62, 21.64, 6.251,
  ],
  narration: "54f05efe",
};

export default timing;
