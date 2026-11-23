// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (216 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-evidence-from-research-1e46f08ab1.m4a",
  durations: [
    9.123, 8.339, 8.4, 11.746, 7.498, 2.247, 3.694, 2.719, 5.757, 3.843, 20.039, 4.903, 2.119,
    4.184, 13.138, 6.779, 20.415, 4.746, 2.134, 4.624, 13.05, 5.45, 25.836, 19.047, 5.884,
  ],
  narration: "eeabe472",
};

export default timing;
