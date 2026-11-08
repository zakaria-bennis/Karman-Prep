// The app's account themes (copied from src/lib/themes/palettes.ts) mapped onto the quiz roles.
// The theme's own canvas, surface, raised, text, muted, border and gold come straight across;
// lines, the bars, correct and wrong are derived so every pair stays readable in that theme.
(function () {
  const T = [
    ['observatory', 'Observatory', 'Dark', true, '#111c19', '#1b2b25', '#293c32', '#f4f3e7', '#bdcbbf', '#718477', '#d8bc7d'],
    ['charcoal', 'Charcoal', 'Dark', true, '#101319', '#1b2029', '#272f3a', '#eef2fa', '#b7c3d4', '#647489', '#dcc089'],
    ['forest', 'Forest', 'Dark', true, '#0c1814', '#172820', '#23392e', '#eef5e9', '#b9cbbd', '#668574', '#dfc986'],
    ['plum', 'Plum', 'Rose & plum', true, '#201321', '#302034', '#412c46', '#f9edf8', '#d0b9d2', '#98769c', '#e8c488'],
    ['ivory', 'Warm ivory', 'Light', false, '#f8f6ef', '#fffdf7', '#e8ede4', '#23332f', '#536457', '#81917f', '#785a25'],
    ['paper', 'Clean paper', 'Light', false, '#f5f7fa', '#ffffff', '#e8edf4', '#18283c', '#4b5c72', '#8495ab', '#735925'],
    ['sand', 'Sand', 'Light', false, '#f1e8db', '#fbf6ee', '#e7dccb', '#32281e', '#605141', '#99836b', '#70521e'],
    ['sage', 'Sage', 'Soft color', false, '#eaf0e8', '#f6faf3', '#dce8d8', '#243b2c', '#45604c', '#7e9880', '#705b23'],
    ['lavender', 'Lavender', 'Soft color', false, '#efebf6', '#faf8ff', '#e2daf0', '#342944', '#60516f', '#9483aa', '#775520'],
    ['peach', 'Peach', 'Soft color', false, '#f7eae0', '#fff8f2', '#efdacd', '#432d26', '#6b4e42', '#ab8675', '#755019'],
    ['rose', 'Rose', 'Rose & plum', false, '#f6e8ed', '#fff7fa', '#ecd8e1', '#482a3b', '#714e61', '#ab8399', '#77521f'],
    ['blush', 'Blush', 'Rose & plum', false, '#faeeed', '#fff9f7', '#f0ddda', '#472d33', '#71525a', '#af8890', '#79551e'],
  ].map(([id, name, family, dark, canvas, surface, raised, text, muted, border, gold]) => ({ id, name, family, dark, canvas, surface, raised, text, muted, border, gold }));
  const mix = (a, b, p) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
  let current = 'observatory';
  function apply(id) {
    const t = T.find((x) => x.id === id) || T[0]; current = t.id;
    const r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
    set('--bg', t.canvas); set('--pane', t.surface); set('--raised', t.raised);
    set('--bar', t.dark ? mix(t.canvas, t.surface, 55) : mix(t.raised, t.surface, 45));
    set('--line', mix(t.border, t.surface, t.dark ? 45 : 40)); set('--line-strong', t.border);
    set('--text', t.text); set('--muted', t.muted); set('--gold', t.gold);
    set('--gold-ink', t.dark ? '#2a2214' : '#fffdf7');
    // the brand marigold stays the accent; on light themes it is deepened so it holds contrast
    set('--marigold', t.dark ? '#eba21f' : '#b26d06'); set('--marigold-ink', t.dark ? '#2c1b00' : '#fffaf0');
    set('--correct', t.dark ? '#63c08f' : '#1d7d4c'); set('--wrong', t.dark ? '#e0937f' : '#b04a35');
    r.dataset.theme = t.id; r.style.colorScheme = t.dark ? 'dark' : 'light';
    try { localStorage.setItem('karman-demo-theme', t.id); } catch {}
    window.dispatchEvent(new Event('themechange'));
  }
  let saved = null; try { saved = localStorage.getItem('karman-demo-theme'); } catch {}
  apply(saved || 'observatory');
  window.Themes = { list: T, apply, get current() { return current; }, next(darkOnly = true) { const l = T.filter((t) => !darkOnly || t.dark), i = l.findIndex((t) => t.id === current); apply(l[(i + 1) % l.length].id); return T.find((t) => t.id === current); } };
})();
