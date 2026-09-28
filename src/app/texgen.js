"use strict";
const TXG = {scene: null, cam: null, quad: null, norm: null};

const TEXDEF = {
  macro: {s: [1, 1], px: 256},
  grass: {s: [4, 4], px: 2048, nrm: 1024, dep: 0.006},
  soil: {s: [1.5, 1.5], px: 1024, nrm: 512, dep: 0.02},
  gravel: {s: [1, 1], px: 1024, nrm: 512, dep: 0.02},
  paving: {s: [1.6, 1.6], px: 1024, nrm: 1024, dep: 0.01, mr: 512},
  asphalt: {s: [3, 3], px: 1024, nrm: 512, dep: 0.003},
  concrete: {s: [3, 3], px: 1024, nrm: 512, dep: 0.0015},
  plaster: {s: [2, 2], px: 1024, nrm: 1024, dep: 0.0012},
  decor: {s: [1, 1], px: 1024, nrm: 1024, dep: 0.003},
  stone: {s: [2, 2], px: 1024, nrm: 1024, dep: 0.025, mr: 512},
  ashlar: {s: [2, 1], px: 1024, nrm: 1024, dep: 0.02, mr: 512},
  brick: {s: [1.3, 1.2], px: 1024, nrm: 1024, dep: 0.008, mr: 512},
  clinker: {s: [1.3, 1.2], px: 1024, nrm: 1024, dep: 0.007, mr: 512},
  aerated: {s: [1.25, 1], px: 1024, nrm: 512, dep: 0.002},
  fibro: {s: [2.4, 1.2], px: 1024, nrm: 512, dep: 0.004},
  planken: {s: [1.2, 1.2], px: 1024, nrm: 1024, dep: 0.008},
  siding: {s: [1.2, 1.2], px: 1024, nrm: 512, dep: 0.01},
  logs: {s: [1.6, 1.6], px: 1024, nrm: 1024, dep: 0.05},
  planks: {s: [1.2, 1.2], px: 1024, nrm: 512, dep: 0.005},
  roofmetal: {s: [1.4, 1.4], px: 1024, nrm: 1024, dep: 0.03},
  seam: {s: [1.5, 1.5], px: 1024, nrm: 1024, dep: 0.02},
  shingles: {s: [1, 1], px: 1024, nrm: 1024, dep: 0.005},
  ctile: {s: [1.2, 1.2], px: 1024, nrm: 1024, dep: 0.035},
  membrane: {s: [2, 2], px: 512, nrm: 512, dep: 0.003},
  parquet: {s: [2.4, 2.4], px: 2048, nrm: 1024, dep: 0.001, mr: 512},
  herring: {s: [1.2, 1.2], px: 1024, nrm: 1024, dep: 0.001, mr: 512},
  laminate: {s: [2.4, 2.4], px: 1024, nrm: 1024, dep: 0.001, mr: 512},
  tile: {s: [1.2, 1.2], px: 1024, nrm: 512, dep: 0.0015, mr: 512},
  porcelain: {s: [1.2, 1.2], px: 1024, nrm: 512, dep: 0.0012, mr: 512},
  metro: {s: [0.6, 0.6], px: 1024, nrm: 1024, dep: 0.003, mr: 512},
  marble: {s: [2.4, 2.4], px: 1024, nrm: 512, dep: 0.0006, mr: 512},
  granite: {s: [1, 1], px: 1024, nrm: 512, dep: 0.0004, mr: 512},
  wood: {s: [1, 1], px: 1024, nrm: 512, dep: 0.0005},
  panel: {s: [1.2, 1.2], px: 1024, nrm: 512, dep: 0.004},
  deck: {s: [1.4, 1.4], px: 1024, nrm: 1024, dep: 0.005},
  fabric: {s: [0.3, 0.3], px: 512, nrm: 512, dep: 0.0006},
  leather: {s: [0.5, 0.5], px: 512, nrm: 512, dep: 0.0008},
  carpet: {s: [0.5, 0.5], px: 512, nrm: 512, dep: 0.002},
  leaf: {s: [0.9, 0.9], px: 512, nrm: 512, dep: 0.012},
  bark: {s: [0.8, 0.8], px: 512, nrm: 512, dep: 0.012},
  ribs: {s: [0.5, 0.5], px: 512, nrm: 512, dep: 0.006},
  fence: {s: [1, 1], px: 512},
  snow: {s: [3, 3], px: 1024, nrm: 512, dep: 0.015}
};

const TXV = "varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = vec4(position.xy, 0.0, 1.0);\n}";

