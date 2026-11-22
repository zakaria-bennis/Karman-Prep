// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (159 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio: null,
  durations: [
    7.392, 8.415, 8.464, 11.084, 7.298, 2.747, 4.328, 4.492, 2.49, 5.8, 10.455, 5.922, 4.368, 5.697,
    2.162, 8.365, 4.489, 6.01, 7.93, 2.351, 15, 17.558, 6.536,
  ],
};

export default timing;
