// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (219 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-essential-and-extra-details-1d2f218d55.m4a",
  durations: [
    10.816, 9.761, 7.313, 8.818, 12.002, 2.297, 3.087, 2.678, 4.574, 4.766, 19.968, 6.278, 10.392,
    4.159, 8.722, 2.337, 18.524, 4.639, 10.057, 7.868, 8.766, 3.849, 23.619, 17.546, 6.209,
  ],
  narration: "2f19268c",
};

export default timing;