const TXLIB = `varying vec2 vUv;
uniform vec2 uSize;
uniform float uSeed;
uniform int uOut;
float h21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec2 h22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}
vec3 h32(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.xxy + q.yzz) * q.zyx);
}
float gn(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 ga = h22(mod(i, per) + uSeed) * 2.0 - 1.0;
  vec2 gb = h22(mod(i + vec2(1.0, 0.0), per) + uSeed) * 2.0 - 1.0;
  vec2 gc = h22(mod(i + vec2(0.0, 1.0), per) + uSeed) * 2.0 - 1.0;
  vec2 gd = h22(mod(i + vec2(1.0, 1.0), per) + uSeed) * 2.0 - 1.0;
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return clamp(0.5 + 0.9 * mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y), 0.0, 1.0);
}
float fbm(vec2 uv, vec2 base, int oct, float gain) {
  float s = 0.0;
  float a = 1.0;
  float n = 0.0;
  vec2 per = base;
  vec2 p = uv * base;
  for (int i = 0; i < 9; i++) {
    if (i >= oct) break;
    s += a * gn(p + float(i) * vec2(17.0, 31.0), per);
    n += a;
    p *= 2.0;
    per *= 2.0;
    a *= gain;
  }
  return s / n;
}
float fbl(vec2 q, float f, int oct) {
  float s = 0.0;
  float a = 1.0;
  float n = 0.0;
  vec2 p = q * f;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * gn(p + float(i) * vec2(17.0, 31.0), vec2(4096.0));
    n += a;
    p *= 2.0;
    a *= 0.5;
  }
  return s / n;
}
vec4 vor(vec2 uv, vec2 n, float jit) {
  vec2 p = uv * n;
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 mg = vec2(0.0);
  vec2 mr = vec2(0.0);
  float md = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = 0.5 + (h22(mod(i + g, n) + uSeed * 1.37) - 0.5) * jit;
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) {
        md = d;
        mr = r;
        mg = g;
      }
    }
  }
  float bd = 8.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 g = mg + vec2(float(x), float(y));
      vec2 o = 0.5 + (h22(mod(i + g, n) + uSeed * 1.37) - 0.5) * jit;
      vec2 r = g + o - f;
      if (dot(mr - r, mr - r) > 0.00001) bd = min(bd, dot(0.5 * (mr + r), normalize(r - mr)));
    }
  }
  vec2 cid = mod(i + mg, n);
  return vec4(sqrt(md), bd, h21(cid + 3.7), h21(cid + 11.3));
}
vec4 bond(vec2 p, vec2 m, float off) {
  float row = floor(p.y / m.y);
  float x = p.x / m.x + mod(row, 2.0) * off;
  return vec4(fract(x), fract(p.y / m.y), floor(x), row);
}
float woodg(vec2 p, float rid) {
  vec2 uv = p / uSize;
  float warp = fbm(uv, vec2(2.0, 6.0), 4, 0.5);
  float lines = fbm(uv + vec2(0.0, warp * 0.03), vec2(2.0, 160.0), 4, 0.6);
  float rings = 0.5 + 0.5 * sin((p.y * 60.0 + warp * 7.0 + rid * 13.0) * 3.14159);
  return clamp(0.55 * lines + 0.45 * rings * (0.35 + 0.65 * lines), 0.0, 1.0);
}
float woodl(vec2 q, float rid) {
  float warp = fbl(q * vec2(0.5, 2.0) + rid, 1.3, 4);
  float lines = fbl(vec2(q.x * 0.04, q.y) + vec2(rid, warp * 0.02), 90.0, 4);
  float rings = 0.5 + 0.5 * sin((q.y * 60.0 + warp * 7.0 + rid * 13.0) * 3.14159);
  return clamp(0.55 * lines + 0.45 * rings * (0.35 + 0.65 * lines), 0.0, 1.0);
}
void grassLayer(vec2 p, float cell, float seed, float lvl, float dry, inout vec3 col, inout float hh) {
  vec2 q = p / cell;
  vec2 i = floor(q);
  vec2 per = floor(uSize / cell + 0.5);
  float best = 0.0;
  float bt = 0.0;
  vec3 br = vec3(0.0);
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 g = i + vec2(float(x), float(y));
      vec3 r = h32(mod(g, per) + seed);
      vec2 root = g + r.xy;
      float ang = r.z * 6.28318;
      vec2 dir = vec2(cos(ang), sin(ang));
      float len = 1.0 + r.x * 1.0;
      vec2 d = q - root;
      float t = clamp(dot(d, dir) / len, 0.0, 1.0);
      float w = 0.16 * (1.0 - 0.7 * t);
      float dist = length(d - dir * len * t);
      float m = 1.0 - smoothstep(w * 0.45, w, dist);
      if (m > best) {
        best = m;
        bt = t;
        br = r;
      }
    }
  }
  vec3 lush = vec3(0.78, 0.95, 0.72);
  vec3 dried = vec3(1.0, 0.9, 0.52);
  vec3 tint = mix(lush, dried, clamp(dry * (0.5 + 0.9 * br.y), 0.0, 1.0));
  vec3 bc = tint * (0.5 + 0.38 * bt + 0.22 * br.z) * (0.82 + 0.18 * lvl);
  col = mix(col, bc, best);
  hh = mix(hh, (lvl + 0.4 + 0.6 * bt) / 3.5, best);
}
`;

const TXMAIN = `void main() {
  vec2 p = vUv * uSize;
  vec3 c = vec3(0.85);
  float h = 0.5;
  vec2 mr = vec2(0.0, 1.0);
  float a = 1.0;
  K(p, c, h, mr, a);
  if (uOut == 0) gl_FragColor = vec4(clamp(c, 0.0, 1.0), a);
  else if (uOut == 1) gl_FragColor = vec4(vec3(clamp(h, 0.0, 1.0)), 1.0);
  else gl_FragColor = vec4(clamp(mr, 0.0, 1.0), 0.0, 1.0);
}`;

const TXN = `uniform sampler2D tH;
uniform vec2 uTx;
uniform vec2 uK;
varying vec2 vUv;
void main() {
  float l = texture2D(tH, vUv - vec2(uTx.x, 0.0)).r;
  float r = texture2D(tH, vUv + vec2(uTx.x, 0.0)).r;
  float d = texture2D(tH, vUv - vec2(0.0, uTx.y)).r;
  float u = texture2D(tH, vUv + vec2(0.0, uTx.y)).r;
  vec3 n = normalize(vec3((l - r) * uK.x, (d - u) * uK.y, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;

const GLSL_K = {
  macro: `
  c = vec3(fbm(p / uSize, vec2(3.0), 6, 0.55));
`,
  grass: `
  vec2 uv = p / uSize;
  float m1 = fbm(uv, vec2(3.0), 5, 0.5);
  float m2 = fbm(uv, vec2(18.0), 4, 0.55);
  vec4 cl = vor(uv, vec2(48.0), 1.0);
  float clump = smoothstep(0.0, 0.3, cl.y);
  float dry = smoothstep(0.5, 0.78, m1 * 0.75 + m2 * 0.4);
  vec3 col = mix(vec3(0.36, 0.3, 0.2), vec3(0.3, 0.34, 0.22), m2) * (0.7 + 0.3 * clump);
  float hh = 0.0;
  grassLayer(p, 4.0 / 128.0, 11.0, 0.0, dry, col, hh);
  grassLayer(p, 4.0 / 192.0, 23.0, 1.0, dry, col, hh);
  grassLayer(p, 4.0 / 256.0, 37.0, 2.0, dry, col, hh);
  float clover = step(0.9, cl.z) * (1.0 - smoothstep(0.1, 0.32, cl.x));
  col = mix(col, vec3(0.62, 0.9, 0.62) * (0.75 + 0.25 * m2), clover * 0.55);
  c = col * (0.72 + 0.28 * clump) * (0.82 + 0.36 * m1);
  h = hh * (0.6 + 0.4 * clump);
