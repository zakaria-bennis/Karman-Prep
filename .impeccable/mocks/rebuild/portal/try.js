/* Karman, "Through the screen": the live question in the bento. Loads the real quiz engine fragment
   (redesign/engine/fragments/alg-1.html) and applies the classes ActiveQuizScreen.tsx uses in each
   state. Called from portal.js with the copy reader and a callback that receives the engine root. */
window.KarmanTry = function (t, onEngine) {
  "use strict";
  var engine = null;
  var frame = document.querySelector(".try__frame");
  var result = document.querySelector(".try__result");
  var again = document.querySelector(".try__again");
  var CORRECT = "C";
  var CHECK =
    '<svg class="k-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6l3.2 3.1L13 4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>';
  var choices = [];
  var picked = null;
  var submitRow = null;

  // The classes ActiveQuizScreen.tsx applies in each state: choose, then Submit Answer, then graded.
  function select(letter) {
    picked = letter;
    choices.forEach(function (c) {
      var on = c.letter === letter;
      c.button.className =
        c.base +
        (on
          ? " cursor-pointer hover:border-info/40 hover:bg-info/5 border-info/40 bg-info/10"
          : " cursor-pointer hover:border-info/40 hover:bg-info/5 border-bronze bg-surface");
      c.badge.className =
        c.badgeBase + (on ? " bg-ivory text-night" : " bg-surface-raised text-ivory/80");
      c.button.setAttribute("aria-pressed", String(on));
    });
    submitRow.hidden = false;
  }
  function submit() {
    if (!picked) return;
    choices.forEach(function (c) {
      var isRight = c.letter === CORRECT;
      var isPicked = c.letter === picked;
      c.button.disabled = true;
      c.button.removeAttribute("aria-pressed");
      c.button.className =
        c.base +
        (isRight
          ? " border-success/40 bg-success/15"
          : isPicked
            ? " border-error/40 bg-error/15"
            : " border-bronze opacity-50");
      c.badge.className =
        c.badgeBase +
        (isRight
          ? " bg-success text-night"
          : isPicked
            ? " bg-error text-ivory"
            : " bg-surface-raised text-taupe");
      c.badge.innerHTML = isRight ? CHECK : c.letter;
    });
    submitRow.hidden = true;
    result.textContent = picked === CORRECT ? t("week.try.right") : t("week.try.wrong");
    again.hidden = false;
  }
  function resetQuestion() {
    picked = null;
    choices.forEach(function (c) {
      c.button.disabled = false;
      c.button.removeAttribute("aria-pressed");
      c.button.className = c.original;
      c.badge.className = c.badgeOriginal;
      c.badge.textContent = c.letter;
    });
    if (submitRow) submitRow.hidden = true;
    result.textContent = "";
    again.hidden = true;
    if (choices[0]) choices[0].button.focus();
  }
  again.addEventListener("click", resetQuestion);

  function hideInert() {
    // Keep the top bar's labels and its timer, the question and the choices. Hide every control
    // that would do nothing in a static fragment.
    var timer = engine.querySelector('[class*="_timer_"]');
    if (timer) {
      Array.prototype.forEach.call(timer.parentElement.children, function (el) {
        if (el !== timer) el.setAttribute("data-engine-hide", "");
      });
      var hideBtn = timer.querySelector("button");
      var out = timer.querySelector("output");
      var start = null;
      var shown = true;
      new IntersectionObserver(
        function (es, io) {
          if (es[0].isIntersecting) {
            start = Date.now();
            io.disconnect();
          }
        },
        { threshold: 0.5 }
      ).observe(frame);
      setInterval(function () {
        if (start === null) return;
        var sec = Math.floor((Date.now() - start) / 1000);
        out.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); // taste-skill-ignore: a clock
      }, 1000);
      hideBtn.addEventListener("click", function () {
        shown = !shown;
        out.style.visibility = shown ? "" : "hidden";
        hideBtn.textContent = shown ? "Hide Timer" : "Show Timer";
        hideBtn.setAttribute("aria-pressed", String(shown));
      });
    }
    engine
      .querySelectorAll(
        '[aria-label="Close quiz"], [data-calculator-cluster], [aria-label^="Transfer to Calculator"]'
      )
      .forEach(function (el) {
        el.setAttribute("data-engine-hide", "");
      });
    var flag = engine.querySelector('[aria-label="Flag question for tutor"]');
    if (flag) flag.parentElement.setAttribute("data-engine-hide", "");
    var content = engine.querySelector("[data-question-content]");
    if (content) content.style.bottom = "0";
  }

  // The engine's stylesheet and fragment load after the page, so they never compete with the hero.
  function loadEngine() {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "../../redesign/engine/engine.css";
    document.head.appendChild(css);
    fetch(frame.getAttribute("data-fragment"))
      .then(function (r) {
        if (!r.ok) throw new Error("fragment " + r.status);
        return r.text();
      })
      .then(function (html) {
        frame.innerHTML = html;
        engine = frame.querySelector(".karman-engine");
        onEngine(engine);
        hideInert();
        var list = engine.querySelector("[data-question-content] .space-y-3");
        engine.querySelectorAll("[data-question-content] .group > button").forEach(function (b) {
          var badge = b.querySelector("span");
          var letter = badge.textContent.trim();
          var drop = [
            "cursor-pointer",
            "hover:border-info/40",
            "hover:bg-info/5",
            "border-bronze",
            "bg-surface",
          ];
          var c = {
            button: b,
            badge: badge,
            letter: letter,
            original: b.className,
            base: b.className
              .split(/\s+/)
              .filter(function (k) {
                return drop.indexOf(k) < 0;
              })
              .join(" "),
            badgeOriginal: badge.className,
            badgeBase: badge.className
              .split(/\s+/)
              .filter(function (k) {
                return ["bg-surface-raised", "text-ivory/80"].indexOf(k) < 0;
              })
              .join(" "),
          };
          var tex = b.querySelector("annotation");
          b.setAttribute(
            "aria-label",
            "Choice " + letter + ": " + (tex ? tex.textContent : b.textContent.trim())
          );
          b.addEventListener("click", function () {
            select(letter);
          });
          choices.push(c);
        });
        // The engine's own Submit Answer row (ActiveQuizScreen.tsx), shown once a choice is made.
        submitRow = document.createElement("div");
        submitRow.className = "mt-6 flex justify-end";
        submitRow.hidden = true;
        var sb = document.createElement("button");
        sb.type = "button";
        sb.className =
          "rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night transition-colors hover:bg-ivory/90";
        sb.textContent = t("week.try.submit");
        sb.addEventListener("click", submit);
        submitRow.appendChild(sb);
        if (list) list.parentElement.insertBefore(submitRow, list.nextSibling);
      })
      .catch(function (err) {
        console.warn(err);
      });
  }
  if (frame) {
    if (document.readyState === "complete") loadEngine();
    else window.addEventListener("load", loadEngine);
  }
};
