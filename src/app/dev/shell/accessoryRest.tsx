// The sixty things worn over the eyes, at the neck and up by one ear: twenty of each.
//   Eyes   drawn for one eye round (0, 0), with a lens about 10 across its half-width, and set over
//          both eyes at the size each face needs.
//   Neck   drawn round the chin: (0, 0) is the chin, down is positive.
//   Side   drawn round a spot up by the right ear.
import {
  CREAM,
  GOLD,
  GOLD_D,
  HEART,
  INK,
  STAR,
  at,
  c,
  e,
  eyes,
  l,
  neck,
  p,
  side,
  type Kind,
} from "./accessoryKit";

const GLASS = { fill: "#ffffff", fillOpacity: 0.22 };

export const EYES: Kind[] = [
  eyes("Round glasses", c(0, 0, 10, "none", { ...GLASS, stroke: INK, strokeWidth: 2.6 })),
  eyes(
    "Square glasses",
    <rect
      x="-10"
      y="-8"
      width="20"
      height="16"
      rx="3.500"
      {...GLASS}
      stroke="#5c3a22"
      strokeWidth="2.600"
    />,
    { bridge: "#5c3a22" }
  ),
  eyes(
    "Sunglasses",
    <>
      {p("M-11 -6H11L8 8H-8Z", "#24202a", {
        stroke: INK,
        strokeWidth: 1.6,
        strokeLinejoin: "round",
      })}
      {l("M-6 -2l5 -2", "#8a94a1", 1.8)}
    </>
  ),
  eyes(
    "Star glasses",
    p(STAR, "#ffd24a", {
      transform: "scale(1.75)",
      fillOpacity: 0.6,
      stroke: GOLD_D,
      strokeWidth: 0.9,
    }),
    { bridge: GOLD_D }
  ),
  eyes(
    "Heart glasses",
    p(HEART, "#f08aa0", {
      transform: "translate(0 1.500) scale(1.45)",
      fillOpacity: 0.65,
      stroke: "#c0392b",
      strokeWidth: 1,
    }),
    { bridge: "#c0392b" }
  ),
  {
    name: "Monocle",
    slot: "eyes",
    draw: (f) => (
      <>
        {c(f.eyeX, f.eyeY, f.lens, "none", { ...GLASS, stroke: GOLD_D, strokeWidth: 2.6 })}
        {l(
          `M${f.eyeX + f.lens * 0.7} ${f.eyeY + f.lens * 0.7}C${f.eyeX + 14} ${f.eyeY + 20} ${f.eyeX + 6} ${f.eyeY + 30} ${f.eyeX + 10} ${f.chin}`,
          GOLD_D,
          1.4
        )}
      </>
    ),
  },
  {
    name: "Eye patch",
    slot: "eyes",
    draw: (f) => (
      <>
        {l(`M${-f.eyeX - 16} ${f.eyeY - 14}L${f.eyeX + 16} ${f.eyeY + 2}`, INK, 2.2)}
        {p(
          `M${f.eyeX - 10} ${f.eyeY - 8}H${f.eyeX + 10}L${f.eyeX + 7} ${f.eyeY + 9}H${f.eyeX - 7}Z`,
          "#24202a"
        )}
      </>
    ),
  },
  eyes(
    "Swim goggles",
    <>
      {e(0, 0, 10.5, 8, "#6aa9e8", { fillOpacity: 0.7, stroke: "#3f5fa8", strokeWidth: 2.6 })}
      {l("M-5 -3l4 -2", "#eaf4ff", 1.8)}
    </>,
    { bridge: "#3f5fa8" }
  ),
  {
    name: "Ski goggles",
    slot: "eyes",
    draw: (f) => (
      <>
        {l(`M${-f.eyeX - f.lens - 8} ${f.eyeY - 2}H${f.eyeX + f.lens + 8}`, "#3b3442", 5)}
        <rect
          x={-f.eyeX - f.lens}
          y={f.eyeY - f.lens * 0.85}
          width={(f.eyeX + f.lens) * 2}
          height={f.lens * 1.7}
          rx={f.lens * 0.7}
          fill="#f2a93b"
          stroke="#3b3442"
          strokeWidth="2.600"
        />
        {p(
          `M${-f.eyeX - f.lens + 5} ${f.eyeY - f.lens * 0.4}h${f.eyeX}l-4 4h${-f.eyeX + 4}Z`,
          "#fff3b8",
          { fillOpacity: 0.8 }
        )}
      </>
    ),
  },
  {
    name: "Movie glasses",
    slot: "eyes",
    draw: (f) => (
      <>
        <rect
          x={-f.eyeX - f.lens - 2}
          y={f.eyeY - f.lens}
          width={(f.eyeX + f.lens + 2) * 2}
          height={f.lens * 2}
          rx="3"
          fill="#ffffff"
          stroke="#d9d2c4"
          strokeWidth="1"
        />
        <rect
          x={-f.eyeX - f.lens * 0.75}
          y={f.eyeY - f.lens * 0.65}
          width={f.lens * 1.5}
          height={f.lens * 1.3}
          rx="2"
          fill="#e0564a"
          fillOpacity="0.85"
        />
        <rect
          x={f.eyeX - f.lens * 0.75}
          y={f.eyeY - f.lens * 0.65}
          width={f.lens * 1.5}
          height={f.lens * 1.3}
          rx="2"
          fill="#3f9fd8"
          fillOpacity="0.85"
        />
      </>
    ),
  },
  eyes(
    "Cat-eye glasses",
    p("M-10 -3C-10 -8 6 -8 13 -12C12 -2 8 8 0 8C-6 8 -10 4 -10 -3Z", "#ffffff", {
      fillOpacity: 0.25,
      stroke: "#b03a30",
      strokeWidth: 2.6,
      strokeLinejoin: "round",
    }),
    { bridge: "#b03a30", arms: false, mirror: true }
  ),
  eyes(
    "Aviators",
    p("M-10 -7H10C11 4 6 10 0 10C-6 10 -11 4 -10 -7Z", "#5fa851", {
      fillOpacity: 0.55,
      stroke: GOLD_D,
      strokeWidth: 2,
    }),
    { bridge: GOLD_D }
  ),
  eyes(
    "Half-moon glasses",
    p("M-10 0H10C10 6 6 9 0 9C-6 9 -10 6 -10 0Z", "#ffffff", {
      fillOpacity: 0.3,
      stroke: GOLD_D,
      strokeWidth: 2.2,
    }),
    { bridge: GOLD_D }
  ),
  eyes(
    "Shutter shades",
    <>
      {l("M-10 -6H10M-10 -2H10M-10 2H10M-9 6H9", "#e0564a", 2.6)}
      {l("M-10 -6V6M10 -6V6", "#e0564a", 2.2)}
    </>,
    { bridge: "#e0564a" }
  ),
  {
    name: "Party mask",
    slot: "eyes",
    draw: (f) => (
      <>
        {p(
          `M${-f.eyeX - f.lens - 3} ${f.eyeY - 7}C${-f.eyeX} ${f.eyeY - f.lens - 5} ${-4} ${f.eyeY - 6} 0 ${f.eyeY - 3}C4 ${f.eyeY - 6} ${f.eyeX} ${f.eyeY - f.lens - 5} ${f.eyeX + f.lens + 3} ${f.eyeY - 7}C${f.eyeX + f.lens + 3} ${f.eyeY + 6} ${f.eyeX} ${f.eyeY + f.lens + 2} 0 ${f.eyeY + 4}C${-f.eyeX} ${f.eyeY + f.lens + 2} ${-f.eyeX - f.lens - 3} ${f.eyeY + 6} ${-f.eyeX - f.lens - 3} ${f.eyeY - 7}Z`,
          "#9a7fe0",
          { stroke: "#6f55b8", strokeWidth: 1.6 }
        )}
        {e(-f.eyeX, f.eyeY, f.lens * 0.62, f.lens * 0.5, "#24180F", { fillOpacity: 0.9 })}
        {e(f.eyeX, f.eyeY, f.lens * 0.62, f.lens * 0.5, "#24180F", { fillOpacity: 0.9 })}
        {c(-f.eyeX + 2, f.eyeY - 2, 1.6, "#ffffff")}
        {c(f.eyeX + 2, f.eyeY - 2, 1.6, "#ffffff")}
        {p(
          `M${f.eyeX + f.lens} ${f.eyeY - 8}C${f.eyeX + f.lens + 8} ${f.eyeY - 20} ${f.eyeX + f.lens + 2} ${f.eyeY - 30} ${f.eyeX + f.lens + 8} ${f.eyeY - 36}C${f.eyeX + f.lens + 14} ${f.eyeY - 26} ${f.eyeX + f.lens + 12} ${f.eyeY - 14} ${f.eyeX + f.lens + 4} ${f.eyeY - 6}Z`,
          GOLD
        )}
      </>
    ),
  },
  {
    name: "Hero mask",
    slot: "eyes",
    draw: (f) => (
      <>
        {p(
          `M${-f.eyeX - f.lens - 10} ${f.eyeY - 6}C${-f.eyeX} ${f.eyeY - f.lens - 2} ${f.eyeX} ${f.eyeY - f.lens - 2} ${f.eyeX + f.lens + 10} ${f.eyeY - 6}L${f.eyeX + f.lens + 4} ${f.eyeY + 5}C${f.eyeX} ${f.eyeY + f.lens} ${-f.eyeX} ${f.eyeY + f.lens} ${-f.eyeX - f.lens - 4} ${f.eyeY + 5}Z`,
          "#3f5fa8"
        )}
        {e(-f.eyeX, f.eyeY, f.lens * 0.6, f.lens * 0.48, "#ffffff")}
        {e(f.eyeX, f.eyeY, f.lens * 0.6, f.lens * 0.48, "#ffffff")}
        {c(-f.eyeX, f.eyeY, f.lens * 0.3, INK)}
        {c(f.eyeX, f.eyeY, f.lens * 0.3, INK)}
      </>
    ),
  },
  {
    name: "Sleep mask",
    slot: "eyes",
    draw: (f) => (
      <>
        {l(`M${-f.eyeX - f.lens - 8} ${f.eyeY}H${f.eyeX + f.lens + 8}`, "#6f55b8", 2.4)}
        {p(
          `M${-f.eyeX - f.lens} ${f.eyeY - 7}C${-f.eyeX} ${f.eyeY - 11} -4 ${f.eyeY - 8} 0 ${f.eyeY - 4}C4 ${f.eyeY - 8} ${f.eyeX} ${f.eyeY - 11} ${f.eyeX + f.lens} ${f.eyeY - 7}C${f.eyeX + f.lens} ${f.eyeY + 6} ${f.eyeX} ${f.eyeY + 10} 0 ${f.eyeY + 5}C${-f.eyeX} ${f.eyeY + 10} ${-f.eyeX - f.lens} ${f.eyeY + 6} ${-f.eyeX - f.lens} ${f.eyeY - 7}Z`,
          "#9a7fe0"
        )}
        {l(`M${-f.eyeX - 5} ${f.eyeY}q5 4 10 0M${f.eyeX - 5} ${f.eyeY}q5 4 10 0`, "#ffffff", 1.8)}
      </>
    ),
  },
  eyes("Pixel shades", p("M-11 -6H11V0H8V4H4V8H-6V4H-9V0H-11Z", "#24202a"), { bridge: "#24202a" }),
  eyes(
    "Rose glasses",
    c(0, 0, 10, "#f6a8bc", { fillOpacity: 0.6, stroke: "#c9567a", strokeWidth: 2.2 }),
    { bridge: "#c9567a" }
  ),
  {
    name: "Taped glasses",
    slot: "eyes",
    draw: (f) => (
      <>
        {l(
          `M${-f.eyeX + f.lens} ${f.eyeY - 1}H${f.eyeX - f.lens}M${-f.eyeX - f.lens} ${f.eyeY - 2}l-8 -5M${f.eyeX + f.lens} ${f.eyeY - 2}l8 -5`,
          "#24202a",
          3.4
        )}
        <rect
          x={-f.eyeX - f.lens}
          y={f.eyeY - f.lens * 0.8}
          width={f.lens * 2}
          height={f.lens * 1.6}
          rx="2"
          {...GLASS}
          stroke="#24202a"
          strokeWidth="3.400"
        />
        <rect
          x={f.eyeX - f.lens}
          y={f.eyeY - f.lens * 0.8}
          width={f.lens * 2}
          height={f.lens * 1.6}
          rx="2"
          {...GLASS}
          stroke="#24202a"
          strokeWidth="3.400"
        />
        <rect
          x="-3.500"
          y={f.eyeY - 4}
          width="7"
          height="6.500"
          fill="#ffffff"
          stroke="#d9d2c4"
          strokeWidth="0.800"
        />
      </>
    ),
  },
];

