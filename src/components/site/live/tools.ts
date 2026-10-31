// The study tools row (home/ToolsCarousel.tsx): the two arrows slide the track one card at a time. On a
// phone the track scrolls by touch and the arrows are not shown.

export function startTools(root: ParentNode): () => void {
  const ac = new AbortController();
  root.querySelectorAll<HTMLElement>(".tools-wrap").forEach((wrap) => {
    const track = wrap.querySelector<HTMLElement>(".tools-track");
    if (!track) return;
    wrap.querySelectorAll<HTMLButtonElement>(".tools-nav button[data-dir]").forEach((b) =>
      b.addEventListener(
        "click",
        () => {
          const card = track.querySelector("li");
          if (!card) return;
          const dir = Number(b.dataset.dir) || 1;
          track.scrollBy({
            left: dir * (card.getBoundingClientRect().width + 16),
            behavior: "smooth",
          });
        },
        { signal: ac.signal }
      )
    );
  });
  return () => ac.abort();
}
