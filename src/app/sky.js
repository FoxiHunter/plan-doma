"use strict";
const CITIES = [
  ["Москва", 55.75, 37.62, 3],
  ["Санкт-Петербург", 59.94, 30.31, 3],
  ["Нижний Новгород", 56.33, 44.0, 3],
  ["Казань", 55.79, 49.12, 3],
  ["Воронеж", 51.67, 39.18, 3],
  ["Ростов-на-Дону", 47.24, 39.71, 3],
  ["Краснодар", 45.04, 38.98, 3],
  ["Сочи", 43.6, 39.73, 3],
  ["Самара", 53.2, 50.15, 4],
  ["Уфа", 54.74, 55.97, 5],
  ["Пермь", 58.01, 56.25, 5],
  ["Екатеринбург", 56.84, 60.61, 5],
  ["Челябинск", 55.16, 61.4, 5],
  ["Тюмень", 57.15, 65.53, 5],
  ["Омск", 54.99, 73.37, 6],
  ["Новосибирск", 55.03, 82.92, 7],
  ["Красноярск", 56.01, 92.87, 7],
  ["Иркутск", 52.29, 104.28, 8],
  ["Хабаровск", 48.48, 135.08, 10],
  ["Владивосток", 43.12, 131.89, 10]
];
const WEATHER = {
  clear: {n: "Ясно", cov: 0, sun: 1, gray: 0, fog: 900},
  few: {n: "Малооблачно", cov: 0.32, sun: 1, gray: 0, fog: 800},
  cloudy: {n: "Облачно", cov: 0.64, sun: 0.72, gray: 0.25, fog: 650},
  overcast: {n: "Пасмурно", cov: 1, sun: 0.06, gray: 0.62, fog: 420},
  rain: {n: "Дождь", cov: 1, sun: 0.03, gray: 0.42, fog: 200, rain: true, wind: 4},
  storm: {n: "Гроза", cov: 1, sun: 0.02, gray: 0.3, fog: 170, rain: true, heavy: true, bolt: true, wind: 12},
  snow: {n: "Снег", cov: 1, sun: 0.05, gray: 0.72, fog: 240, snow: true, wind: 3},
  hail: {n: "Град", cov: 1, sun: 0.04, gray: 0.45, fog: 230, hail: true, wind: 7},
  fog: {n: "Туман", cov: 0.85, sun: 0.22, gray: 0.7, fog: 70}
};
const SKYK = [
  [-18, 0x04060c, 0x0a0e18, 0x000000, 0x000000, 0, 0.02],
  [-8, 0x0e1830, 0x28314d, 0x3a2433, 0x000000, 0, 0.1],
  [-3, 0x20315a, 0x575a7a, 0x8a4a4a, 0xff6a3a, 0, 0.28],
  [0, 0x32507f, 0x9c8f95, 0xff8a50, 0xff7a40, 0.35, 0.5],
  [5, 0x3d69a6, 0xd9b99c, 0xffb07a, 0xffaa66, 1.5, 0.78],
  [15, 0x3b71bd, 0xcbd9e6, 0xffe0b8, 0xffe2c0, 2.7, 0.95],
  [35, 0x3a70c0, 0xd2e2ee, 0xfff0dd, 0xfff4e6, 3.2, 1],
  [90, 0x3669b9, 0xd6e5f0, 0xfff4e6, 0xfff7ee, 3.3, 1]
];
const SKY = {m: new Date().getMonth() + 1, d: new Date().getDate(), t: 14 * 60, weather: "clear", play: false, path: false, speed: 60, st: null, envAt: 0, envSig: "", pathSig: "", fx: null, fxKind: ""};

function sunPos(ms, lat, lon) {
  const rad = Math.PI / 180;
  const d = ms / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const H = (gmst * 15 + lon) * rad - ra;
  const la = lat * rad;
  const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(H));
  return {alt, az: (az + 2 * Math.PI) % (2 * Math.PI)};
}

function skyYear() {
  return new Date().getFullYear();
}

