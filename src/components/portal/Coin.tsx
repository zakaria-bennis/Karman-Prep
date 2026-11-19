// The Karman coin (founder, 2026-11-16: "looks amazing"): a gold piece with the fox carved into it as
// George Washington is on a dollar bill. Coins are gold in every theme. It is drawn here once and
// used wherever coins are shown: Rewards, and the end of an activity.
// The wig, as on the portrait on a dollar bill: hair swept back over the whole top of the head, a
// big rolled puff at each side where the ears would be on a man, and a smaller roll under it. The
// fox's own ears come up through it. Under the chin are the coat's shoulders and a cravat.
const WIG_BACK = "M-55 -26C-61 -66 -30 -82 0 -82C30 -82 61 -66 55 -26Z";
const WIG_FRONT =
  "M-34 -35C-25 -50 -8 -54 0 -47C8 -54 25 -50 34 -35L48 -41C43 -62 20 -69 0 -67C-20 -69 -43 -62 -48 -41Z";
const EARS = "M-44 -54L-39 -94L-13 -66ZM44 -54L39 -94L13 -66Z";
const EARS_IN = "M-38 -61L-36 -83L-22 -67ZM38 -61L36 -83L22 -67Z";
const COAT = "M-80 54C-74 20 -46 6 -26 0L26 0C46 6 74 20 80 54Z";
const CRAVAT = "M-13 9C-6 14 6 14 13 9L17 25C9 21 4 27 0 43C-4 27 -9 21 -17 25Z";
const ROLLS = [
  { x: 49, y: -21, rx: 16, ry: 14.5 },
  { x: 46, y: 5, rx: 12, ry: 10 },
];
const FOX = "M-34 -80L-8 -56L0 -58L8 -56L34 -80L30 -42L40 -32L30 0L0 8L-30 0L-40 -32L-30 -42Z";
const PALE = "#fff0b8";
const LINE = "#8a5a00";

