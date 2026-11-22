// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (240 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-reading-graphs-34e3849161.m4a",
  durations: [
    8.256, 8.249, 5.541, 9.749, 6.862, 2.804, 1.755, 3.328, 5.564, 4.336, 19.188, 5.902, 6.223,
    8.291, 15.844, 8.859, 20.674, 5.347, 5.867, 7.641, 16.067, 7.892, 27.231, 22.106, 6.539,
  ],
  narration: "da018625",
};

export default timing;
