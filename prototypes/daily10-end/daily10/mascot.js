// Study companion engine (prototype). Hidden while the student answers; pops out of a fresh spot after Check.
// The companion is a front-facing origami animal that only ever peeks out from behind real UI
// edges: the bottom bar, the feedback bar, the top bar and, after an answer is checked, the side of
// the answer area or the explanation. It never crosses question text. Every motion is a spring that
// starts from the current value, so any reaction can interrupt any other without a jump.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const K = '#24180F';

  // ---------- animals ----------
  const ANIMALS = {
    fox: { name: 'Fox', c: { l: '#F6B652', m: '#E89A2C', d: '#CC8020', muz: '#FFF8EE', in: '#FFF0DA', tip: '#2A2A2A', paw: '#2A2A2A' }, ear: 'tall', cheeks: true, tail: 'fox', sig: 'tailSwish', unlock: 'Your starter companion' },
    bunny: { name: 'Bunny', c: { l: '#FBF8F3', m: '#EEE9E1', d: '#DDD6CC', muz: '#FFFFFF', in: '#F2B4B1', paw: '#F4F0EA' }, ear: 'long', teeth: true, tail: null, sig: 'earFlop', unlock: 'Finish 7 Daily 10s in a row' },
    cat: { name: 'Cat', c: { l: '#6A6A73', m: '#585861', d: '#3F3F47', muz: '#F2F0EE', in: '#F2B4B1', paw: '#F2F0EE' }, ear: 'cat', whisk: true, stripes: true, tail: 'cat', sig: 'pawBat', unlock: 'Master your first skill' },
    owl: { name: 'Owl', c: { l: '#A9784B', m: '#8E6038', d: '#5E3D22', muz: '#F7EFE1', in: '#86633F', paw: '#E9962A' }, ear: 'tuft', owl: true, tail: null, sig: 'owlTilt', unlock: 'Finish a full-length practice test' },
    bear: { name: 'Bear', c: { l: '#B9895C', m: '#A47447', d: '#8B5F37', muz: '#F0E1CC', in: '#D9B08A', paw: '#8B5F37' }, ear: 'round', tail: null, sig: 'pawWave', unlock: 'Answer 500 questions' },
    wolf: { name: 'Wolf pup', c: { l: '#AEB5BF', m: '#949CA7', d: '#7C848F', muz: '#F7F8FA', in: '#E9C9C6', paw: '#C9CED6' }, ear: 'tall', mask: true, tail: 'wolf', sig: 'howl', unlock: 'Beat your best Time Trial' },
  };
  const STAGES = {
    kit: { name: 'Little', head: 0.82, eye: 1.18, ear: 0.72 },
    young: { name: 'Growing', head: 0.92, eye: 1.06, ear: 0.88 },
    grown: { name: 'Grown', head: 1, eye: 1, ear: 1 },
  };

  function earSVG(x, y, s, c, shape, k) {
    const e = (n) => n * k;
    if (shape === 'tall') return `<path d="M${x} ${y} L${x - s * e(4)} ${y - e(38)} L${x + s * 22} ${y - e(14)}Z" fill="${c.m}"/><path d="M${x - s * e(4)} ${y - e(38)} L${x - s * e(2)} ${y - e(26)} L${x + s * e(8)} ${y - e(30)}Z" fill="${c.tip || c.m}"/><path d="M${x + s * 2} ${y - 6} L${x} ${y - e(26)} L${x + s * 14} ${y - e(14)}Z" fill="${c.in}"/>`;
    if (shape === 'long') return `<path d="M${x} ${y} L${x - s * 2} ${y - e(64)} L${x + s * 18} ${y - 6}Z" fill="${c.m}"/><path d="M${x + s * 2} ${y - 6} L${x + s * 1} ${y - e(54)} L${x + s * 12} ${y - 8}Z" fill="${c.in}"/>`;
    if (shape === 'round') return `<circle cx="${x + s * 4}" cy="${y - e(12)}" r="${e(13)}" fill="${c.m}"/><circle cx="${x + s * 4}" cy="${y - e(12)}" r="${e(7)}" fill="${c.in}"/>`;
    if (shape === 'cat') return `<path d="M${x} ${y} L${x} ${y - e(30)} L${x + s * 22} ${y - e(10)}Z" fill="${c.m}"/><path d="M${x + s * 3} ${y - 5} L${x + s * 3} ${y - e(22)} L${x + s * 15} ${y - e(10)}Z" fill="${c.in}"/>`;
    return `<path d="M${x} ${y} L${x - s * 6} ${y - e(22)} L${x + s * 18} ${y - e(8)}Z" fill="${c.d}"/>`;
  }
  // Head in local space: the UI edge is y = 0, the head rises into negative y.
  // The owl has its own head: feather ear tufts, a pale heart-shaped facial disc with a dark rim,
  // big amber eyes, a small hooked beak and feather chevrons on the forehead. It keeps the shared
  // expression classes so every mood and blink works the same way.
  function owlHead(a, st) {
    const c = a.c, y = -32, E = st.eye, k = st.ear, ir = (9.6 * E).toFixed(1), pu = (5.4 * E).toFixed(1);
    const tuft = (s) => `<path d="M${s * 18} ${y - 18} L${s * 34} ${y - 18 - 26 * k} L${s * 36} ${y - 10}Z" fill="${c.d}"/><path d="M${s * 22} ${y - 17} L${s * 33} ${y - 16 - 20 * k} L${s * 33} ${y - 12}Z" fill="${c.l}" opacity=".7"/>`;
    const eye = (x) => `<circle cx="${x}" cy="${y + 5}" r="${ir}" fill="#F2B33D"/><circle cx="${x}" cy="${y + 5}" r="${ir}" fill="none" stroke="#C47A12" stroke-width="1.4"/><circle cx="${x}" cy="${y + 5}" r="${pu}" fill="${K}"/>`;
    return `
    <g class="m-ear" data-s="1">${tuft(-1)}</g><g class="m-ear" data-s="-1">${tuft(1)}</g>
    <path d="M-42 ${y - 2} L-34 ${y - 22} L0 ${y - 29} L34 ${y - 22} L42 ${y - 2} L37 ${y + 30} L0 ${y + 42} L-37 ${y + 30}Z" fill="${c.m}"/>
    <path d="M-42 ${y - 2} L-34 ${y - 22} L0 ${y - 29} L0 ${y + 42} L-37 ${y + 30}Z" fill="${c.l}"/>
    <path d="M-20 ${y - 21} L-12 ${y - 14} L-4 ${y - 21} M4 ${y - 21} L12 ${y - 14} L20 ${y - 21} M-8 ${y - 26} L0 ${y - 19} L8 ${y - 26}" stroke="${c.d}" stroke-width="2" fill="none" stroke-linejoin="round" opacity=".8"/>
    <path d="M0 ${y - 10} C-10 ${y - 18} -32 ${y - 16} -33 ${y + 4} C-33 ${y + 22} -14 ${y + 30} 0 ${y + 34} C14 ${y + 30} 33 ${y + 22} 33 ${y + 4} C32 ${y - 16} 10 ${y - 18} 0 ${y - 10}Z" fill="${c.d}"/>
    <path d="M0 ${y - 7} C-9 ${y - 14} -29 ${y - 13} -30 ${y + 4} C-30 ${y + 20} -13 ${y + 27} 0 ${y + 31} C13 ${y + 27} 30 ${y + 20} 30 ${y + 4} C29 ${y - 13} 9 ${y - 14} 0 ${y - 7}Z" fill="${c.muz}"/>
    <path d="M0 ${y - 7} C9 ${y - 14} 29 ${y - 13} 30 ${y + 4} C30 ${y + 20} 13 ${y + 27} 0 ${y + 31}Z" fill="#EADFCC"/>
    <g class="m-face">
    <g class="m-eyes">
      <g class="m-eN"><g class="m-lid">${eye(-14)}${eye(14)}
        <g class="m-gloss"><circle cx="${ex2(-11.6, E)}" cy="${y + 2}" r="${(2.6 * E).toFixed(1)}" fill="#fff"/><circle cx="${ex2(16.4, E)}" cy="${y + 2}" r="${(2.6 * E).toFixed(1)}" fill="#fff"/></g></g></g>
      <path class="m-eH" d="M-21 ${y + 6} Q-14 ${y - 3} -7 ${y + 6} M7 ${y + 6} Q14 ${y - 3} 21 ${y + 6}" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
      <g class="m-eS" opacity="0"><circle cx="-14" cy="${y + 7}" r="7" fill="#F2B33D"/><circle cx="14" cy="${y + 7}" r="7" fill="#F2B33D"/><circle cx="-14" cy="${y + 7.5}" r="4.4" fill="${K}"/><circle cx="14" cy="${y + 7.5}" r="4.4" fill="${K}"/><path d="M-23 ${y - 3} L-8 ${y + 1} M23 ${y - 3} L8 ${y + 1}" stroke="${c.d}" stroke-width="3" stroke-linecap="round"/></g>
      <path class="m-eZ" d="M-21 ${y + 5} Q-14 ${y + 10} -7 ${y + 5} M7 ${y + 5} Q14 ${y + 10} 21 ${y + 5}" stroke="${K}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"/>
    </g>
    <ellipse class="m-blush" cx="-25" cy="${y + 20}" rx="5.5" ry="3.2" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="25" cy="${y + 20}" rx="5.5" ry="3.2" fill="#F28B7E" opacity=".55"/>
    <path d="M-5 ${y + 12} L5 ${y + 12} L1.2 ${y + 22} L0 ${y + 24} L-1.2 ${y + 22}Z" fill="#E9962A"/><path d="M0 ${y + 12} L5 ${y + 12} L1.2 ${y + 22} L0 ${y + 24}Z" fill="#C97A16"/>
    <path class="m-mouth" d="M-4 ${y + 27} Q0 ${y + 29} 4 ${y + 27}" stroke="${K}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/></g>`;
  }
  const ex2 = (dx, E) => (dx * (1 + (E - 1) * 0.3)).toFixed(1);
  function headSVG(a, st) {
    if (a.owl) return owlHead(a, st);
    const c = a.c, y = -32, E = st.eye;
    const ex = (dx) => (dx * (1 + (E - 1) * 0.3)).toFixed(1);
    return `
    <g class="m-ear" data-s="1">${earSVG(-30, y - 10, 1, c, a.ear, st.ear)}</g>
    <g class="m-ear" data-s="-1">${earSVG(30, y - 10, -1, c, a.ear, st.ear)}</g>
    <path d="M-40 ${y} L0 ${y - 26} L40 ${y} L0 ${y + 6}Z" fill="${c.l}"/>
    <path d="M-40 ${y} L0 ${y + 6} L-4 ${y + 40} L-30 ${y + 32}Z" fill="${c.m}"/>
    <path d="M40 ${y} L0 ${y + 6} L4 ${y + 40} L30 ${y + 32}Z" fill="${c.d}"/>
    ${a.cheeks ? `<path d="M-40 ${y} L-16 ${y + 18} L0 ${y + 40} L-30 ${y + 32}Z M40 ${y} L16 ${y + 18} L0 ${y + 40} L30 ${y + 32}Z" fill="${c.muz}"/>` : ''}
    ${a.mask ? `<path d="M-30 ${y + 2} L0 ${y - 14} L30 ${y + 2} L0 ${y + 12}Z" fill="#E9ECF0"/>` : ''}
    ${a.stripes ? `<path d="M-8 ${y - 20} L-5 ${y - 10} M0 ${y - 24} L0 ${y - 12} M8 ${y - 20} L5 ${y - 10}" stroke="${c.d}" stroke-width="3" stroke-linecap="round"/>` : ''}
    <g class="m-face"><path d="M-16 ${y + 18} L0 ${y + 8} L16 ${y + 18} L0 ${y + 40}Z" fill="${c.muz}"/>
    <path d="M-40 ${y} L0 ${y - 26}" stroke="#fff" stroke-width="1" opacity=".28"/>
    <g class="m-eyes">
      <g class="m-eN"><g class="m-lid"><ellipse cx="-15" cy="${y + 4}" rx="${(6 * E).toFixed(1)}" ry="${(6.8 * E).toFixed(1)}" fill="${K}"/><ellipse cx="15" cy="${y + 4}" rx="${(6 * E).toFixed(1)}" ry="${(6.8 * E).toFixed(1)}" fill="${K}"/>
        <g class="m-gloss"><circle cx="${ex(-12.6)}" cy="${y + 1.2}" r="${(2.3 * E).toFixed(1)}" fill="#fff"/><circle cx="${ex(17.4)}" cy="${y + 1.2}" r="${(2.3 * E).toFixed(1)}" fill="#fff"/><circle cx="-17" cy="${y + 7}" r="1" fill="#fff" opacity=".7"/><circle cx="13" cy="${y + 7}" r="1" fill="#fff" opacity=".7"/></g></g></g>
      <path class="m-eH" d="M-21 ${y + 5} Q-15 ${y - 3} -9 ${y + 5} M9 ${y + 5} Q15 ${y - 3} 21 ${y + 5}" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
      <g class="m-eS" opacity="0"><ellipse cx="-15" cy="${y + 6}" rx="5" ry="5.6" fill="${K}"/><ellipse cx="15" cy="${y + 6}" rx="5" ry="5.6" fill="${K}"/><circle cx="-13.4" cy="${y + 4}" r="1.8" fill="#fff"/><circle cx="16.6" cy="${y + 4}" r="1.8" fill="#fff"/><path d="M-22 ${y - 4} L-10 ${y - 1} M22 ${y - 4} L10 ${y - 1}" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/></g>
      <path class="m-eZ" d="M-21 ${y + 4} Q-15 ${y + 9} -9 ${y + 4} M9 ${y + 4} Q15 ${y + 9} 21 ${y + 4}" stroke="${K}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"/>
    </g>
    <ellipse class="m-blush" cx="-26" cy="${y + 16}" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="26" cy="${y + 16}" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/>
    <path d="M-5 ${y + 17} L5 ${y + 17} L0 ${y + 22}Z" fill="${K}"/>
    ${a.teeth ? `<rect x="-4" y="${y + 25}" width="3.6" height="5" rx="1" fill="#fff" stroke="${K}" stroke-width="1"/><rect x=".4" y="${y + 25}" width="3.6" height="5" rx="1" fill="#fff" stroke="${K}" stroke-width="1"/>` : ''}
    ${a.whisk ? `<path d="M-14 ${y + 20} L-40 ${y + 16} M-14 ${y + 23} L-40 ${y + 25} M14 ${y + 20} L40 ${y + 16} M14 ${y + 23} L40 ${y + 25}" stroke="#E8E4DE" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>` : ''}
    <path class="m-mouth" d="M-4 ${y + 25} Q0 ${y + 28} 4 ${y + 25}" stroke="${K}" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
  }
  // The tail never stands up. It lies along the top of the edge the head peeks from, a soft folded
  // brush with tufts on top, and its tip flops over the edge in front of the bar. It sways from the
  // bend like a pendulum and is drawn in front of the bar, so it reads as draped over it.
  const TAILS = {
    fox: (c) => ({ th: 1.3, tipK: 1.18, tip: c.muz, tip2: '#E6D8C4' }),
    wolf: (c) => ({ th: 0.86, tipK: 0.9, tip: c.muz, tip2: '#D9DEE5' }),
    cat: (c) => ({ th: 0.5, tipK: 0.62, tip: c.d, tip2: '#2E2E35' }),
  };
  function tailSVG(a) {
    if (!a.tail) return '';
    const c = a.c, T = TAILS[a.tail](c), y = (n) => (n * T.th).toFixed(1);
    return `<g class="t-base">
      <path d="M28 1 L38 ${y(-11)} L45 ${y(-17)} L51 ${y(-13)} L58 ${y(-19)} L64 ${y(-14)} L71 ${y(-18)} L76 ${y(-12)} L86 ${y(-8)} L62 ${y(-4)}Z" fill="${c.l}"/>
      <path d="M28 1 L62 ${y(-4)} L86 ${y(-8)} L89 2 L58 3Z" fill="${c.m}"/>
      <path d="M45 ${y(-17)} L51 ${y(-13)} L48 ${y(-8)}Z M58 ${y(-19)} L64 ${y(-14)} L61 ${y(-9)}Z" fill="${c.m}" opacity=".55"/>
      <g class="t-tip" data-k="${T.tipK}">
        <path d="M80 ${y(-11)} L92 ${y(-12)} L102 4 L95 11 L83 2Z" fill="${c.d}"/>
        <path d="M95 11 L102 4 L109 17 L104 30 L93 24Z" fill="${T.tip}"/>
        <path d="M93 24 L104 30 L98 35Z" fill="${T.tip2}"/>
        <path d="M102 4 L109 17 L104 14Z" fill="#fff" opacity=".35"/>
      </g>
    </g>`;
  }
  function pawsSVG(a) {
    const p = a.c.paw;
    const one = (x) => `<g class="m-paw"><ellipse cx="${x}" cy="1" rx="10" ry="6.5" fill="${p}"/><path d="M${x - 4} 3 l0 3 M${x + 4} 3 l0 3" stroke="#000" stroke-width="1.2" opacity=".32"/></g>`;
    return one(-21) + one(21);
  }
  // A still portrait for Settings.
  function portrait(id, stage = 'grown', size = 92) {
    const a = ANIMALS[id], st = STAGES[stage];
    return `<svg viewBox="-56 -110 112 ${size + 30}" aria-hidden="true"><g transform="scale(${st.head})">${headSVG(a, st)}</g><rect x="-56" y="0" width="112" height="${size}" fill="var(--pane)"/><line x1="-56" y1="0" x2="56" y2="0" stroke="var(--line-strong)"/><g transform="scale(${st.head})">${pawsSVG(a)}</g></svg>`;
  }

  // ---------- springs ----------
  const spring = (x, k, c) => ({ x, v: 0, t: x, k, c });
  function step(s, dt, reduced) {
    if (reduced) { s.x = s.t; s.v = 0; return; }
    const a = -s.k * (s.x - s.t) - s.c * s.v; s.v += a * dt; s.x += s.v * dt;
  }

  // ---------- engine ----------
  const M = {
    animal: 'fox', stage: 'kit', enabled: true, answering: true, reduced: false,
    layout: null, // fn returning { spots, keepOut }
    spot: 'bar', cur: null,
    s: {
      peek: spring(0, 170, 17), slide: spring(0, 80, 14), tilt: spring(0, 120, 11), squash: spring(1, 420, 14),
      lookX: spring(0, 160, 18), lookY: spring(0, 160, 18), earL: spring(0, 260, 11), earR: spring(0, 260, 11),
      tail: spring(0, 70, 7), room: spring(1, 200, 24), turn: spring(0, 170, 13), pitch: spring(0, 170, 14), lean: spring(0, 150, 12), puff: spring(1, 160, 12), tailFade: spring(0, 220, 26), cock: spring(0, 260, 24),
      paw: spring(0, 200, 16), pawLift: spring(0, 240, 14), size: spring(1, 120, 16),
    },
    bobY: 0, bobV: 0, wag: 0, wagRate: 2.4, wagAmp: 4, mood: 'n', next: null, gliding: false,
    lookTarget: null, timers: [], lastInput: performance.now(), dozing: false,
    tailSide: 1, cache: {}, shift: {}, visible: false, lastSpot: null, recent: [], cursor: null,
  };
  // Check-ins use a stiffer, less damped peek so the pop is quick and lands with a small overshoot.
  function snappy(on) { const p = M.s.peek; p.k = on ? 620 : 170; p.c = on ? 34 : 17; }
  const later = (ms, f) => { const t = setTimeout(f, ms); M.timers.push(t); return t; };
  const clearTimers = () => { M.timers.forEach(clearTimeout); M.timers = []; };

  let svg, root, head, tail, paws, clipP, front;
  function build() {
    const a = ANIMALS[M.animal], st = STAGES[M.stage];
    svg.innerHTML = `<defs><clipPath id="mClip" clipPathUnits="userSpaceOnUse"><path id="mClipP" clip-rule="evenodd"/></clipPath></defs>
      <g clip-path="url(#mClip)"><g id="mRoot"><g id="mHead">${headSVG(a, st)}</g></g></g>
      <g id="mFront"><g id="mTail">${tailSVG(a)}</g><g id="mPaws">${pawsSVG(a)}</g></g>`;
    root = svg.querySelector('#mRoot'); head = svg.querySelector('#mHead'); tail = svg.querySelector('#mTail');
    paws = svg.querySelector('#mPaws'); clipP = svg.querySelector('#mClipP'); front = svg.querySelector('#mFront');
    M.s.size.x = M.s.size.t = st.head;
    setMood(M.mood);
  }
  const q = (sel) => svg.querySelectorAll(sel);
  function setMood(m) {
    M.mood = m;
    const show = (sel, on) => q(sel).forEach((e) => (e.style.opacity = on ? 1 : 0));
    show('.m-eN', m === 'n' || m === 'w' || m === 'c'); show('.m-eH', m === 'h' || m === 'k'); show('.m-eS', m === 's'); show('.m-eZ', m === 'z');
    const y = -32;
    const mouth = { n: `M-4 ${y + 25} Q0 ${y + 28} 4 ${y + 25}`, w: `M-3 ${y + 26} Q0 ${y + 27} 3 ${y + 26}`, h: `M-6 ${y + 24} Q0 ${y + 34} 6 ${y + 24}Z`, s: `M-4 ${y + 28} Q0 ${y + 25} 4 ${y + 28}`, z: `M-3 ${y + 26} Q0 ${y + 27} 3 ${y + 26}`, c: `M-5 ${y + 26} Q-2.5 ${y + 24} 0 ${y + 26} Q2.5 ${y + 28} 5 ${y + 26}`, k: `M-5 ${y + 24.5} Q0 ${y + 29.5} 5 ${y + 24.5}`, o: `M-4 ${y + 24} Q0 ${y + 33} 4 ${y + 24} Q0 ${y + 21} -4 ${y + 24}Z` }[m] || '';
    q('.m-mouth').forEach((e) => { e.setAttribute('d', mouth); e.setAttribute('fill', m === 'h' || m === 'o' ? '#7A2E24' : 'none'); });
    q('.m-blush').forEach((e) => (e.style.opacity = m === 'h' ? 0.85 : m === 'k' ? 0.75 : 0.55));
    // a lazy sway at rest, a happy swish, almost still when sad
    M.wagRate = m === 'h' ? 9 : m === 's' ? 0.8 : m === 'z' ? 0.5 : 1.8; M.wagAmp = m === 'h' ? 11 : m === 's' ? 1.5 : 4;
    M.s.puff.t = 1;
  }

  function anchorOf(sp) {
    const r = sp.rect;
    if (sp.side === 'top') return { x: sp.at, y: r.top, rot: 0, horiz: true };
    if (sp.side === 'bottom') return { x: sp.at, y: r.bottom, rot: 180, horiz: true };
    if (sp.side === 'right') return { x: r.right, y: sp.at, rot: 90, horiz: false };
    return { x: r.left, y: sp.at, rot: -90, horiz: false };
  }
  // Footprint of the companion at its highest pop, in screen space, to test against question text.
  function footprint(sp) {
    const a = anchorOf(sp), h = 92 * (STAGES[M.stage].head), w = 70;
    if (sp.side === 'top') return { left: a.x - w, right: a.x + w, top: a.y - h, bottom: a.y + 8 };
    if (sp.side === 'bottom') return { left: a.x - w, right: a.x + w, top: a.y - 8, bottom: a.y + h };
    if (sp.side === 'right') return { left: a.x + 2, right: a.x + h, top: a.y - w, bottom: a.y + w };
    return { left: a.x - h, right: a.x - 2, top: a.y - w, bottom: a.y + w };
  }
  const GAP = 14; // keep a visible gap from any text, not just avoid touching it
  const HEAD_H = 98, HALF_W = 64, MIN_PEEK = 0.5;
  // Text on the companion's side of the edge, including a line cut in half by the edge (scrolled
  // partly behind a bar): that line is visible too, so it leaves no room at all.
  function blockers(sp, keepOut, a) {
    const hw = HALF_W + GAP, out = [];
    keepOut.forEach((r) => {
      if (sp.side === 'top' && r.right > a.x - hw && r.left < a.x + hw && r.top < a.y - 1) out.push({ room: r.bottom <= a.y + 1 ? a.y - r.bottom : 0, line: Math.min(r.bottom, a.y) });
      if (sp.side === 'bottom' && r.right > a.x - hw && r.left < a.x + hw && r.bottom > a.y + 1) out.push({ room: r.top >= a.y - 1 ? r.top - a.y : 0, line: Math.max(r.top, a.y) });
      if (sp.side === 'right' && r.bottom > a.y - hw && r.top < a.y + hw && r.right > a.x + 1) out.push({ room: r.left >= a.x - 1 ? r.left - a.x : 0, line: Math.max(r.left, a.x) });
      if (sp.side === 'left' && r.bottom > a.y - hw && r.top < a.y + hw && r.left < a.x - 1) out.push({ room: r.right <= a.x + 1 ? a.x - r.right : 0, line: Math.min(r.right, a.x) });
    });
    return out;
  }
  // How far the companion may rise out of this edge without coming within GAP of any text.
  // 1 is a full peek. Below MIN_PEEK (eyes only) the spot is not used at all.
  function capFor(sp, keepOut) {
    const a = anchorOf(sp), h = HEAD_H * STAGES[M.stage].head;
    const room = blockers(sp, keepOut, a).reduce((m, b) => Math.min(m, b.room), Infinity);
    return Math.min(1.08, (room - GAP) / h);
  }
  // The screen line that the companion's outline must stay GAP away from, along the peek direction.
  function limitFor(sp, keepOut) {
    const a = anchorOf(sp), bs = blockers(sp, keepOut, a);
    if (!bs.length) return null;
    const ls = bs.map((b) => b.line);
    return sp.side === 'top' || sp.side === 'left' ? Math.max(...ls) : Math.min(...ls);
  }
  function validSpot(name) {
    const L = M.layout(); const sp = L.spots[name];
    if (!sp) return null;
    const f = footprint(sp);
    if (f.left < -1 || f.right > innerWidth + 1 || f.top < 0 || f.bottom > innerHeight) {
      if (sp.side !== 'top') return null; // the bar spots may still be used at a lower peek
    }
    if (capFor(sp, L.keepOut) < MIN_PEEK) return null;
    return sp;
  }
  // a spot that just scrolled away is held where it was for the moment it takes to duck and move
  function spotNow(name) { const L = M.layout(); if (L.spots[name]) return (M.cache[name] = L.spots[name]); return M.cache[name] || L.spots.bar; }

  function goTo(name, opts = {}) {
    const sp = validSpot(name);
    if (!sp) return false;
    const cur = spotNow(M.spot), a = anchorOf(sp), ca = anchorOf(cur);
    const sameEdge = sp.side === cur.side && Math.abs(sp.rect.top - cur.rect.top) < 1 && Math.abs(sp.rect.bottom - cur.rect.bottom) < 1 && a.horiz;
    if (name === M.spot) { if (M.s.peek.t < 0.5) M.s.peek.t = 1; return true; }
    if (sameEdge && !opts.duck) {
      M.spot = name; M.gliding = true; M.s.peek.t = 0.34; M.s.slide.t = a.x; M.s.paw.t = 0; return true;
    }
    M.next = name; M.s.peek.t = -0.2; M.s.paw.t = 0; return true;
  }

  // ---------- when it is on screen ----------
  // While the student answers, the companion is fully tucked away. It pops out of a fresh spot the
  // moment they press Check, reacts, settles into a calm neutral (blinking, eyes on the cursor), and
  // ducks away again when they press Next. Each pop uses a spot it has not used recently, and never
  // the same spot twice in a row.
  const SPOTS = ['bar', 'barR', 'next', 'top', 'edge', 'edgeL', 'figure', 'choice', 'choiceL'];
  function pickSpot(exclude = []) {
    const valid = SPOTS.filter((n) => n !== M.lastSpot && !exclude.includes(n) && validSpot(n));
    // Only one spot has room on this screen: use it, but slide to a different stretch of it, so
    // the companion never comes out of the same place twice in a row.
    if (!valid.length) {
      const only = SPOTS.find((n) => !exclude.includes(n) && validSpot(n)) || (validSpot('bar') ? 'bar' : null);
      if (!only) return null;
      const prev = M.shift[only] || 0; let d;
      do { d = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 110); } while (Math.abs(d - prev) < 80);
      M.shift[only] = d; M.lastSpot = only; return only;
    }
    const fresh = valid.filter((n) => !M.recent.includes(n));
    const pool = fresh.length ? fresh : valid;
    const nm = pool[Math.floor(Math.random() * pool.length)];
    M.recent = [nm, ...M.recent].slice(0, Math.max(1, SPOTS.filter(validSpot).length - 1));
    M.lastSpot = nm;
    return nm;
  }
  function hide() { clearTimers(); M.visible = false; M.next = null; M.dozing = false; M.lookTarget = null; M.s.peek.t = -0.25; M.s.tilt.t = 0; ears(0, 0, 0); setMood('n'); }
  // pop out of a new spot with a quick, slightly overshooting spring
  function popOut() {
    clearTimers(); M.visible = true; M.dozing = false; M.lookTarget = null; setMood('n');
    const nm = pickSpot(); if (!nm) return false;
    snappy(true); later(700, () => snappy(false));
    M.next = nm; M.s.peek.t = -0.2;
    return true;
  }
  // hop to another fresh spot mid-celebration (used by the long-streak finale)
  function hop() { const nm = pickSpot([M.spot]); if (nm) { snappy(true); goTo(nm, { duck: true }); later(600, () => snappy(false)); } }

  // ---------- reactions ----------
  const ears = (l, r, ms) => { M.s.earL.t = l; M.s.earR.t = r; if (ms) later(ms, () => { M.s.earL.t = 0; M.s.earR.t = 0; }); };
  const bob = (v) => { if (M.reduced) return; M.bobV = -v; };
  // back to calm: neutral face, blinking, eyes following the cursor
  const settle = (ms) => later(ms, () => { setMood('n'); M.s.peek.t = 1; M.s.tilt.t = 0; ears(0, 0, 0); M.lookTarget = null; });
  const wiggle = (n, deg, gap) => { for (let i = 0; i < n; i++) later(i * gap, () => (M.s.tilt.t = i % 2 ? -deg : deg)); later(n * gap, () => (M.s.tilt.t = 0)); };
  function signature() {
    const s = ANIMALS[M.animal].sig;
    // fox: the tail fluffs up and swishes fast along the bar, staying low the whole time
    if (s === 'tailSwish') { M.wagRate = 15; M.wagAmp = 16; M.s.puff.t = 1.18; later(1200, () => { M.s.puff.t = 1; M.wagRate = Math.min(M.wagRate, 10); M.wagAmp = Math.min(M.wagAmp, 12); }); bob(150); later(300, () => bob(120)); }
    if (s === 'earFlop') { ears(28, -20, 0); later(180, () => ears(-22, 28, 0)); later(360, () => ears(24, -18, 0)); later(560, () => ears(0, 0, 0)); bob(160); later(320, () => bob(150)); }
    if (s === 'pawBat') { M.s.pawLift.t = 1; later(170, () => (M.s.pawLift.t = 0)); later(340, () => (M.s.pawLift.t = 1)); later(510, () => (M.s.pawLift.t = 0)); M.s.tilt.t = -8; later(600, () => (M.s.tilt.t = 0)); }
    if (s === 'owlTilt') { M.s.tilt.t = 24; later(380, () => (M.s.tilt.t = -24)); later(760, () => (M.s.tilt.t = 0)); bob(120); }
    if (s === 'pawWave') { M.s.pawLift.t = 1.4; wiggle(5, 7, 140); later(860, () => { M.s.pawLift.t = 0; }); }
    if (s === 'howl') { setMood('o'); M.s.tilt.t = -14; M.s.peek.t = 1.1; later(1100, () => { M.s.tilt.t = 0; setMood('h'); }); [0, 1, 2].forEach((i) => later(140 + i * 160, () => window.Sound && window.Sound.enabled && window.Sound.play('tap'))); }
  }
  // happiness grows with the streak: a bigger smile, livelier tail, more bounce, longer celebration
  function happy(tier) { setMood('h'); M.wagRate = 4 + tier * 2.4; M.wagAmp = 5 + tier * 2.4; q('.m-blush').forEach((e) => (e.style.opacity = Math.min(1, 0.6 + tier * 0.1))); }
  const OUT = 330; // time for the pop to land before the reaction starts
  const R = {
    // a new question: stay tucked away so the student can focus
    arrive() { hide(); },
    next() { hide(); },
    // the student picked a choice: nothing to show while they work
    picked() { wake(); },
    correct(streak) {
      wake(); popOut();
      const tier = Math.min(Math.max(streak, 1), 5);
      later(OUT, () => {
        happy(tier); ears(-12 - tier * 2, -12 - tier * 2, 500 + tier * 120); bob(120 + tier * 14);
        if (tier >= 2) { M.s.peek.t = 1.06; later(300, () => bob(130)); }
        if (tier >= 3) later(560, () => signature());
        if (tier >= 4) { later(260, () => wiggle(6, 11, 105)); later(1500, () => { bob(160); signature(); }); }
        if (tier >= 5) {
          // the finale: a burst of hide-and-seek through two more fresh spots
          later(1300, () => hop()); later(1800, () => { happy(5); bob(150); signature(); });
          later(2600, () => hop()); later(3100, () => { happy(5); bob(160); wiggle(4, 12, 100); signature(); });
        }
      });
      settle(OUT + [0, 1300, 1700, 2200, 2900, 4300][tier]);
    },
    // Not judging. A small "oh?" with a puzzled tilt, then a gentle nod and a kind smile
    // ("that's okay"), then it reads the explanation along with the student.
    wrong() {
      wake(); popOut();
      later(OUT, () => { setMood('c'); M.s.peek.t = 0.88; ears(18, -8, 0); M.s.tilt.t = 12; });
      later(OUT + 900, () => {
        setMood('k'); M.s.tilt.t = 0; ears(-6, -6, 0); M.s.peek.t = 1;
        [0, 220, 440, 660].forEach((d, i) => later(d, () => (M.s.peek.t = i % 2 ? 1 : 0.9)));
      });
      later(OUT + 2100, () => { setMood('n'); ears(0, 0, 0); look('explain'); });
      later(OUT + 3700, () => look(null));
    },
    results(perfect) {
      wake(); popOut();
      later(OUT, () => { happy(perfect ? 5 : 3); bob(170); ears(-14, -14, 600); });
      if (perfect) later(OUT + 700, () => { signature(); later(900, () => signature()); });
      settle(OUT + (perfect ? 2800 : 1600));
    },
    doze() { if (M.mood !== 'n' || !M.visible) return; M.dozing = true; setMood('z'); M.s.peek.t = 0.78; M.s.tilt.t = 9; ears(18, 18, 0); },
  };
  function look(what) {
    if (!what) { M.lookTarget = null; return; }
    M.lookTarget = typeof what === 'string' ? document.getElementById(what === 'stem' ? 'qStem' : what === 'explain' ? 'explainText' : what) : what;
  }
  function wake() {
    M.lastInput = performance.now();
    if (M.dozing) { M.dozing = false; setMood('n'); M.s.peek.t = 1.06; M.s.tilt.t = 0; ears(-16, -16, 300); M.s.squash.v = 5; later(300, () => (M.s.peek.t = 1)); }
  }

  // ---------- frame loop ----------
  let last = performance.now(), blinkAt = performance.now() + 2500;
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000); last = t;
    if (!M.enabled || !M.layout) { svg.style.display = 'none'; requestAnimationFrame(frame); return; }
    svg.style.display = '';
    const s = M.s;
    // finished ducking: move the anchor to the new element, then come out of its edge
    if (M.next && s.peek.x < 0.03) {
      const nm = validSpot(M.next) ? M.next : 'bar'; M.next = null; M.spot = nm;
      const nsp = spotNow(nm), a = anchorOf(nsp); s.slide.x = s.slide.t = a.horiz ? a.x : a.y; s.peek.v = 0; s.peek.t = 1; s.squash.v = 3;
      s.cock.x = s.cock.t = nsp.cock || 0; s.cock.v = 0;
    }
    // once tucked away between questions, park at home so no stale spot is left behind
    if (!M.visible && !M.next && s.peek.x < 0.03 && M.spot !== 'bar') { M.spot = 'bar'; M.cache = {}; const h = anchorOf(spotNow('bar')); s.slide.x = s.slide.t = h.x; s.cock.x = s.cock.t = 0; }
    const sp = spotNow(M.spot), a = anchorOf(sp);
    if (M.gliding && Math.abs(s.slide.x - s.slide.t) < 2) { M.gliding = false; s.peek.t = M.mood === 's' ? 0.6 : 1; s.squash.v = 3; }
    if (!M.gliding) s.slide.t = a.horiz ? a.x : a.y;
    s.cock.t = sp.cock || 0;
    // vertical bob, capped so the chin never leaves the edge
    M.bobV += 1500 * dt; M.bobY += M.bobV * dt; if (M.bobY > 0) { if (M.bobV > 120) s.squash.v += M.bobV * 0.004; M.bobY = 0; M.bobV = 0; }
    M.bobY = Math.max(M.bobY, -9);
    // idle life while the student is thinking
    const idle = t - M.lastInput;
    if (M.visible && M.mood === 'n' && !M.dozing && idle > 45000) R.doze();
    if (t > blinkAt && (M.mood === 'n' || M.mood === 'w')) { blink(); blinkAt = t + 1800 + Math.random() * 4200; }
    // eyes follow a target element
    const lt = M.lookTarget || (M.mood === 'n' && !M.dozing && M.cursor ? M.cursor : null), isPt = lt && typeof lt.x === 'number' && !lt.getBoundingClientRect;
    if (lt && (isPt || lt.isConnected)) {
      const r = isPt ? null : lt.getBoundingClientRect(), tx = isPt ? lt.x : r.left + r.width / 2, ty = isPt ? lt.y : r.top + r.height / 2;
      const hx = a.horiz ? s.slide.x : a.x, hy = a.horiz ? a.y - 30 : s.slide.x;
      let dx = tx - hx, dy = ty - hy; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      const rad = (-a.rot * Math.PI) / 180, lx = dx * Math.cos(rad) - dy * Math.sin(rad), ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      s.lookX.t = lx * 5; s.lookY.t = ly * 3.6;
      // Eager following in its calm moments, all in the head: it turns and tips toward the cursor
      // with a springy overshoot, the face shifts more than the outline (a little 3D turn), the ear
      // on that side perks, and it stretches up toward the cursor when it is close or moving fast.
      const follow = !M.lookTarget && M.mood === 'n' && M.visible && !M.next;
      const lxRaw = (tx - hx) * Math.cos(rad) - (ty - hy) * Math.sin(rad), lyRaw = (tx - hx) * Math.sin(rad) + (ty - hy) * Math.cos(rad);
      M.cursorZip = Math.max(0, (M.cursorZip || 0) - dt * 2.4);
      s.turn.t = follow ? Math.max(-1, Math.min(1, lxRaw / 240)) : 0;
      s.pitch.t = follow ? Math.max(-1, Math.min(1, (lyRaw + 40) / 260)) : 0;
      s.lean.t = follow ? Math.min(1, Math.max(0, 1 - n / 380) + M.cursorZip * 0.6) : 0;
    } else { s.lookX.t = 0; s.lookY.t = 0; s.turn.t = 0; s.pitch.t = 0; s.lean.t = 0; }
    s.paw.t = s.peek.x > 0.7 && !M.gliding && !M.next ? 1 : 0;
    M.wag += dt * M.wagRate; s.tail.t = Math.sin(M.wag) * M.wagAmp;
    Object.values(s).forEach((sp_) => step(sp_, dt, M.reduced));
    const along = s.slide.x, ax = a.horiz ? along : a.x, ay = a.horiz ? a.y : along;
    const size = s.size.x, depth = 74;
    const breathe = M.reduced ? 1 : 1 + Math.sin(t / 900) * 0.008;
    // the cap is re-measured every frame, so text that moves (an unfolding explanation, a scroll)
    // pushes the companion down instead of being covered
    const cap = capFor(sp, M.layout().keepOut);
    M.cap = cap;
    // its spot lost its room (the explanation unfolded above it, or the page scrolled): rather than
    // stay squashed out of sight, it ducks and comes out of another fresh spot
    if (M.visible && !M.next && (cap < MIN_PEEK || !M.layout().spots[M.spot]) && t > (M.relocAt || 0)) { M.relocAt = t + 900; hop(); }
    // with too little room for even its eyes, it stays tucked away rather than showing ear tips
    s.room.t = cap < 0.32 ? 0 : cap;
    const shown = Math.min(s.peek.x, Math.max(0, s.room.x));
    const reach = (sp.reach || 0) * Math.max(0, Math.min(1, shown, cap - 0.2)); // side peeks lean out further so both eyes clear the corner
    const leanOut = Math.min(s.lean.x * 9, Math.max(0, (cap - shown) * depth)); // only into space that is free
    const off = (1 - shown) * depth - reach - leanOut + (cap < 1 ? 0 : M.bobY) + (M.push || 0); // no upward bob when space is tight
    const lean = M.gliding ? Math.max(-9, Math.min(9, s.slide.v * 0.02)) : 0;
    root.setAttribute('transform', `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${a.rot}) scale(${size.toFixed(3)})`);
    head.setAttribute('transform', `translate(${(s.turn.x * 9).toFixed(1)} ${off.toFixed(1)}) rotate(${(s.tilt.x + lean + s.cock.x + s.turn.x * 15).toFixed(2)} 0 -12) scale(${((2 - s.squash.x) * (1 - Math.abs(s.turn.x) * 0.05)).toFixed(3)} ${(s.squash.x * breathe * (1 + s.lean.x * 0.035 - s.pitch.x * 0.02)).toFixed(3)})`);
    drawTail(a, ax, ay, size, lean, shown);
    q('.m-eyes').forEach((e) => e.setAttribute('transform', `translate(${s.lookX.x.toFixed(2)} ${s.lookY.x.toFixed(2)})`));
    q('.m-face').forEach((e) => e.setAttribute('transform', `translate(${(s.turn.x * 6).toFixed(2)} ${(s.pitch.x * 3.5).toFixed(2)})`));
    const eg = M.gliding ? 16 : 0, ears_ = q('.m-ear');
    const perk = s.lean.x * 8, side = s.turn.x * 10; // the ear nearer the cursor perks forward
    if (ears_[0]) ears_[0].setAttribute('transform', `rotate(${(-(s.earL.x + eg) + perk + Math.max(0, -side)).toFixed(2)} -22 -44)`);
    if (ears_[1]) ears_[1].setAttribute('transform', `rotate(${(s.earR.x + eg - perk - Math.max(0, side)).toFixed(2)} 22 -44)`);
    front.setAttribute('transform', `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${a.rot}) scale(${size.toFixed(3)})`);
    const pw = q('.m-paw'), lift = s.pawLift.x;
    paws.setAttribute('transform', `translate(0 ${((1 - s.paw.x) * 16).toFixed(1)})`);
    paws.style.opacity = a.horiz ? Math.max(0, Math.min(1, s.paw.x)).toFixed(2) : 0; // paws only grip horizontal edges
    if (pw[1]) pw[1].setAttribute('transform', `translate(${(lift * 4).toFixed(1)} ${(-lift * 14).toFixed(1)}) rotate(${(-lift * 18).toFixed(1)} 21 1)`);
    // Last line of defence: measure the real outline (ears, stretch and all) and push the head back
    // behind its edge if any part comes within GAP of text. Relaxes again once there is room.
    const lim = limitFor(sp, M.layout().keepOut);
    if (lim !== null) {
      const hb = head.getBoundingClientRect();
      const v = sp.side === 'top' ? lim + GAP - hb.top : sp.side === 'bottom' ? hb.bottom - (lim - GAP) : sp.side === 'right' ? hb.right - (lim - GAP) : lim + GAP - hb.left;
      if (v > 0) M.push = (M.push || 0) + v / size + 0.5;
      else if (v < -6) M.push = Math.max(0, (M.push || 0) - 40 * dt);
    } else M.push = Math.max(0, (M.push || 0) - 40 * dt);
    // the clip hides the companion inside the element it peeks out of
    const r = sp.rect, W = innerWidth, H = innerHeight;
    clipP.setAttribute('d', `M0 0 H${W} V${H} H0Z M${r.left} ${r.top} V${r.bottom} H${r.right} V${r.top}Z`);
    requestAnimationFrame(frame);
  }
  // ---------- tail ----------
  // Which side of the head the tail lies on: whichever side is free of the bar's own contents
  // (progress dots, the button, feedback text). It only switches sides while tucked away.
  function tailFoot(side, ax, ay, size) { const x1 = ax + side * 26 * size, x2 = ax + side * 112 * size; return { left: Math.min(x1, x2), right: Math.max(x1, x2), top: ay - 22 * size, bottom: ay + 38 * size }; }
  function tailFree(side, ax, ay, size, avoid) {
    const f = tailFoot(side, ax, ay, size);
    if (f.left < -30 || f.right > innerWidth + 30) return false;
    return !avoid.some((r) => !(f.right < r.left - 10 || f.left > r.right + 10 || f.bottom < r.top - 4 || f.top > r.bottom + 4));
  }
  function drawTail(a, ax, ay, size, lean, shown) {
    if (!tail.querySelector('.t-base')) return;
    const s = M.s, avoid = M.layout().avoid || [], horiz = a.rot === 0;
    let want = M.tailSide;
    if (horiz && !tailFree(want, ax, ay, size, avoid)) want = tailFree(-want, ax, ay, size, avoid) ? -want : 0;
    if (!horiz) { s.tailFade.x = 0; s.tailFade.v = 0; s.tailFade.t = 0; }
    else if (want !== 0 && want !== M.tailSide) { s.tailFade.t = 0; if (s.tailFade.x < 0.05) M.tailSide = want; }
    else s.tailFade.t = want !== 0 && shown > 0.45 && !M.next ? 1 : 0;
    const out = Math.max(0, Math.min(1, s.tailFade.x)), side = M.tailSide;
    const baseRot = Math.max(-5, Math.min(3, -s.tail.x * 0.3));
    const trail = M.gliding ? Math.max(-12, Math.min(12, s.slide.v * 0.03 * side)) : 0;
    const droop = M.mood === 's' ? 14 : M.mood === 'z' ? 10 : 0;
    const tipRot = Math.max(-12, Math.min(26, s.tail.x + droop + trail));
    tail.style.opacity = out.toFixed(2);
    tail.setAttribute('transform', `scale(${side} 1) translate(26 0) scale(${(0.55 + 0.45 * out).toFixed(3)} ${(out * s.puff.x).toFixed(3)}) rotate(${baseRot.toFixed(2)}) translate(-26 0)`);
    const tip = tail.querySelector('.t-tip'), k = +tip.dataset.k;
    tip.setAttribute('transform', `rotate(${tipRot.toFixed(2)} 84 -5) translate(84 -5) scale(${k}) translate(-84 5)`);
  }

  function blink(dbl) {
    const lids = q('.m-lid'); if (!lids.length || M.reduced) return;
    const anim = (d) => lids.forEach((l) => l.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }], { duration: 150, delay: d, transformOrigin: 'center', easing: 'ease-in-out' }));
    lids.forEach((l) => { l.style.transformBox = 'fill-box'; l.style.transformOrigin = 'center'; });
    anim(0); if (dbl === true || Math.random() < 0.25) anim(210);
  }

  window.Mascot = {
    ANIMALS, STAGES, portrait, R, goTo, wake, look,
    // A free-standing head (for results screens): an <svg> string, plus a mood setter for it.
    head(id = 'fox', stage = 'grown') { const A = ANIMALS[id], st = STAGES[stage]; return `<svg class="m-solo" viewBox="-60 -112 120 128" aria-hidden="true"><g transform="scale(${st.head})">${headSVG(A, st)}</g></svg>`; },
    moodOn(el, m) {
      const qq = (sel) => el.querySelectorAll(sel), show = (sel, on) => qq(sel).forEach((e) => (e.style.opacity = on ? 1 : 0));
      show('.m-eN', m === 'n' || m === 'w' || m === 'c' || m === 'o'); show('.m-eH', m === 'h' || m === 'k'); show('.m-eS', m === 's'); show('.m-eZ', m === 'z');
      const y = -32, mouth = { n: `M-4 ${y + 25} Q0 ${y + 28} 4 ${y + 25}`, h: `M-6 ${y + 24} Q0 ${y + 34} 6 ${y + 24}Z`, k: `M-5 ${y + 24.5} Q0 ${y + 29.5} 5 ${y + 24.5}`, c: `M-5 ${y + 26} Q-2.5 ${y + 24} 0 ${y + 26} Q2.5 ${y + 28} 5 ${y + 26}`, o: `M-4 ${y + 24} Q0 ${y + 33} 4 ${y + 24} Q0 ${y + 21} -4 ${y + 24}Z`, z: `M-3 ${y + 26} Q0 ${y + 27} 3 ${y + 26}`, s: `M-4 ${y + 28} Q0 ${y + 25} 4 ${y + 28}`, w: `M-3 ${y + 26} Q0 ${y + 27} 3 ${y + 26}` }[m] || '';
      qq('.m-mouth').forEach((e) => { e.setAttribute('d', mouth); e.setAttribute('fill', m === 'h' || m === 'o' ? '#7A2E24' : 'none'); });
      qq('.m-blush').forEach((e) => (e.style.opacity = m === 'h' ? 0.85 : m === 'k' ? 0.75 : 0.5));
    },
    blinkOn(el) { el.querySelectorAll('.m-lid').forEach((l) => { l.style.transformBox = 'fill-box'; l.style.transformOrigin = 'center'; l.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }], { duration: 150, easing: 'ease-in-out' }); }); },
    init(el, layoutFn) { svg = el; M.layout = layoutFn; build(); M.s.peek.x = M.s.peek.t = -0.25;
      addEventListener('pointermove', (e) => { const p = M.cursor, now = performance.now(); if (p && p.t) { const v = Math.hypot(e.clientX - p.x, e.clientY - p.y) / Math.max(8, now - p.t); M.cursorZip = Math.min(1, (M.cursorZip || 0) + v * 0.08); } M.cursor = { x: e.clientX, y: e.clientY, t: now }; }); const a = anchorOf(spotNow('bar')); M.s.slide.x = M.s.slide.t = a.x; requestAnimationFrame(frame); },
    setAnimal(id, stage) { M.animal = id; if (stage) M.stage = stage; build(); },
    setStage(stage) { M.stage = stage; build(); },
    setAnswering(v) { M.answering = v; if (v) hide(); },
    setEnabled(v) { M.enabled = v; },
    setReduced(v) { M.reduced = v; },
    get state() { return M; },
  };
})();
