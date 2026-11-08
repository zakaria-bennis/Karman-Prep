// Records sounds instead of playing them so specs can assert on them.
declare global {
  var __sounds: string[] | undefined;
}
export function playSound(name: string) {
  (globalThis.__sounds ??= []).push(name);
}
export function preloadSounds() {}
