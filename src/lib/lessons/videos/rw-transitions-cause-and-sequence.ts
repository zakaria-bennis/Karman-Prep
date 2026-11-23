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
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-transitions-cause-and-sequence-171a7a7ea2.m4a",
  durations: [
    13.549, 11.265, 9.569, 10.229, 10.168, 2.868, 3.08, 4.01, 3.579, 4.142, 15.695, 3.184, 3.859,
    6.951, 6.814, 2.26, 17.724, 3.745, 3.32, 8.904, 6.712, 1.964, 21.664, 21.311, 6.652,
  ],
  narration: "7ea608af",
};

export default timing;