`,
  soil: `
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(18.0), 1.0);
  float n = fbm(uv, vec2(6.0), 5, 0.55);
  float clod = smoothstep(0.0, 0.14, v.y);
  float peb = step(0.94, v.z) * (1.0 - smoothstep(0.1, 0.3, v.x));
  float lum = 0.5 + 0.35 * n + 0.12 * (v.w - 0.5);
  c = vec3(lum) * mix(vec3(0.82, 0.86, 0.9), vec3(1.0), clod);
  c = mix(c, vec3(1.0, 0.97, 0.92), peb * 0.8);
  h = clod * (0.6 + 0.4 * n) + peb * 0.4;
`,
  gravel: `
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(40.0), 0.9);
  float dome = sqrt(clamp(v.y * 2.4, 0.0, 1.0));
  float g = fbm(uv, vec2(160.0), 2, 0.5);
  vec3 tint = mix(vec3(1.0, 0.96, 0.9), vec3(0.88, 0.9, 0.95), v.w);
  c = tint * (0.55 + 0.4 * v.z) * (0.6 + 0.4 * dome) * (0.9 + 0.2 * g);
  h = dome * (0.6 + 0.4 * v.z);
`,
  paving: `
  vec4 b = bond(p, vec2(0.2, 0.1), 0.5);
  vec2 cid = vec2(mod(b.z, 8.0), mod(b.w, 16.0));
  vec2 e = min(b.xy, 1.0 - b.xy) * vec2(0.2, 0.1);
  float ed = min(e.x, e.y);
  float joint = 1.0 - smoothstep(0.002, 0.0035, ed);
  float bevel = smoothstep(0.002, 0.008, ed);
  vec3 r = h32(cid + 5.0);
  float n = fbm(p / uSize, vec2(64.0), 3, 0.6);
  float big = fbm(p / uSize, vec2(4.0), 4, 0.5);
  float dirt = smoothstep(0.55, 0.85, fbm(p / uSize, vec2(8.0), 4, 0.55));
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.16, 0.12, 0.1);
  c = tint * (0.64 + 0.26 * r.x + 0.1 * n) * (0.9 + 0.12 * big) * (1.0 - 0.18 * dirt) * mix(0.8, 1.0, bevel);
  h = bevel * (0.85 + 0.15 * n);
  mr = vec2(joint, mix(1.0, 0.92, bevel));
`,
  asphalt: `
  vec2 uv = p / uSize;
  float n = fbm(uv, vec2(8.0), 5, 0.55);
  vec4 v = vor(uv, vec2(300.0), 1.0);
  float agg = 1.0 - smoothstep(0.1, 0.35, v.x);
  c = vec3(0.68 + 0.2 * n) * mix(1.0, mix(0.72, 1.3, v.z), agg * 0.7);
  h = 0.4 + 0.5 * agg * (0.5 + 0.5 * v.z) - 0.2 * n;
`,
  concrete: `
  vec2 uv = p / uSize;
  float n1 = fbm(uv, vec2(4.0), 6, 0.55);
  float n2 = fbm(uv, vec2(48.0), 4, 0.6);
  vec4 v = vor(uv, vec2(120.0), 1.0);
  float pore = (1.0 - smoothstep(0.05, 0.14, v.x)) * step(0.82, v.z);
  c = vec3(0.8 + 0.14 * (n1 - 0.5) + 0.06 * (n2 - 0.5) - 0.25 * pore);
  h = 0.6 + 0.3 * n2 - 0.6 * pore;
`,
  plaster: `
  vec2 uv = p / uSize;
  float g = fbm(uv, vec2(220.0), 3, 0.6);
  float t = fbm(uv, vec2(3.0), 4, 0.5);
  vec4 v = vor(uv, vec2(90.0), 1.0);
  float pore = (1.0 - smoothstep(0.06, 0.16, v.x)) * step(0.9, v.z);
  c = vec3(0.9 + 0.06 * (g - 0.5) + 0.05 * (t - 0.5) - 0.1 * pore);
  h = 0.55 * g + 0.25 * t + 0.2 - 0.4 * pore;
`,
  decor: `
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(70.0), 1.0);
  float blob = smoothstep(0.0, 0.35, v.y);
  float g = fbm(uv, vec2(300.0), 2, 0.6);
  c = vec3(0.8 + 0.12 * blob + 0.05 * g);
  h = blob * (0.7 + 0.3 * v.z) + 0.1 * g;
`,
  stone: `
  vec2 uv = p / uSize;
  vec2 q = uv + vec2(fbm(uv, vec2(6.0), 3, 0.5) - 0.5, fbm(uv + 0.5, vec2(6.0), 3, 0.5) - 0.5) * 0.025;
  vec4 v = vor(q, vec2(6.0, 8.0), 0.9);
  float ed = v.y * 0.28;
  float mortar = 1.0 - smoothstep(0.007, 0.013, ed);
  float face = fbm(uv, vec2(40.0), 4, 0.55);
  float big = fbm(uv + v.zw, vec2(10.0), 3, 0.5);
  vec3 r = h32(vec2(v.z, v.w) * 91.0);
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.3, 0.22, 0.16);
  c = tint * (0.5 + 0.34 * r.x + 0.16 * face + 0.1 * big);
  h = smoothstep(0.006, 0.045, ed) * (0.65 + 0.2 * face + 0.15 * big);
  mr = vec2(mortar, 1.0);
