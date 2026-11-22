// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (203 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-colons-and-dashes-5df1275707.m4a",
  durations: [
    9.759, 7.352, 8.026, 9.051, 11.689, 2.663, 2.393, 3.703, 4.71, 4.231, 18.245, 8.113, 3.621,
    3.122, 11.833, 2.272, 17.775, 4.875, 5.803, 6.234, 5.266, 2.121, 23.468, 19.79, 6.49,
  ],
  narration: "d6253a6b",
};

export default timing;
