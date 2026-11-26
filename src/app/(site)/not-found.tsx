// An address that doesn't exist: Karman the fox adrift in a spacesuit, looking puzzled, with the stars
// sliding past him. Two lines of words and the word Karman, top left, which is the way home. Shown for a marketing
// page that calls notFound() and, through [...missing]/page.tsx, for any address that matches no page. It
// carries its own styles, so nothing here adds to what the other marketing pages load; the student app's
// missing pages use src/app/not-found.tsx.
import { HEAD } from "@/components/portal/Fox";
import { litFonts } from "@/components/site/home/fonts";
import { ROUTES } from "@/components/site/routes";
import { SITE } from "@/lib/marketing/site-copy";

/* One tile of stars: each dot is a tiny radial gradient, and the tile repeats. */
const stars = (dots: [number, number, number, string][]) =>
  dots
    .map(
      ([x, y, r, c]) => `radial-gradient(${r}px ${r}px at ${x}% ${y}%,${c} 60%,transparent 100%)`
    )
    .join(",");

const FAR = stars([
  [8, 12, 1, "#cfd8ff"],
  [23, 64, 1, "#ffffff"],
  [37, 31, 1, "#bcc8f5"],
  [52, 83, 1, "#ffffff"],
  [64, 18, 1, "#cfd8ff"],
  [71, 55, 1, "#ffe9c4"],
  [86, 38, 1, "#ffffff"],
  [93, 91, 1, "#bcc8f5"],
  [14, 88, 1, "#ffffff"],
  [45, 6, 1, "#ffe9c4"],
]);
const MID = stars([
  [12, 40, 1.4, "#ffffff"],
  [31, 9, 1.4, "#ffe9c4"],
  [48, 58, 1.6, "#ffffff"],
  [67, 77, 1.4, "#cfd8ff"],
  [82, 21, 1.6, "#ffffff"],
  [95, 62, 1.4, "#ffe9c4"],
]);
const NEAR = stars([
  [18, 22, 2.2, "#ffffff"],
  [58, 71, 2.4, "#ffe9c4"],
  [88, 46, 2, "#dbe4ff"],
]);

const CSS = `
.sp{position:fixed;inset:0;z-index:60;overflow:hidden;background:radial-gradient(120% 90% at 70% 110%,#27305f 0%,#141a3c 38%,#080b1c 72%,#04050f 100%);color:#f4f1e8;font-family:var(--font-hanken),system-ui,sans-serif}
.sp-glow{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5;animation:sp-glow 26s ease-in-out infinite alternate}
.sp-glow.a{width:60vmax;height:42vmax;left:-18vmax;top:-12vmax;background:#3b2a78}
.sp-glow.b{width:46vmax;height:38vmax;right:-14vmax;bottom:-16vmax;background:#12506e;animation-duration:34s;animation-direction:alternate-reverse}
.sp-stars{position:absolute;inset:-640px;background-repeat:repeat;will-change:transform}
.sp-stars.far{background-image:${FAR};background-size:320px 320px;opacity:.75;animation:sp-far 90s linear infinite}
.sp-stars.mid{background-image:${MID};background-size:480px 480px;animation:sp-mid 55s linear infinite}
.sp-stars.near{background-image:${NEAR};background-size:640px 640px;animation:sp-near 28s linear infinite}
.sp-shoot{position:absolute;top:10%;left:-30%;width:clamp(160px,22vw,300px);height:2.5px;border-radius:3px;background:linear-gradient(90deg,transparent,rgba(190,215,255,.5) 60%,#fff);box-shadow:0 0 10px 1px rgba(200,220,255,.55);opacity:0;animation:sp-shoot 7s ease-in 1s infinite}
.sp-shoot.two{top:46%;animation-delay:3.4s;animation-duration:9s}
.sp-shoot.three{top:-6%;left:10%;animation-delay:5.2s;animation-duration:11s}
.sp-shoot.four{top:28%;left:-45%;animation-delay:7.9s;animation-duration:8s}
.sp-planet{position:absolute;right:clamp(-70px,3vw,90px);top:clamp(60px,13vh,150px);width:clamp(190px,25vw,400px);animation:sp-planet 40s ease-in-out infinite alternate}
.sp-home{position:absolute;z-index:2;left:clamp(16px,4vw,48px);top:clamp(14px,3vw,34px);display:inline-flex;align-items:center;min-height:48px;padding:0 14px;border-radius:999px;color:#f4f1e8;text-decoration:none;font:400 26px/1 var(--font-young-serif),Georgia,serif;letter-spacing:-0.01em;transition:background .25s ease,transform .2s ease}
@media (hover:hover){.sp-home:hover{background:rgba(244,241,232,.12)}}
.sp-home:active{transform:scale(.96)}
.sp-home:focus-visible{outline:3px solid #e7cf9a;outline-offset:3px}
.sp main{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:clamp(10px,2vh,18px);padding:72px 20px 32px;text-align:center}
.sp-fox{width:clamp(150px,min(36vh,52vw),330px);height:auto;overflow:visible;animation:sp-float 16s ease-in-out infinite alternate}
.sp-fox .head{transform-origin:0 -20px;animation:sp-head 7s ease-in-out infinite alternate}
.sp-fox .m-mouth{display:none}
.sp-fox .m-gloss{transform:translate(2px,-1.5px)}
.sp-fox .why{animation:sp-why 3.4s ease-in-out infinite alternate;transform-origin:62px -70px}
.sp h1{margin:0;font:400 clamp(34px,6vw,72px)/1.05 var(--font-young-serif),Georgia,serif;letter-spacing:-0.015em;text-wrap:balance}
.sp main p{margin:0;font-size:clamp(17px,1.6vw,21px);line-height:1.5;font-weight:500;color:#c9cde0}
@keyframes sp-far{to{transform:translate3d(-320px,160px,0)}}
@keyframes sp-mid{to{transform:translate3d(-480px,240px,0)}}
@keyframes sp-near{to{transform:translate3d(-640px,320px,0)}}
@keyframes sp-glow{to{transform:translate3d(6vmax,4vmax,0) scale(1.15)}}
@keyframes sp-shoot{0%{transform:translate3d(0,0,0) rotate(18deg);opacity:0}3%{opacity:1}16%{opacity:.9}20%{transform:translate3d(160vw,52vw,0) rotate(18deg);opacity:0}100%{transform:translate3d(160vw,52vw,0) rotate(18deg);opacity:0}}
@keyframes sp-planet{to{transform:translate3d(-26px,18px,0) rotate(-6deg)}}
@keyframes sp-float{0%{transform:translate3d(-14px,8px,0) rotate(-9deg)}50%{transform:translate3d(10px,-12px,0) rotate(4deg)}100%{transform:translate3d(18px,10px,0) rotate(11deg)}}
@keyframes sp-head{from{transform:rotate(-7deg)}to{transform:rotate(9deg)}}
@keyframes sp-why{from{transform:translateY(0) rotate(-8deg)}to{transform:translateY(-7px) rotate(10deg)}}
@media (max-width:640px){.sp main{align-content:start;padding-top:17svh}.sp-planet{position:absolute;right:clamp(-70px,3vw,90px);top:clamp(60px,13vh,150px);width:clamp(190px,25vw,400px);animation:sp-planet 40s ease-in-out infinite alternate}}
@media (max-height:520px){.sp-fox{width:130px}.sp h1{font-size:30px}.sp main{padding-top:60px}}
@media (prefers-reduced-motion:reduce){.sp *{animation:none!important}}
`;

