// Parts: accessories, the token balance, the mystery box (Crossy Road's feel: spend tokens on it,
// tap it open, try what's inside on your fox), the new-companion moment, and the skills sheet.
(function () {
  const { DATA: D, P, SFX } = End;
  End.pick = End.pick || {};

  // ---------- accessories (object colours, no marigold) ----------
  const ACC = {
    glasses: '<g class="acc"><circle cx="-15" cy="-28" r="9.5" fill="rgba(255,255,255,.18)" stroke="#2A1B10" stroke-width="2.4"/><circle cx="15" cy="-28" r="9.5" fill="rgba(255,255,255,.18)" stroke="#2A1B10" stroke-width="2.4"/><path d="M-5.5 -29 Q0 -32 5.5 -29 M-24.5 -30 L-36 -34 M24.5 -30 L36 -34" stroke="#2A1B10" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>',
    headphones: '<g class="acc"><path d="M-40 -30 C-44 -86 44 -86 40 -30" fill="none" stroke="#2A2F3A" stroke-width="6" stroke-linecap="round"/><rect x="-50" y="-40" width="14" height="24" rx="6" fill="#2A2F3A"/><rect x="36" y="-40" width="14" height="24" rx="6" fill="#2A2F3A"/><rect x="-48" y="-36" width="6" height="16" rx="3" fill="#E9E4D8"/><rect x="42" y="-36" width="6" height="16" rx="3" fill="#E9E4D8"/></g>',
    cap: '<g class="acc" transform="rotate(-8 0 -62)"><path d="M-14 -62 L-12 -52 L12 -52 L14 -62 Z" fill="#20242C"/><path d="M-34 -64 L0 -76 L34 -64 L0 -54 Z" fill="#2A2F3A"/><path d="M0 -65 L22 -62 L24 -46" stroke="#C4473B" stroke-width="2" fill="none"/><circle cx="24" cy="-44" r="3" fill="#C4473B"/></g>',
    bow: '<g class="acc"><path d="M0 12 L-16 4 L-16 20 Z M0 12 L16 4 L16 20 Z" fill="#B8443A"/><circle cx="0" cy="12" r="4" fill="#8E2E26"/></g>',
    scarf: '<g class="acc"><path d="M-34 2 Q0 18 34 2 L32 12 Q0 28 -32 12 Z" fill="#3E6FB0"/><path d="M14 14 L20 36 L30 34 L24 12 Z" fill="#335E97"/><path d="M-20 8 l2 4 4 .5 -3 3 1 4 -4 -2 -3.5 2 .8-4 -3-3 4-.5Z" fill="#F1ECDF"/></g>',
  };
  P.wear = (w, acc, animate) => { const g = w.querySelector('svg g'); g.querySelectorAll('.acc').forEach((n) => n.remove()); g.insertAdjacentHTML('beforeend', ACC[acc]); const n = g.lastElementChild; if (animate) n.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' }); return n; };
  P.unwear = (w) => w.querySelectorAll('svg g .acc').forEach((n) => n.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-30px)' }], { duration: 380, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(() => n.remove()).catch(() => {}));
  // each accessory framed on its own, for the prize tile
  const ACCV = { glasses: '-40 -46 80 36', headphones: '-55 -82 110 72', cap: '-38 -80 76 44', bow: '-21 -4 42 30', scarf: '-37 -4 74 44' };
  // the prize sits in a soft glow with thin rays that turn slowly behind it, like something catching the light
  P.rays = () => `<div class="pglow"><i class="pg-halo"></i><svg class="pg-rays" viewBox="-50 -50 100 100" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<path d="M-${i % 2 ? 1 : 1.8} -9 L0 -${i % 2 ? 34 : 48} L${i % 2 ? 1 : 1.8} -9Z" transform="rotate(${i * 22.5})"/>`).join('')}</svg><svg class="pg-rays r2" viewBox="-50 -50 100 100" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<path d="M-1 -10 L0 -30 L1 -10Z" transform="rotate(${i * 45 + 11})"/>`).join('')}</svg></div>`;
  P.accGlow = (acc, size = 128) => `${P.rays()}<div class="pitem-w"><svg class="pitem" viewBox="${ACCV[acc]}" width="${Math.round(size * 0.74)}" aria-hidden="true">${ACC[acc]}</svg></div>`;
  P.accIcon = (acc, size = 48) => `<svg viewBox="-56 -90 112 120" width="${size}" aria-hidden="true">${ACC[acc]}</svg>`;

  // ---------- token balance (Crossy Road's corner counter) ----------
  // earn(): tokens fly in from a source and the balance counts up; then a box button can be offered
  P.counter = (value = End.balanceNow()) => {
    const el = document.createElement('div'); el.className = 'tokens';
    el.innerHTML = `${End.tokenSVG(20)}<b class="num">${value.toLocaleString()}</b>`;
    const n0 = el.querySelector('b');
    return {
      el, set(v) { n0.textContent = v.toLocaleString(); },
      async earn(X, from, opts = {}) {
        if (End.state.box) return;
        const host = X.stage, to = P.rect(el.querySelector('svg')), src = from ? P.rect(from) : { x: to.x - 200, y: to.y + 120, w: 0, h: 0 };
        const flights = [];
        // ten tokens fly in one after another; the payout sound is scheduled once, so each clink lands with a token
        const n = 14, gap = 50, fly = 560; SFX.tokens(fly / 1000, n, gap / 1000);
        for (let i = 0; i < n; i++) {
          const c = document.createElement('div'); c.className = 'flytoken'; c.innerHTML = End.tokenSVG(18); host.appendChild(c);
          const x0 = src.x + src.w / 2 - 9 + ((i % 5) - 2) * 7, y0 = src.y + src.h / 2 - 9 + (i % 2) * 6, x1 = to.x + 1, y1 = to.y + 1, lift = 60 + (i % 4) * 10;
          c.style.transform = `translate(${x0}px, ${y0}px) scale(.4)`;
          flights.push(X.wait(i * gap).then(() => X.tween(fly, (k) => { c.style.transform = `translate(${x0 + (x1 - x0) * k}px, ${y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * lift}px) scale(${0.6 + 0.4 * Math.min(1, k * 2)}) rotate(${k * 200}deg)`; }, End.easeInOut)).then(() => { c.remove(); el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 160 }); }));
        }
        const counting = X.wait(fly).then(() => X.count(n0, D.tokensBefore, D.tokens, n * gap + 80));
        await Promise.all([...flights, counting]);
        End.fx.celebrate('tokens', el);
        if (opts.after) await X.wait(opts.after);
      },
    };
  };

  // ---------- the mystery box (Crossy Road's feel) ----------
  // A chunky gift box drops in and hops while it waits. The student taps it and it opens one of
  // several ways; the prize appears on a tile, turns, and settles with its name.
  P.mystery = (size = 150) => {
    const w = document.createElement('div'); w.className = 'mystery'; w.style.width = size + 'px';
    const rib = 'color-mix(in srgb, var(--pane) 88%, var(--text))', ribD = 'color-mix(in srgb, var(--pane) 70%, var(--text))';
    w.innerHTML = `<svg viewBox="-60 -80 120 140" aria-hidden="true">
      <g class="my-body"><g class="my-l"><path d="M-48 -19 L0 5 L0 49 L-48 25 Z" fill="var(--accent)"/><path d="M-29 -28.5 L-19 -23.5 L-19 39.5 L-29 34.5 Z" fill="${rib}"/></g>
      <g class="my-r"><path d="M48 -19 L0 5 L0 49 L48 25 Z" fill="color-mix(in srgb, var(--accent) 76%, #000)"/><path d="M19 -23.5 L29 -28.5 L29 34.5 L19 39.5 Z" fill="${ribD}"/></g></g>
      <g class="my-lid">
        <path d="M-48 -31 L0 -7 L0 5 L-48 -19 Z" fill="color-mix(in srgb, var(--accent) 88%, #000)"/><path d="M48 -31 L0 -7 L0 5 L48 -19 Z" fill="color-mix(in srgb, var(--accent) 66%, #000)"/>
        <path d="M0 -55 L48 -31 L0 -7 L-48 -31 Z" fill="color-mix(in srgb, var(--accent) 80%, #fff)"/>
        <g class="my-rib"><path d="M-29 -40.5 L19 -16.5 L29 -21.5 L-19 -45.5 Z M19 -45.5 L29 -40.5 L-19 -16.5 L-29 -21.5 Z" fill="${rib}"/>
        <path d="M-29 -28.5 L-19 -23.5 L-19 -11.5 L-29 -16.5 Z" fill="${ribD}"/><path d="M19 -23.5 L29 -28.5 L29 -16.5 L19 -11.5 Z" fill="${ribD}"/></g>
        <g class="my-bow"><path d="M0 -33 C-10 -52 -30 -50 -22 -38 C-17 -32 -7 -33 0 -33 C7 -33 17 -32 22 -38 C30 -50 10 -52 0 -33 Z" fill="${rib}" stroke="${ribD}" stroke-width="1.5"/>
        <ellipse cx="0" cy="-33" rx="5" ry="3.6" fill="${ribD}"/></g></g>
    </svg>`;
    return w;
  };
  const anim = (el, frames, ms, ease = 'cubic-bezier(.22,1,.36,1)', fill = 'forwards') => el.animate(frames, { duration: End.reduced ? 1 : ms, easing: ease, fill });
  // a little iso cube, for the voxel burst
  const cube = (s) => `<svg viewBox="-12 -14 24 28" width="${s}" aria-hidden="true"><path d="M0 -12 L10 -6 L0 0 L-10 -6Z" fill="color-mix(in srgb, var(--accent) 80%, #fff)"/><path d="M-10 -6 L0 0 L0 12 L-10 6Z" fill="var(--accent)"/><path d="M10 -6 L0 0 L0 12 L10 6Z" fill="color-mix(in srgb, var(--accent) 76%, #000)"/></svg>`;

  // ---------- opening it: the box shakes, bursts into blocks, and the prize pops out ----------
  const burst = async (c) => {
    await c.tap();
    await anim(c.svg, [{ transform: 'none' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'none' }], 420, 'ease-in-out').finished;
    SFX.open(); c.box.style.opacity = 0;
    const r = P.rect(c.box), n = 16;
    for (let i = 0; i < n; i++) {
      const s = c.size * (0.14 + (i % 3) * 0.04), q = document.createElement('div'); q.className = 'vox'; q.innerHTML = cube(s); c.stage.appendChild(q);
      const x0 = r.x + r.w * (0.2 + ((i * 37) % 60) / 100), y0 = r.y + r.h * (0.15 + ((i * 53) % 65) / 100), a = (i / n) * Math.PI * 2, d = c.size * (0.5 + (i % 4) * 0.12);
      q.style.cssText = `left:${x0 - s / 2}px;top:${y0 - s / 2}px`;
      q.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${Math.cos(a) * d * 0.6}px, ${Math.sin(a) * d * 0.5 - 50}px) rotate(${(i % 2 ? 1 : -1) * 60}deg)`, opacity: 1, offset: 0.45 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.5 + 70}px) rotate(${(i % 2 ? 1 : -1) * 140}deg)`, opacity: 0 }], { duration: End.reduced ? 1 : 900, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
      setTimeout(() => q.remove(), 1000);
    }
    await c.prize();
  };

  // The box, in place: it drops into `area`, the student taps it open, sees the prize on their fox,
  // and decides: wear it now, or keep it for later. Nothing is put on for them.
  // o: { cur, acc, area, balance, fox, size, cy }
  End.mystery = async (X, o) => {
    const stage = X.stage, cur = o.cur || P.cursor(X), acc = o.acc, ar = P.rect(o.area), fox = o.fox;
    const size = Math.min(o.size || 170, ar.w * 0.5), cx = ar.x + ar.w / 2, cy = o.cy != null ? o.cy : ar.y + ar.h * 0.44;
    const box = P.mystery(size), svg = box.querySelector('svg'); box.classList.add('onstage'); stage.appendChild(box); box.style.left = cx - size / 2 + 'px'; box.style.top = cy - size * 0.6 + 'px';
    // 1. it drops in and lands (momentum, so a little bounce)
    await X.spring(-420, 0, (v) => { box.style.transform = `translateY(${v}px)`; }, 0.42, 0.62); SFX.thud();
    const hint = X.el('<div class="taphint">Tap to open</div>', stage); hint.style.cssText = `left:${cx}px;top:${cy + size * 0.62}px`;
    // 2. it hops while it waits
    let waiting = true; (async () => { while (waiting && X.alive()) { await new Promise((r) => setTimeout(r, 900)); if (!waiting) break; anim(svg, [{ transform: 'none' }, { transform: 'translateY(-8px) scale(.98,1.03)', offset: 0.4 }, { transform: 'scale(1.03,.97)', offset: 0.8 }, { transform: 'none' }], 520, 'ease-out', 'none'); } })();
    await X.wait(1100);
    // 3. it bursts into blocks; the prize appears in a glow with turning rays, and turns once
    const ps = Math.round(size * 0.9), top = cy - ps * 0.62 - size * 0.18; let icon;
    await burst({
      X, stage, box, svg, size,
      async tap() { await cur.to(box, 520); await cur.tap(); waiting = false; svg.getAnimations().forEach((a) => a.cancel()); hint.remove(); },
      prize() {
        icon = document.createElement('div'); icon.className = 'prize'; icon.style.width = icon.style.height = ps + 'px'; icon.innerHTML = P.accGlow(acc, ps); stage.appendChild(icon);
        icon.style.left = cx - ps / 2 + 'px'; icon.style.top = top + 'px';
        return X.spring(0, 1, (k) => { icon.style.transform = `scale(${k})`; icon.style.opacity = Math.min(1, k * 3); }, 0.42, 0.6);
      },
    });
    SFX.chime(); End.fx.celebrate('prize', icon); cur.away(); box.remove();
    const inner = icon.querySelector('.pitem'), name = X.el(`<div class="pname"><span class="lbl">New accessory</span><b>${D.prizes[acc]}</b></div>`, stage); name.style.cssText = `left:${cx}px;top:${cy + size * 0.42}px`;
    await X.tween(1500, (k) => { const v = Math.cos(k * Math.PI * 4); inner.style.transform = `scaleX(${(v < 0 ? -1 : 1) * Math.max(0.06, Math.abs(v))})`; }, (k) => 1 - Math.pow(1 - k, 3));
    inner.style.transform = 'none'; await X.wait(300);
    // 4. the preview: their own fox steps into the glow wearing it
    const w = icon.querySelector('.pitem-w'); w.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 260, fill: 'forwards' });
    if (fox) fox.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    const pv = P.fox('h', Math.round(ps * 0.82)); pv.classList.add('pv-fox'); P.wear(pv, acc); icon.appendChild(pv);
    pv.animate([{ opacity: 0, transform: 'translateY(16px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    name.querySelector('.lbl').textContent = 'Preview on your fox';
    const acts = X.el(`<div class="pacts"><button type="button" class="cta">Wear it</button><button type="button" class="savebtn">Keep for later</button></div>`, stage); acts.style.cssText = `left:${cx}px;top:${cy + size * 0.42 + 64}px`;
    // the student decides; the demo waits for a real tap (End.pick.wear lets a test choose)
    const wearBtn = acts.querySelector('.cta'), keepBtn = acts.querySelector('.savebtn');
    const choice = await new Promise((res, rej) => {
      wearBtn.onclick = () => res('wear'); keepBtn.onclick = () => res('keep');
      if (End.pick.wear) setTimeout(() => res(End.pick.wear), 900);
      (function check() { if (!X.alive()) rej(new End.Cancelled()); else setTimeout(check, 200); })();
    });
    [wearBtn, keepBtn].forEach((b) => (b.disabled = true));
    if (choice === 'wear') { SFX.pop(); End.cheer(pv); End.fx.celebrate('wear', pv); End.state.wear = acc; await X.wait(1200); }
    else { P.unwear(pv); name.querySelector('.lbl').textContent = 'Saved to your collection'; await X.wait(1100); }
    [icon, name, acts].forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
    if (fox) { if (choice === 'wear') P.wear(fox, acc); fox.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' }); }
    await X.wait(320); [icon, name, acts].forEach((e) => e.remove());
    return choice;
  };

  // ---------- the offer: open now, or save it (boxes keep, and can be opened together later) ----------
  P.boxIcon = (s = 34) => { const m = P.mystery(s); return `<span class="boxic" style="width:${s}px">${m.innerHTML}</span>`; };
  P.offer = () => {
    const el = document.createElement('div'); el.className = 'offer';
    el.innerHTML = `<div class="of-t">${P.boxIcon(36)}<div><b>Mystery box ready</b><span class="muted">Open it now, or save it for later</span></div></div><div class="of-a"><button type="button" class="boxbtn"><span>Open</span></button><button type="button" class="savebtn">Save for later</button></div>`;
    return { el, open: el.querySelector('.boxbtn'), save: el.querySelector('.savebtn') };
  };

  // ---------- box first: when today's tokens reach a box, the box comes before the results ----------
  // End.state.box is 'opened', 'saved' (paid for and kept for later), or null (not enough tokens yet);
  // the ending then shows only what is left.
  End.state = { box: null, wear: null };
  End.balanceNow = () => (End.state.box ? D.tokensAfter : D.tokensBefore);
  P.css('boxfirst', `.bf { position: relative; min-height: 100%; background: var(--bg); }
  .bf-a { position: relative; min-height: 100%; display: flex; flex-direction: column; align-items: center; padding: 54px 20px 24px; }
  .bf-ct { position: absolute; right: 26px; top: 22px; z-index: 3; }
  .bf-t { text-align: center; font: 600 30px var(--font); letter-spacing: -.02em; } .bf-t span { display: block; font: 400 16px var(--font); color: var(--muted); letter-spacing: 0; margin-top: 6px; }
  .bf-earned { position: absolute; left: 50%; top: 150px; translate: -50% 0; z-index: 2; display: inline-flex; align-items: center; gap: 8px; font: 600 44px var(--font); }
  .bf-area { position: relative; width: min(820px, 100%); height: 420px; margin-top: 18px; }
  .bf-area .fox { position: absolute; right: 2%; top: 38%; }
  .bf-ob { display: grid; justify-items: center; min-height: 110px; }
  @container pg (max-width: 900px) { .bf-area { height: 440px; } }
  @container pg (max-width: 560px) { .bf-a { padding-top: 70px; } .bf-t { font-size: 24px; } .bf-earned { top: 160px; font-size: 38px; } .bf-area { height: 430px; } .bf-area .fox { right: 0; top: auto; bottom: 0; } .bf-ob { width: 100%; } .bf-ob .offer { width: 100%; max-width: none; } }`);
  // a box counter that appears in the corner when a box is saved, counts it in, then slips away
  const boxCounter = (host) => { const el = document.createElement('div'); el.className = 'tokens bxct'; el.innerHTML = `${P.boxIcon(22)}<b class="num">0</b>`; host.appendChild(el); return el; };
  End.boxFirst = async (X, d = {}) => {
    End.state = { box: null, wear: null };
    if (!D.boxes) return;
    const choice = End.pick.choice || d.choice || 'open', acc = d.acc || 'glasses';
    await P.leave(X, 'shrink');
    const root = X.el(`<div class="bf"><div class="dawnglow"></div><div class="bf-a"><div class="bf-ct"></div><div class="bf-t">You earned ${D.tokensToday} tokens<span>From today's Daily 10</span></div><div class="bf-earned">${End.tokenSVG(36)}<span class="num">0</span></div><div class="bf-area"></div><div class="bf-ob"></div></div></div>`);
    const A = root.querySelector('.bf-a'), glow = root.querySelector('.dawnglow'), ct = A.querySelector('.bf-ct'), ctr = P.counter(D.tokensBefore); ct.appendChild(ctr.el);
    End.fade(A.querySelector('.bf-t'), 0, X); const e = A.querySelector('.bf-earned'); End.fade(e, 150, X);
    X.tween(900, (k) => { glow.style.opacity = 0.5 * k; });
    await X.count(e.querySelector('.num'), 0, D.tokensToday, 700, (v) => '+' + Math.round(v));
    await X.wait(300); await ctr.earn(X, e); e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    A.querySelector('.bf-t').firstChild.textContent = 'Enough for a mystery box';
    const area = A.querySelector('.bf-area'), fox = P.fox('h', X.phone ? 84 : 120); area.appendChild(fox); End.fade(fox, 200, X);
    const ob = A.querySelector('.bf-ob'), of = P.offer(); ob.appendChild(of.el); End.fade(of.el, 0, X); await X.wait(800);
    const cur = P.cursor(X);
    if (choice === 'save') {
      // saved: the tokens pay for it, and the box flies up to a counter in the corner, which then slips away
      await cur.to(of.save); await cur.tap(of.save); cur.away();
      X.count(ctr.el.querySelector('b'), D.tokens, D.tokensAfter, 420);
      const bc = boxCounter(ct); bc.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      const ic = of.el.querySelector('.boxic'), from = P.rect(ic), to = P.rect(bc.querySelector('.boxic')), fly = document.createElement('div'); fly.className = 'flytoken'; fly.innerHTML = P.boxIcon(36); X.stage.appendChild(fly);
      ic.style.opacity = 0; of.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 300, fill: 'forwards' });
      await X.tween(640, (k) => { const s = 1 - (1 - to.w / from.w) * k; fly.style.transform = `translate(${from.x + (to.x - from.x) * k}px, ${from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 90}px) scale(${s})`; fly.style.transformOrigin = '0 0'; }, End.easeInOut);
      fly.remove(); SFX.pop(); End.setNum(bc.querySelector('b'), 1); bc.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 260 });
      End.state.box = 'saved'; await X.wait(1100);
      await new Promise((r) => bc.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 360, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(r, r));
      await X.wait(300); return;
    }
    await cur.to(of.open); await cur.tap(of.open);
    of.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    X.count(ctr.el.querySelector('b'), D.tokens, D.tokensAfter, 420);
    const ar = P.rect(area);
    End.state.box = 'opened';
    await End.mystery(X, { cur, acc, area, balance: ctr, fox, size: X.phone ? 150 : 170, cy: ar.y + ar.h * (X.phone ? 0.36 : 0.42) });
    ctr.set(D.tokensAfter); await X.wait(400);
  };

  // ---------- a new companion: its own moment, then it goes; it never sits beside the fox ----------
  P.css('unlock', `.unl { position: relative; min-height: 100%; display: grid; place-items: center; background: var(--bg); text-align: center; padding: 40px 20px; }
  .unl-stage { position: relative; width: 220px; height: 220px; margin: 0 auto 6px; display: grid; place-items: center; }
  .unl-stage .pglow { inset: -40%; } .unl-stage .fox { position: relative; }
  .unl h2 { font: 600 30px var(--font); letter-spacing: -.02em; margin: 6px 0 6px; } .unl p { margin: 0; font-size: 16px; }
  @container pg (max-width: 560px) { .unl h2 { font-size: 25px; } .unl-stage { width: 180px; height: 180px; } }`);
  End.unlock = async (X) => {
    if (End.pick.unlock === 'no') return;
    await P.leave(X, 'shrink');
    const root = X.el(`<div class="unl"><div><div class="unl-stage">${P.rays()}</div><div class="lbl">New companion</div><h2>The owl joins your journey</h2><p class="muted">For ${D.dayStreak} days in a row</p></div></div>`);
    const stg = root.querySelector('.unl-stage'), glow = stg.querySelector('.pglow'), owl = P.owl('h', X.phone ? 120 : 150); stg.appendChild(owl);
    const txt = [...root.querySelectorAll('.lbl, h2, p')]; txt.forEach((t) => (t.style.opacity = 0));
    glow.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    SFX.companion();
    await X.spring(0, 1, (k) => { owl.style.transform = `translateY(${(1 - k) * 60}px) scale(${0.4 + 0.6 * k})`; owl.style.opacity = Math.min(1, k * 2); }, 0.5, 0.62);
    End.fx.celebrate('companion', owl);
    txt.forEach((t, i) => End.fade(t, i * 110)); txt.forEach((t) => (t.style.opacity = ''));
    End.cheer(owl); await X.wait(2600);
    await X.tween(380, (k) => { root.style.opacity = 1 - k; root.style.transform = `scale(${1 - 0.04 * k})`; });
    X.clear();
  };

  // ---------- following the content on a phone or iPad, where the page scrolls ----------
  End.follow = (X, el) => {
    const pg = X.page; if (!pg || pg.scrollHeight <= pg.clientHeight + 2 || !el.isConnected) return;
    const r = el.getBoundingClientRect(), pr = pg.getBoundingClientRect(), k = pr.height / pg.clientHeight;
    const bottom = (r.bottom - pr.top) / k + pg.scrollTop, top = (r.top - pr.top) / k + pg.scrollTop;
    if (bottom > pg.scrollTop + pg.clientHeight - 20) pg.scrollTo({ top: Math.min(top - 16, bottom - pg.clientHeight + 28), behavior: End.reduced ? 'auto' : 'smooth' });
  };
  End.fade = (el, d = 0, X) => { const a = el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: d, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' }); if (X) End.follow(X, el); return a; };

  // ---------- skills: the three biggest movers, then everything ----------
  End.skillBlock = async (X, host, opts = {}) => {
    for (const s of D.skills) { const b = P.bar(s, opts); host.appendChild(b.el); End.fade(b.el, 0, X); await X.wait(150); await b.play(X); if (opts.fox) { P.mood(opts.fox, s.now >= s.was ? 'o' : 'k'); setTimeout(() => P.mood(opts.fox, 'h'), 700); } }
    const more = document.createElement('button'); more.type = 'button'; more.className = 'seeall'; more.innerHTML = `See all skills <span class="muted">${D.moved.length} moved today</span><svg viewBox="0 0 8 12" aria-hidden="true"><path d="M2 2 6 6 2 10"/></svg>`;
    more.onclick = () => End.allSkills(X, more); host.appendChild(more); End.fade(more, 0, X); await X.wait(200); return more;
  };
  // a static bar for the full list: today's gain or loss shows as a lighter or warmer piece
  const still = (s) => { const el = document.createElement('div'); el.className = 'mbar small still'; const SEG = [[0, 35], [35, 60], [60, 80], [80, 100]], part = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a))) * 100, lo = Math.min(s.was, s.now), hi = Math.max(s.was, s.now);
    el.innerHTML = `<div class="mb-top"><span class="mb-mark">${P.mark(End.band(s.now))}</span><span class="mb-name">${s.name}</span><span class="mb-band">${End.BANDS[End.band(s.now)]}</span></div><div class="mb-track">${SEG.map((g) => `<i><b class="f" style="width:${part(lo, ...g)}%"></b><b class="${s.now >= s.was ? 'g' : 'l'}" style="left:${part(lo, ...g)}%;width:${part(hi, ...g) - part(lo, ...g)}%"></b></i>`).join('')}</div>`; return el; };
  // The full list, in a sheet that grows out of the See all button and shrinks back into it
  // (the Morph Dialog pattern from 21st.dev, id 37543): the button's box springs open to the sheet's box,
  // the list keeps its final width and fades in once there is room, and the dimming spreads from the button.
  End.allSkills = (X, trigger) => {
    const stage = X.stage; if (stage.querySelector('.allsk')) return;
    const scrim = document.createElement('div'); scrim.className = 'scrim'; stage.appendChild(scrim);
    const sh = document.createElement('div'); sh.className = 'allsk'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'All skills');
    const groups = {}; [...D.moved, ...D.others].forEach((s) => { (groups[s.domain] = groups[s.domain] || []).push(s); });
    sh.innerHTML = `<div class="allsk-in"><div class="ps-grab"></div><header><b>Skills</b><button type="button" class="done">Done</button></header><div class="seg" role="tablist"><button type="button" role="tab" aria-selected="true" data-t="m">Moved today</button><button type="button" role="tab" aria-selected="false" data-t="a">All skills</button></div><div class="body"><div class="tab" data-t="m"></div><div class="tab" data-t="a" hidden></div></div></div>`;
    stage.appendChild(sh);
    const tm = sh.querySelector('.tab[data-t="m"]'), ta = sh.querySelector('.tab[data-t="a"]');
    D.moved.forEach((s) => tm.appendChild(still(s)));
    Object.entries(groups).forEach(([dom, list]) => { const h = document.createElement('div'); h.className = 'lbl dom'; h.textContent = dom; ta.appendChild(h); list.forEach((s) => ta.appendChild(still(s))); });
    sh.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { sh.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-selected', String(x === b))); sh.querySelectorAll('.tab').forEach((t) => (t.hidden = t.dataset.t !== b.dataset.t)); }));
    const inner = sh.querySelector('.allsk-in'), sp = End.springEase ? End.springEase(0.5, 0.88) : { easing: 'cubic-bezier(.22,1,.36,1)', duration: 480 };
    const box = (r, rad) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', borderRadius: rad });
    const pin = (r) => { sh.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;right:auto;bottom:auto;margin:0;`; };
    const centre = (r) => `${r.x + r.w / 2}px ${r.y + r.h / 2}px`, far = Math.hypot(stage.offsetWidth, stage.offsetHeight);
    const to = P.rect(sh), from = trigger && trigger.isConnected ? P.rect(trigger) : null, sheetRad = getComputedStyle(sh).borderRadius;
    if (from && !End.reduced) {
      inner.style.width = to.w + 'px'; pin(from);
      const grow = sh.animate([box(from, from.h / 2 + 'px'), box(to, sheetRad)], { duration: sp.duration, easing: sp.easing, fill: 'forwards' });
      inner.animate([{ opacity: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1 }], { duration: sp.duration, easing: 'ease-out', fill: 'both' });
      scrim.animate([{ clipPath: `circle(0px at ${centre(from)})`, opacity: 1 }, { clipPath: `circle(${far}px at ${centre(from)})`, opacity: 1 }], { duration: sp.duration * 1.1, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      trigger.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
      grow.finished.then(() => { grow.cancel(); sh.style.cssText = ''; inner.style.width = ''; }).catch(() => {});
    } else { scrim.style.opacity = 1; }
    const restore = () => { if (trigger) trigger.getAnimations().forEach((a) => a.cancel()); };
    sh._restore = restore;
    let closing = false;
    const close = () => {
      if (closing || !sh.isConnected) return; closing = true; removeEventListener('keydown', esc);
      const now = P.rect(sh), back = trigger && trigger.isConnected ? P.rect(trigger) : null;
      if (!back || End.reduced) { sh.remove(); scrim.remove(); restore(); return; }
      inner.style.width = now.w + 'px'; pin(now);
      inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      const s2 = End.springEase ? End.springEase(0.42, 1) : sp;
      // the button comes back as the sheet arrives at it, as part of the same motion
      restore(); trigger.animate([{ opacity: 0 }, { opacity: 0, offset: 0.65 }, { opacity: 1 }], { duration: s2.duration, fill: 'backwards' });
      sh.animate([box(now, sheetRad), box(back, back.h / 2 + 'px')], { duration: s2.duration, easing: s2.easing, fill: 'forwards' }).finished.then(() => sh.remove()).catch(() => sh.remove());
      scrim.animate([{ clipPath: `circle(${far}px at ${centre(back)})`, opacity: 1 }, { clipPath: `circle(0px at ${centre(back)})`, opacity: 1 }], { duration: s2.duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.then(() => scrim.remove()).catch(() => {});
    };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    sh.querySelector('.done').onclick = close; scrim.onclick = close; addEventListener('keydown', esc);
    sh.querySelector('.done').focus({ preventScroll: true });
  };
})();
