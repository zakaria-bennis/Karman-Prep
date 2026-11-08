// The device's light or dark setting for the portals' theme (founder, 8 November; design rule 33).
// It runs right after themeBootstrapScript, before paint. palettes.ts stays frozen for the calculator's
// theme transfer (TransferControl.test.tsx, TH-2), so this lives here. When no theme was ever saved on
// this device, a light device gets the light palette; a saved choice always wins, and a device with no
// preference stays dark. ThemeProvider follows later device changes.
export const DEVICE_LIGHT_THEME = "ivory";

export function deviceThemeBootstrapScript(): string {
  return `(()=>{try{if(localStorage.getItem("karman-theme:active")||localStorage.getItem("karman-theme:visitor")||localStorage.getItem("karman-theme"))return;if(typeof matchMedia==="function"&&matchMedia("(prefers-color-scheme: light)").matches){const root=document.documentElement;root.dataset.theme=${JSON.stringify(DEVICE_LIGHT_THEME)};root.classList.remove("dark");}}catch{}})();`;
}
