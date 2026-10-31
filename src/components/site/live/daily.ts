// The Daily 10 on the student's phone (home/DailyTenDemo.tsx), and it works: pick a choice, press Check, and
// the phone answers the way the app does, right or wrong, with the explanation; Try it again clears it. The
// words (the titles and each choice's explanation) are on the screen's own elements as data attributes.

function wire(scr: HTMLElement): () => void {
  const choices = [...scr.querySelectorAll<HTMLButtonElement>(".ch button")];
  const go = scr.querySelector<HTMLButtonElement>(".go");
  const step = scr.querySelectorAll<HTMLElement>(".steps i")[3];
  if (!choices.length || !go || !step) return () => {};
  const right = choices.findIndex((b) => b.dataset.right === "1");
  const ac = new AbortController();
  const signal = ac.signal;
  let pick = -1;
  let checked = false;

  const paint = () => {
    const ok = checked && pick === right;
    scr.classList.toggle("done", checked);
    step.className = checked ? (ok ? "done" : "miss") : "now";
    choices.forEach((b, k) => {
      b.className = checked
        ? k === right
          ? "ok"
          : k === pick
            ? "no"
            : ""
        : pick === k
          ? "pick"
          : "";
      b.setAttribute("aria-checked", String(pick === k));
      b.disabled = checked;
    });
    scr.querySelector(".fb")?.remove();
    if (checked) {
      const fb = document.createElement("div");
      fb.className = `fb ${ok ? "ok" : "no"}`;
      fb.setAttribute("aria-live", "polite");
      const title = document.createElement("b");
      title.textContent = ok ? (scr.dataset.ok ?? "") : (scr.dataset.no ?? "");
      const why = document.createElement("span");
      why.textContent = choices[ok ? right : pick]?.dataset.why ?? "";
      fb.append(title, why);
      go.before(fb);
    }
    go.textContent = checked ? (scr.dataset.again ?? "") : (scr.dataset.check ?? "");
    go.disabled = pick < 0;
  };

  choices.forEach((b, k) =>
    b.addEventListener(
      "click",
      () => {
        if (checked) return;
        pick = k;
        paint();
      },
      { signal }
    )
  );
  go.addEventListener(
    "click",
    () => {
      if (checked) {
        checked = false;
        pick = -1;
      } else if (pick >= 0) checked = true;
      paint();
    },
    { signal }
  );
  return () => ac.abort();
}

export function startDailyTen(root: ParentNode): () => void {
  const offs = [...root.querySelectorAll<HTMLElement>(".d10.live")].map(wire);
  return () => offs.forEach((off) => off());
}
