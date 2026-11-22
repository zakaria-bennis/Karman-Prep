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
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-reading-data-displays-3ea82dbd1c.m4a",
  durations: [
    13.891, 13.405, 11.87, 11.122, 8.77, 6.069, 2.553, 5.115, 3.775, 4.524, 5.594, 9.295, 8.808,
    9.682, 5.979, 2.851, 8.639, 8.068, 6.535, 9.589, 2.026, 23.439, 20.74, 6.694,
  ],
  narration: "47e5e3f5",
};

export default timing;
