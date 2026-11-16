"use client";

// A check sheet (dev only): every kind of accessory on every character, so anything that sits badly
// on a face can be seen at a glance. Each column is one kind, in a different color down the page;
// the last column is one of each place worn together. Open /dev/shell/sheet.
import { notFound } from "next/navigation";
import { ACCESSORIES, Dressed, KIND_COUNT, type Outfit } from "../accessories";
import type { FaceKind } from "../characters";
import { CHARACTERS } from "../rewardsData";

export default function AccessorySheet() {
  if (process.env.NODE_ENV === "production") notFound();
  const kinds = Array.from({ length: KIND_COUNT }, (_, k) => k);
  return (
    <main
      style={{ padding: 16, background: "#f6ead9", color: "#1d1a22", font: "600 12px system-ui" }}
    >
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th />
            {kinds.map((k) => (
              <th key={k} style={{ padding: 4, maxWidth: 70 }}>
                {ACCESSORIES[k * 10].name.split(" ").slice(1).join(" ")}
              </th>
            ))}
            <th>all four</th>
          </tr>
        </thead>
        <tbody>
          {CHARACTERS.map((c, row) => {
            const face: FaceKind = c.face;
            const all: Outfit = {
              head: ACCESSORIES[(row % 10) * 10 + (row % 10)].id,
              eyes: ACCESSORIES[(10 + (row % 4)) * 10 + ((row + 3) % 10)].id,
              neck: ACCESSORIES[(14 + (row % 4)) * 10 + ((row + 5) % 10)].id,
              side: ACCESSORIES[(18 + (row % 2)) * 10 + ((row + 7) % 10)].id,
            };
            return (
              <tr key={c.name}>
                <th style={{ textAlign: "left", paddingRight: 8 }}>
                  {c.name}
                  <br />
                  {c.kind}
                </th>
                {kinds.map((k) => {
                  const item = ACCESSORIES[k * 10 + ((row + k) % 10)];
                  return (
                    <td key={k} data-cell={`${c.kind} / ${item.name}`} style={{ padding: 3 }}>
                      <Dressed face={face} outfit={{ [item.slot]: item.id }} size={64} />
                    </td>
                  );
                })}
                <td style={{ padding: 3 }}>
                  <Dressed face={face} outfit={all} size={64} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
