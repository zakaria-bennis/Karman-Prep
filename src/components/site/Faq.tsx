"use client";

// The FAQ: answers open smoothly, one at a time, so the page stays short. Plain <details> underneath, so
// every answer is in the page for search engines and works without scripts.
import type { MouseEvent } from "react";
import { delay, Icon } from "./parts";

export default function Faq({ items }: { items: [string, string][] }) {
  const toggle = (e: MouseEvent<HTMLElement>) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const d = e.currentTarget.parentElement as HTMLDetailsElement;
    const ans = d.querySelector<HTMLElement>(".ans");
    if (!ans) return;
    e.preventDefault();
    const ease = "cubic-bezier(.22,1,.36,1)";
    if (d.open) {
      ans.animate(
        [
          { height: `${ans.offsetHeight}px`, opacity: 1 },
          { height: "0px", opacity: 0 },
        ],
        { duration: 260, easing: ease }
      ).onfinish = () => (d.open = false);
    } else {
      d.parentElement
        ?.querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((o) => o !== d && (o.open = false));
      d.open = true;
      ans.animate(
        [
          { height: "0px", opacity: 0 },
          { height: `${ans.offsetHeight}px`, opacity: 1 },
        ],
        { duration: 340, easing: ease }
      );
    }
  };
  return (
    <div className="i-faq">
      {items.map(([q, a], k) => (
        <details className="rv" style={delay(Math.min(k, 6) * 0.04)} key={q}>
          <summary onClick={toggle}>
            <span>{q}</span>
            <Icon name="plus" />
          </summary>
          <div className="ans">
            <p>{a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
