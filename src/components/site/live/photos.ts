// The moving photos (Photo.tsx with `clip`): a short silent loop of the same moment plays over the still. The
// clip's file is asked for only when its figure comes within most of a screen, and it rests while off screen.
// Reduced motion never loads a clip (photos.css hides it); a clip that fails to load is removed and the still
// stays. The still's own fade-in is handled by the page's boot script (SitePage.tsx), before hydration.

export function startClips(root: ParentNode): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const clips = [...root.querySelectorAll<HTMLVideoElement>(".k-photo video.clip")];
  if (!clips.length) return () => {};
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else v.pause();
      }),
    { rootMargin: "80% 0px" }
  );
  clips.forEach((v) => {
    v.addEventListener("error", () => v.remove(), { once: true });
    io.observe(v);
  });
  return () => io.disconnect();
}
