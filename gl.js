'use strict';
// WebGL2 backdrop: the film's paper, baked once per size, and a morphing stippled point cloud.
const Backdrop = (() => {
  const canvas = document.getElementById('gl');
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) {
    canvas.remove();
    return null;
  }

  const FS_VERT = `#version 300 es
out vec2 vUv;
void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;

  const PAPER_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec3 uA; uniform vec2 uRes; uniform float uDpr,uLine;
float hash12(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }
void main(){
  vec2 px=vUv*uRes/uDpr;
  vec2 g=abs(fract(px/40.)-.5);
  float line=smoothstep(.485,.5,max(g.x,g.y));
  float f=fbm(px*.012)*.5+fbm(px*.09)*.25;
  vec3 c=uA*(.955+f*.07);
  c+=uLine*line*.045;
  float v=length((vUv-.5)*vec2(1.2,1.));
  c*=1.-v*v*.22;
  o=vec4(c,1.);
}`;

  const COPY_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex;
void main(){ o=texture(uTex,vUv); }`;

  const PTS_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec4 aA;
layout(location=1) in vec4 aB;
layout(location=2) in vec3 aR;
uniform float uMix,uTime,uAspect,uSize,uFade,uInvert;
uniform mat3 uRot; uniform vec3 uPlace,uInk,uEmber;
out vec3 vCol; out float vA;
vec3 flow(vec3 p,float t){
  return vec3(sin(p.y*1.7+t)+sin(p.z*2.3-t*.7),sin(p.z*1.9+t*.9)+sin(p.x*2.1+t*.6),sin(p.x*1.6-t*1.1)+sin(p.y*2.5+t*.8))*.5;
}
void main(){
  const float spread=.55;
  float m=smoothstep(aR.x*spread,aR.x*spread+1.-spread,uMix);
  vec3 p=mix(aA.xyz,aB.xyz,m);
  float tone=mix(aA.w,aB.w,m);
  float s=sin(m*3.14159);
  p+=flow(p*1.2+aR.y*2.,uTime*.6+aR.z*6.)*(.55*s*s+.006);
  p=uRot*p;
  float w=1.-p.z*.2;
  vec2 q=p.xy/w*uPlace.z;
  gl_Position=vec4(q.x/uAspect+uPlace.x,q.y+uPlace.y,0.,1.);
  gl_PointSize=uSize*(.75+aR.y*.5)/w;
  vec3 n=normalize(p);
  float lit=clamp(dot(n,normalize(vec3(-.56,.5,.66))),0.,1.);
  // tone: under .6 a stippled surface facing the viewer, .995 the ring, 1 always drawn, else stippled.
  bool surface=tone<.6;
  bool ring=tone>.992&&tone<.998;
  float grain=surface?tone/.59:.5;
  float shade=clamp(mix(1.-lit,lit,uInvert)+(grain-.5)*.8,0.,1.);
  float show=tone>.99?1.:step(aR.y,.03+pow(shade,1.7)*1.05);
  if(surface&&p.z<0.) show=0.;
  if(ring&&p.z<0.&&dot(p.xy,p.xy)<1.) show=0.;
  vCol=aR.z>.992?uEmber:uInk;
  vA=show*uFade;
}`;

  const PTS_FRAG = `#version 300 es
precision highp float;
in vec3 vCol; in float vA; out vec4 o;
void main(){ if(vA<.01) discard; o=vec4(vCol,vA); }`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  const paperP = program(FS_VERT, PAPER_FRAG);
  const copyP = program(FS_VERT, COPY_FRAG);
  const ptsP = program(PTS_VERT, PTS_FRAG);
  const loc = (p, n) => gl.getUniformLocation(p, n);
  const U = Object.fromEntries(['uMix', 'uTime', 'uAspect', 'uSize', 'uFade', 'uInvert', 'uRot', 'uPlace', 'uInk', 'uEmber'].map((n) => [n, loc(ptsP, n)]));
  const empty = gl.createVertexArray();

  // Point targets: x, y, z, tone. tone 1 stays visible; anything else is stippled by the light.
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  let count = Math.min(+canvas.dataset.points || 46000, mobile ? 18000 : 46000);
  const N = count;
  const rand = (() => { let a = 72; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const fract = (x) => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy) + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
  };
  const shapes = {
    moon(o, i) {
      if (i % 23 === 0) {
        const a = rand() * Math.PI * 2, r = 1.52 + rand() * .035, c = Math.cos(.3), s = Math.sin(.3);
        const x = Math.cos(a) * r, z = Math.sin(a) * r * .9;
        o.set([x * c, x * s, z, .995], i * 4);
        return;
      }
      const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const x = r * Math.cos(a), z = r * Math.sin(a), y = u;
      const tone = (noise(x * 2.6 + 4, y * 2.6 + z * 2.1) + noise(x * 6 + z * 5, y * 6) * .5) / 1.5;
      o.set([x, y, z, Math.min(.59, tone * .62)], i * 4);
    },
    lattice(o, i) {
      const k = 3, e = (j) => (j / k) * 2 - 1;
      const axis = Math.floor(rand() * 3), a = e(Math.floor(rand() * (k + 1))), b = e(Math.floor(rand() * (k + 1)));
      const t = rand() * 2 - 1, j = .012;
      const p = axis === 0 ? [t, a, b] : axis === 1 ? [a, t, b] : [a, b, t];
      o.set([p[0] * .82 + (rand() - .5) * j, p[1] * .82 + (rand() - .5) * j, p[2] * .82 + (rand() - .5) * j, i % 3 ? .62 : 1], i * 4);
    },
    sheets(o, i) {
      const n = 7, s = Math.floor(rand() * n), x = rand() * 2.2 - 1.1, z = rand() * 1.5 - .75;
      const y = -.96 + s * .32 + Math.sin(x * 2.6 + s) * Math.cos(z * 3 + s * .7) * .06;
      o.set([x, y, z, i % 4 ? .6 : 1], i * 4);
    },
    // Rings round the vertical axis, so the outline holds as the cloud turns.
    signal(o, i) {
      if (i % 40 === 0) {
        o.set([(rand() - .5) * .012, rand() * 1.45 - .45, (rand() - .5) * .012, 1], i * 4);
        return;
      }
      const n = 7, s = Math.floor(rand() * n), a = rand() * Math.PI * 2;
      const r = .18 + s * .19 + (rand() - .5) * .014;
      o.set([Math.cos(a) * r, -.45 + Math.sin(r * 7.5) * .09, Math.sin(a) * r, 1], i * 4);
    },
  };
  const ORDER = ['moon', 'lattice', 'sheets', 'signal'];
  const buffers = ORDER.map((name) => {
    const data = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) shapes[name](data, i);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  });
  const randoms = new Float32Array(N * 3);
  for (let i = 0; i < randoms.length; i++) randoms[i] = rand();
  const randomBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, randomBuf);
  gl.bufferData(gl.ARRAY_BUFFER, randoms, gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enableVertexAttribArray(2);
  gl.bindBuffer(gl.ARRAY_BUFFER, randomBuf);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
  const bindShapes = (a, b) => {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[a]);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[b]);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  };

  let W = 0, H = 0, dpr = 1, paperTex = null, paperFb = null;
  let theme = { paper: [.827, .804, .722], ink: [.102, .094, .078], ember: [.788, .322, .122], line: -1, invert: 0 };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

  function bakePaper() {
    if (paperTex) { gl.deleteTexture(paperTex); gl.deleteFramebuffer(paperFb); }
    paperTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paperTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, W, H);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    paperFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, paperFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, paperTex, 0);
    gl.viewport(0, 0, W, H);
    gl.useProgram(paperP);
    gl.uniform3fv(loc(paperP, 'uA'), theme.paper);
    gl.uniform2f(loc(paperP, 'uRes'), W, H);
    gl.uniform1f(loc(paperP, 'uDpr'), dpr);
    gl.uniform1f(loc(paperP, 'uLine'), theme.line);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    W = Math.round(innerWidth * dpr);
    H = Math.round(innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    bakePaper();
  }

  // Motion state: from/to shape and where on screen the cloud sits.
  let from = 0, to = 0, mix = 0, morphing = false, tStart = 0;
  const place = [0, 0, .5], target = [0, 0, .5];
  let fade = 0, fadeTo = 1;
  let anchor = null;
  let running = false;
  let calm = false;
  const started = performance.now();

  function aim(jump) {
    if (anchor && anchor.offsetParent !== null) {
      const r = anchor.getBoundingClientRect();
      target[0] = ((r.left + r.width / 2) / innerWidth) * 2 - 1;
      target[1] = 1 - ((r.top + r.height / 2) / innerHeight) * 2;
      target[2] = (Math.min(r.width, r.height) * .33 / innerHeight) * 2;
      fadeTo = 1;
    } else {
      fadeTo = 0;
    }
    if (jump) { place[0] = target[0]; place[1] = target[1]; place[2] = target[2]; fade = fadeTo; }
  }

  function draw(now) {
    const t = (now - started) / 1000;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.useProgram(copyP);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, paperTex);
    gl.uniform1i(loc(copyP, 'uTex'), 0);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const ang = calm ? .7 : t * .1 + .7, tilt = .32;
    const c = Math.cos(ang), s = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt);
    const rot = new Float32Array([c, st * s, -ct * s, 0, ct, st, s, -st * c, ct * c]);
    gl.useProgram(ptsP);
    gl.uniform1f(U.uMix, mix);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uAspect, W / H);
    gl.uniform1f(U.uSize, 1.55 * dpr);
    gl.uniform1f(U.uFade, fade);
    gl.uniform1f(U.uInvert, theme.invert);
    gl.uniformMatrix3fv(U.uRot, false, rot);
    gl.uniform3fv(U.uPlace, place);
    gl.uniform3fv(U.uInk, theme.ink);
    gl.uniform3fv(U.uEmber, theme.ember);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    bindShapes(from, to);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  let slow = 0, last = 0;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = now - last;
    last = now;
    if (dt > 45 && dt < 400 && ++slow > 40 && count > 9000) { count = count >> 1; slow = 0; }
    aim(false);
    const k = 1 - Math.pow(.86, Math.min(dt, 60) / 16.7);
    for (let i = 0; i < 3; i++) place[i] += (target[i] - place[i]) * k;
    fade += (fadeTo - fade) * k;
    if (morphing) {
      const p = Math.min(1, (now - tStart) / 1500);
      mix = p * p * (3 - 2 * p);
      if (p >= 1) { morphing = false; from = to; mix = 0; }
    }
    draw(now);
  }

  function shape(i, el) {
    anchor = el;
    aim(calm);
    if (i === to && !morphing) { if (calm) draw(performance.now()); return; }
    if (calm) {
      from = to = i;
      mix = 0;
      draw(performance.now());
      return;
    }
    if (morphing) { from = to; }
    to = i;
    mix = 0;
    morphing = true;
    tStart = performance.now();
  }

  function setTheme(css) {
    theme = { paper: hex(css.paper), ink: hex(css.ink), ember: hex(css.ember), line: css.void ? 1 : -1, invert: css.void ? 1 : 0 };
    if (!W) return;
    bakePaper();
    if (calm) draw(performance.now());
  }

  function start(reduced) {
    calm = reduced;
    resize();
    addEventListener('resize', () => { resize(); aim(true); if (calm) draw(performance.now()); });
    aim(true);
    if (calm) { addEventListener('scroll', () => { aim(true); draw(performance.now()); }, { passive: true }); draw(performance.now()); return; }
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  return { start, shape, setTheme };
})();
