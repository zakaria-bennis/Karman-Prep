// The iPhone 17 Pro in Cosmic Orange, drawn in CSS (phone.css): the band, the glass, the island and the
// home bar, around whatever is on the screen. It imports nothing, so a client component can use it without
// carrying the rest of the marketing parts into the browser.
import type { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="iphone">
      <span className="btns" aria-hidden="true" />
      <div className="glass">
        {children}
        <span className="island" aria-hidden="true" />
        <span className="home" aria-hidden="true" />
      </div>
    </div>
  );
}
