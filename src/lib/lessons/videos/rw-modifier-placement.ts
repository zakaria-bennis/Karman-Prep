// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (227 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-modifier-placement-a1fa449a78.m4a",
  durations: [
    13.272, 12.762, 8.679, 11.579, 8.824, 2.878, 4.15, 3.624, 5.521, 3.449, 19.291, 4.748, 4.887,
    9.337, 5.781, 4.637, 19.4, 6.675, 4.616, 8.179, 6.104, 4.605, 23.237, 23.321, 7.01,
  ],
  narration: "959a54ab",
};

export default timing;
