// The home page's calendar (WeekCalendar.tsx), once it is on screen: it arrives in a stagger when it comes into
// view; pointing at a day lifts it and reads it out in the side card; pointing at a full-length test or the
// session that reviews it draws the line between the two. The days and their events carry their own words as
// data attributes, so the side card is rebuilt from the grid itself.

const SVG = "http://www.w3.org/2000/svg";

function wire(sc: HTMLElement): () => void {
  const grid = sc.querySelector<HTMLElement>(".sc-grid");
  const card = sc.querySelector<HTMLElement>(".sc-card");
  const link = sc.querySelector<SVGSVGElement>(".sc-link");
  if (!grid || !card || !link) return () => {};
  const days = [...grid.querySelectorAll<HTMLElement>(".sc-day")];
  const today = Math.max(
    0,
    days.findIndex((d) => d.classList.contains("today"))
  );
  const ac = new AbortController();
  const signal = ac.signal;
  let day = today;
  let pair = 0;

  const io = new IntersectionObserver(
    (es) => {
      if (es[0].isIntersecting) {
        sc.classList.add("in-view");
        io.disconnect();
      }
    },
    { threshold: 0.25 }
  );
  io.observe(sc);

  // the side card: the day's name and date, then its events (or a free day)
  const paintCard = () => {
    const d = days[day];
    if (!d) return;
    card.replaceChildren();
    const head = document.createElement("p");
    head.className = "sc-d";
    const name = document.createElement("b");
    name.textContent = d.dataset.day ?? "";
    head.append(name, `${d.dataset.month ?? ""} ${d.dataset.n ?? ""}`);
    if (day === today) {
      const t = document.createElement("span");
      t.className = "sc-today";
      t.textContent = "Today";
      head.append(t);
    }
    card.append(head);
    const evs = [...d.querySelectorAll<HTMLElement>(".sc-ev")];
    if (evs.length) {
      const ul = document.createElement("ul");
      evs.forEach((ev) => {
        const li = document.createElement("li");
        li.className = ev.dataset.kind ?? "";
        const mark = document.createElement("i");
        mark.setAttribute("aria-hidden", "true");
        const words = document.createElement("span");
        const long = document.createElement("b");
        long.textContent = ev.dataset.long ?? "";
        const small = document.createElement("small");
        small.textContent = `${ev.dataset.kindName ?? ""}, ${ev.dataset.at ?? ""}`;
        words.append(long, small);
        li.append(mark, words);
        ul.append(li);
      });
      card.append(ul);
    } else {
      const free = document.createElement("p");
      free.className = "sc-free";
      free.textContent = sc.dataset.free ?? "";
      card.append(free);
    }
  };

  // the line from a full-length test to the session that reviews it, in the grid's own pixels
  const paintLink = () => {
    link.replaceChildren();
    grid
      .querySelectorAll<HTMLElement>(".sc-ev")
      .forEach((ev) =>
        ev.classList.toggle("lit", Boolean(pair) && ev.dataset.pair === String(pair))
      );
    if (!pair) return;
    const a = grid.querySelector<HTMLElement>(`[data-pair="${pair}"].fl`),
      b = grid.querySelector<HTMLElement>(`[data-pair="${pair}"].s`);
    if (!a || !b) return;
    const o = grid.getBoundingClientRect(),
      ra = a.getBoundingClientRect(),
      rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - o.left,
      y1 = ra.top - o.top,
      x2 = rb.left + rb.width / 2 - o.left,
      y2 = rb.top - o.top;
    const lift = Math.max(28, Math.abs(x2 - x1) * 0.45);
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", `M${x1} ${y1} C${x1} ${y1 - lift} ${x2} ${y2 - lift} ${x2} ${y2}`);
    path.setAttribute("pathLength", "1");
    link.append(path);
  };
  const setDay = (i: number) => {
    if (i === day) return;
    day = i;
    days.forEach((d, k) => d.classList.toggle("on", k === i));
    paintCard();
  };
  const setPair = (p: number) => {
    if (p === pair) return;
    pair = p;
    paintLink();
  };

  days.forEach((d, i) => {
    d.addEventListener("pointerenter", () => setDay(i), { signal });
    d.querySelectorAll<HTMLElement>(".sc-ev").forEach((ev) => {
      ev.addEventListener("pointerenter", () => setPair(Number(ev.dataset.pair) || 0), { signal });
      ev.addEventListener("pointerleave", () => setPair(0), { signal });
    });
  });
  grid.addEventListener(
    "pointerleave",
    () => {
      setDay(today);
      setPair(0);
    },
    { signal }
  );
  return () => {
    ac.abort();
    io.disconnect();
  };
}

export function startCalendar(root: ParentNode): () => void {
  const offs = [...root.querySelectorAll<HTMLElement>(".sc")].map(wire);
  return () => offs.forEach((off) => off());
}
