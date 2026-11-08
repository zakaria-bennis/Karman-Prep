/* 21st.dev component 23552 (ddoemonn/segmented-control, "Segmented Control"), ported from React and
   motion/react to plain JavaScript: role=radiogroup, one button per option, arrow, Home and End keys, and a
   thumb that slides to the chosen cell (Web Animations API, transform only, no travel under reduced motion).
   The stone palette and the blue focus ring became Karman's tokens (components/segmented.css). On the pricing
   page it is the one live thing: pick the SAT date and the cohort ticket changes.
   Usage: karmanSegmented(root, onChange) where root is [role=radiogroup] holding .seg-thumb and button[data-value]. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.karmanSegmented = function (root, onChange) {
    const btns = [...root.querySelectorAll("button[data-value]")];
    const thumb = root.querySelector(".seg-thumb");
    root.style.setProperty("--n", btns.length);
    let current = Math.max(0, btns.findIndex((b) => b.getAttribute("aria-checked") === "true"));
    const place = (animate) => {
      const to = `translateX(${current * 100}%)`;
      if (animate && !reduce) thumb.animate([{ transform: thumb.style.transform || to }, { transform: to }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
      thumb.style.transform = to;
    };
    let fillT = 0;
    const select = (i, focus) => {
      current = i;
      btns.forEach((b, k) => { b.setAttribute("aria-checked", String(k === i)); b.tabIndex = k === i ? 0 : -1; b.removeAttribute("data-filled"); });
      clearTimeout(fillT);
      fillT = setTimeout(() => btns[i].setAttribute("data-filled", ""), reduce ? 0 : 330);
      if (focus) btns[i].focus();
      place(true);
      onChange?.(btns[i].dataset.value, i);
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(i));
      b.addEventListener("keydown", (e) => {
        const n = btns.length;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select((i + 1) % n, true); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (e.key === "Home") { e.preventDefault(); select(0, true); }
        else if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
    select(current);
    return { select };
  };
})();
