// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (220 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-expanding-and-factoring-bc91db9525.m4a",
  durations: [
    11.405, 11.432, 10.447, 8.973, 6.366, 2.57, 2.695, 4.264, 4.622, 7.424, 9.376, 11.348, 7.589,
    10.13, 4.403, 3.727, 6.772, 7.851, 13.783, 5.875, 15.621, 4.141, 12.521, 30.042, 6.733,
  ],
  narration: "65673013",
};

export default timing;