function skyMs(m, d, t) {
  const site = S.site || siteDefault();
  return Date.UTC(skyYear(), m - 1, d, 0, 0) + (t - site.tz * 60) * 60000;
}

function sunAt(m, d, t) {
  const site = S.site || siteDefault();
  return sunPos(skyMs(m, d, t), site.lat, site.lon);
}

function sunDirOf(alt, az) {
  const site = S.site || siteDefault();
  const th = az + site.north * Math.PI / 180;
  return new THREE.Vector3(Math.cos(alt) * Math.sin(th), Math.sin(alt), -Math.cos(alt) * Math.cos(th));
}

function compassName(deg) {
  const n = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
  return n[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function hm(t) {
  const m = ((Math.round(t) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

function dur(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h} ч ${m} мин` : `${m} мин`;
}

function daySun(m, d) {
  let rise = null;
  let set = null;
  let noon = 0;
  let top = -90;
  let prev = sunAt(m, d, 0).alt * 180 / Math.PI;
  for (let t = 1; t <= 1440; t++) {
    const a = sunAt(m, d, t).alt * 180 / Math.PI;
    if (prev < -0.833 && a >= -0.833 && rise === null) rise = t;
    if (prev >= -0.833 && a < -0.833) set = t;
    if (a > top) {
      top = a;
      noon = t;
    }
    prev = a;
  }
  return {rise, set, noon, top};
}

function lerpKey(alt) {
  let i = 0;
  while (i < SKYK.length - 2 && alt > SKYK[i + 1][0]) i++;
  const a = SKYK[i];
  const b = SKYK[i + 1];
  const t = clamp((alt - a[0]) / (b[0] - a[0]), 0, 1);
  const col = j => lin(a[j]).lerp(lin(b[j]), t);
  return {zen: col(1), hor: col(2), glow: col(3), sunc: col(4), sunI: a[5] + (b[5] - a[5]) * t, k: a[6] + (b[6] - a[6]) * t};
}

function skyCompute() {
  const s = sunAt(SKY.m, SKY.d, SKY.t);
  const alt = s.alt * 180 / Math.PI;
  const W = WEATHER[SKY.weather] || WEATHER.clear;
  const K = lerpKey(alt);
  const gray = new THREE.Color(W.gray, W.gray, W.gray * 1.03).multiplyScalar(K.k);
  const zen = K.zen.clone().multiplyScalar(K.k).lerp(gray.clone().multiplyScalar(0.78), W.cov * (W.gray ? 1 : 0.35));
  const hor = K.hor.clone().multiplyScalar(K.k).lerp(gray, W.cov * (W.gray ? 1 : 0.3));
  const glow = K.glow.clone().multiplyScalar(1 - 0.85 * Math.min(1, W.cov * (W.gray ? 1.2 : 0.5)));
  const night = alt < -4;
  const dir = night ? sunDirOf(35 * Math.PI / 180, s.az + Math.PI) : sunDirOf(s.alt, s.az);
  const sunI = night ? 0.06 * (1 - W.cov * 0.8) : K.sunI * W.sun;
  const sunc = night ? lin(0x9fb6e8) : K.sunc.clone();
  const cloud = lin(0xffffff).multiplyScalar(K.k * (W.gray ? 0.55 + 0.4 * W.gray : 0.95)).lerp(K.sunc.clone().multiplyScalar(K.k * 1.1), W.gray ? 0.08 : 0.35);
  const avg = (zen.r + zen.g + zen.b + 2 * (hor.r + hor.g + hor.b)) / 9;
  const expo = 0.72 * Math.pow(clamp(0.42 / Math.max(0.004, avg + sunI * 0.08), 1, 14), 0.62);
  return {alt, az: s.az, dir, sunI, sunc, zen, hor, glow, cloud, cov: W.cov, gray: W.gray, fog: W.fog, rain: !!W.rain, snow: !!W.snow, hail: !!W.hail, heavy: !!W.heavy, night, expo, stars: clamp((-alt - 6) / 8, 0, 1) * (1 - W.cov)};
}

function skyRad(d, st) {
  const h = Math.max(0, d.y);
  const c = st.hor.clone().lerp(st.zen, Math.pow(h, 0.45));
  const cs = Math.max(0, d.dot(st.dir));
  const band = Math.pow(1 - h, 6);
  return c.add(st.glow.clone().multiplyScalar((Math.pow(cs, 6) * 0.6 + Math.pow(cs, 2) * 0.25) * (0.35 + 0.65 * band)));
}

const SKYV = "varying vec3 vDir;\nvoid main() {\n  vDir = position;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_Position.z = gl_Position.w;\n}";
const SKYF = `uniform vec3 uZen;
uniform vec3 uHor;
uniform vec3 uGnd;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uGlow;
uniform vec3 uCloud;
uniform float uDisc;
uniform float uCov;
uniform float uGray;
uniform float uTime;
uniform float uStars;
uniform vec2 uWindV;
uniform float uFlash;
varying vec3 vDir;
float h21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    s += a * vn(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3;
    a *= 0.5;
  }
  return s;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float hp = max(h, 0.0);
  vec3 col = mix(uHor, uZen, pow(hp, 0.45));
  float cs = max(dot(d, uSun), 0.0);
  float band = pow(1.0 - hp, 6.0);
  col += uGlow * (pow(cs, 6.0) * 0.6 + pow(cs, 2.0) * 0.25) * (0.35 + 0.65 * band);
  if (h < 0.0) col = mix(uHor, uGnd, clamp(-h * 5.0, 0.0, 1.0));
  float cover = 0.0;
  if (h > 0.0) {
    if (uStars > 0.0) {
      vec2 sp = floor(d.xz / (h + 0.3) * 260.0);
      float st = step(0.998, h21(sp)) * h21(sp + 3.1);
      col += vec3(st * uStars * 0.75);
    }
    if (uCov > 0.001) {
      vec2 cp = d.xz / (h + 0.12) * 1.3 + uTime * (vec2(0.0015, 0.0006) + uWindV * 0.0011);
      float n = fbm(cp);
      float cv = smoothstep(1.02 - uCov * 0.78, 1.18 - uCov * 0.58, n + 0.25 * uCov);
      float fade = smoothstep(0.0, 0.1, h);
      float lit = 0.72 + 0.28 * smoothstep(0.35, 0.8, n) + 0.35 * pow(cs, 4.0) * (1.0 - uGray);
      vec3 cc = uCloud * lit * (1.0 - 0.28 * smoothstep(0.55, 0.95, n) * uGray);
      cover = cv * fade;
      col = mix(col, cc, cover);
    }
    col += vec3(0.55, 0.6, 0.78) * uFlash * (0.2 + cover * 1.4);
  }
  col += uSunCol * smoothstep(0.99955, 0.9998, cs) * 30.0 * uDisc * (1.0 - cover) * step(0.0, h);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

function skyMaterial(disc) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uZen: {value: lin(0x3a70c0)},
      uHor: {value: lin(0xd2e2ee)},
      uGnd: {value: lin(0x6f6d66)},
      uSun: {value: new THREE.Vector3(0.4, 0.8, 0.4)},
      uSunCol: {value: new THREE.Color(1, 0.95, 0.85)},
      uGlow: {value: new THREE.Color(0, 0, 0)},
      uCloud: {value: new THREE.Color(1, 1, 1)},
      uDisc: {value: disc},
      uCov: {value: 0},
      uGray: {value: 0},
      uTime: {value: 0},
      uStars: {value: 0},
      uWindV: {value: new THREE.Vector2()},
      uFlash: {value: 0}
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: SKYV,
    fragmentShader: SKYF
  });
}

function skyUniforms(mt, st) {
  const u = mt.uniforms;
  u.uZen.value.copy(st.zen);
  u.uHor.value.copy(st.hor);
  u.uGnd.value.copy(st.hor).multiplyScalar(0.35);
  u.uSun.value.copy(st.night ? sunDirOf(st.alt * Math.PI / 180, st.az) : st.dir);
  u.uSunCol.value.copy(st.sunc);
  u.uGlow.value.copy(st.glow);
  u.uCloud.value.copy(st.cloud);
  u.uCov.value = st.cov;
  u.uGray.value = st.gray;
  u.uStars.value = st.stars;
}

function makeEnv() {
  if (!V.ok) return;
  try {
    if (!SKY.envScene) {
      const sc = new THREE.Scene();
      SKY.envSky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMaterial(0));
      sc.add(SKY.envSky);
      SKY.envGround = new THREE.Mesh(new THREE.CircleGeometry(390, 32), new THREE.MeshBasicMaterial({color: lin(0x8e8b84)}));
      SKY.envGround.rotation.x = -Math.PI / 2;
      SKY.envGround.position.y = -2;
      sc.add(SKY.envGround);
      SKY.envScene = sc;
      SKY.pm = new THREE.PMREMGenerator(V.renderer);
    }
    const st = SKY.st || skyCompute();
    skyUniforms(SKY.envSky.material, st);
    const gl = Math.max(0, st.sunI * Math.max(0, st.dir.y)) + (st.hor.r + st.hor.g + st.hor.b) / 3;
    SKY.envGround.material.color.copy(lin(0x8a8a78).lerp(lin(0xe8ecef), WX.snow)).multiplyScalar(clamp(gl * 0.24, 0.002, 1.2));
    const rt = SKY.pm.fromScene(SKY.envScene, 0.02, 0.1, 1000);
    if (SKY.envRT) SKY.envRT.dispose();
    SKY.envRT = rt;
    V.env = rt.texture;
    V.scene.environment = V.env;
  } catch (err) {
    V.env = null;
  }
}

function skySig(st) {
  return [Math.round(st.alt * 2), Math.round(st.az * 90), SKY.weather, (S.site || siteDefault()).north, Math.round(WX.snow * 5)].join("|");
}

function applySky(force) {
  if (!V.scene) return;
  const st = skyCompute();
  SKY.st = st;
  V.sunDir.copy(st.dir);
  if (V.sky) skyUniforms(V.sky.material, st);
  if (V.sun) {
    V.sun.color.copy(st.sunc);
    V.sun.intensity = st.sunI;
    V.sun.castShadow = st.sunI > 0.02;
    fitSun();
  }
  if (V.hemi) {
    const lum = (st.hor.r + st.hor.g + st.hor.b) / 3;
    V.hemi.color.copy(st.hor).lerp(new THREE.Color(lum, lum, lum), 0.6);
    V.hemi.groundColor.copy(lin(0xb3a48c)).multiplyScalar(clamp(0.3 * lum + 0.12 * st.sunI * Math.max(0, st.dir.y), 0, 1.5));
    V.hemi.intensity = 0.3;
  }
  if (V.renderer) V.renderer.toneMappingExposure = st.expo;
  const fc = new THREE.Color().copy(st.hor).convertLinearToSRGB();
  if (V.scene.fog) {
    V.scene.fog.color.copy(fc).multiplyScalar(Math.min(1, st.expo * 0.9));
    V.scene.fog.near = st.fog < 200 ? 4 : 120;
    V.scene.fog.far = st.fog;
  }
  const sig = skySig(st);
  const now = performance.now();
  if (force || (sig !== SKY.envSig && now - SKY.envAt > 180)) {
    SKY.envSig = sig;
    SKY.envAt = now;
    makeEnv();
  } else if (sig !== SKY.envSig) {
    clearTimeout(SKY.envTimer);
    SKY.envTimer = setTimeout(() => applySky(true), 200);
  }
  lampSkyCheck(st);
  wxSky();
  skyFx(st);
  sunPath();
  syncSkyUI();
  V.need = true;
  if (typeof refineReset === "function") refineReset();
}

function skyFx(st) {
  const kind = st.rain ? (st.heavy ? "storm" : "rain") : st.snow ? "snow" : st.hail ? "hail" : "";
  if (kind === SKY.fxKind) return;
  if (SKY.fx) {
    V.scene.remove(SKY.fx);
    SKY.fx.geometry.dispose();
    SKY.fx.material.dispose();
    SKY.fx = null;
  }
  SKY.fxKind = kind;
  if (!kind) return;
  const lines = kind === "rain" || kind === "storm";
  const n = kind === "storm" ? 12000 : kind === "rain" ? 7000 : kind === "hail" ? 5000 : 6000;
  const rnd = srng(77);
  const pos = new Float32Array(lines ? n * 6 : n * 3);
  const box = [36, 22, 36];
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * box[0];
    const y = rnd() * box[1];
    const z = (rnd() - 0.5) * box[2];
    if (lines) pos.set([x, y, z, x + 0.01, y + 0.38, z + 0.004], i * 6);
    else pos.set([x, y, z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.userData.base = pos.slice();
  let fx;
  if (lines) {
    fx = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: 0xc9d4de, transparent: true, opacity: kind === "storm" ? 0.3 : 0.38, depthWrite: false}));
  } else {
    fx = new THREE.Points(g, new THREE.PointsMaterial({color: kind === "hail" ? 0xe9eef2 : 0xffffff, size: kind === "hail" ? 0.028 : 0.045, transparent: true, opacity: 0.92, depthWrite: false, map: snowSprite(), alphaTest: 0.05}));
  }
  fx.frustumCulled = false;
  fx.userData.noPick = true;
  fx.userData.box = box;
  fx.userData.t = 0;
  fx.renderOrder = 30;
  SKY.fx = fx;
  V.scene.add(fx);
}

