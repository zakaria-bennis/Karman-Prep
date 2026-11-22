// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (215 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-exponents-and-radicals-8de68a91f2.m4a",
  durations: [
    9.223, 13.072, 9.097, 13.383, 11.425, 2.933, 6.289, 5.906, 5.929, 3.133, 9.833, 13.285, 12.727,
    3.75, 7.649, 3.21, 8.606, 12.243, 4.62, 7.7, 3.287, 2.782, 14.671, 23.113, 7.234,
  ],
  narration: "d392a281",
};

export default timing;