const SUIT = "#f3f5fa";
const SHADE = "#c6ccda";
const TRIM = "#8f99b0";

export default function NotFound() {
  return (
    <div className={`${litFonts} sp`}>
      <style>{CSS}</style>
      <div className="sp-glow a" />
      <div className="sp-glow b" />
      <div className="sp-stars far" />
      <div className="sp-stars mid" />
      <div className="sp-stars near" />
      <span className="sp-shoot" />
      <span className="sp-shoot two" />
      <span className="sp-shoot three" />
      <span className="sp-shoot four" />
      <svg className="sp-planet" viewBox="0 0 300 200" aria-hidden="true">
        <defs>
          <linearGradient id="sp-bands" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f7a58" />
            <stop offset=".12" stopColor="#c9b184" />
            <stop offset=".24" stopColor="#e2cfa2" />
            <stop offset=".34" stopColor="#d3b986" />
            <stop offset=".44" stopColor="#ecdcb4" />
            <stop offset=".54" stopColor="#d9c08e" />
            <stop offset=".64" stopColor="#c7a976" />
            <stop offset=".76" stopColor="#dcc699" />
            <stop offset=".88" stopColor="#b79a6c" />
            <stop offset="1" stopColor="#8a7453" />
          </linearGradient>
          <radialGradient id="sp-shade" cx=".3" cy=".28" r=".85">
            <stop offset="0" stopColor="#fff" stopOpacity=".28" />
            <stop offset=".45" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#02030a" stopOpacity=".88" />
          </radialGradient>
          <linearGradient id="sp-ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#bfae8c" stopOpacity=".55" />
            <stop offset=".5" stopColor="#efe2c2" />
            <stop offset="1" stopColor="#a8987a" stopOpacity=".5" />
          </linearGradient>
          <clipPath id="sp-back">
            <rect x="0" y="0" width="300" height="100" />
          </clipPath>
          <clipPath id="sp-front">
            <rect x="0" y="100" width="300" height="100" />
          </clipPath>
          <clipPath id="sp-ball">
            <circle cx="150" cy="100" r="56" />
          </clipPath>
        </defs>
        <g transform="rotate(-20 150 100)">
          <g clipPath="url(#sp-back)" fill="none" stroke="url(#sp-ring)">
            <ellipse cx="150" cy="100" rx="128" ry="30" strokeWidth="9" opacity=".6" />
            <ellipse cx="150" cy="100" rx="109" ry="25.5" strokeWidth="17" opacity=".85" />
            <ellipse cx="150" cy="100" rx="87" ry="20" strokeWidth="8" opacity=".4" />
          </g>
          <circle cx="150" cy="100" r="56" fill="url(#sp-bands)" />
          <g clipPath="url(#sp-ball)">
            {/* the rings' shadow across the globe */}
            <ellipse
              cx="150"
              cy="88"
              rx="118"
              ry="22"
              fill="none"
              stroke="#1a1408"
              strokeWidth="7"
              opacity=".32"
            />
          </g>
          <circle cx="150" cy="100" r="56" fill="url(#sp-shade)" />
          <g clipPath="url(#sp-front)" fill="none" stroke="url(#sp-ring)">
            <ellipse cx="150" cy="100" rx="128" ry="30" strokeWidth="9" opacity=".7" />
            <ellipse cx="150" cy="100" rx="109" ry="25.5" strokeWidth="17" opacity=".95" />
            <ellipse cx="150" cy="100" rx="87" ry="20" strokeWidth="8" opacity=".5" />
          </g>
        </g>
      </svg>

      <a className="sp-home" href={ROUTES.home} aria-label={SITE["not found home"]}>
        Karman
      </a>

      <main>
        <svg className="sp-fox" viewBox="-110 -100 220 250" aria-hidden="true" focusable="false">
          <rect x="-36" y="20" width="72" height="64" rx="14" fill={TRIM} />
          <path d="M20 84 C58 78 86 102 72 134 C62 120 42 110 20 106Z" fill={SUIT} />
          <path d="M60 104 C70 112 74 122 72 134 C66 126 58 118 50 114Z" fill="#E89A2C" />
          <g transform="rotate(14 -16 92)">
            <rect x="-28" y="86" width="24" height="46" rx="11" fill={SUIT} />
            <rect x="-31" y="124" width="30" height="17" rx="8.5" fill={TRIM} />
          </g>
          <g transform="rotate(-20 16 92)">
            <rect x="4" y="86" width="24" height="46" rx="11" fill={SHADE} />
            <rect x="1" y="124" width="30" height="17" rx="8.5" fill={TRIM} />
          </g>
          <rect x="-31" y="24" width="62" height="74" rx="24" fill={SUIT} />
          <path
            d="M8 24 H7 A24 24 0 0 1 31 48 V74 A24 24 0 0 1 7 98 H8 C20 80 20 44 8 24Z"
            fill={SHADE}
          />
          <rect x="-15" y="50" width="30" height="19" rx="5" fill="#232b4d" />
          <circle cx="-8" cy="59.5" r="2.6" fill="#e7cf9a" />
          <circle cx="0" cy="59.5" r="2.6" fill="#7fd3c4" />
          <circle cx="8" cy="59.5" r="2.6" fill="#f28b7e" />
          <rect x="-31" y="78" width="62" height="6" fill={TRIM} opacity=".55" />
          {/* One paw up at the helmet, the other out in a shrug. */}
          <path
            d="M-24 42 Q-66 40 -58 4"
            fill="none"
            stroke={SUIT}
            strokeWidth="20"
            strokeLinecap="round"
          />
          <circle cx="-57" cy="0" r="12" fill={TRIM} />
          <path
            d="M24 42 Q58 50 70 26"
            fill="none"
            stroke={SHADE}
            strokeWidth="20"
            strokeLinecap="round"
          />
          <circle cx="72" cy="22" r="12" fill={TRIM} />
          <circle cx="0" cy="-32" r="60" fill="#161c3d" />
          <g className="head">
            <g dangerouslySetInnerHTML={{ __html: HEAD }} />
            <path
              d="M-23 -42 Q-15 -49 -8 -43"
              stroke="#24180F"
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M9 -38 L22 -40"
              stroke="#24180F"
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M-6 -5 Q-3 -8.5 0 -5.5 T6 -6"
              stroke="#24180F"
              strokeWidth="1.9"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          <circle
            cx="0"
            cy="-32"
            r="60"
            fill="#9fc4ff"
            fillOpacity=".1"
            stroke={SUIT}
            strokeWidth="6"
          />
          <path
            d="M-44 -52 A50 50 0 0 1 -18 -80"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity=".55"
          />
          <path
            d="M38 -6 A50 50 0 0 0 47 -22"
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".3"
          />
          <ellipse cx="0" cy="27" rx="35" ry="9" fill={SHADE} />
          <text
            className="why"
            x="62"
            y="-70"
            fontSize="40"
            fontFamily="var(--font-young-serif),Georgia,serif"
            fill="#e7cf9a"
          >
            ?
          </text>
        </svg>
        <h1>{SITE["not found title"]}</h1>
        <p>{SITE["not found text"]}</p>
      </main>
    </div>
  );
}
