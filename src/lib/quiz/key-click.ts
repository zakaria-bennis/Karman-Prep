// A soft click for each press of the quiz's own number keys (founder, 2026-11-17: iPhones do not
// let a web page vibrate, so a press should be heard instead, subtly, like typing numbers on a
// phone's keyboard). It is made here from a few milliseconds of filtered noise, not taken from
// any phone, and it is silent when the quiz's sounds are switched off.
import { quizSoundsEnabled } from "./reward-sound";

let context: AudioContext | null = null;

export function keyClick() {
  if (typeof window === "undefined" || !quizSoundsEnabled()) return;
  const Audio =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return;
  try {
    context ??= new Audio();
    // a phone keeps sound asleep until something is pressed; a key press is that
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const length = Math.floor(context.sampleRate * 0.012);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const tone = context.createBiquadFilter();
    tone.type = "bandpass";
    tone.frequency.value = 2400;
    tone.Q.value = 1.2;
    const level = context.createGain();
    level.gain.setValueAtTime(0.22, now);
    level.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    source.connect(tone).connect(level).connect(context.destination);
    source.start(now);
  } catch {
    /* No sound is never a reason to stop a key from typing. */
  }
}
