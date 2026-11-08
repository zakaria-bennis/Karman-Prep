// Round five: one ending, Box first. After the last question, in order: a new companion (when one was
// earned) gets its own moment and leaves, then the box (when today's tokens reach one), then the results.
// The results are one calm column: how today went (score, section split, answer path), then the one next
// step, then the skills that moved. Streak and tokens sit quietly in the top bar. It fits on one iPhone
// screen. Everything else is collected for the dashboard, not shown here.
(function () {
  const { DATA: D, P, SFX } = End;
  const fade = (X, el, d = 0) => End.fade(el, d, X);
  P.css('ending', `.dawnglow { position: absolute; inset: 0; background: linear-gradient(to top, color-mix(in srgb, var(--accent) 26%, transparent) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 32%, transparent 62%); opacity: 0; pointer-events: none; }
  .vstack { display: grid; gap: 14px; align-content: start; }
  .r5 { min-height: 100%; display: grid; grid-template-rows: auto 1fr; grid-template-columns: minmax(0, 1fr); }
  .r5-bar { display: flex; align-items: center; gap: 8px; padding: 18px 28px 0; }
  .r5-bar .done { margin-left: auto; border: 0; background: none; color: var(--accent); font: 600 16px var(--font); cursor: pointer; padding: 6px 2px; }
  .streak { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 13px 0 11px; border-radius: 999px; background: color-mix(in srgb, var(--text) 6%, var(--pane)); border: 1px solid var(--line); font: 600 15px var(--font); white-space: nowrap; }
  .streak .flame { width: 14px; height: 18px; } .streak span { font-weight: 500; color: var(--muted); }
  .r5-bar .tokens { height: 34px; }
  .r5-body { width: min(1000px, 100%); margin: 0 auto; padding: 4px 40px 28px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: 'hero hero' 'next sk'; gap: 34px 56px; align-content: start; }
  .r5-hero { grid-area: hero; display: grid; justify-items: center; text-align: center; gap: 6px; }
  .split { display: flex; flex-wrap: wrap; gap: 6px 26px; } .split > span { display: inline-flex; align-items: baseline; gap: 8px; } .split b { font: 600 16px var(--font); font-variant-numeric: tabular-nums; }
  .r5-hero .big { font-size: 80px; } .r5-hero .split { justify-content: center; margin-top: 2px; } .r5-hero .apath { margin-top: 18px; width: 100%; max-width: 620px; justify-self: stretch; margin-inline: auto; }
  .r5-next { grid-area: next; display: grid; gap: 12px; align-content: start; }
  .r5-next .cta { width: 100%; height: auto; min-height: 58px; white-space: normal; line-height: 1.25; font-size: 17px; padding: 14px 24px; }
  .r5-rev { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 54px; padding: 0 16px; border-radius: 16px; border: 1px solid var(--line-strong); background: transparent; color: var(--text); font: 600 15.5px var(--font); cursor: pointer; text-align: left; }
  .r5-rev .nums { margin-left: auto; display: flex; gap: 6px; } .r5-rev .nums i { font-style: normal; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: color-mix(in srgb, var(--text) 8%, transparent); font: 600 13px var(--font); }
  .r5-rev > svg { width: 8px; height: 12px; fill: none; stroke: var(--muted); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .r5-sk { grid-area: sk; display: grid; gap: 14px; align-content: start; }
  .r5-sk-h { display: flex; justify-content: space-between; align-items: baseline; }
  .r5-sk .seeall { height: auto; padding: 2px 0; border: 0; border-radius: 6px; color: var(--accent); font-size: 14px; gap: 6px; }
  @container pg (max-width: 900px) { .r5-body { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'hero' 'next' 'sk'; width: min(640px, 100%); } }
  @container pg (max-width: 560px) {
    .r5-bar { padding: 14px 18px 0; } .streak span { display: none; } .streak, .r5-bar .tokens { height: 30px; font-size: 14px; }
    .r5-body { padding: 2px 18px 20px; gap: 24px; } .r5-hero .big { font-size: 60px; } .r5-hero .apath { margin-top: 12px; }
    .r5-next .cta { font-size: 16px; min-height: 54px; } .r5-sk { gap: 12px; }
  }`);
  // the score counts up to 7 and lands with one sound
  const scoreUp = async (X, el) => { for (let i = 1; i <= D.right; i++) { End.setNum(el, i); End.fx.score(el, i, D.total); await X.wait(150); } SFX.score(); End.cheerAll(); End.fx.celebrate('score', el); await X.wait(300); };
  const split = () => { const sec = (name) => { const qs = D.questions.filter((q) => q.subject === name); return `<span><span class="lbl">${name}</span><b>${qs.filter((q) => q.ok).length} of ${qs.length}</b></span>`; }; const el = document.createElement('div'); el.className = 'split'; el.innerHTML = sec('Reading and Writing') + sec('Math'); return el; };

  Designs.push({
    name: 'Box first', idea: 'A new companion gets its own moment, then the box, then one calm screen: how today went, then the next step.',
    apple: 'One thing at a time. Each reward is its own moment; the results lead with the score and one obvious next step.',
    defaults: { acc: 'cap', choice: 'open' },
    async run(X) {
      await End.unlock(X);
      await End.boxFirst(X, this.defaults);
      await P.leave(X, 'shrink');
      const root = X.el(`<div class="r5"><div class="r5-bar"></div><div class="r5-body">
        <section class="r5-hero"></section>
        <section class="r5-next"></section>
        <section class="r5-sk"><div class="r5-sk-h"><span class="lbl">Skills that moved</span></div></section></div></div>`);
      // top bar: streak and tokens, quietly; Done goes home
      const bar = root.querySelector('.r5-bar'), st = document.createElement('div'); st.className = 'streak'; st.setAttribute('aria-label', `${D.dayStreak} days in a row`); st.innerHTML = `${P.flameSVG()}<b class="num">${D.dayStreak}</b><span>days in a row</span>`;
      const ctr = P.counter(), done = document.createElement('button'); done.type = 'button'; done.className = 'done'; done.textContent = 'Done';
      bar.append(st, ctr.el, done); fade(X, bar);
      // how today went: her fox (wearing only what she chose), the score, each section, and the answer path
      const hero = root.querySelector('.r5-hero'), fox = P.fox('h', X.phone ? 58 : 72); hero.appendChild(fox); fade(X, fox);
      hero.insertAdjacentHTML('beforeend', `<div class="lbl">Daily 10 complete</div><div class="big"><span class="s">0</span><span class="muted" style="font-size:.4em"> of ${D.total}</span></div>`);
      await X.wait(200); await scoreUp(X, hero.querySelector('.s'));
      const sp = split(); hero.appendChild(sp); fade(X, sp);
      const path = P.answers(); hero.appendChild(path); await P.answersIn(X, path, 30);
      // the one next step, then the misses
      const nx = root.querySelector('.r5-next');
      nx.innerHTML = `<div class="lbl">Your next step</div><button type="button" class="cta">Practise ${D.weakest.toLowerCase()}</button>
        <button type="button" class="r5-rev">Review the ${D.misses.length} you missed<span class="nums">${D.misses.map((q) => `<i>${q.n}</i>`).join('')}</span><svg viewBox="0 0 8 12" aria-hidden="true"><path d="M2 2 6 6 2 10"/></svg></button>`;
      fade(X, nx); await X.wait(400);
      // with no box today, the tokens land in the top bar now
      await ctr.earn(X, hero.querySelector('.big'));
      // the skills that moved, with See all in the section's header
      const sk = root.querySelector('.r5-sk'), more = await End.skillBlock(X, sk, { small: true });
      const m = more.querySelector('.muted'); if (m) m.remove(); sk.querySelector('.r5-sk-h').appendChild(more);
    },
  });
})();
