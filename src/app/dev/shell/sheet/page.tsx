"use client";

// A check sheet (dev only): every one of the 100 accessories on every one of the 16 characters, so
// anything that sits badly on a face can be seen at a glance. One block for each character.
// Open /dev/shell/sheet.
import { notFound } from "next/navigation";
import { ACCESSORIES, Dressed } from "../accessories";
import { CHARACTERS } from "../rewardsData";

export default function AccessorySheet() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main
      style={{ padding: 16, background: "#f6ead9", color: "#1d1a22", font: "600 12px system-ui" }}
    >
      {CHARACTERS.map((c) => (
        <section key={c.name} style={{ marginBottom: 18 }}>
          <h2 style={{ margin: "0 0 4px", font: "600 14px system-ui" }}>
            {c.name}, {c.kind}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ACCESSORIES.map((item) => (
              <span key={item.id} data-cell={`${c.kind} / ${item.name}`} title={item.name}>
                <Dressed face={c.face} outfit={{ [item.slot]: item.id }} size={56} />
              </span>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
