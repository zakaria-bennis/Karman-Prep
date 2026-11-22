// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (202 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-key-details-49e8ab0bcb.m4a",
  durations: [
    9.621, 7.478, 6.574, 4.853, 6.703, 2.595, 5.932, 2.809, 2.408, 5.107, 18.845, 4.661, 5.826,
    4.452, 11.877, 3.63, 22.253, 3.961, 4.607, 4.632, 14.548, 4.383, 24.038, 13.86, 6.306,
  ],
  narration: "6b79a42e",
};

export default timing;
