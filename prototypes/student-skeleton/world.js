/*
 * The living world behind the app: the painting, with mist, stars and moonlight
 * moving over it. It answers the pointer, stops on question screens so nothing
 * competes with reading, and holds one still frame under reduced motion.
 */
(() => {
  const root = document.createElement("div");
  root.id = "world"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<div class="w-art"><img alt="" id="wImg"></div><canvas id="wMist"></canvas>`;
  document.body.prepend(root);
  const img = root.querySelector("#wImg"), wrap = root.querySelector(".w-art"), canvas = root.querySelector("#wMist");
  const MOON = { phone: [0.93, 0.42], tablet: [0.5, 0.2], wide: [0.58, 0.22] };
  const shape = () => (innerWidth < 560 ? "phone" : innerWidth < 1000 ? "tablet" : "wide");
  const theme = () => document.documentElement.dataset.theme || "dark";
  const lookNow = () => document.documentElement.dataset.look || "ink";
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hidden = () => document.getElementById("app").classList.contains("focus") && !document.querySelector(".hero-zone");
  function paintImage() {
    const src = `art/${lookNow()}-${theme()}-${shape()}.jpg`;
    if (!img.src.endsWith(src)) img.src = src;
  }
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  let U = null;
  if (gl) {
    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `precision mediump float;
uniform vec2 r;uniform float t,top,bot,dim,dark,wood;uniform vec2 m,moon;uniform vec3 c;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(11.3,7.1);a*=.5;}return s;}
void main(){
  vec2 px=vec2(gl_FragCoord.x,r.y-gl_FragCoord.y);
  float ax=r.x/r.y,x=px.x/r.y,y=px.y/r.y;
  float v=(px.y-top)/max(1.,bot-top);
  vec2 q=vec2(x,y)+m*.012;
  float warp=fbm(vec2(q.x*1.4-t*.018,q.y*3.+t*.012));
  float far=fbm(vec2(q.x*1.7-t*.045+warp*.9,q.y*5.5+warp*.5));
  float near=fbm(vec2(q.x*2.9-t*.09+warp*1.3,q.y*8.+warp*.8+3.));
  float a1=smoothstep(.42,.74,far),a2=smoothstep(.46,.78,near);
  float valley=smoothstep(.2,.62,v)*(1.-smoothstep(.8,1.34,v));
  float sky=(1.-smoothstep(.05,.55,v))*smoothstep(-.02,.02,v);
  float page=smoothstep(.9,1.5,v);
  float amt=a1*(valley*.42+sky*.13+page*.075)+a2*(valley*.34+page*.05);
  vec2 pm=(m*.5+.5)*vec2(ax,1.);
  amt*=1.-.55*(1.-smoothstep(.02,.2,distance(vec2(x,y),pm)));
  if(wood>.5){amt=floor(amt*4.5+.35)/4.5;}
  vec3 col=c*amt;float al=amt;
  if(dark>.5){
    vec2 g=gl_FragCoord.xy/9.;vec2 id=floor(g);float s=h(id);
    vec2 off=vec2(h(id+3.),h(id+5.))*.7+.15;
    float dot_=1.-smoothstep(.06,.15,distance(fract(g),off));
    float tw=step(.965,s)*(.5+.5*sin(t*(.5+h(id+7.)*1.6)+s*90.));
    float star=dot_*tw*(1.-smoothstep(.12,.6,v))*smoothstep(-.02,.02,v)*max(0.,1.-amt*2.2);
    col+=vec3(.95,.97,1.)*star;al=max(al,star);
  }
  vec2 mp=vec2(moon.x*r.x,top+moon.y*(bot-top))/r.y;
  float d=distance(vec2(x,y),mp);
  float breath=.75+.25*sin(t*.42);
  float glow=dark*.26*breath*(1.-smoothstep(.0,.34,d))*(1.-smoothstep(.9,1.2,v));
  col+=vec3(1.,.96,.84)*glow;al=max(al,glow);
  gl_FragColor=vec4(col,al)*dim;
}`;
    const sh = (ty, src) => { const o = gl.createShader(ty); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr); gl.useProgram(pr);
    gl.vertexAttribPointer(gl.getAttribLocation(pr, "p"), 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(pr, "p"));
    U = Object.fromEntries(["r", "t", "top", "bot", "dim", "dark", "wood", "m", "moon", "c"].map((k) => [k, gl.getUniformLocation(pr, k)]));
  }
  const MIST = { dark: { ink: [0.62, 0.68, 0.76], wood: [0.5, 0.62, 0.72] }, light: { ink: [0.97, 0.95, 0.9], wood: [0.99, 0.95, 0.85] } };
  let mx = 0, my = 0, tx = 0, ty = 0, scale = 0.6, W = 0, H = 0;
  function size() {
    const w = Math.ceil(innerWidth * scale), h = Math.ceil(innerHeight * scale);
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; if (gl) gl.viewport(0, 0, w, h); }
  }
  addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  /* Where the painting sits: behind the page's hero, or a dim band on other screens. */
  function band() {
    const hero = document.querySelector(".hero-zone");
    if (hero) { const r = hero.getBoundingClientRect(); return { top: r.top, bot: r.bottom, dim: 1 }; }
    const top = 52 - scrollY;
    return { top, bot: top + Math.min(innerWidth / (shape() === "phone" ? 1.2 : shape() === "tablet" ? 2.7 : 4.5), 280), dim: 0.3 };
  }
  const start = performance.now();
  let last = 0, painted = "";
  function draw(now) {
    requestAnimationFrame(draw);
    if (document.hidden) return;
    const off = hidden();
    root.classList.toggle("off", off);
    if (off) return;
    const moving = !still();
    if (moving && now - last < 32) return;
    last = now;
    paintImage(); size();
    if (moving) { mx += (tx - mx) * 0.05; my += (ty - my) * 0.05; }
    const b = band(), hgt = Math.max(1, b.bot - b.top);
    wrap.style.transform = `translate3d(0,${b.top}px,0)`;
    wrap.style.height = `${hgt}px`;
    wrap.style.opacity = b.dim;
    img.style.transform = `translate3d(${(-mx * 8).toFixed(2)}px,${(-my * 4).toFixed(2)}px,0) scale(1.03)`;
    if (!gl) return;
    /* Under reduced motion the page still scrolls and themes change, so redraw one still frame when they do. */
    const key = [Math.round(b.top), Math.round(b.bot), b.dim, W, H, theme(), lookNow(), innerWidth].join();
    if (!moving && key === painted) return;
    painted = key;
    gl.uniform2f(U.r, W, H);
    gl.uniform1f(U.t, moving ? (now - start) / 1000 : 40);
    gl.uniform1f(U.top, b.top * scale); gl.uniform1f(U.bot, b.bot * scale); gl.uniform1f(U.dim, b.dim === 1 ? 1 : 0.5);
    const dark = theme() === "dark", c = MIST[theme()][lookNow()];
    gl.uniform1f(U.dark, dark ? 1 : 0); gl.uniform1f(U.wood, lookNow() === "wood" ? 1 : 0);
    gl.uniform2f(U.m, mx, my);
    const mo = MOON[shape()]; gl.uniform2f(U.moon, mo[0], mo[1]);
    gl.uniform3f(U.c, c[0], c[1], c[2]);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(draw);
  window.worldRefresh = () => { painted = ""; };
})();