function snowSprite() {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const x = c.getContext("2d");
  if (!x || !x.createRadialGradient) return null;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.5, "rgba(255,255,255,0.8)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function skyTick(dt) {
  let moved = false;
  if (SKY.play) {
    SKY.t = (SKY.t + dt * SKY.speed) % 1440;
    SKY.pendApply = true;
    moved = true;
  }
  if (SKY.pendApply && (!SKY.lastApply || performance.now() - SKY.lastApply > 60)) {
    SKY.pendApply = false;
    SKY.lastApply = performance.now();
    applySky();
    moved = true;
  }
  const fx = SKY.fx;
  if (fx && V.camera) {
    const kind = SKY.fxKind;
    const rain = kind === "rain" || kind === "storm";
    fx.userData.t += dt;
    const p = fx.geometry.attributes.position;
    const base = fx.geometry.userData.base;
    const [bx, by, bz] = fx.userData.box;
    const t = fx.userData.t;
    const c = V.camera.position;
    const fall = kind === "storm" ? 11 : rain ? 9 : kind === "hail" ? 12 : 0.9;
    const wv = windVec();
    const drift = rain || kind === "hail" ? 0.55 : 0.8;
    const dx = wv.x * drift;
    const dz = wv.z * drift;
    const sl = kind === "storm" ? 0.5 : 0.38;
    const tl = sl / fall;
    const stride = rain ? 6 : 3;
    const arr = p.array;
    for (let i = 0; i < base.length; i += stride) {
      const sw = kind === "snow" ? Math.sin(t * 0.8 + i * 0.013) * 0.35 : 0;
      const x = ((base[i] + sw + t * dx - c.x) % bx + bx * 1.5) % bx - bx / 2 + c.x;
      const y = ((base[i + 1] - t * fall - c.y + 4) % by + by) % by + c.y - 6;
      const z = ((base[i + 2] + t * (dz + (rain ? 0.4 : 0.2)) - c.z) % bz + bz * 1.5) % bz - bz / 2 + c.z;
      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
      if (rain) {
        arr[i + 3] = x - dx * tl + 0.01;
        arr[i + 4] = y + sl;
        arr[i + 5] = z - dz * tl + 0.004;
      }
    }
    p.needsUpdate = true;
    moved = true;
  }
  return wxTick(dt, moved);
}

