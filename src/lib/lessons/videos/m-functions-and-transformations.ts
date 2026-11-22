// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (196 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-functions-and-transformations-f104d31712.m4a",
  durations: [
    10.94, 12.514, 7.585, 8.011, 12.745, 2.302, 3.501, 5.032, 2.59, 7.489, 10.415, 8.257, 6.021,
    6.97, 2.155, 11.615, 9.592, 7.788, 14.784, 2.108, 16.125, 21.315, 5.999,
  ],
  narration: "b679c230",
};

export default timing;
