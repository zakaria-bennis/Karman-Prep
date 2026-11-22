// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (209 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-meaning-in-context-b7f2bfb639.m4a",
  durations: [
    12.298, 13.325, 7.461, 6.399, 8.135, 2.693, 4.18, 3.395, 5.465, 19.642, 6.828, 4.868, 11.195,
    2.423, 18.472, 8.437, 2.856, 13.112, 2.668, 24.652, 23.834, 6.72,
  ],
  narration: "787a583e",
};

export default timing;
