// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (200 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-verb-tense-cf21fd4b5a.m4a",
  durations: [
    9.759, 8.344, 6.422, 9.737, 10.858, 2.656, 3.958, 3.306, 5.215, 3.374, 20.175, 3.735, 7.822,
    4.035, 6.591, 2.273, 17.343, 6.735, 6.247, 4.226, 4.673, 2.129, 24.484, 19.114, 6.423,
  ],
  narration: "4fe8245f",
};

export default timing;
