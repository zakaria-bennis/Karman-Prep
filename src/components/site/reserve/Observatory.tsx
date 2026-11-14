// Where the registration flight lands: an observatory on a hill, drawn in code. It rises into view when the
// last question is answered. By day it is pale stone on green hills; by night its windows are lit, the dome
// stands open and a few stars sit over it (colours: intake.css, by the page's light or dark mode).
export function Observatory() {
  const pine = (x: number, y: number, s = 1) => (
    <path
      key={`${x}-${y}`}
      className="obs-pine"
      d={`M${x} ${y} l${-13 * s} 0 l${6 * s} ${-14 * s} l${-4 * s} 0 l${6 * s} ${-13 * s} l${-3 * s} 0 l${8 * s} ${-16 * s} l${8 * s} ${16 * s} l${-3 * s} 0 l${6 * s} ${13 * s} l${-4 * s} 0 l${6 * s} ${14 * s}Z`}
    />
  );
  return (
    <svg
      className="obs"
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="obs-dome" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="var(--obs-dome-hi)" />
          <stop offset="1" stopColor="var(--obs-dome)" />
        </linearGradient>
        {(["far", "hill", "near"] as const).map((k) => (
          <linearGradient key={k} id={`obs-g-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`var(--obs-${k}-hi)`} />
            <stop offset="1" stopColor={`var(--obs-${k})`} />
          </linearGradient>
        ))}
        <radialGradient id="obs-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* stars, at night only */}
      <g className="obs-stars">
        {[
          [820, 60, 2.2],
          [910, 30, 1.6],
          [1010, 76, 1.8],
          [1090, 34, 2.4],
          [1180, 92, 1.5],
          [760, 110, 1.4],
          [1250, 48, 1.9],
        ].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} />
        ))}
      </g>
      {/* the far ridge */}
      <path
        className="obs-far"
        d="M0 330 C140 270 260 300 380 250 C520 196 620 268 760 232 C900 196 1010 150 1120 190 C1240 232 1340 210 1440 250 L1440 520 L0 520Z"
      />
      {/* the hill the observatory stands on */}
      <path
        className="obs-hill"
        d="M0 430 C200 410 380 336 560 292 C660 268 780 268 880 292 C1080 340 1280 384 1440 404 L1440 520 L0 520Z"
      />
      {/* the path up to the door */}
      <path
        className="obs-path"
        d="M560 520 C640 470 760 440 770 400 C778 360 700 330 706 296"
        fill="none"
      />
      {/* the building: a round drum, a small wing, and the dome with its open slit */}
      <g transform="translate(700 204) scale(1.4)">
        <ellipse className="obs-shadow" cx="20" cy="62" rx="150" ry="14" />
        <rect className="obs-wing" x="62" y="14" width="96" height="46" rx="4" />
        <path className="obs-roof" d="M56 14 h108 l-10 -12 h-88Z" />
        <rect className="obs-win" x="80" y="26" width="16" height="20" rx="2" />
        <rect className="obs-win" x="112" y="26" width="16" height="20" rx="2" />
        <rect className="obs-drum" x="-74" y="-4" width="148" height="64" rx="6" />
        <rect className="obs-drum-shade" x="20" y="-4" width="54" height="64" rx="6" />
        <rect className="obs-door" x="-13" y="24" width="26" height="36" rx="13" />
        <rect className="obs-win" x="-54" y="14" width="14" height="22" rx="7" />
        <rect className="obs-win" x="40" y="14" width="14" height="22" rx="7" />
        <path d="M-80 -4 A80 80 0 0 1 80 -4Z" fill="url(#obs-dome)" />
        <path
          className="obs-rib"
          d="M-52 -4 A52 80 0 0 1 0 -84 M52 -4 A52 80 0 0 0 0 -84"
          fill="none"
        />
        <path className="obs-slit" d="M-11 -4 L-9 -80 Q0 -86 9 -80 L11 -4Z" />
        <path className="obs-scope" d="M-3 -40 L20 -96 L28 -92 L5 -36Z" />
        <rect className="obs-band" x="-82" y="-8" width="164" height="8" rx="3" />
        <circle className="obs-light" cx="0" cy="-30" r="60" fill="url(#obs-glow)" />
      </g>
      {[
        [500, 338, 1],
        [536, 326, 1.2],
        [1010, 340, 1.1],
        [1052, 352, 0.9],
        [440, 362, 0.8],
      ].map(([x, y, s]) => pine(x, y, s))}
      {/* the near slope */}
      <path
        className="obs-near"
        d="M0 470 C200 430 420 470 640 440 C860 410 1100 452 1440 420 L1440 520 L0 520Z"
      />
      {[
        [150, 452, 1.5],
        [230, 462, 1.2],
        [1250, 440, 1.6],
        [1330, 446, 1.3],
      ].map(([x, y, s]) => pine(x, y, s))}
    </svg>
  );
}