function sunPath() {
  if (!V.scene) return;
  const site = S.site || siteDefault();
  const sig = [SKY.path, SKY.m, SKY.d, site.lat, site.lon, site.tz, site.north, S.house.cx, S.house.cy, S.plot.w, S.plot.d].join("|");
  if (sig === SKY.pathSig && (!SKY.pathG || SKY.pathG.visible === SKY.path)) {
    sunMarker();
    return;
  }
  SKY.pathSig = sig;
  if (SKY.pathG) {
    V.scene.remove(SKY.pathG);
    SKY.pathG.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !o.userData.shared) o.material.dispose();
    });
    SKY.pathG = null;
  }
  if (!SKY.path) return;
  const g = new THREE.Group();
  g.userData.noPick = true;
  const R = Math.max(S.plot.w, S.plot.d) * 0.75 + 6;
  const c = new THREE.Vector3(S.house.cx, 0, S.house.cy);
  const pts = [];
  for (let t = 0; t <= 1440; t += 5) {
    const s = sunAt(SKY.m, SKY.d, t);
    if (s.alt < -0.02) continue;
    pts.push(c.clone().addScaledVector(sunDirOf(s.alt, s.az), R));
  }
  const lm = new THREE.LineBasicMaterial({color: 0xffb020, transparent: true, opacity: 0.95, depthTest: true, toneMapped: false});
  if (pts.length > 1) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
  const ring = [];
  for (let i = 0; i <= 72; i++) {
    const a = i / 72 * Math.PI * 2;
    ring.push(new THREE.Vector3(c.x + Math.cos(a) * R, 0.05, c.z + Math.sin(a) * R));
  }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.45, toneMapped: false})));
  const dm = new THREE.MeshBasicMaterial({color: 0xffb020, toneMapped: false});
  for (let hr = 0; hr < 24; hr++) {
    const s = sunAt(SKY.m, SKY.d, hr * 60);
    if (s.alt < 0) continue;
    const p = c.clone().addScaledVector(sunDirOf(s.alt, s.az), R);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), dm);
    dot.position.copy(p);
    g.add(dot);
    const lb = label(hm(hr * 60));
    if (lb) {
      lb.position.copy(p).add(new THREE.Vector3(0, 0.9, 0));
      g.add(lb);
    }
  }
  const nd = sunDirOf(0, 0);
  const lbN = label("С");
  if (lbN) {
    lbN.position.copy(c).addScaledVector(nd, R + 1.5).setY(0.6);
    g.add(lbN);
  }
  for (const [nm, az] of [["В", 90], ["Ю", 180], ["З", 270]]) {
    const lb = label(nm);
    if (lb) {
      lb.position.copy(c).addScaledVector(sunDirOf(0, az * Math.PI / 180), R + 1.5).setY(0.6);
      g.add(lb);
    }
  }
  const sm = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), new THREE.MeshBasicMaterial({color: 0xfff1b0, toneMapped: false}));
  sm.userData.sun = true;
  g.add(sm);
  SKY.pathG = g;
  SKY.pathC = c;
  SKY.pathR = R;
  V.scene.add(g);
  sunMarker();
}

