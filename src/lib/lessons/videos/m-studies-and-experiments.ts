// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (221 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-studies-and-experiments-93465943a9.m4a",
  durations: [
    11.743, 9.884, 8.467, 6.973, 9.01, 5.64, 2.697, 8.24, 5.709, 5.622, 5.553, 18.489, 6.75, 6.862,
    7.964, 6.158, 18.366, 6.788, 9.008, 7.803, 6.342, 20.767, 18.958, 6.857,
  ],
  narration: "87019f9d",
};

export default timing;