`,
  ashlar: `
  float rowH = 0.25;
  float row = floor(p.y / rowH);
  float fy = fract(p.y / rowH);
  float rr = mod(row, 4.0);
  float xi = floor(p.x / 0.5);
  float j0 = (h21(vec2(rr, mod(xi, 4.0)) + 3.0) - 0.5) * 0.36;
  float j1 = (h21(vec2(rr, mod(xi + 1.0, 4.0)) + 3.0) - 0.5) * 0.36;
  float j2 = (h21(vec2(rr, mod(xi + 2.0, 4.0)) + 3.0) - 0.5) * 0.36;
  float jm = (h21(vec2(rr, mod(xi + 3.0, 4.0)) + 3.0) - 0.5) * 0.36;
  float b0 = (xi + j0) * 0.5;
  float b1 = (xi + 1.0 + j1) * 0.5;
  float b2 = (xi + 2.0 + j2) * 0.5;
  float bm = (xi - 1.0 + jm) * 0.5;
  float lft = b0;
  float rgt = b1;
  float sid = mod(xi, 4.0);
  if (p.x < b0) {
    lft = bm;
    rgt = b0;
    sid = mod(xi + 3.0, 4.0);
  } else if (p.x >= b1) {
    lft = b1;
    rgt = b2;
    sid = mod(xi + 1.0, 4.0);
  }
  float ex = min(p.x - lft, rgt - p.x);
  float ey = min(fy, 1.0 - fy) * rowH;
  vec2 uv = p / uSize;
  float chip = (fbm(uv, vec2(40.0, 20.0), 3, 0.5) - 0.5) * 0.008;
  float ed = min(ex, ey) + chip;
  float mortar = 1.0 - smoothstep(0.005, 0.008, ed);
  vec3 r = h32(vec2(sid, rr) + 17.0);
  float face = fbm(uv + r.xy, vec2(24.0, 12.0), 5, 0.55);
  float split = fbm(uv + r.yz, vec2(6.0, 3.0), 3, 0.5);
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.22, 0.17, 0.12);
  c = tint * (0.5 + 0.3 * r.x + 0.16 * face + 0.1 * split) * mix(0.85, 1.0, smoothstep(0.006, 0.02, ed));
  h = smoothstep(0.004, 0.03, ed) * (0.45 + 0.35 * face + 0.2 * split);
  mr = vec2(mortar, 1.0);
`,
  brick: `
  vec4 b = bond(p, vec2(0.26, 0.075), 0.5);
  vec2 cid = vec2(mod(b.z, 5.0), mod(b.w, 16.0));
  vec3 r = h32(cid + 13.0);
  vec2 e = min(b.xy, 1.0 - b.xy) * vec2(0.26, 0.075);
  float chip = (fbm(p / uSize, vec2(60.0), 3, 0.5) - 0.5) * 0.004;
  float ed = min(e.x, e.y) + chip;
  float mortar = 1.0 - smoothstep(0.004, 0.0055, ed);
  float face = fbm(p / uSize, vec2(90.0), 4, 0.55);
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.18, 0.12, 0.1);
  c = tint * (0.66 + 0.22 * r.y + 0.12 * face);
  h = smoothstep(0.003, 0.008, ed) * (0.85 + 0.15 * face);
  mr = vec2(mortar, 1.0);
`,
  clinker: `
  vec4 b = bond(p, vec2(0.26, 0.075), 0.5);
  vec2 cid = vec2(mod(b.z, 5.0), mod(b.w, 16.0));
  vec3 r = h32(cid + 29.0);
  vec2 e = min(b.xy, 1.0 - b.xy) * vec2(0.26, 0.075);
  float ed = min(e.x, e.y);
  float mortar = 1.0 - smoothstep(0.0035, 0.0045, ed);
  float face = fbm(p / uSize, vec2(120.0), 3, 0.55);
  float burn = smoothstep(0.7, 1.0, r.z);
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.25, 0.18, 0.14);
  c = tint * (0.55 + 0.35 * r.y + 0.08 * face) * (1.0 - 0.45 * burn);
  h = smoothstep(0.003, 0.006, ed) * (0.92 + 0.08 * face);
  mr = vec2(mortar, mix(0.75, 1.0, mortar));
`,
  aerated: `
  vec4 b = bond(p, vec2(0.625, 0.25), 0.5);
  vec2 e = min(b.xy, 1.0 - b.xy) * vec2(0.625, 0.25);
  float joint = 1.0 - smoothstep(0.001, 0.0025, min(e.x, e.y));
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(160.0, 128.0), 1.0);
  float pore = (1.0 - smoothstep(0.05, 0.2, v.x)) * step(0.6, v.z);
  float n = fbm(uv, vec2(10.0), 4, 0.5);
  c = vec3(0.9 + 0.05 * n - 0.16 * pore - 0.15 * joint);
  h = 0.7 - 0.5 * pore - 0.6 * joint + 0.1 * n;
`,
  fibro: `
  vec2 f = fract(p / vec2(1.2, 0.6));
  vec2 e = min(f, 1.0 - f) * vec2(1.2, 0.6);
  float joint = 1.0 - smoothstep(0.004, 0.005, min(e.x, e.y));
  vec2 cell = mod(floor(p / vec2(1.2, 0.6)), vec2(2.0));
  float r = h21(cell + 4.0);
  float n = fbm(p / uSize, vec2(12.0, 6.0), 4, 0.5);
  vec2 sc = fract(p / vec2(0.4, 0.3)) - 0.5;
  float screw = 1.0 - smoothstep(0.006, 0.009, length(sc * vec2(0.4, 0.3)));
  c = vec3((0.82 + 0.08 * r + 0.06 * n) * (1.0 - 0.6 * joint) * (1.0 - 0.25 * screw));
  h = (1.0 - joint) * (1.0 - 0.3 * screw);