function sunMarker() {
  if (!SKY.pathG) return;
  const sm = SKY.pathG.children.find(o => o.userData.sun);
  if (!sm) return;
  const s = sunAt(SKY.m, SKY.d, SKY.t);
  sm.visible = s.alt > 0;
  sm.position.copy(SKY.pathC).addScaledVector(sunDirOf(s.alt, s.az), SKY.pathR);
}

function facadeSun(m, d) {
  const e = ext();
  if (!e) return [];
  const faces = [[0, 1], [0, -1], [-1, 0], [1, 0]];
  const site = S.site || siteDefault();
  const out = faces.map(([hx, hy]) => {
    const w = dirToWorld(hx, hy);
    const name = Math.abs(w.z) > Math.abs(w.x) ? (w.z > 0 ? "Фасад к улице" : "Задний фасад") : (w.x > 0 ? "Правый фасад" : "Левый фасад");
    const th = Math.atan2(w.x, -w.z) * 180 / Math.PI;
    const az = ((th - site.north) % 360 + 360) % 360;
    return {name, hx, hy, nx: w.x, nz: w.z, az, runs: [], total: 0};
  });
  const step = 5;
  let prev = out.map(() => false);
  for (let t = 0; t <= 1440; t += step) {
    const s = sunAt(m, d, t);
    const dir = sunDirOf(s.alt, s.az);
    const h = Math.hypot(dir.x, dir.z) || 1;
    out.forEach((f, i) => {
      const lit = s.alt > 2 * Math.PI / 180 && (dir.x * f.nx + dir.z * f.nz) / h > 0.08;
      if (lit && !prev[i]) f.runs.push([t, t]);
      if (lit) {
        f.runs[f.runs.length - 1][1] = t;
        f.total += step;
      }
      prev[i] = lit;
    });
  }
  return out;
}

