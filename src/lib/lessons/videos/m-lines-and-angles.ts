// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (206 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-lines-and-angles-0103d072b0.m4a",
  durations: [
    8.576, 11.579, 8.573, 12.182, 12.875, 2.701, 3.299, 3.201, 5.637, 3.581, 14.827, 4.348, 6.666,
    2.806, 8.262, 2.636, 14.827, 4.843, 9.528, 7.212, 6.596, 2.692, 17.75, 24.323, 6.339,
  ],
  narration: "d59ae475",
};

export default timing;