`,
  planken: `
  float row = floor(p.y / 0.12);
  float fy = fract(p.y / 0.12) * 0.12;
  float gap = step(0.115, fy) + (1.0 - smoothstep(0.0, 0.0015, fy)) * 0.5;
  float rid = h21(vec2(mod(row, 10.0), 3.0));
  float jx = fract(p.x / 1.2 + rid);
  float vj = 1.0 - smoothstep(0.0, 0.003, min(jx, 1.0 - jx) * 1.2);
  float gr = woodg(p + vec2(rid * 2.4, 0.0), rid * 9.0);
  c = vec3(0.7 + 0.2 * rid) * (0.78 + 0.28 * gr) * (1.0 - 0.8 * clamp(gap + vj, 0.0, 1.0));
  h = (1.0 - clamp(gap + vj, 0.0, 1.0)) * (0.9 + 0.1 * gr);
`,
  siding: `
  float fy = fract(p.y / 0.2);
  float n = fbm(p / uSize, vec2(4.0, 24.0), 4, 0.5);
  float gr = fbm(p / uSize, vec2(2.0, 120.0), 3, 0.6);
  c = vec3(0.86 + 0.05 * n + 0.03 * gr) * (1.0 - 0.38 * smoothstep(0.86, 1.0, fy));
  h = 1.0 - fy * 0.9;
`,
  logs: `
  float fy = fract(p.y / 0.2);
  float row = mod(floor(p.y / 0.2), 8.0);
  float prof = sqrt(max(0.0, 1.0 - pow(fy * 2.0 - 1.0, 2.0)));
  float rid = h21(vec2(row, 1.0));
  vec2 uv = p / uSize;
  float gr = fbm(uv + vec2(rid, 0.0), vec2(3.0, 90.0), 4, 0.6);
  float crack = 1.0 - smoothstep(0.0, 0.02, abs(fbm(uv + vec2(0.0, rid), vec2(2.0, 16.0), 3, 0.5) - 0.5));
  c = vec3(0.78 + 0.14 * rid) * (0.45 + 0.55 * prof) * (0.82 + 0.25 * gr) * (1.0 - 0.35 * crack * prof);
  h = prof * (1.0 - 0.1 * crack);
`,
  planks: `
  float col = floor(p.x / 0.15);
  float fx = fract(p.x / 0.15) * 0.15;
  float gap = 1.0 - smoothstep(0.003, 0.006, min(fx, 0.15 - fx));
  float rid = h21(vec2(mod(col, 8.0), 9.0));
  vec2 uv = p / uSize;
  float gr = fbm(uv + vec2(rid, 0.0), vec2(120.0, 3.0), 4, 0.6);
  c = vec3(0.68 + 0.22 * rid) * (0.8 + 0.25 * gr) * (1.0 - 0.7 * gap);
  h = (1.0 - gap) * (0.8 + 0.2 * gr);
`,
  roofmetal: `
  float wx = 0.5 + 0.5 * cos(p.x / 0.175 * 6.28318);
  float fy = fract(p.y / 0.35);
  float st = fy < 0.1 ? 0.3 + fy / 0.1 * 0.7 : 1.0 - (fy - 0.1) / 0.9 * 0.3;
  float n = fbm(p / uSize, vec2(8.0), 3, 0.5);
  c = vec3(0.72 + 0.2 * wx * st + 0.08 * st + 0.03 * n);
  h = wx * 0.5 * st + 0.5 * st;
`,
  seam: `
  float fx = fract(p.x / 0.5) * 0.5;
  float d = min(fx, 0.5 - fx);
  float rib = 1.0 - smoothstep(0.008, 0.016, d);
  float oil = fbm(p / uSize, vec2(3.0, 1.0), 3, 0.5);
  float fine = fbm(p / uSize, vec2(3.0, 60.0), 2, 0.5);
  c = vec3(0.86 + 0.09 * rib + 0.04 * oil + 0.02 * fine);
  h = 0.2 + 0.8 * rib + 0.06 * oil;
`,
  shingles: `
  vec4 b = bond(p, vec2(1.0 / 3.0, 1.0 / 7.0), 0.5);
  vec2 cid = vec2(mod(b.z, 3.0), mod(b.w, 7.0));
  vec3 r = h32(cid + 21.0);
  float slot = 1.0 - smoothstep(0.003, 0.006, min(b.x, 1.0 - b.x) / 3.0);
  float gran = fbm(p / uSize, vec2(200.0), 2, 0.6);
  vec4 v = vor(p / uSize, vec2(160.0), 1.0);
  float sp = v.z;
  c = vec3(0.56 + 0.28 * r.x + 0.08 * gran + 0.08 * (sp - 0.5)) * (1.0 - 0.45 * smoothstep(0.84, 1.0, b.y)) * (1.0 - 0.6 * slot);
  h = (1.0 - b.y) * 0.75 + 0.15 * gran - slot * 0.4;
`,
  ctile: `
  float fx = fract(p.x / 0.3);
  float fy = fract(p.y / 0.3);
  float wave = 0.5 + 0.5 * sin(fx * 6.28318);
  vec2 cid = vec2(mod(floor(p.x / 0.3), 4.0), mod(floor(p.y / 0.3), 4.0));
  vec3 r = h32(cid + 2.0);
  float n = fbm(p / uSize, vec2(40.0), 3, 0.55);
  c = vec3(0.7 + 0.2 * r.x + 0.06 * n) * (0.65 + 0.35 * wave) * (1.0 - 0.4 * smoothstep(0.84, 1.0, fy));
  h = wave * 0.6 + (1.0 - fy) * 0.4;
`,
  membrane: `
  float seam = 1.0 - smoothstep(0.02, 0.03, fract(p.x));
  float n = fbm(p / uSize, vec2(6.0), 5, 0.5);
  c = vec3(0.85 + 0.08 * n - 0.06 * seam);
  h = 0.5 + 0.2 * n + 0.3 * seam;
