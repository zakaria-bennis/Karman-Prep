// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (183 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-solving-linear-equations-085eaec1f4.m4a",
  durations: [
    14.109, 7.905, 6.361, 10.675, 7.389, 2.631, 6.057, 4.352, 4.063, 3.142, 6.975, 11.279, 4.978,
    6.348, 3.848, 2.701, 6.444, 10.018, 5.114, 5.602, 5.4, 2.707, 13.519, 24.503, 6.991,
  ],
  narration: "3dd640a8",
};

export default timing;
