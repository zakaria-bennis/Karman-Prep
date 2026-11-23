// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (229 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-inferring-from-findings-7ac41bfe5c.m4a",
  durations: [
    11.379, 11.194, 7.814, 10.135, 5.801, 2.584, 3.224, 3.162, 3.115, 5.437, 19.814, 8.743, 7.023,
    3.376, 13.668, 6.107, 18.776, 8.224, 5.647, 4.079, 9.332, 4.686, 26.607, 23.005, 6.299,
  ],
  narration: "bf69ae5d",
};

export default timing;