`,
  parquet: `
  float row = floor(p.y / 0.15);
  float rr = mod(row, 16.0);
  float off = h21(vec2(rr, 7.0)) * 1.2;
  float x = (p.x + off) / 1.2;
  float col = floor(x);
  float fx = fract(x);
  float fy = fract(p.y / 0.15);
  vec3 r = h32(vec2(mod(col, 2.0), rr) + 31.0);
  vec2 e = vec2(min(fx, 1.0 - fx) * 1.2, min(fy, 1.0 - fy) * 0.15);
  float seam = 1.0 - smoothstep(0.0005, 0.0012, min(e.x, e.y));
  float gr = woodg(vec2(p.x + r.x * 3.0, p.y), r.y * 10.0);
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.12, 0.1, 0.08);
  c = tint * (0.7 + 0.18 * r.z) * (0.76 + 0.3 * gr) * (1.0 - 0.55 * seam);
  h = (1.0 - seam) * (0.95 + 0.05 * gr);
  mr = vec2(0.0, 0.72 + 0.28 * seam + 0.08 * gr);
`,
  herring: `
  float col = floor(p.x / 0.3);
  float lx = fract(p.x / 0.3) * 0.3;
  float lx2 = mod(col, 2.0) < 0.5 ? lx : 0.3 - lx;
  float t = p.y + lx2;
  float st = floor(t / 0.1);
  float ft = fract(t / 0.1);
  vec3 r = h32(vec2(mod(col, 4.0), mod(st, 12.0)) + 41.0);
  float ex = min(lx, 0.3 - lx);
  float ey = min(ft, 1.0 - ft) * 0.0707;
  float seam = 1.0 - smoothstep(0.0005, 0.0012, min(ex, ey));
  float gr = woodl(vec2(lx2 * 1.4142 + r.x * 5.0, ft * 0.0707 + r.y * 5.0), r.z);
  vec3 tint = vec3(1.0) + (r - 0.5) * vec3(0.12, 0.1, 0.08);
  c = tint * (0.7 + 0.18 * r.z) * (0.76 + 0.3 * gr) * (1.0 - 0.55 * seam);
  h = (1.0 - seam) * (0.95 + 0.05 * gr);
  mr = vec2(0.0, 0.72 + 0.28 * seam + 0.08 * gr);
`,
  laminate: `
  float row = floor(p.y / 0.2);
  float rr = mod(row, 12.0);
  float off = h21(vec2(rr, 5.0)) * 1.2;
  float x = (p.x + off) / 1.2;
  float col = floor(x);
  float fx = fract(x);
  float fy = fract(p.y / 0.2);
  vec3 r = h32(vec2(mod(col, 2.0), rr) + 61.0);
  vec2 e = vec2(min(fx, 1.0 - fx) * 1.2, min(fy, 1.0 - fy) * 0.2);
  float ed = min(e.x, e.y);
  float seam = 1.0 - smoothstep(0.0008, 0.0022, ed);
  float gr = woodg(vec2(p.x + r.x * 3.0, p.y), r.y * 10.0);
  c = vec3(0.78 + 0.1 * r.z) * (0.82 + 0.2 * gr) * (1.0 - 0.4 * seam);
  h = smoothstep(0.0005, 0.0025, ed) * (0.96 + 0.04 * gr);
  mr = vec2(0.0, 0.8 + 0.2 * seam);
`,
  tile: `
  vec2 f = fract(p / 0.3);
  vec2 e = min(f, 1.0 - f) * 0.3;
  float ed = min(e.x, e.y);
  float grout = 1.0 - smoothstep(0.0012, 0.0018, ed);
  vec3 r = h32(mod(floor(p / 0.3), 4.0) + 51.0);
  float n = fbm(p / uSize, vec2(24.0), 4, 0.5);
  c = vec3(0.9 + 0.05 * r.x + 0.03 * n);
  h = 1.0 - grout * 0.8 - (1.0 - smoothstep(0.0018, 0.004, ed)) * 0.15;
  mr = vec2(grout, mix(0.25, 1.0, grout));
`,
  porcelain: `
  vec2 f = fract(p / 0.6);
  vec2 e = min(f, 1.0 - f) * 0.6;
  float ed = min(e.x, e.y);
  float grout = 1.0 - smoothstep(0.0009, 0.0014, ed);
  vec3 r = h32(mod(floor(p / 0.6), 2.0) + 71.0);
  vec2 uv = p / uSize;
  float n = fbm(uv + r.xy, vec2(6.0), 6, 0.55);
  float n2 = fbm(uv, vec2(60.0), 3, 0.6);
  c = vec3(0.8 + 0.12 * n + 0.05 * n2 + 0.04 * r.z);
  h = 1.0 - grout * 0.8;
  mr = vec2(grout, mix(0.45, 1.0, grout));
`,
  metro: `
  vec4 b = bond(p, vec2(0.15, 0.075), 0.5);
  vec2 e = min(b.xy, 1.0 - b.xy) * vec2(0.15, 0.075);
  float ed = min(e.x, e.y);
  float grout = 1.0 - smoothstep(0.001, 0.0015, ed);
  float bev = smoothstep(0.001, 0.006, ed);
  float r = h21(vec2(mod(b.z, 4.0), mod(b.w, 8.0)) + 3.0);
  c = vec3(0.9 + 0.06 * r) * (0.94 + 0.06 * bev);
  h = bev;
  mr = vec2(grout, mix(0.12, 1.0, grout));
