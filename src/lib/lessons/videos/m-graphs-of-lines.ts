// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (192 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-graphs-of-lines-ae51ff2326.m4a",
  durations: [
    9.27, 10.402, 11.551, 12.214, 12.568, 2.776, 6.92, 4.09, 4.406, 8.083, 7.317, 8.007, 4.586,
    7.679, 2.389, 9.122, 8.659, 5.748, 4.923, 5.197, 4.022, 13.595, 22.084, 6.875,
  ],
  narration: "cf6f567d",
};

export default timing;
