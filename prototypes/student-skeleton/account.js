/* The account menu. It opens from the avatar, as on Google, YouTube or Instagram:
   a small panel, never a full screen. Escape, a click outside or a new page closes it. */
(() => {
  const menu = document.createElement("div");
  menu.className = "acct"; menu.id = "acct"; menu.hidden = true; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Account");
  document.body.append(menu);
  const THEMES = [["device", "Use device setting"], ["dark", "Dark"], ["light", "Light"]];
  const opener = () => document.querySelector(".me-top");
  const isOpen = () => !menu.hidden;
  /* Draw a fox apart from the page's, so their per-fox styles never collide. */
  function face(size, wearing) {
    const n = foxN, w = state.wearing;
    foxN = 9000 + Math.floor(Math.random() * 900);
    if (wearing !== undefined) state.wearing = wearing;
    const s = fox(size);
    state.wearing = w; foxN = n;
    return s;
  }
  const back = (title) => `<button class="am-row" role="menuitem" data-am="main"><span class="am-left"><i class="chev back"></i><span class="am-title">${title}</span></span></button><div class="am-rule"></div>`;
  const tick = (on) => (on ? `<i class="tick"></i>` : "");
  const PANELS = {
    main: () => `<div class="am-who"><span class="am-face">${face(48)}</span><div><b>${MAYA.name}</b><span>${P().label} plan</span></div></div><div class="am-rule"></div>
      <button class="am-row" role="menuitem" data-am="character"><span>Change character</span><i class="chev"></i></button>
      <a class="am-row" role="menuitem" href="#/profile"><span>Account settings</span></a>
      <a class="am-row" role="menuitem" href="#/rewards"><span>Rewards</span><small>${tokens()} tokens</small></a>
      <button class="am-row" role="menuitem" data-am="appearance"><span>Appearance</span><small>${THEMES.find((t) => t[0] === themeChoice())[1].replace("Use device setting", "Device")}</small></button>
      <div class="am-rule"></div>
      <button class="am-row" role="menuitem" data-am-logout><span>Log out</span></button>`,
    character: () => {
      const options = [[null, "Fox"]];
      if (state.prize) options.push([MAYA.prize.id, `Fox with ${MAYA.prize.name.toLowerCase()}`]);
      return back("Change character") + options.map(([id, name]) => `<button class="am-row" role="menuitemradio" aria-checked="${state.wearing === id}" data-am-wear="${id || ""}"><span class="am-left"><span class="am-face">${face(48, id)}</span><span>${name}</span></span>${tick(state.wearing === id)}</button>`).join("") + `<p class="am-note">Mystery boxes unlock more. <a href="#/rewards">See your rewards</a></p>`;
    },
    appearance: () => back("Appearance") + THEMES.map(([id, name]) => `<button class="am-row" role="menuitemradio" aria-checked="${themeChoice() === id}" data-am-theme="${id}"><span>${name}</span>${tick(themeChoice() === id)}</button>`).join(""),
  };
  const items = () => [...menu.querySelectorAll("[role^=menuitem]")];
  let panel = "main";
  function place() {
    const b = opener();
    if (!b) return;
    const r = b.getBoundingClientRect(), right = Math.max(12, document.documentElement.clientWidth - r.right);
    menu.style.right = `${right}px`;
    menu.style.top = `${r.bottom + scrollY + 8}px`;
    menu.style.maxHeight = `${Math.max(240, innerHeight - r.bottom - 20)}px`;
  }
  function show(name, focusIndex = 0) {
    panel = name;
    menu.innerHTML = PANELS[name]();
    place();
    const list = items();
    if (list[focusIndex]) list[focusIndex].focus({ preventScroll: true });
  }
  function open() {
    menu.hidden = false;
    show("main");
    const b = opener();
    if (b) b.setAttribute("aria-expanded", "true");
    M.anim(menu, [{ opacity: 0, transform: "translateY(-8px) scale(.92)" }, { opacity: 1, transform: "none" }], M.S.pop);
  }
  function close(giveFocusBack) {
    if (!isOpen()) return;
    menu.hidden = true;
    const b = opener();
    if (b) { b.setAttribute("aria-expanded", "false"); if (giveFocusBack) b.focus({ preventScroll: true }); }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".me-top");
    if (b) { isOpen() ? close(true) : open(); return; }
    if (!isOpen()) return;
    if (!menu.contains(e.target)) return close(false);
    const go = e.target.closest("[data-am]");
    if (go) return show(go.dataset.am);
    const wear = e.target.closest("[data-am-wear]");
    if (wear) { const list = items(), i = list.indexOf(wear); state.wearing = wear.dataset.amWear || null; save(); render(true); show("character", i); return; }
    const theme = e.target.closest("[data-am-theme]");
    if (theme) { const list = items(), i = list.indexOf(theme); setTheme(theme.dataset.amTheme); show("appearance", i); return; }
    if (e.target.closest("[data-am-logout]")) { close(true); M.toast("Log out isn't connected in this demo"); return; }
    if (e.target.closest("a")) close(false);
  });
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") { e.preventDefault(); close(true); return; }
    if (e.key === "Tab") { close(false); return; }
    const list = items(), i = list.indexOf(document.activeElement);
    const to = { ArrowDown: (i + 1) % list.length, ArrowUp: (i - 1 + list.length) % list.length, Home: 0, End: list.length - 1 }[e.key];
    if (to !== undefined) { e.preventDefault(); list[to].focus(); }
  });
  addEventListener("hashchange", () => close(false));
  addEventListener("resize", () => { if (isOpen()) place(); });
})();
