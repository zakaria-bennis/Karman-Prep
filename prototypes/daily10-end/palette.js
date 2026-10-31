// Round three colours: no marigold. Each theme gets one accent chosen to sit with its own hue
// (OKLCH, checked for contrast), plus two companions for the prize machine's boxes.
// --gold is remapped to the accent so every shared piece follows the theme.
(function () {
  const P = {
    observatory: { accent: '#84c8eb', ink: '#052330', t1: '#97aad7', t2: '#76b8ba', name: 'Starlight blue' },
    charcoal: { accent: '#88c1ff', ink: '#0e2036', t1: '#aaa1e4', t2: '#5db9d5', name: 'Clear blue' },
    forest: { accent: '#7cced2', ink: '#012527', t1: '#83b2ce', t2: '#85b8a1', name: 'Glacier' },
    plum: { accent: '#eea4c4', ink: '#301522', t1: '#d79991', t2: '#bf9ccb', name: 'Orchid' },
    ivory: { accent: '#277165', ink: '#f3fcfa', t1: '#5a909d', t2: '#709070', name: 'Deep teal' },
    paper: { accent: '#2460b7', ink: '#f6faff', t1: '#8977c8', t2: '#0095ba', name: 'Ink blue' },
    sand: { accent: '#38698a', ink: '#f4fbff', t1: '#7b84ab', t2: '#599197', name: 'Slate' },
    sage: { accent: '#1b6f80', ink: '#f3fcfe', t1: '#6989ac', t2: '#599388', name: 'Lake' },
    lavender: { accent: '#6652a6', ink: '#faf9ff', t1: '#a76fa7', t2: '#5c88c4', name: 'Violet' },
    peach: { accent: '#216f7b', ink: '#f3fcfe', t1: '#688aa8', t2: '#5e9284', name: 'Teal' },
    rose: { accent: '#964267', ink: '#fff7fa', t1: '#b96f63', t2: '#a073aa', name: 'Berry' },
    blush: { accent: '#984357', ink: '#fff7f9', t1: '#b57358', t2: '#a7719e', name: 'Cranberry' },
  };
  function paint() {
    const t = Themes.list.find((x) => x.id === Themes.current), p = P[t.id], r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
    set('--accent', p.accent); set('--accent-ink', p.ink); set('--t1', p.t1); set('--t2', p.t2);
    set('--gold', p.accent); set('--gold-ink', p.ink); set('--marigold', p.accent); set('--marigold-ink', p.ink);
    // right and wrong: calm, and the wrong colour is kept well away from berry accents
    const warm = t.id === 'rose' || t.id === 'blush';
    set('--correct', t.dark ? '#82cf98' : '#2f7346');
    set('--wrong', t.dark ? '#d9a390' : warm ? '#7a6a4c' : '#985943');
  }
  window.Palette = { list: P, paint };
  paint(); addEventListener('themechange', paint);
})();
