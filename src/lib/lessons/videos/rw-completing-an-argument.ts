// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (238 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-completing-an-argument-0576d23842.m4a",
  durations: [
    11.977, 11.225, 7.322, 8.574, 8.401, 8.405, 2.623, 3.323, 3.756, 2.71, 3.357, 21.441, 6.352,
    6.873, 4.578, 13.478, 5.715, 23.544, 5.121, 5.236, 3.445, 8.595, 3, 27.127, 25.6, 6.626,
  ],
  narration: "cdda3c8b",
};

export default timing;
