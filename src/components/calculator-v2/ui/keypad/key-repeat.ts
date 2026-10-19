// Hold-to-repeat for the arrow and Backspace keys (K-11).
export const KEY_REPEAT_DELAY_MS = 400;
export const KEY_REPEAT_INTERVAL_MS = 80;
export interface KeyRepeat {
  start(fire: () => void): void; // fires at once, after 400 ms, then every 80 ms
  stop(): void;
}

export function createKeyRepeat(): KeyRepeat {
  let delay: ReturnType<typeof setTimeout> | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (delay !== null) clearTimeout(delay);
    if (interval !== null) clearInterval(interval);
    delay = null;
    interval = null;
  };
  return {
    start(fire) {
      stop();
      fire();
      delay = setTimeout(() => {
        delay = null;
        fire();
        interval = setInterval(fire, KEY_REPEAT_INTERVAL_MS);
      }, KEY_REPEAT_DELAY_MS);
    },
    stop,
  };
}