export const NECK: Kind[] = [
  neck(
    "Bow tie",
    <>
      {p("M0 3L-17 -6V12Z", "#e0564a")}
      {p("M0 3L17 -6V12Z", "#b03a30")}
      {p("M-4 -2H4V8H-4Z", "#8f2c24")}
    </>
  ),
  neck(
    "Scarf",
    <>
      {p("M-27 -6C-12 4 12 4 27 -6L25 5C12 13 -12 13 -25 5Z", "#6aa9e8")}
      {p("M6 6L10 20L22 17L18 4Z", "#3f7fc4")}
      {l("M11 20V16M15 19V15M19 18V14", "#6aa9e8", 1.6)}
    </>
  ),
  neck(
    "Bandana",
    <>
      {p("M-24 -5L24 -5L0 17Z", "#e0564a")}
      {p("M0 -5L24 -5L0 17Z", "#b03a30")}
      {c(-9, 0, 1.5, CREAM)}
      {c(0, 6, 1.5, CREAM)}
      {c(9, 0, 1.5, CREAM)}
    </>
  ),
  neck(
    "Medal",
    <>
      {l("M-11 -8L0 7", "#3f5fa8", 5.5, { strokeLinecap: "butt" })}
      {l("M11 -8L0 7", "#c0392b", 5.5, { strokeLinecap: "butt" })}
      {c(0, 11, 7, GOLD, { stroke: "#a66f00", strokeWidth: 1.2 })}
      {p(STAR, "#a66f00", { transform: "translate(0 11.300) scale(0.55)" })}
    </>
  ),
  neck(
    "Necktie",
    <>
      {p("M-5 -4H5L3 2H-3Z", "#3f5fa8")}
      {p("M-3 2H3L6 16L0 22L-6 16Z", "#3f5fa8")}
      {p("M0 2H3L6 16L0 22Z", "#2f4a8a")}
      {l("M-4 8L4 5M-5 14L5 11", "#f2c14e", 1.8)}
    </>
  ),
  neck(
    "Pearls",
    <>
      {[-22, -15, -8, 0, 8, 15, 22].map((x) =>
        c(x, 3 - Math.abs(x) * 0.28, 3.6, "#fbf7ee", {
          key: x,
          stroke: "#d9d2c4",
          strokeWidth: 0.8,
        })
      )}
    </>
  ),
  neck(
    "Bead necklace",
    <>
      {[-22, -15, -8, 0, 8, 15, 22].map((x, i) =>
        c(
          x,
          3 - Math.abs(x) * 0.28,
          3.6,
          ["#e0564a", "#f2c14e", "#5fa851", "#6aa9e8", "#9a7fe0", "#f08a6a", "#3fb7b3"][i],
          { key: x }
        )
      )}
    </>
  ),
  neck(
    "Bell collar",
    <>
      {p("M-24 -6C-12 2 12 2 24 -6L23 2C12 9 -12 9 -23 2Z", "#c0392b")}
      {c(0, 9, 6, GOLD, { stroke: GOLD_D, strokeWidth: 1 })}
      {l("M-3 10H3M0 10V14", "#8a5a00", 1.4)}
    </>
  ),
  neck(
    "Flower garland",
    <>
      {l("M-26 -6C-12 8 12 8 26 -6", "#5fa851", 3)}
      {c(-20, -1, 5, "#f08aa0")}
      {c(-10, 4, 5, "#ffd24a")}
      {c(0, 6, 5.5, "#f08a6a")}
      {c(10, 4, 5, "#9a7fe0")}
      {c(20, -1, 5, "#f08aa0")}
      {c(0, 6, 1.8, CREAM)}
    </>
  ),
  neck(
    "Striped scarf",
    <>
      {p("M-27 -6C-12 4 12 4 27 -6L25 5C12 13 -12 13 -25 5Z", "#f2c14e")}
      {l("M-16 0L-15 9M-5 3L-5 11M6 3L6 11M17 0L16 9", "#c0392b", 3.4, { strokeLinecap: "butt" })}
      {p("M-18 5L-22 20L-11 21L-9 8Z", "#f2c14e")}
      {l("M-19 12L-10 13", "#c0392b", 3.4, { strokeLinecap: "butt" })}
    </>
  ),
  neck(
    "Cape",
    <>
      {p("M-30 -8C-22 0 22 0 30 -8L36 18C20 12 -20 12 -36 18Z", "#c0392b")}
      {p("M0 -2C12 -2 22 -4 30 -8L36 18C24 13 12 12 0 12Z", "#8f2c24")}
      {c(0, 1, 4.5, GOLD, { stroke: GOLD_D, strokeWidth: 1 })}
    </>
  ),
  neck(
    "Whistle",
    <>
      {l("M-14 -8L0 6L14 -8", "#3b3442", 1.8)}
      {p("M-8 6H6A5 5 0 0 1 6 16H-2A5 5 0 0 1 -8 11Z", "#c9d0d8")}
      {c(2, 11, 2, "#737a82")}
    </>
  ),
  neck(
    "Heart locket",
    <>
      {l("M-16 -8L0 5L16 -8", GOLD_D, 1.6)}
      {p(HEART, "#e0564a", {
        transform: "translate(0 11) scale(0.95)",
        stroke: "#b03a30",
        strokeWidth: 1,
      })}
    </>
  ),
  neck(
    "Amulet",
    <>
      {l("M-16 -8L0 4L16 -8", "#8a5a34", 1.8)}
      {p("M0 3L7 9L0 19L-7 9Z", "#3fb7b3")}
      {p("M0 3L7 9L0 19Z", "#1f8a88")}
      {p("M0 3L3 9L0 12L-3 9Z", "#bff0ee")}
    </>
  ),
  neck(
    "Name tag",
    <>
      {p("M-24 -6C-12 2 12 2 24 -6L23 2C12 9 -12 9 -23 2Z", "#3f7fc4")}
      {p("M-7 6H7V16H-7Z", "#fbf7ee", { stroke: "#d9d2c4", strokeWidth: 0.8 })}
      {l("M-4 10H4M-4 13H2", "#737a82", 1.2)}
    </>
  ),
  neck(
    "Shell necklace",
    <>
      {l("M-18 -8L0 4L18 -8", "#b07840", 1.6)}
      {p("M0 4C-9 6 -10 16 0 18C10 16 9 6 0 4Z", "#fbe6cc")}
      {l("M0 5V17M-4 7L-3 16M4 7L3 16", "#e0b08a", 1.2)}
    </>
  ),
  neck(
    "Ribbon bow",
    <>
      {p("M0 2C-8 -12 -24 -10 -22 2C-24 14 -8 12 0 6Z", "#f6a8bc")}
      {p("M0 2C8 -12 24 -10 22 2C24 14 8 12 0 6Z", "#e089a2")}
      {p("M-3 4L-9 20L-2 16L0 8Z", "#e089a2")}
      {p("M3 4L9 20L2 16L0 8Z", "#f6a8bc")}
      {c(0, 4, 4, "#c9567a")}
    </>
  ),
  neck(
    "Knit scarf",
    <>
      {p("M-28 -8C-12 2 12 2 28 -8L27 8C12 16 -12 16 -27 8Z", "#5fa851")}
      {l("M-20 -2L-19 10M-12 1L-12 13M-4 2L-4 14M4 2L4 14M12 1L12 13M20 -2L19 10", "#7cc46a", 2.4)}
    </>
  ),
  neck(
    "Ruff",
    <>
      {[-22, -13, -4.5, 4.5, 13, 22].map((x) =>
        e(x, 3 - Math.abs(x) * 0.22, 6, 7.5, "#ffffff", {
          key: x,
          stroke: "#d9d2c4",
          strokeWidth: 1,
        })
      )}
      {l("M-24 2C-12 8 12 8 24 2", "#e6e1d6", 1.4)}
    </>
  ),
  neck(
    "Key",
    <>
      {l("M-14 -8L0 5L14 -8", "#8a5a34", 1.6)}
      {c(0, 9, 4.5, "none", { stroke: GOLD_D, strokeWidth: 2.4 })}
      {l("M0 13V22M0 18H4M0 21H3", GOLD_D, 2.4)}
    </>
  ),
];

