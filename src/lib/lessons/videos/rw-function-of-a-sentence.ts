// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (226 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-function-of-a-sentence-0e6003ab32.m4a",
  durations: [
    7.864, 8.284, 8.061, 9.707, 11.355, 2.706, 1.71, 4.267, 7.411, 3.144, 21.336, 4.811, 5.524,
    4.512, 10.48, 6.026, 20.912, 5.526, 4.967, 5.051, 9.391, 6.398, 30.559, 19.661, 6.55,
  ],
  narration: "cd4ee638",
};

export default timing;
