// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (205 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-subject-verb-agreement-25a79047e1.m4a",
  durations: [
    9.375, 7.663, 11.154, 13.732, 9.088, 2.673, 4.35, 3.637, 2.767, 3.507, 20.441, 4.245, 6.818,
    5.077, 8.235, 1.968, 19.039, 2.013, 4.318, 4.463, 5.054, 2.088, 26.047, 20.293, 6.791,
  ],
  narration: "78f8232c",
};

export default timing;
