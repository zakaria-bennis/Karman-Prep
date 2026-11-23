// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (216 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-lists-and-series-0829adde9a.m4a",
  durations: [
    10.829, 9.076, 5.662, 13.249, 8.118, 2.574, 2.231, 5.298, 4.244, 4.544, 21.164, 6.292, 6.973,
    6.294, 9.703, 2.362, 18.047, 3.594, 7.5, 8.865, 2.676, 2.269, 24.945, 23.011, 6.678,
  ],
  narration: "c374f8e9",
};

export default timing;
