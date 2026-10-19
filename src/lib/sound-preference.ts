// Sound is off for every new page session. Only the visible control enables it.
// Do not infer permission from a stored preference or another browser tab.
let enabled = false;
const listeners = new Set<() => void>();

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  for (const listener of listeners) listener();
}

export function subscribeSoundPreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