`,
  marble: `
  vec2 uv = p / uSize;
  float w = fbm(uv, vec2(3.0), 6, 0.55);
  float w2 = fbm(uv + w * 0.1, vec2(5.0), 5, 0.55);
  float vein = abs(sin((uv.x * 2.0 + uv.y * 4.0 + w2 * 5.0) * 3.14159));
  float v1 = pow(1.0 - vein, 14.0);
  float v2 = pow(1.0 - abs(sin((uv.x * 3.0 - uv.y * 2.0 + w * 7.0) * 3.14159)), 36.0);
  vec2 f = fract(p / vec2(1.2, 0.6));
  vec2 e = min(f, 1.0 - f) * vec2(1.2, 0.6);
  float joint = 1.0 - smoothstep(0.0004, 0.0009, min(e.x, e.y));
  c = vec3(0.94 + 0.05 * w2) - vec3(0.36, 0.34, 0.31) * v1 - vec3(0.2) * v2;
  h = 1.0 - joint * 0.7;
  mr = vec2(joint, 0.12 + 0.6 * joint);
`,
  granite: `
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(220.0), 1.0);
  vec4 v2 = vor(uv, vec2(90.0), 1.0);
  vec3 col = v.z < 0.3 ? vec3(0.28) : (v.z < 0.75 ? vec3(0.72) : vec3(0.97, 0.92, 0.88));
  col = mix(col, vec3(0.12), step(0.9, v2.z) * (1.0 - smoothstep(0.1, 0.3, v2.x)));
  c = col;
  h = 0.5 + 0.1 * v.z;
  mr = vec2(0.0, 0.35);
`,
  wood: `
  float gr = woodg(p, 0.0);
  c = vec3(0.72 + 0.28 * gr);
  h = gr;
`,
  panel: `
  float col = floor(p.x / 0.1);
  float fx = fract(p.x / 0.1) * 0.1;
  float groove = 1.0 - smoothstep(0.002, 0.006, min(fx, 0.1 - fx));
  float rid = h21(vec2(mod(col, 12.0), 17.0));
  float gr = woodg(vec2(p.y, p.x + rid * 2.4), rid * 9.0);
  c = vec3(0.74 + 0.16 * rid) * (0.8 + 0.25 * gr) * (1.0 - 0.45 * groove);
  h = 1.0 - groove;
`,
  deck: `
  float row = floor(p.y / 0.14);
  float fy = fract(p.y / 0.14) * 0.14;
  float gap = 1.0 - smoothstep(0.0025, 0.0035, min(fy, 0.14 - fy));
  float rib = 0.5 + 0.5 * sin(fy / 0.006 * 6.28318);
  float rid = h21(vec2(mod(row, 10.0), 23.0));
  float gr = woodg(vec2(p.x + rid * 2.8, p.y), rid * 5.0);
  c = vec3(0.7 + 0.2 * rid) * (0.8 + 0.25 * gr) * (0.92 + 0.08 * rib) * (1.0 - 0.8 * gap);
  h = (1.0 - gap) * (0.85 + 0.15 * rib);
`,
  fabric: `
  vec2 uv = p / uSize;
  float tx = 0.5 + 0.5 * sin(uv.x * 100.0 * 6.28318);
  float ty = 0.5 + 0.5 * sin(uv.y * 100.0 * 6.28318);
  float ch = mod(floor(uv.x * 100.0) + floor(uv.y * 100.0), 2.0);
  float wv = mix(tx, ty, ch);
  float n = fbm(uv, vec2(12.0), 4, 0.5);
  float sl = fbm(uv, vec2(100.0, 12.0), 2, 0.5);
  c = vec3(0.84 + 0.08 * wv + 0.05 * n + 0.03 * sl);
  h = wv * 0.8 + 0.2 * sl;
`,
  leather: `
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(40.0), 1.0);
  float crease = 1.0 - smoothstep(0.0, 0.08, v.y);
  float n = fbm(uv, vec2(80.0), 3, 0.55);
  float big = fbm(uv, vec2(4.0), 4, 0.5);
  c = vec3(0.8 + 0.1 * big + 0.05 * n - 0.18 * crease);
  h = 1.0 - crease * 0.7 + 0.1 * n;
`,
  carpet: `
  vec2 uv = p / uSize;
  float n = fbm(uv, vec2(150.0), 3, 0.7);
  vec4 v = vor(uv, vec2(120.0), 1.0);
  float lp = smoothstep(0.0, 0.3, v.y);
  float big = fbm(uv, vec2(3.0), 4, 0.5);
  c = vec3(0.72 + 0.14 * n + 0.08 * lp + 0.06 * big);
  h = lp * 0.6 + n * 0.4;
`,
  leaf: `
  vec2 uv = p / uSize;
  vec4 v = vor(uv, vec2(26.0), 1.0);
  vec4 v2 = vor(uv + 0.37, vec2(40.0), 1.0);
  float pick = step(0.5, fbm(uv, vec2(12.0), 2, 0.5));
  float lf = mix(smoothstep(0.0, 0.12, v.y), smoothstep(0.0, 0.12, v2.y), pick);
  float sh = mix(v.z, v2.z, pick);
  vec3 tint = mix(vec3(0.82, 1.0, 0.8), vec3(1.0, 0.94, 0.72), mix(v.w, v2.w, pick));
  c = tint * (0.3 + 0.62 * lf * (0.55 + 0.45 * sh));
  h = lf * (0.5 + 0.5 * sh);
`,
  bark: `
  vec2 uv = p / uSize;
  float f = fbm(uv, vec2(10.0, 2.0), 5, 0.55);
  float ridges = abs(sin((uv.x * 10.0 + f * 3.0) * 3.14159));
  float cr = fbm(uv, vec2(40.0, 6.0), 3, 0.5);
  c = vec3(0.45 + 0.42 * ridges * (0.7 + 0.3 * cr));
  h = ridges * (0.8 + 0.2 * cr);
`,
  ribs: `
  float fy = fract(p.y / 0.5);
  float groove = 1.0 - smoothstep(0.0, 0.02, min(fy, 1.0 - fy));
  float rib = 0.5 + 0.5 * cos(fy * 4.0 * 6.28318);
  float n = fbm(p / uSize, vec2(30.0), 3, 0.5);
  c = vec3(0.86 + 0.06 * rib + 0.03 * n) * (1.0 - 0.4 * groove);
  h = 0.3 + 0.4 * rib - 0.5 * groove;
