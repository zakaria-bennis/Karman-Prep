// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (187 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-pronoun-agreement-4f7f4e407a.m4a",
  durations: [
    9.209, 10.095, 7.763, 8.878, 7.849, 2.663, 2.179, 4.243, 3.797, 4.192, 17.501, 4.046, 4.987,
    5.622, 6.838, 1.765, 16.651, 4.206, 6.448, 3.838, 6.339, 1.831, 23.363, 16.276, 6.421,
  ],
  narration: "b9457204",
};

export default timing;
