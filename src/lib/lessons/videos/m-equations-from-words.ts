// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (218 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-equations-from-words-925eee911d.m4a",
  durations: [
    9.991, 8.72, 11.571, 10.474, 9.786, 2.533, 2.841, 3.876, 3.673, 6.115, 14.83, 3.662, 5.856,
    5.105, 11.622, 4.134, 12.207, 5.276, 9.864, 7.412, 11.176, 3.064, 19.816, 27.364, 6.561,
  ],
  narration: "1cc08725",
};

export default timing;