function roomSun(fs) {
  const e = ext();
  if (!e) return [];
  const sides = extSides(e);
  const faceOf = L => (L.o === "h" ? (L.out > 0 ? 0 : 1) : (L.out < 0 ? 2 : 3));
  return S.rooms.map(r => {
    const set = new Set();
    for (const w of S.windows) {
      const L = sides.find(sd => onLine(w, sd));
      if (!L) continue;
      const a = along(w);
      const inside = w.o === "h" ? a > r.x && a < r.x + r.w && (near(L.c, r.y) || near(L.c, r.y + r.d)) : a > r.y && a < r.y + r.d && (near(L.c, r.x) || near(L.c, r.x + r.w));
      if (inside) set.add(faceOf(L));
    }
    const mins = new Array(289).fill(false);
    for (const i of set) for (const [a, b] of fs[i].runs) for (let t = a; t <= b; t += 5) mins[t / 5] = true;
    const total = mins.filter(Boolean).length * 5;
    return {r, faces: [...set].map(i => fs[i]), total};
  });
}

function syncSkyUI() {
  const bar = $("#sunbar");
  if (!bar) return;
  const st = SKY.st;
  const tl = $("#sktime");
  if (tl) tl.textContent = hm(SKY.t);
  const sl = $("#skt");
  if (sl && document.activeElement !== sl) sl.value = String(Math.round(SKY.t));
  const dd = $("#skd");
  if (dd && document.activeElement !== dd) dd.value = String(SKY.d);
  const mm = $("#skm");
  if (mm && document.activeElement !== mm) mm.value = String(SKY.m);
  const wt = $("#skw");
  if (wt) wt.value = SKY.weather;
  const lt = $("#skl");
  if (lt) lt.value = LAMP.mode;
  wxSync();
  const pb = $("#skplay");
  if (pb) pb.setAttribute("aria-pressed", String(SKY.play));
  const pp = $("#skpath");
  if (pp) pp.setAttribute("aria-pressed", String(SKY.path));
  if (tl && st) tl.dataset.tip = st.alt > -0.833 ? `Солнце ${Math.round(st.alt)}° над горизонтом, ${compassName(st.az * 180 / Math.PI)}` : "Солнце за горизонтом";
}

