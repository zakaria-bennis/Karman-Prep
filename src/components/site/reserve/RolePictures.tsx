// The two drawings on "Who is reserving the seat?" (founder, 2026-11-14), drawn in code in the site's
// hand-painted manner: warm brown line work that wobbles a little like a brush, soft shading, paper grain.
// A mother holding her son close, and a girl in her graduation cap and gown holding up her rolled diploma.
// Each moves a little when its card is hovered or picked (reserve.css).
import type { ReactNode } from "react";

const LINE = "#4a3528";
const SKIN = "#f8dcc0";
const SKIN_SHADE = "#eebb98";
const BLUSH = "#f0958a";
const HAIR = "#3b2a22";
const HAIR_LIGHT = "#6b4a38";
const NAVY = "#24316b";
const NAVY_DEEP = "#161f49";
const NAVY_LIGHT = "#3d4f96";
const PAPER = "#fbf3df";
const PAPER_SHADE = "#e9dcbb";
const RIBBON = "#c8372d";

const ink = {
  stroke: LINE,
  strokeWidth: 1.5,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};
const fine = { ...ink, strokeWidth: 1.1, fill: "none" };

/** The frame both drawings share: the brush wobble, the paper grain, the shadow on the ground. */
function Painted({ id, children }: { id: string; children: ReactNode }) {
  return (
    <svg className="rs-pic" viewBox="0 0 240 220" aria-hidden="true" focusable="false">
      <defs>
        <filter id={`${id}-brush`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves="2"
            seed="7"
            result="wob"
          />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="2.2" result="drawn" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="3"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0.2  0 0 0 0 0.14  0 0 0 0 0.1  0 0 0 -1.5 0.62"
            result="specks"
          />
          <feComposite in="specks" in2="drawn" operator="in" result="onShape" />
          <feMerge>
            <feMergeNode in="drawn" />
            <feMergeNode in="onShape" />
          </feMerge>
        </filter>
        <linearGradient id={`${id}-gown`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={NAVY_LIGHT} />
          <stop offset="0.35" stopColor={NAVY} />
          <stop offset="1" stopColor={NAVY_DEEP} />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#fde9d4" />
          <stop offset="0.7" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_SHADE} />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="210" rx="70" ry="6" fill="rgba(40,30,50,.16)" />
      <g filter={`url(#${id}-brush)`}>{children}</g>
    </svg>
  );
}

/** A few blades of grass and a small flower, at the feet. */
function Grass({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} 210) scale(${flip ? -1 : 1} 1)`}>
      <path
        d="M0 0q-2-9 1-14M4 0q1-8 5-12M8 0q3-6 8-8M-4 0q-3-6-7-8"
        fill="none"
        stroke="#6f9a5a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="-10" r="2.4" fill="#fffaf3" stroke={LINE} strokeWidth="0.8" />
      <circle cx="12" cy="-10" r="0.9" fill="#f1d27a" />
    </g>
  );
}

export function StudentPicture() {
  return (
    <Painted id="rs-grad">
      <Grass x={54} />
      <Grass x={182} flip />
      {/* her hair, long down her back, a lock lifting on the right */}
      <path
        d="M84 62C78 96 76 124 84 144h58c8-20 6-48 0-82-4-24-54-24-58 0Z"
        fill={HAIR}
        {...ink}
      />
      <g className="rs-pic-lock">
        <path d="M140 88c13 12 18 30 12 50-3-10-8-22-14-32Z" fill={HAIR} {...ink} />
      </g>
      {/* the gown: a wide yoke, pleats falling from it, a zip down the front, a full hem */}
      <path
        d="M76 120c6-13 20-20 36-20s30 7 36 20l14 86c-32 9-68 9-100 0l14-86Z"
        fill="url(#rs-grad-gown)"
        {...ink}
      />
      <path d="M62 206c32 9 68 9 100 0l-2-11c-30 8-66 8-96 0Z" fill={NAVY_DEEP} opacity="0.55" />
      <path
        d="M82 121c10 9 20 12 30 12s20-3 30-12"
        {...fine}
        stroke={NAVY_LIGHT}
        strokeWidth="1.6"
      />
      <path
        d="M92 131c-4 26-8 52-10 76M102 134c-2 26-4 50-4 76M122 134c2 26 4 50 4 76M132 131c4 26 8 52 10 76"
        {...fine}
        stroke={NAVY_DEEP}
        opacity="0.7"
      />
      <path d="M112 133v77" {...fine} stroke={NAVY_LIGHT} strokeWidth="1.4" />
      {/* the stole over her shoulders, and the white collar */}
      <path d="M92 105l9-3 6 70-11 1Z" fill={PAPER} {...ink} />
      <path d="M132 105l-9-3-6 70 11 1Z" fill={PAPER} {...ink} />
      <path
        d="M96.500 160l10 0M96.800 165l10.400-.400M117.500 160l10 0M117.200 164.600l10.400.400"
        {...fine}
        stroke={NAVY}
        strokeWidth="1.6"
      />
      <path d="M99 101c8-3 18-3 26 0l-13 22Z" fill="#fffaf3" {...ink} />
      {/* her left arm at her side, in its bell sleeve */}
      <path
        d="M79 117c-14 10-22 34-24 58 7 8 20 8 27 1 2-22 6-42 11-56Z"
        fill="url(#rs-grad-gown)"
        {...ink}
      />
      <path d="M57 170c7 7 19 7 25 1" {...fine} stroke={NAVY_LIGHT} />
      <path d="M61 178c4 3 12 3 16 0-1 6-4 10-8 10s-7-4-8-10Z" fill={SKIN} {...ink} />
      {/* neck and face */}
      <path d="M104 90h16v12c-5 4-11 4-16 0Z" fill={SKIN_SHADE} {...ink} />
      <path
        d="M90 68c0-19 44-19 44 0 0 18-10 30-22 30S90 86 90 68Z"
        fill="url(#rs-grad-face)"
        {...ink}
      />
      <ellipse cx="98" cy="81" rx="5.500" ry="3.200" fill={BLUSH} opacity="0.55" />
      <ellipse cx="126" cy="81" rx="5.500" ry="3.200" fill={BLUSH} opacity="0.55" />
      <ellipse cx="102" cy="73" rx="3.300" ry="4.600" fill="#2a1c16" />
      <ellipse cx="122" cy="73" rx="3.300" ry="4.600" fill="#2a1c16" />
      <circle cx="103.300" cy="71.200" r="1.300" fill="#fff" />
      <circle cx="123.300" cy="71.200" r="1.300" fill="#fff" />
      <path d="M97 68.500q5-4.500 10-.500M117 68q5-4 10 .500" {...fine} strokeWidth="1.400" />
      <path
        d="M96.500 62q5.500-3.500 11-1.500M116.500 60.500q5.500-2 11 1.500"
        {...fine}
        stroke={HAIR}
        strokeWidth="1.600"
      />
      <path d="M112.500 77.500q1.800 2.600-1 3.600" {...fine} stroke="#c98f70" />
      <path
        d="M103.500 85.500Q112 96 120.500 85.500 112 88.500 103.500 85.500Z"
        fill="#b8433a"
        {...ink}
        strokeWidth="1.100"
      />
      <path d="M106 86.700q6 2.300 12 0l-1.200 1.800q-4.800 2-9.600 0Z" fill="#fff" />
      {/* her fringe and the locks by her cheeks */}
      <path
        d="M88 71c-3-19 9-30 24-30s27 11 24 30c-5-5-9-11-11-18-6 7-18 11-29 7-2 4-5 8-8 11Z"
        fill={HAIR}
        {...ink}
      />
      <path
        d="M88 68c-4 16-2 32 3 46 2-13 2-29 1-42ZM136 68c4 16 2 32-3 46-2-13-2-29-1-42Z"
        fill={HAIR}
        {...ink}
      />
      <path d="M99 48c8-3 19-3 27 2M96 55c5 2 11 2 16-1" {...fine} stroke={HAIR_LIGHT} />
      {/* the cap: its board seen from below the front edge, a button, and the tassel hanging by her cheek */}
      <path d="M89 51c2-11 44-11 46 0v-8c-8-9-38-9-46 0Z" fill={NAVY_DEEP} {...ink} />
      <path d="M64 34l48 17 48-17v5l-48 17-48-17Z" fill={NAVY_DEEP} {...ink} />
      <path d="M112 17l48 17-48 17-48-17Z" fill={NAVY} {...ink} />
      <path d="M112 21l37 13-37 13" {...fine} stroke={NAVY_LIGHT} opacity="0.8" />
      <ellipse cx="112" cy="34" rx="4" ry="2.200" fill={PAPER} {...ink} strokeWidth="1" />
      <g className="rs-pic-tassel">
        <path d="M112 34c14 1 30 3 40 6v22" {...fine} stroke="#e6c56a" strokeWidth="2" />
        <path d="M149 61h6l3 17c-4 2-8 2-12 0Z" fill="#f1d27a" {...ink} strokeWidth="1.100" />
        <path
          d="M148.500 64.500h7M150.500 68v10M153.500 68v10"
          {...fine}
          stroke="#b8963c"
          strokeWidth="0.900"
        />
      </g>
      {/* her right arm raised: the sleeve falls back from her wrist, and her hand holds the rolled diploma */}
      <g className="rs-pic-wave">
        <path
          d="M138 110c12-8 26-28 34-50l15 6c-2 22-10 48-27 68-9-3-17-11-22-24Z"
          fill="url(#rs-grad-gown)"
          {...ink}
        />
        <path
          d="M150 112c8-10 14-22 19-36M158 124c8-12 14-26 18-42"
          {...fine}
          stroke={NAVY_DEEP}
          opacity="0.7"
        />
        <ellipse
          cx="179.500"
          cy="63"
          rx="8"
          ry="3.600"
          transform="rotate(22 179.500 63)"
          fill={NAVY_DEEP}
          {...ink}
        />
        <path d="M174 60c1-9 4-17 8-24l9 4c-2 8-4 16-7 24Z" fill={SKIN} {...ink} />
        {/* the diploma: a roll of cream paper with its curled ends showing, tied with a red ribbon and bow */}
        <g transform="rotate(-20 190 28)">
          <rect x="156" y="19" width="68" height="17" rx="8.500" fill={PAPER} {...ink} />
          <path d="M160 31.500h58" {...fine} stroke={PAPER_SHADE} strokeWidth="2.400" />
          <ellipse cx="224" cy="27.500" rx="4.200" ry="8.500" fill={PAPER_SHADE} {...ink} />
          <path
            d="M224 22.500c2.200 1.400 2.200 8.600 0 10-1.600-1.200-1.600-5.800 0-6.800"
            {...fine}
            strokeWidth="1"
          />
          <path d="M156.500 23c-3 2-3 7 0 9" {...fine} strokeWidth="1" />
          <path d="M201 18.500h8v18h-8Z" fill={RIBBON} {...ink} strokeWidth="1.100" />
          <path
            d="M205 19c-7-9-15-6-12 0 2 4 8 3 12 0ZM205 19c7-9 15-6 12 0-2 4-8 3-12 0Z"
            fill={RIBBON}
            {...ink}
            strokeWidth="1.100"
          />
          <path d="M203 36l-4 12 5-3 2 5 3-14Z" fill={RIBBON} {...ink} strokeWidth="1.100" />
          <circle cx="205" cy="19.500" r="2.400" fill="#a82a22" {...ink} strokeWidth="1" />
        </g>
        {/* her fingers closed around it */}
        <path d="M178 32c2-5 8-7 13-5s7 7 5 12-9 6-14 4-6-6-4-11Z" fill={SKIN} {...ink} />
        <path
          d="M183 31.500l8 3.400M181.500 35.500l8.500 3.500M181 39.500l7 3"
          {...fine}
          stroke="#c98f70"
        />
      </g>
      {/* two small glints by the diploma */}
      <path
        d="M216 52l1.600 4 4 1.600-4 1.600-1.600 4-1.600-4-4-1.600 4-1.600ZM150 8l1.200 3 3 1.200-3 1.200-1.200 3-1.200-3-3-1.200 3-1.200Z"
        fill="#fffaf3"
        stroke={LINE}
        strokeWidth="0.700"
        className="rs-pic-glint"
      />
    </Painted>
  );
}

export function ParentPicture() {
  const CARDIGAN = "#3f5fa8";
  const CARDIGAN_DEEP = "#2c4380";
  const SKIRT = "#efe4cc";
  const TEE = "#fbf3df";
  const STRIPE = "#d8643f";
  return (
    <Painted id="rs-mom">
      <Grass x={46} />
      <Grass x={196} flip />
      {/* the mother, leaning down to him: a long skirt, a cardigan over a white blouse, hair in a loose bun */}
      <path d="M110 128c-6 28-9 56-8 80h74c2-28-1-56-9-82Z" fill={SKIRT} {...ink} />
      <path
        d="M122 132c-3 26-4 52-4 76M140 132c0 26 1 52 2 76M156 130c3 26 6 52 8 76"
        {...fine}
        stroke="#cbbd9c"
      />
      <path d="M102 208h74l-.500-9c-24 3-49 3-73 0Z" fill="#d9cba8" opacity="0.7" />
      <path d="M124 208c0 4 4 6 10 6h4v-6ZM150 208c0 4 4 6 10 6h4v-6Z" fill="#7a5340" {...ink} />
      <circle cx="168" cy="36" r="9.500" fill={HAIR} {...ink} />
      <path d="M163 31c3-3 8-3 11 0M161 37c4 3 10 3 14 0" {...fine} stroke={HAIR_LIGHT} />
      <path d="M114 84c8-12 38-14 48-2l8 50c-20 5-42 5-62 0Z" fill={CARDIGAN} {...ink} />
      <path d="M130 76l10 20 10-20c-6-3-14-3-20 0Z" fill="#fffaf3" {...ink} />
      <path d="M140 96v38" {...fine} stroke={CARDIGAN_DEEP} strokeWidth="1.600" />
      <circle cx="140" cy="106" r="1.500" fill={PAPER} stroke={LINE} strokeWidth="0.700" />
      <circle cx="140" cy="118" r="1.500" fill={PAPER} stroke={LINE} strokeWidth="0.700" />
      <path
        d="M126 82c-2 16-3 32-3 48M156 82c3 16 5 32 6 48"
        {...fine}
        stroke={CARDIGAN_DEEP}
        opacity="0.7"
      />
      <g className="rs-pic-nuzzle">
        <path d="M132 70h14v10c-4 4-10 4-14 0Z" fill={SKIN_SHADE} {...ink} />
        <g transform="rotate(-14 138 52)">
          <path
            d="M118 50c0-17 40-17 40 0 0 17-9 27-20 27s-20-10-20-27Z"
            fill="url(#rs-mom-face)"
            {...ink}
          />
          <ellipse cx="125" cy="61" rx="5" ry="3" fill={BLUSH} opacity="0.55" />
          <ellipse cx="151" cy="61" rx="5" ry="3" fill={BLUSH} opacity="0.55" />
          <path d="M123 54q4.500 4 9 0M144 54q4.500 4 9 0" {...fine} strokeWidth="1.500" />
          <path
            d="M122.500 48q5-3 10-1M143.500 47q5-2 10 1"
            {...fine}
            stroke={HAIR}
            strokeWidth="1.500"
          />
          <path d="M138.500 58q1.600 2.400-1 3.200" {...fine} stroke="#c98f70" />
          <path d="M131 66q7 6 14 0" {...fine} strokeWidth="1.500" />
          <path
            d="M116 54c-3-19 9-29 22-29s25 10 22 29c-4-5-7-10-8-16-8 6-20 8-30 4-1 5-3 9-6 12Z"
            fill={HAIR}
            {...ink}
          />
          <path
            d="M116 52c-3 8-3 16 0 24 2-7 3-15 2-22ZM160 52c3 8 3 16 0 24-2-7-3-15-2-22Z"
            fill={HAIR}
            {...ink}
          />
          <path d="M126 31c7-3 16-3 24 1M122 38c5 2 10 2 15-1" {...fine} stroke={HAIR_LIGHT} />
          <circle cx="160.500" cy="64" r="1.800" fill="#f1d27a" stroke={LINE} strokeWidth="0.700" />
        </g>
      </g>
      {/* her son, pressed against her, eyes shut, smiling: a striped shirt, shorts, a small backpack */}
      {/* her far arm goes behind his head, to his shoulder */}
      <path
        d="M118 92c-16 6-30 20-40 40"
        fill="none"
        stroke={LINE}
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M118 92c-16 6-30 20-40 40"
        fill="none"
        stroke={CARDIGAN}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <g className="rs-pic-child">
        <rect x="58" y="126" width="20" height="38" rx="8" fill="#6f9a5a" {...ink} />
        <path d="M62 138h12M62 150h12" {...fine} stroke="#4f7341" />
        <path
          d="M84 196h13v12H82c0-5 0-9 2-12ZM102 196h13c2 3 2 7 2 12h-15Z"
          fill="#7a5340"
          {...ink}
        />
        <path d="M86 178h10l1 20H85ZM104 178h10l1 20h-12Z" fill={SKIN} {...ink} />
        <path d="M78 164h40l2 22h-17l-3-11-3 11H80Z" fill={NAVY} {...ink} />
        <path d="M78 128c5-9 35-9 40 0l1 38H77Z" fill={TEE} {...ink} />
        <path
          d="M78.500 136h39M78 146h40M77.500 156h41"
          {...fine}
          stroke={STRIPE}
          strokeWidth="3.400"
          strokeLinecap="butt"
        />
        <path d="M82 124c-3 8-4 20-4 34" {...fine} stroke="#4f7341" strokeWidth="3" />
        <g transform="rotate(9 100 106)">
          <path
            d="M82 104c0-17 36-17 36 0 0 15-8 24-18 24s-18-9-18-24Z"
            fill="url(#rs-mom-face)"
            {...ink}
          />
          <ellipse cx="88.500" cy="113" rx="4.600" ry="2.800" fill={BLUSH} opacity="0.6" />
          <ellipse cx="111.500" cy="113" rx="4.600" ry="2.800" fill={BLUSH} opacity="0.6" />
          <path d="M87 106q4 3.800 8 0M105 106q4 3.800 8 0" {...fine} strokeWidth="1.500" />
          <path d="M100.500 110q1.400 2-.800 2.800" {...fine} stroke="#c98f70" />
          <path
            d="M92.500 116.500Q100 125 107.500 116.500 100 119 92.500 116.500Z"
            fill="#b8433a"
            {...ink}
            strokeWidth="1.100"
          />
          <path
            d="M80 106c-4-17 7-26 20-26s24 9 20 26c-3-4-5-8-6-12-4 3-9 4-14 3 1-3 1-5 0-7-3 5-9 9-15 9-1 3-3 5-5 7Z"
            fill={HAIR}
            {...ink}
          />
          <path
            d="M92 80c-1-4 1-7 4-8-1 3 0 6 2 8M104 80c1-3 4-5 7-5-2 2-3 4-2 7"
            fill={HAIR}
            {...ink}
          />
          <path d="M90 88c6-3 14-3 20 0" {...fine} stroke={HAIR_LIGHT} />
        </g>
      </g>
      {/* her hand on his shoulder, and her near arm across his back */}
      <path d="M75 128c5-4 12-3 15 2s1 11-4 13-11 0-13-5 0-8 2-10Z" fill={SKIN} {...ink} />
      <path d="M78 134l9 2M77 138l8 2" {...fine} stroke="#c98f70" />
      <path
        d="M160 94c2 22-12 44-40 56"
        fill="none"
        stroke={LINE}
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M160 94c2 22-12 44-40 56"
        fill="none"
        stroke={CARDIGAN}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path d="M150 104c-2 12-8 24-18 34" {...fine} stroke={CARDIGAN_DEEP} opacity="0.7" />
      <path d="M112 144c5-4 12-3 15 2s1 11-4 13-11 0-13-5 0-8 2-10Z" fill={SKIN} {...ink} />
      <path d="M115 150l9 2M114 154l8 2" {...fine} stroke="#c98f70" />
      {/* and his around her */}
      <path
        d="M114 132c12 2 24 2 36-2"
        fill="none"
        stroke={LINE}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M114 132c12 2 24 2 36-2"
        fill="none"
        stroke={SKIN}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M110 127c5-1 10 0 13 3l-2 8c-4 1-8 0-11-2Z" fill={TEE} {...ink} />
      <path d="M115 127.500l-1.500 9" {...fine} stroke={STRIPE} strokeWidth="2.600" />
    </Painted>
  );
}
