// The two small drawings on "Who is reserving the seat?" (founder, 2026-11-14), drawn in code: a mother
// hugging her son, and a girl in a cap and gown holding up her diploma, smiling. Simple flat shapes in the
// page's ink and blue. Each moves a little when its card is hovered or picked (reserve.css).

const SKIN = "#f3d2b3";
const HAIR = "#2b2333";

export function ParentPicture() {
  return (
    <svg className="rs-pic" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
      {/* a small heart over them */}
      <path
        className="rs-pic-heart"
        d="M95 20c-2.600-4.400-9-2.300-9 2.400 0 4 5.300 7.300 9 10.100 3.700-2.800 9-6.100 9-10.100 0-4.700-6.400-6.800-9-2.400Z"
        fill="#e2574c"
      />
      {/* the mother: hair in a bun, a blue dress */}
      <circle cx="41" cy="13" r="6" fill={HAIR} />
      <path d="M35 30c0-10 6-16 14-16s14 6 14 16c0 6-3 10-6 12H41c-3-2-6-6-6-12Z" fill={HAIR} />
      <path d="M36 44c2-4 7-6 13-6s11 2 13 6l6 52H30l6-52Z" fill="var(--a)" />
      <circle cx="49" cy="28" r="11.500" fill={SKIN} />
      <path d="M38 26c2-8 8-11 14-10 5 1 8 4 9 9-6 0-13-2-17-6-1 3-3 5-6 7Z" fill={HAIR} />
      <path d="M44 28.500q2 2 4 0M52 28.500q2 2 4 0" className="rs-pic-line" />
      <path d="M45.500 33q4 3.600 8 0" className="rs-pic-line" />
      {/* her son, leaning in */}
      <g className="rs-pic-child">
        <path d="M64 60c1-3 5-5 10-5s9 2 10 5l4 36H62l2-36Z" fill="#f2b84b" />
        <circle cx="74" cy="46" r="9.500" fill={SKIN} />
        <path
          d="M64.500 45c0-7 4-10.500 9.500-10.500s9.500 3.500 9.500 10.500c-3-3-6-4.500-9.500-4.500s-6.500 1.500-9.500 4.500Z"
          fill={HAIR}
        />
        <path
          d="M69.500 46.500q1.700 1.700 3.400 0M76 46.500q1.700 1.700 3.400 0"
          className="rs-pic-line"
        />
        <path d="M70.500 50.500q3.500 3 7 0" className="rs-pic-line" />
      </g>
      {/* her arm around him, and his around her */}
      <path d="M60 50c8 2 18 8 26 18" className="rs-pic-arm" stroke="var(--a)" />
      <circle cx="86.500" cy="68.500" r="3.800" fill={SKIN} />
      <path d="M66 66c-6 3-13 4-20 3" className="rs-pic-arm" stroke="#f2b84b" />
      <circle cx="45.500" cy="69" r="3.600" fill={SKIN} />
    </svg>
  );
}

export function StudentPicture() {
  return (
    <svg className="rs-pic" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
      {/* long hair behind the shoulders */}
      <path d="M43 30c0-11 7-18 17-18s17 7 17 18v24c0 4-3 6-6 6H49c-3 0-6-2-6-6V30Z" fill={HAIR} />
      {/* the gown */}
      <path d="M44 50c3-4 9-6 16-6s13 2 16 6l8 46H36l8-46Z" fill="var(--a)" />
      <path d="M60 44v52" stroke="rgba(255,255,255,.35)" strokeWidth="1.500" />
      <path
        d="M53 45l7 9 7-9"
        fill="none"
        stroke="#fffaf3"
        strokeWidth="2.500"
        strokeLinejoin="round"
      />
      {/* her face, smiling */}
      <circle cx="60" cy="31" r="12" fill={SKIN} />
      <path d="M48 30c1-8 6-12 12-12s11 4 12 12c-5-1-9-3-12-7-3 4-7 6-12 7Z" fill={HAIR} />
      <circle cx="55.500" cy="31" r="1.400" fill={HAIR} />
      <circle cx="64.500" cy="31" r="1.400" fill={HAIR} />
      <path
        d="M54.500 35.500q5.500 5.500 11 0Z"
        fill="#fffaf3"
        stroke={HAIR}
        strokeWidth="1.400"
        strokeLinejoin="round"
      />
      {/* the cap, with its tassel */}
      <path d="M50 17h20v6c-6 2.500-14 2.500-20 0v-6Z" fill={HAIR} />
      <path d="M60 6l25 9-25 9-25-9 25-9Z" fill="#3a3148" />
      <g className="rs-pic-tassel">
        <path
          d="M60 15l19 3v10"
          fill="none"
          stroke="#f2b84b"
          strokeWidth="1.800"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M77 28h4l1 7h-6l1-7Z" fill="#f2b84b" />
      </g>
      {/* her arm up, holding the diploma */}
      <g className="rs-pic-wave">
        <path d="M74 54c7-4 12-11 16-20" className="rs-pic-arm" stroke="var(--a)" />
        <circle cx="90.500" cy="33" r="3.800" fill={SKIN} />
        <g transform="rotate(-28 95 24)">
          <rect
            x="84"
            y="19"
            width="24"
            height="9"
            rx="4.500"
            fill="#fffaf3"
            stroke={HAIR}
            strokeWidth="1.300"
          />
          <path d="M94.500 19v9M97.500 19v9" stroke="#e2574c" strokeWidth="2" />
        </g>
      </g>
      <path d="M46 54c-5 4-8 10-9 18" className="rs-pic-arm" stroke="var(--a)" />
      <circle cx="37" cy="73" r="3.600" fill={SKIN} />
    </svg>
  );
}