export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg style={{ flex: "none" }} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="kp-coin-rim" x1="0.15" y1="0.08" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#fff6c9" />
          <stop offset="0.4" stopColor="#f5bd3a" />
          <stop offset="1" stopColor="#9a6500" />
        </linearGradient>
        <radialGradient id="kp-coin-field" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#f7c84a" />
          <stop offset="1" stopColor="#c98a0a" />
        </radialGradient>
        <linearGradient id="kp-coin-fox" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b97c0a" />
          <stop offset="1" stopColor="#e0a326" />
        </linearGradient>
        <linearGradient id="kp-coin-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a4d00" />
          <stop offset="1" stopColor="#a8700a" />
        </linearGradient>
        <clipPath id="kp-coin-clip">
          <circle cx="24" cy="24" r="17.800" />
        </clipPath>
      </defs>
      {/* the rim, with its reeded edge */}
      <circle
        cx="24"
        cy="24"
        r="22.500"
        fill="url(#kp-coin-rim)"
        stroke="#7a4d00"
        strokeWidth="1"
      />
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke={LINE}
        strokeOpacity="0.5"
        strokeWidth="1.600"
        strokeDasharray="0.9 1.3"
      />
      {/* the field, sunk below the rim: shadow along its upper left, light along its lower right */}
      <circle cx="24" cy="24" r="17.800" fill="url(#kp-coin-field)" />
      <circle
        cx="23.500"
        cy="23.500"
        r="17.800"
        fill="none"
        stroke="#6b4300"
        strokeOpacity="0.55"
      />
      <circle cx="24.600" cy="24.600" r="17.800" fill="none" stroke="#fff3b8" strokeOpacity="0.7" />
      {/* Karman as the head on the coin: a portrait to the shoulders, cut off by the field's edge */}
      <g clipPath="url(#kp-coin-clip)">
        <g transform="translate(24 31.400) scale(0.235)">
          {/* the coat, and the turn of its collar */}
          <path d={COAT} transform="translate(-2 -2)" fill="#5a3800" fillOpacity="0.6" />
          <path d={COAT} fill="url(#kp-coin-coat)" />
          <path
            d="M-26 1L-9 34M26 1L9 34M-52 14L-40 54M52 14L40 54"
            fill="none"
            stroke="#ffe9a3"
            strokeOpacity="0.55"
            strokeWidth="2.400"
            strokeLinecap="round"
          />
          {/* the hair behind the head, over the whole top of it */}
          <path d={WIG_BACK} transform="translate(-2 -2)" fill="#5a3800" fillOpacity="0.6" />
          <path d={WIG_BACK} fill={PALE} />
          {/* the fox's ears come up through the hair */}
          <path d={EARS} fill="url(#kp-coin-fox)" stroke="#6b4300" strokeWidth="1.600" />
          <path d={EARS_IN} fill={LINE} fillOpacity="0.8" />
          {/* the face */}
          <path d={FOX} transform="translate(-2.200 -2.200)" fill="#5a3800" fillOpacity="0.75" />
          <path d={FOX} fill="url(#kp-coin-fox)" />
          <path
            d="M-40 -32L-16 -14L0 8L16 -14L40 -32M-16 -14L0 -24L16 -14"
            fill="none"
            stroke="#6b4300"
            strokeOpacity="0.7"
            strokeWidth="2.200"
            strokeLinejoin="round"
          />
          <path
            d="M-40 -32L-16 -14L0 8L-30 0ZM40 -32L16 -14L0 8L30 0Z"
            fill="#ffe9a3"
            fillOpacity="0.55"
          />
          {/* the hair swept back from the brow, which hides where the ears begin */}
          <path d={WIG_FRONT} fill={PALE} />
          <path
            d="M-34 -35C-25 -50 -8 -54 0 -47C8 -54 25 -50 34 -35"
            fill="none"
            stroke={LINE}
            strokeOpacity="0.6"
            strokeWidth="1.800"
            strokeLinecap="round"
          />
          <path
            d="M-22 -47C-21 -58 -14 -68 -8 -76M-9 -51C-9 -60 -6 -70 -3 -78M9 -51C9 -60 6 -70 3 -78M22 -47C21 -58 14 -68 8 -76M-36 -43C-36 -52 -31 -58 -27 -62M36 -43C36 -52 31 -58 27 -62"
            fill="none"
            stroke={LINE}
            strokeOpacity="0.45"
            strokeWidth="1.600"
            strokeLinecap="round"
          />
          {/* the rolls at each side, each with the line of its curl */}
          {ROLLS.map((r) =>
            [-1, 1].map((way) => (
              <g key={`${r.y}${way}`} transform={`translate(${way * r.x} ${r.y}) scale(${way} 1)`}>
                <ellipse
                  cx="-1.600"
                  cy="-1.600"
                  rx={r.rx}
                  ry={r.ry}
                  fill="#5a3800"
                  fillOpacity="0.55"
                />
                <ellipse rx={r.rx} ry={r.ry} fill={way < 0 ? PALE : "#ffe7a0"} />
                <path
                  d={`M${-r.rx * 0.62} 1C${-r.rx * 0.5} ${-r.ry * 0.7} ${r.rx * 0.5} ${-r.ry * 0.7} ${r.rx * 0.6} 0C${r.rx * 0.5} ${r.ry * 0.55} ${-r.rx * 0.1} ${r.ry * 0.55} ${-r.rx * 0.15} 0`}
                  fill="none"
                  stroke={LINE}
                  strokeOpacity="0.7"
                  strokeWidth="1.800"
                  strokeLinecap="round"
                />
              </g>
            ))
          )}
          {/* the cravat under the chin */}
          <path d={CRAVAT} transform="translate(-1.600 -1.600)" fill="#5a3800" fillOpacity="0.55" />
          <path d={CRAVAT} fill={PALE} />
          <path
            d="M-9 13C-3 17 3 17 9 13M0 17L0 36"
            fill="none"
            stroke={LINE}
            strokeOpacity="0.6"
            strokeWidth="1.600"
            strokeLinecap="round"
          />
          {/* slanted eyes, each with a point of light */}
          <ellipse
            cx="-15"
            cy="-28"
            rx="7"
            ry="4.400"
            transform="rotate(20 -15 -28)"
            fill="#4a2e00"
          />
          <ellipse
            cx="15"
            cy="-28"
            rx="7"
            ry="4.400"
            transform="rotate(-20 15 -28)"
            fill="#4a2e00"
          />
          <circle cx="-12.600" cy="-29.800" r="1.700" fill="#fff3b8" />
          <circle cx="17.400" cy="-29.800" r="1.700" fill="#fff3b8" />
          <path d="M-5 -15L5 -15L0 -9Z" fill="#4a2e00" />
          <path
            d="M-4 -5Q0 -2 4 -5"
            fill="none"
            stroke="#4a2e00"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </g>
      {/* light catching the upper left of the rim */}
      <path
        d="M7.500 17A18 18 0 0 1 19 6.600"
        fill="none"
        stroke="#fffdf0"
        strokeOpacity="0.8"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
    </svg>
  );
}
