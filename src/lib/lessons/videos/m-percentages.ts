// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (218 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-percentages-09b69bdfde.m4a",
  durations: [
    10.139, 8.95, 13.941, 14.782, 10.535, 6.298, 2.912, 9.906, 3.938, 4.991, 4.143, 11.537, 9.232,
    10.132, 5.722, 2.832, 10.049, 7.784, 7.418, 8.625, 2.924, 17.153, 26.761, 7.022,
  ],
  narration: "df7ef2f7",
};

export default timing;
