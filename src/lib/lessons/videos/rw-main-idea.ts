// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (255 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-main-idea-a8ff3ed317.m4a",
  durations: [
    8.286, 11.676, 8.33, 10.793, 9.964, 7.492, 2.66, 1.837, 6.887, 4.327, 4.717, 22.447, 5.594,
    6.915, 5.352, 15.748, 7.261, 23.794, 4.98, 6.471, 5.748, 14.206, 7.021, 27.247, 18.488, 6.804,
  ],
  narration: "5054ea65",
};

export default timing;
