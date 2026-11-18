// Turns the Schedule's scene photographs into paintings (founder, 2026-11-17: the plain
// photographs looked "too real"; he asked for a halfway between a photograph and a painting).
//
// For each photograph in public/scenes it writes a painted twin beside it (lake-day.jpg ->
// lake-day-painted.jpg). The painting is made on the graphics card, once, here, so the site only
// ever loads a finished picture:
//   brush     each point takes its color from the calmest wedges of a round brush around it (a
//             generalized Kuwahara filter), which lays the photo down in flat, soft-edged strokes
//             the way paint does, and keeps edges where they are
//   color     richer; greens warmer, pale gray skies a soft blue; the darkest darks are lifted
//             into deep blue-violet, as a painter mixes shadows from color, never from black
//   paper     a faint grain
// Run it with the dev server up:   node scripts/dev/paint-scenes.cjs
// A place with a photograph of its day and none of its night (<place>-day.jpg, no
// <place>-night.jpg) also gets <place>-night-painted.jpg, made from the day: the same place
// under moonlight. --only lake paints just the files that begin with "lake".
// Options:  --brush 6 (stroke size in pixels)  --passes 2 (times the brush goes over it)
// --keep 0.1 (how much of the photo's fine detail shows through)  --color 1.35 (richness)
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const arg = (name, fallback) => {
  const at = process.argv.indexOf("--" + name);
  return at > -1 ? Number(process.argv[at + 1]) : fallback;
};
const BRUSH = arg("brush", 6);
const KEEP = arg("keep", 0.1);
const COLOR = arg("color", 1.35);
const PASSES = arg("passes", 2);
const DIR = path.join(process.cwd(), "public", "scenes");
const BASE = process.env.SCENES_ORIGIN || "http://localhost:3000";

const FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_size;
uniform float u_keep;
uniform float u_color;
uniform float u_last;
uniform float u_dusk;
const float RAD = ${BRUSH.toFixed(1)};
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_size;
  vec2 px = 1.0 / u_size;
  vec3 here = texture2D(u_tex, uv).rgb;
  // a round brush: eight wedges around the point; the calmest wedges give the stroke its color,
  // so edges stay where they are and everything between them is laid flat
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int k = 0; k < 8; k++) {
    float mid = float(k) * 0.7853982;
    vec3 m = here;
    vec3 q = here * here;
    float w = 1.0;
    for (int a = -2; a <= 2; a++) {
      float ang = mid + float(a) * 0.19;
      vec2 dir = vec2(cos(ang), sin(ang));
      for (int r = 1; r <= 6; r++) {
        float d = RAD * float(r) / 6.0;
        float g = exp(-d * d / (0.55 * RAD * RAD));
        vec3 c = texture2D(u_tex, uv + dir * d * px).rgb;
        m += c * g;
        q += c * c * g;
        w += g;
      }
    }
    m /= w;
    float sigma = sqrt(max(dot(abs(q / w - m * m), vec3(1.0)), 0.0)) * 255.0;
    // a wedge counts for more the calmer it is, and for less the further its color is from the
    // point's own, so a dark shape never spreads over the light beside it
    vec3 far = m - here;
    float calm = (1.0 / (1.0 + pow(sigma / 9.0, 4.0))) * exp(-dot(far, far) / 0.02) + 0.0005;
    sum += m * calm;
    total += calm;
  }
  vec3 col = sum / total;
  if (u_last < 0.5) { gl_FragColor = vec4(col, 1.0); return; }
  // a little of the photograph's own fine detail is kept under the strokes
  col = mix(col, here, u_keep);
  // color: richer, the mid-tones opened, a gentle curve
  float l = dot(col, vec3(0.30, 0.59, 0.11));
  if (u_dusk > 0.5) {
    // night, made from the day's photograph: most of the color drains away, what is left turns
    // to moonlit blue, and the sky, the brightest thing by day, becomes the deep part
    vec3 n = mix(vec3(l), col, 0.50) * vec3(0.30, 0.43, 0.82);
    // (blossom and pale sand are warm, not sky: they keep their light and glow a little)
    float warm = smoothstep(0.0, 0.10, col.r - col.b);
    n *= mix(1.0, 0.68, smoothstep(0.35, 0.85, l) * smoothstep(0.25, 0.75, uv.y) * (1.0 - warm));
    n += warm * smoothstep(0.45, 0.90, l) * vec3(0.10, 0.09, 0.15);
    // open blue sky goes deepest of all; cloud stays a little lighter than it, as under a moon
    n *= mix(1.0, 0.66, smoothstep(0.0, 0.40, col.b - col.r) * smoothstep(0.20, 0.80, l));
    n = pow(n, vec3(1.10)) * 1.45;
    n = max(n, vec3(0.030, 0.036, 0.085) * (1.0 + 0.6 * uv.y));
    n *= 0.985 + 0.03 * hash(gl_FragCoord.xy);
    gl_FragColor = vec4(clamp(n, 0.0, 1.0), 1.0);
    return;
  }
  col = mix(vec3(l), col, u_color);
  col = pow(max(col, 0.0), vec3(0.88));
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  // storybook color: greens lean to warm, sunlit green; pale gray skies lean to a soft blue
  float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
  float green = smoothstep(0.02, 0.18, col.g - max(col.r, col.b));
  col = mix(col, col * vec3(1.10, 1.06, 0.80), green * 0.55);
  float pale = smoothstep(0.55, 0.85, l) * (1.0 - smoothstep(0.04, 0.16, sat));
  col = mix(col, col * vec3(0.84, 0.95, 1.10), pale * 0.75);
  // the darkest darks become deep blue-violet, and the brightest lights a warm cream
  col = max(col, vec3(0.050, 0.055, 0.115) * (1.0 + 0.6 * uv.y));
  col = mix(col, vec3(1.0, 0.975, 0.91), smoothstep(0.90, 1.0, l) * 0.5);
  // paper
  col *= 0.985 + 0.03 * hash(gl_FragCoord.xy);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