function skySet(p) {
  const m0 = SKY.m;
  const w0 = SKY.weather;
  Object.assign(SKY, p);
  if (p.m !== undefined && p.m !== m0) Object.assign(WX, {snow: seasonSnow(), wet: 0, pud: 0});
  if (p.weather !== undefined && p.weather !== w0) wxWeather(p.weather);
  SKY.d = clamp(Math.round(SKY.d), 1, new Date(Date.UTC(skyYear(), SKY.m, 0)).getUTCDate());
  applySky();
  saveUI();
  if (UIP.ptab === "proj" && tab === "plot") renderPanel();
}

function sunSec() {
  const site = S.site || siteDefault();
  const cities = CITIES.map(([n]) => `<option${n === site.city ? " selected" : ""}>${n}</option>`).join("");
  let h = sec("Место и стороны света",
    `<label class="f">Город рядом<select data-b="site.city"><option value="">Свои координаты</option>${cities}</select></label>` +
    row(num("Широта, °", "site.lat", site.lat, "in-lat", 0.01), num("Долгота, °", "site.lon", site.lon, "in-lon", 0.01)) +
    row(num("Часовой пояс, UTC+", "site.tz", site.tz, "in-tz", 1), num("Север от верха плана, °", "site.north", site.north, "in-north", 5)) +
    `<div class="btns">${btn("north-l", "Север ↺ 15°")}${btn("north-r", "Север ↻ 15°")}${btn("sky-path", SKY.path ? "Спрятать путь солнца" : "Показать путь солнца")}</div>` +
    `<p class="hint">Север 0° значит, что верх плана смотрит на север, а улица на юг. Стрелка «С» на плане участка показывает север.</p>`);
  const day = daySun(SKY.m, SKY.d);
  const md = `${SKY.d} ${MONTHS[SKY.m - 1]}`;
  const fs = facadeSun(SKY.m, SKY.d);
  let body = day.rise === null && day.top < 0 ? `<p class="hint">${md} солнце не встаёт.</p>` : `<dl class="stats"><dt>Восход</dt><dd>${day.rise === null ? "нет" : hm(day.rise)}</dd><dt>Заход</dt><dd>${day.set === null ? "нет" : hm(day.set)}</dd><dt>Выше всего</dt><dd>${hm(day.noon)}, ${Math.round(day.top)}°</dd><dt>Светлый день</dt><dd>${day.rise !== null && day.set !== null ? dur(day.set - day.rise) : "круглые сутки"}</dd></dl>`;
  if (fs.length) {
    body += `<h3 class="sub">Когда солнце на фасаде</h3>` + fs.map(f => `<div class="sunrow"><b>${f.name}, ${compassName(f.az)}</b><span>${f.runs.length ? f.runs.map(([a, b]) => hm(a) + " - " + hm(b)).join(", ") + ", " + dur(f.total) : "солнца нет"}</span></div>`).join("");
    const rs = roomSun(fs).filter(x => x.r.type !== "Коридор");
    body += `<h3 class="sub">Прямое солнце в комнатах через окна</h3>` + rs.map(x => `<div class="sunrow"><b>${esc(x.r.name)}</b><span>${x.faces.length ? (x.total ? dur(x.total) : "солнца нет") + ", окна " + x.faces.map(f => compassName(f.az)).join(" и ") : "окон нет"}</span></div>`).join("");
  }
  h += sec("Солнце " + md, body + `<p class="hint">Считаю без соседних домов и деревьев, по центру фасада. День и время меняются внизу 3D-вида.</p>`);
  return h;
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function skyUIInit() {
  const mm = $("#skm");
  if (mm) mm.innerHTML = MONTHS.map((n, i) => `<option value="${i + 1}">${["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"][i]}</option>`).join("");
  const wt = $("#skw");
  if (wt) wt.innerHTML = Object.entries(WEATHER).map(([k, w]) => `<option value="${k}">${w.n}</option>`).join("");
  const sl = $("#skt");
  if (sl) {
    sl.addEventListener("input", () => {
      SKY.t = clamp(Number(sl.value) || 0, 0, 1439);
      SKY.play = false;
      SKY.pendApply = true;
      V.need = true;
      const tl = $("#sktime");
      if (tl) tl.textContent = hm(SKY.t);
    });
    sl.addEventListener("change", () => skySet({t: clamp(Number(sl.value) || 0, 0, 1439)}));
  }
  const dd = $("#skd");
  if (dd) dd.addEventListener("change", () => skySet({d: Number(dd.value) || 1}));
  if (mm) mm.addEventListener("change", () => skySet({m: clamp(Number(mm.value) || 1, 1, 12)}));
  if (wt) wt.addEventListener("change", () => skySet({weather: WEATHER[wt.value] ? wt.value : "clear"}));
  const pb = $("#skplay");
  if (pb) pb.addEventListener("click", () => {
    SKY.play = !SKY.play;
    syncSkyUI();
    if (!SKY.play) saveUI();
  });
  const pp = $("#skpath");
  if (pp) pp.addEventListener("click", () => skySet({path: !SKY.path}));
  const lt = $("#skl");
  if (lt) {
    lt.innerHTML = Object.entries(LAMP_MODES).map(([key, v]) => `<option value="${key}">${v}</option>`).join("");
    lt.addEventListener("change", () => setLampMode(lt.value));
  }
  wxUIInit();
}