const petals = (fill: string, alt: string, heart: string, r = 5.2) => (
  <>
    {[0, 72, 144, 216, 288].map((turn) =>
      c(0, -6.5, r, turn % 144 ? fill : alt, { key: turn, transform: `rotate(${turn})` })
    )}
    {c(0, 0, 4, heart)}
  </>
);

export const SIDE: Kind[] = [
  side("Flower", petals("#f08aa0", "#e0667f", "#ffe28a")),
  side(
    "Feather",
    at(
      0,
      0,
      <>
        {p("M0 8C-10 -4 -8 -22 0 -32C8 -22 10 -4 0 8Z", "#3fb7b3")}
        {p("M0 8C10 -4 8 -22 0 -32Z", "#1f8a88")}
        {l("M0 12V-30", CREAM, 1.3)}
      </>,
      "rotate(24)"
    )
  ),
  side(
    "Leaf",
    at(
      0,
      0,
      <>
        {p("M0 10C-12 0 -10 -18 0 -26C10 -18 12 0 0 10Z", "#7cc46a")}
        {p("M0 10C12 0 10 -18 0 -26Z", "#5fa851")}
        {l("M0 12V-22M0 -4L-5 -9M0 -10L5 -15", "#d9eeb8", 1.2)}
      </>,
      "rotate(30)"
    )
  ),
  side(
    "Daisy",
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((turn) =>
        e(0, -7, 2.8, 5.5, "#ffffff", {
          key: turn,
          transform: `rotate(${turn})`,
          stroke: "#e6e1d6",
          strokeWidth: 0.6,
        })
      )}
      {c(0, 0, 4.2, "#ffd24a")}
    </>
  ),
  side(
    "Rose",
    <>
      {c(0, 0, 10, "#c0392b")}
      {l("M0 0C-4 -4 2 -8 5 -3C8 2 0 8 -6 3C-11 -3 -2 -11 6 -7", "#f08a8a", 2)}
      {p("M-8 8C-14 10 -16 16 -12 20C-8 16 -6 12 -4 9Z", "#5fa851")}
    </>
  ),
  side(
    "Butterfly",
    <>
      {p("M0 0C-8 -14 -20 -12 -18 -2C-20 8 -8 10 0 2Z", "#f2a93b")}
      {p("M0 0C8 -14 20 -12 18 -2C20 8 8 10 0 2Z", "#e0564a")}
      {c(-10, -3, 2.6, CREAM)}
      {c(10, -3, 2.6, CREAM)}
      {l("M0 -6V8M0 -6L-4 -12M0 -6L4 -12", INK, 1.6)}
    </>
  ),
  side("Star clip", p(STAR, GOLD, { transform: "scale(1.7)", stroke: GOLD_D, strokeWidth: 0.8 })),
  side(
    "Pencil",
    at(
      0,
      0,
      <>
        {p("M-3 -22H3V10L0 18L-3 10Z", "#f2c14e")}
        {p("M0 -22H3V10L0 18Z", "#d9a52e")}
        {p("M-3 -26H3V-22H-3Z", "#f08aa0")}
        {p("M-1.500 14L0 18L1.500 14Z", INK)}
      </>,
      "rotate(28)"
    )
  ),
  side(
    "Paintbrush",
    at(
      0,
      0,
      <>
        {p("M-2 -4H2V18H-2Z", "#b07840")}
        {p("M-3 -8H3V-4H-3Z", "#c9d0d8")}
        {p("M-4 -8C-5 -16 -2 -22 0 -26C2 -22 5 -16 4 -8Z", "#3f7fc4")}
      </>,
      "rotate(28)"
    )
  ),
  side(
    "Holly",
    <>
      {p("M0 2C-8 -2 -8 -8 -14 -8C-12 -2 -16 2 -12 6C-8 8 -4 6 0 2Z", "#3f8a4f")}
      {p("M0 2C4 -6 10 -6 12 -12C16 -6 20 -6 18 0C14 4 6 6 0 2Z", "#5fa851")}
      {c(-2, 4, 3.2, "#d43d32")}
      {c(4, 6, 3.2, "#c0392b")}
      {c(1, 0, 3.2, "#e0564a")}
    </>
  ),
  side(
    "Cherries",
    <>
      {l("M-6 2C-6 -8 2 -14 8 -16M6 4C6 -6 6 -12 8 -16", "#5fa851", 1.8)}
      {c(-6, 6, 6, "#d43d32")}
      {c(7, 8, 6, "#b03a30")}
      {c(-8, 4, 1.8, "#f6a8a0")}
    </>
  ),
  side(
    "Clover",
    <>
      {[0, 90, 180, 270].map((turn) =>
        p(HEART, turn % 180 ? "#5fa851" : "#7cc46a", {
          key: turn,
          transform: `rotate(${turn}) translate(0 -7) scale(0.8) rotate(180)`,
        })
      )}
      {l("M0 2C2 8 6 12 10 14", "#3f8a4f", 2)}
    </>
  ),
  side(
    "Snowflake",
    <>
      {l("M0 -12V12M-10.400 -6L10.400 6M-10.400 6L10.400 -6", "#6aa9e8", 2.2)}
      {l(
        "M-3 -9L0 -6L3 -9M-3 9L0 6L3 9M-9.300 -1.900L-5.200 -3L-6.300 -7.100M9.300 1.900L5.200 3L6.300 7.100M-9.300 1.900L-5.200 3L-6.300 7.100M9.300 -1.900L5.200 -3L6.300 -7.100",
        "#9cc4f0",
        1.6
      )}
    </>
  ),
  side(
    "Lightning bolt",
    p("M3 -16L-8 2H-1L-4 16L8 -3H1Z", "#ffd24a", {
      stroke: GOLD_D,
      strokeWidth: 1,
      strokeLinejoin: "round",
    })
  ),
  side(
    "Moon",
    p("M4 -13A13 13 0 1 0 12 8A10 10 0 0 1 4 -13Z", "#ffe9a3", { stroke: GOLD_D, strokeWidth: 1 })
  ),
  side(
    "Sun",
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((turn) =>
        l("M0 -9V-14", "#f2a93b", 2.6, { key: turn, transform: `rotate(${turn})` })
      )}
      {c(0, 0, 7, "#ffd24a", { stroke: "#f2a93b", strokeWidth: 1 })}
    </>
  ),
  side(
    "Music note",
    <>
      {l("M-4 8V-12L8 -15V5", INK, 2.4)}
      {e(-7.5, 9, 4.5, 3.5, INK, { transform: "rotate(-20 -7.500 9)" })}
      {e(4.5, 6, 4.5, 3.5, INK, { transform: "rotate(-20 4.500 6)" })}
    </>
  ),
  side(
    "Heart",
    p(HEART, "#e0564a", { transform: "scale(1.5)", stroke: "#b03a30", strokeWidth: 0.8 })
  ),
  side(
    "Acorn",
    <>
      {p("M-8 -2H8C8 8 4 14 0 16C-4 14 -8 8 -8 -2Z", "#d9a25a")}
      {p("M0 -2H8C8 8 4 14 0 16Z", "#b98540")}
      {p("M-10 -8C-10 -12 10 -12 10 -8L9 -1H-9Z", "#7a4416")}
      {l("M0 -11V-15", "#7a4416", 2.2)}
    </>
  ),
  side(
    "Ladybug",
    <>
      {c(0, 0, 9, "#d43d32")}
      {p("M-8 -4C-4 -11 4 -11 8 -4Z", INK)}
      {l("M0 -4V9", INK, 1.6)}
      {c(-4, 1, 1.9, INK)}
      {c(4, 1, 1.9, INK)}
      {c(-3, 6, 1.5, INK)}
      {c(3, 6, 1.5, INK)}
    </>
  ),
];