(async () => {
  const only = process.argv.includes("--only")
    ? process.argv[process.argv.indexOf("--only") + 1]
    : "";
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /\.jpg$/.test(f) && !/-painted\.jpg$/.test(f) && f.startsWith(only));
  // every photograph is painted; and a place with no photograph of its night gets one made from
  // its day
  const jobs = files.map((file) => ({
    file,
    out: file.replace(/\.jpg$/, "-painted.jpg"),
    dusk: 0,
  }));
  for (const file of files) {
    const day = /^(.+)-day\.jpg$/.exec(file);
    if (day && !fs.existsSync(path.join(DIR, day[1] + "-night.jpg")))
      jobs.push({ file, out: day[1] + "-night-painted.jpg", dusk: 1 });
  }
  const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=metal"] });
  const page = await browser.newPage();
  await page.goto(BASE + "/scenes/" + files[0]);
  for (const { file, out, dusk } of jobs) {
    const painted = await page.evaluate(
      async ({ src, frag, keep, color, passes, dusk }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
        const make = (type, source) => {
          const s = gl.createShader(type);
          gl.shaderSource(s, source);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
          return s;
        };
        const program = gl.createProgram();
        gl.attachShader(
          program,
          make(
            gl.VERTEX_SHADER,
            "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"
          )
        );
        gl.attachShader(program, make(gl.FRAGMENT_SHADER, frag));
        gl.linkProgram(program);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW
        );
        const at = gl.getAttribLocation(program, "p");
        gl.enableVertexAttribArray(at);
        gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
          gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
        for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
          gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.uniform2f(gl.getUniformLocation(program, "u_size"), canvas.width, canvas.height);
        gl.uniform1f(gl.getUniformLocation(program, "u_keep"), keep);
        gl.uniform1f(gl.getUniformLocation(program, "u_color"), color);
        gl.uniform1f(gl.getUniformLocation(program, "u_dusk"), dusk);
        gl.viewport(0, 0, canvas.width, canvas.height);
        // the brush goes over the picture more than once; color is graded on the last pass
        const last = gl.getUniformLocation(program, "u_last");
        for (let pass = 0; pass < passes; pass++) {
          gl.uniform1f(last, pass === passes - 1 ? 1 : 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (pass < passes - 1)
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, canvas.width, canvas.height, 0);
        }
        return canvas.toDataURL("image/jpeg", 0.86);
      },
      { src: "/scenes/" + file, frag: FRAG, keep: KEEP, color: COLOR, passes: PASSES, dusk }
    );
    fs.writeFileSync(path.join(DIR, out), Buffer.from(painted.split(",")[1], "base64"));
    console.log(out, Math.round(fs.statSync(path.join(DIR, out)).size / 1024) + " KB");
  }
  await browser.close();
})();
