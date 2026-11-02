/* Karman, "Through the screen": the motion layer (GSAP 3.12.5 + ScrollTrigger + CustomEase, deferred).
   Nothing here is needed to read or use the page. The hero is never hidden: it is painted by index.html
   and only settles 16 px in CSS. Below the fold, reveals play once and only move things (16 px, 0.5 s);
   nothing fades from 0, no heading is masked, and no price or result changes while it moves. */
(function () {
  "use strict";
  var P = window.KarmanPortal || {};
  if (P.reduce || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined")
    return;
  var root = document.documentElement;
  root.classList.add("motion");
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  if (window.CustomEase) {
    gsap.registerPlugin(window.CustomEase);
    window.CustomEase.create("settle", "0.2,0.8,0.2,1");
  }
  var TOK = {
    out: "expo.out",
    settle: window.CustomEase ? "settle" : "power4.out",
    base: 0.5,
    reveal: 0.5,
    items: 0.06,
    reveal_at: "top 90%",
  };
  gsap.defaults({ overwrite: "auto" });

  // Rise, then Land, once per section. Content is never invisible while it is on screen: nothing fades
  // in from 0; everything is already in place and only moves up to 16 px, for at most 0.5 s, starting
  // before the section enters (top 90%). A fast scroll or a jump lands on finished content.
  function sectionTimeline(section, opts) {
    var heads = section.querySelectorAll(opts.heads || "h2");
    var objs = opts.objects ? section.querySelectorAll(opts.objects) : [];
    var subs = opts.subs ? section.querySelectorAll(opts.subs) : [];
    var land = opts.land ? section.querySelector(opts.land) : null;
    if (objs.length) gsap.set(objs, { y: 16 });
    gsap.set(heads, { y: 16 });
    if (subs.length) gsap.set(subs, { y: 12 });
    if (land) gsap.set(land, { y: 16 });
    var tl = gsap.timeline({
      defaults: { ease: TOK.out, duration: TOK.reveal },
      scrollTrigger: { trigger: section, start: opts.start || TOK.reveal_at, once: true },
    });
    if (objs.length) tl.to(objs, { y: 0, stagger: TOK.items }, 0);
    tl.to(heads, { y: 0 }, 0);
    if (subs.length) tl.to(subs, { y: 0, stagger: TOK.items }, 0.05);
    if (land) tl.to(land, { y: 0, ease: TOK.settle }, 0.12);
    return tl;
  }
  sectionTimeline(document.querySelector(".platform"), {
    start: "top 95%",
    subs: ".platform .sub, .tab, .platform__caption",
    land: ".platform__phone",
  });
  sectionTimeline(document.querySelector(".week"), {
    heads: ".week > h2",
    objects: ".tile",
    land: ".start__date",
  });
  // The result is written as 1520 from the start; it only settles into place.
  sectionTimeline(document.querySelector(".results"), {
    objects: ".results__grid li",
    subs: ".results__range, .results__label",
  });
  sectionTimeline(document.querySelector(".plans"), {
    heads: ".plans > h2",
    objects: ".plan",
    subs: ".plans__links",
  });
  sectionTimeline(document.querySelector(".close"), {
    objects: ".close__photo",
    subs: ".close .sub, .close__objection, .close__date",
    land: ".close .button",
  });

  // The camera push (desktop): the one pin on the page, 150vh, scrubbed.
  var mm = gsap.matchMedia();
  var portal = document.querySelector("[data-portal]");
  mm.add("(min-width: 1024px)", function () {
    portal.classList.add("is-live");
    var card = portal.querySelector(".hero__card");
    var copy = portal.querySelector(".hero__copy");
    var ground = portal.querySelector(".portal__ground");
    var phone = portal.querySelector(".hero__phone");
    var geo = {};
    function measure() {
      gsap.set(card, { clearProps: "transform" });
      var c = card.getBoundingClientRect();
      var p = phone.getBoundingClientRect();
      var sx = p.left + p.width * 0.04071;
      var sy = p.top + p.height * 0.019115;
      var sw = p.width * 0.91858;
      var S = window.innerWidth / sw;
      geo.S = S;
      card.style.transformOrigin =
        (sx * S) / (S - 1) - c.left + "px " + ((sy * S) / (S - 1) - c.top) + "px";
    }
    var smooth = function (a, b, x) {
      var u = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return u * u * (3 - 2 * u);
    };
    function render(p) {
      // Constant-speed zoom: the scale grows geometrically, so the camera never lurches.
      gsap.set(card, { scale: Math.pow(geo.S, smooth(0.03, 0.6, p)) });
      gsap.set(copy, { opacity: 1 - smooth(0, 0.14, p) });
      copy.style.visibility = p > 0.15 ? "hidden" : "";
      gsap.set(ground, { opacity: smooth(0.5, 0.66, p) });
    }
    var st = ST.create({
      trigger: portal,
      start: "top top",
      end: "bottom bottom",
      onUpdate: function (self) {
        render(self.progress);
      },
      onRefresh: function (self) {
        measure();
        render(self.progress);
      },
    });
    measure();
    render(st.progress || 0);
    return function () {
      st.kill();
      portal.classList.remove("is-live");
      card.style.transformOrigin = "";
      gsap.set([card, copy, ground], { clearProps: "transform,opacity" });
      copy.style.visibility = "";
    };
  });

  var refresh = function () {
    ST.refresh();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  if (document.readyState === "complete") refresh();
  else window.addEventListener("load", refresh);
})();