`,
  fence: `
  vec2 f = fract(p / vec2(0.05, 0.2));
  vec2 e = min(f, 1.0 - f) * vec2(0.05, 0.2);
  float wire = 1.0 - smoothstep(0.0016, 0.0026, min(e.x, e.y));
  c = vec3(1.0);
  a = wire;
`,
  snow: `
  vec2 uv = p / uSize;
  float n = fbm(uv, vec2(3.0), 5, 0.55);
  float n2 = fbm(uv, vec2(40.0), 3, 0.6);
  vec4 v = vor(uv, vec2(300.0), 1.0);
  float sp = step(0.97, v.z) * (1.0 - smoothstep(0.05, 0.2, v.x));
  c = vec3(0.9 + 0.05 * n2 + 0.08 * sp);
  h = n * 0.7 + n2 * 0.3;
`
};

function txgInit() {
  if (TXG.scene) return;
  TXG.scene = new THREE.Scene();
  TXG.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  TXG.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  TXG.quad.frustumCulled = false;
  TXG.scene.add(TXG.quad);
  TXG.norm = new THREE.ShaderMaterial({vertexShader: TXV, fragmentShader: TXN, uniforms: {tH: {value: null}, uTx: {value: new THREE.Vector2()}, uK: {value: new THREE.Vector2()}}, depthTest: false, depthWrite: false});
}

function txgTarget(px, mip) {
  const rt = new THREE.WebGLRenderTarget(px, px, {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    magFilter: THREE.LinearFilter,
    minFilter: mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    generateMipmaps: !!mip,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false
  });
  return rt;
}

function txgDraw(mt, rt) {
  TXG.quad.material = mt;
  V.renderer.setRenderTarget(rt);
  V.renderer.render(TXG.scene, TXG.cam);
}

function txgTex(rt, D) {
  const t = rt.texture;
  t.repeat.set(1 / D.s[0], 1 / D.s[1]);
  t.anisotropy = V.renderer.capabilities ? Math.min(8, V.renderer.capabilities.getMaxAnisotropy()) : 1;
  return t;
}

function texGen(name) {
  const D = TEXDEF[name];
  const R = V.renderer;
  if (!D || !R || !V.ok || !GLSL_K[name]) return null;
  txgInit();
  const mt = new THREE.ShaderMaterial({
    vertexShader: TXV,
    fragmentShader: TXLIB + "void K(vec2 p, inout vec3 c, inout float h, inout vec2 mr, inout float a) {\n" + GLSL_K[name] + "\n}\n" + TXMAIN,
    uniforms: {uSize: {value: new THREE.Vector2(D.s[0], D.s[1])}, uSeed: {value: D.seed || 0}, uOut: {value: 0}},
    depthTest: false,
    depthWrite: false
  });
  const prev = R.getRenderTarget();
  const out = {map: null, normal: null, rough: null};
  try {
    const rm = txgTarget(D.px, true);
    mt.uniforms.uOut.value = 0;
    txgDraw(mt, rm);
    out.map = txgTex(rm, D);
    if (D.nrm) {
      const rh = txgTarget(D.nrm, false);
      mt.uniforms.uOut.value = 1;
      txgDraw(mt, rh);
      const rn = txgTarget(D.nrm, true);
      TXG.norm.uniforms.tH.value = rh.texture;
      TXG.norm.uniforms.uTx.value.set(1 / D.nrm, 1 / D.nrm);
      TXG.norm.uniforms.uK.value.set(D.dep / (2 * D.s[0] / D.nrm), D.dep / (2 * D.s[1] / D.nrm));
      txgDraw(TXG.norm, rn);
      TXG.norm.uniforms.tH.value = null;
      rh.dispose();
      out.normal = txgTex(rn, D);
    }
    if (D.mr) {
      const rr = txgTarget(D.mr, true);
      mt.uniforms.uOut.value = 2;
      txgDraw(mt, rr);
      out.rough = txgTex(rr, D);
    }
  } finally {
    R.setRenderTarget(prev);
    mt.dispose();
  }
  return out;
}

const SWC = new Map();
let SWS = null;

function matSwatch(key) {
  if (SWC.has(key)) return SWC.get(key);
  if (!V.ok || !V.renderer) return null;
  const R = V.renderer;
  if (!SWS) {
    const sc = new THREE.Scene();
    sc.environment = V.env;
    sc.background = new THREE.Color(0xdfe3e6);
    sc.add(new THREE.HemisphereLight(lin(0xffffff), lin(0x9aa08f), 0.55));
    const dl = new THREE.DirectionalLight(lin(0xfff3e0), 1.6);
    dl.position.set(1.2, 2.4, 1.6);
    sc.add(dl);
    const geo = new THREE.PlaneGeometry(0.9, 0.9);
    uvPlane(geo, 0.9, 0.9);
    const mesh = new THREE.Mesh(geo, null);
    mesh.rotation.x = -Math.PI / 2;
    sc.add(mesh);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
    cam.position.set(0, 1.62, 0.35);
    cam.lookAt(0, 0, 0);
    SWS = {sc, mesh, cam, rt: new THREE.WebGLRenderTarget(96, 96, {encoding: THREE.sRGBEncoding}), buf: new Uint8Array(96 * 96 * 4)};
  }
  SWS.sc.environment = V.env;
  SWS.mesh.material = mat(key, false);
  const prev = R.getRenderTarget();
  R.setRenderTarget(SWS.rt);
  R.render(SWS.sc, SWS.cam);
  R.readRenderTargetPixels(SWS.rt, 0, 0, 96, 96, SWS.buf);
  R.setRenderTarget(prev);
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext("2d");
  if (!ctx || !ctx.createImageData) return null;
  const img = ctx.createImageData(96, 96);
  for (let y = 0; y < 96; y++) img.data.set(SWS.buf.subarray((95 - y) * 384, (96 - y) * 384), y * 384);
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL("image/png");
  SWC.set(key, url);
  return url;
}
