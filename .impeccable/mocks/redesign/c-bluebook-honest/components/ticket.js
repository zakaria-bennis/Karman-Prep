/* 21st.dev component 22433 (larsen66/admit-one-ticket), the geometry: ticketClipPath(width, height) builds the
   outline with a half-round notch cut out of the top and bottom edges where the main part meets the stub,
   and the ticket is clipped to it. Ported from the React component's TICKET_GEOMETRY (notch radius 21/1000
   of the width in the original; 16px here, and the seam sits at 70% on desktop, at the stub's foot on phones).
   Recomputed on resize so the notches always sit on the seam. */
(function () {
  function path(w, h, r, upright) {
    const R = 12; // the page's corner
    if (!upright) {
      const x = w * 0.7;
      return `M${R} 0H${x - r}A${r} ${r} 0 0 0 ${x + r} 0H${w - R}A${R} ${R} 0 0 1 ${w} ${R}V${h - R}A${R} ${R} 0 0 1 ${w - R} ${h}H${x + r}A${r} ${r} 0 0 0 ${x - r} ${h}H${R}A${R} ${R} 0 0 1 0 ${h - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z`;
    }
    // phone: the stub is below the main part; the notches sit on the left and right edges at the seam
    const y = upright;
    return `M${R} 0H${w - R}A${R} ${R} 0 0 1 ${w} ${R}V${y - r}A${r} ${r} 0 0 0 ${w} ${y + r}V${h - R}A${R} ${R} 0 0 1 ${w - R} ${h}H${R}A${R} ${R} 0 0 1 0 ${h - R}V${y + r}A${r} ${r} 0 0 0 0 ${y - r}V${R}A${R} ${R} 0 0 1 ${R} 0Z`;
  }
  window.karmanTicket = function (t) {
    const fit = () => {
      const w = t.offsetWidth, h = t.offsetHeight;
      const stub = t.querySelector(".stub"), main = t.querySelector(".main");
      const upright = innerWidth < 761 ? Math.max(stub.offsetTop, main.offsetTop) : 0;
      t.style.clipPath = `path('${path(w, h, 16, upright)}')`;
    };
    new ResizeObserver(fit).observe(t);
    fit();
  };
})();
