// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (215 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-solving-systems-cbef4acdb7.m4a",
  durations: [
    9.653, 9.501, 9.754, 10.65, 9.494, 8.339, 2.65, 4.886, 8.122, 6.523, 4.775, 13.412, 10.25, 5.61,
    3.007, 7.576, 4.945, 1.909, 7.962, 9.791, 6.169, 6.964, 7.417, 2.271, 14.146, 22.382, 6.555,
  ],
  narration: "46dd7c4a",
};

export default timing;
