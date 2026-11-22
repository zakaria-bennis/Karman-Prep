// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (191 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-unneeded-punctuation-794d35829f.m4a",
  durations: [
    9.395, 7.453, 4.701, 8.615, 7.839, 2.669, 2.815, 7.273, 1.654, 6.798, 16.975, 6.371, 4.972,
    5.251, 8.086, 2.126, 17.849, 5.418, 3.785, 6.053, 2.314, 2.061, 23.611, 20.274, 6.536,
  ],
  narration: "89b25f09",
};

export default timing;
