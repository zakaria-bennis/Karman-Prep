// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (197 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-linking-clauses-425bea9846.m4a",
  durations: [
    11.277, 10.053, 8.438, 6.914, 9.995, 2.666, 3.477, 5.17, 5.082, 4.303, 16.875, 4.942, 6.918,
    3.404, 6.597, 2.001, 15.824, 4.798, 5.183, 3.757, 7.077, 2.179, 20.538, 23.403, 6.442,
  ],
  narration: "d3bde3cc",
};

export default timing;
