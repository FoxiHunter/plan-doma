"use strict";
const WX = {snow: 0, wet: 0, pud: 0, wind: 0, windDir: 270, clock: 0, flash: 0, flashT: -1, nextBolt: 3, bolt: null, season: "", hemiBase: null};
const CLIM = [-7, -6, -1, 6, 13, 17, 19, 17, 11, 5, -1, -5];
const WX_SPEEDS = {10: "10 минут в секунду", 60: "1 час в секунду", 180: "3 часа в секунду"};
const COMPASS8 = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];

function climMonth(m) {
  const site = S.site || siteDefault();
  const i = site.lat < 0 ? (m + 5) % 12 : m - 1;
  return CLIM[i] + clamp((55.75 - Math.abs(site.lat)) * 0.55, -15, 25);
}

function airTemp(m, d, t) {
  const f = (d - 15) / 30;
  const m2 = f >= 0 ? m % 12 + 1 : (m + 10) % 12 + 1;
  const base = climMonth(m) + (climMonth(m2) - climMonth(m)) * Math.abs(f);
  const W = WEATHER[SKY.weather] || WEATHER.clear;
  let T = base + 4 * Math.cos((t / 60 - 15) / 24 * 2 * Math.PI) * (1 - W.cov * 0.6) - W.cov;
  if (W.snow) T = Math.min(T, -1);
  if (W.rain) T = Math.max(T, 1);
  if (W.hail) T = Math.max(T, 8);
  return Math.round(T * 10) / 10;
}

function monthFrac() {
  const site = S.site || siteDefault();
  let m = SKY.m + (SKY.d - 1) / 31;
  if (site.lat < 0) m = (m + 5) % 12 + 1;
  return m;
}

function seasonKey() {
  const site = S.site || siteDefault();
  if (Math.abs(site.lat) < 23) return "summer";
  const m = monthFrac();
  if (m < 4.2 || m >= 11.7) return "bare";
  if (m < 5.1) return "spring";
  if (m < 9.4) return "summer";
  if (m < 10.2) return "autumn";
  if (m < 11) return "fall";
  return "late";
}

function seasonSnow() {
  const site = S.site || siteDefault();
  if (Math.abs(site.lat) < 44) return 0;
  const m = monthFrac();
  if (m >= 12 || m < 3) return 0.9;
  if (m < 3.5) return 0.6;
  if (m >= 11.6) return 0.4;
  return 0;
}

function grassKey(base) {
  const s = WX.season || seasonKey();
  if (s === "bare" || s === "late") return base + "_w";
  if (s === "spring") return base + "_s";
  if (s === "fall") return base + "_a";
  return base;
}

function windVec() {
  const v = sunDirOf(0, (WX.windDir + 180) * Math.PI / 180);
  return {x: v.x * WX.wind, z: v.z * WX.wind};
}

function wxUniforms() {
  const W = WEATHER[SKY.weather] || WEATHER.clear;
  SHU.uSnow.value = WX.snow;
  SHU.uWet.value = WX.wet;
  SHU.uPud.value = WX.pud;
  SHU.uRainOn.value = W.rain ? (W.heavy ? 1.6 : 1) : 0;
  const w = windVec();
  SHU.uWind.value.set(w.x, WX.wind, w.z);
  SHU.uTime.value = WX.clock;
  if (V.sky) {
    const u = V.sky.material.uniforms;
    u.uTime.value = WX.clock;
    u.uWindV.value.set(w.x, w.z);
    u.uFlash.value = WX.flash;
  }
}

function wxStep(dm) {
  const W = WEATHER[SKY.weather] || WEATHER.clear;
  const st = SKY.st;
  const T = airTemp(SKY.m, SKY.d, SKY.t);
  const sun = st && !st.night ? Math.max(0, st.sunI * Math.max(0, st.dir.y)) / 3 : 0;
  if (W.snow) WX.snow = Math.min(1, WX.snow + dm / 200);
  if (W.hail && WX.snow < 0.45) WX.snow = Math.min(0.45, WX.snow + dm / 50);
  if (W.rain) {
    WX.wet = Math.min(1, WX.wet + dm / (W.heavy ? 6 : 15));
    WX.pud = Math.min(1, WX.pud + dm / (W.heavy ? 45 : 130));
  }
  if (T > 0.5 && WX.snow > 0) {
    const melt = Math.min(WX.snow, dm * (T / 900 + sun / 250 + (W.rain ? 1 / 180 : 0)));
    WX.snow -= melt;
    WX.wet = Math.min(1, WX.wet + melt * 5);
    WX.pud = Math.min(1, WX.pud + melt * 1.6);
  }
  if (!W.rain) {
    const ev = (0.25 + Math.max(0, T) / 25 + sun * 1.2 + WX.wind / 20) / 200;
    WX.wet = Math.max(0, WX.wet - dm * ev * (T < -2 ? 0.2 : 1));
    WX.pud = Math.max(0, WX.pud - dm * ev * (T < -2 ? 0.05 : 0.3));
  }
}

function wxSeasonCheck() {
  const s = seasonKey();
  if (s === WX.season) return;
  WX.season = s;
  THUMBS.clear();
  schedule3D();
}

function wxTick(dt, moved) {
  const W = WEATHER[SKY.weather] || WEATHER.clear;
  let anim = moved;
  if (SKY.play) {
    wxStep(dt * SKY.speed);
    anim = true;
  }
  if (WX.wind >= 0.5 || SKY.fx || W.bolt) {
    WX.clock += dt;
    anim = true;
  }
  if (W.bolt) {
    WX.nextBolt -= dt;
    if (WX.nextBolt <= 0) {
      WX.flashT = 0;
      WX.nextBolt = 4 + Math.random() * 10;
      boltMake();
    }
  }
  if (WX.flashT >= 0) {
    WX.flashT += dt;
    const t = WX.flashT;
    const p = k => Math.exp(-Math.pow((t - k) / 0.035, 2));
    WX.flash = Math.min(1.4, p(0.02) * 1.2 + p(0.13) * 0.7 + p(0.3) * 1.0 + Math.max(0, 0.25 - t) * 0.6);
    if (t > 0.7) {
      WX.flashT = -1;
      WX.flash = 0;
    }
    if (WX.bolt) WX.bolt.visible = WX.flash > 0.15;
    anim = true;
  }
  if (V.hemi && WX.hemiBase) {
    V.hemi.intensity = WX.hemiBase.i + WX.flash * 4;
    V.hemi.color.copy(WX.hemiBase.c).lerp(new THREE.Color(0.75, 0.8, 1), Math.min(1, WX.flash));
  }
  if (anim) wxUniforms();
  return anim;
}

function wxSky() {
  if (V.hemi) WX.hemiBase = {i: V.hemi.intensity, c: V.hemi.color.clone()};
  const W = WEATHER[SKY.weather] || WEATHER.clear;
  if (!W.bolt && WX.bolt) {
    boltClear();
    WX.flash = 0;
    WX.flashT = -1;
  }
  wxSeasonCheck();
  wxUniforms();
}

function boltClear() {
  if (!WX.bolt) return;
  V.scene.remove(WX.bolt);
  WX.bolt.geometry.dispose();
  WX.bolt.material.dispose();
  WX.bolt = null;
}

function boltMake() {
  if (!V.scene || !V.camera) return;
  boltClear();
  const P = S.plot;
  const f = camF();
  const a = Math.random() < 0.7 ? Math.atan2(f.z, f.x) + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
  const dist = 220 + Math.random() * 200;
  const c = new THREE.Vector3(P.w / 2 + Math.cos(a) * dist, 0, P.d / 2 + Math.sin(a) * dist);
  const pos = [];
  const cam = V.camera.position;
  const ribbon = (pts, w) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const seg = p1.clone().sub(p0);
      const side = seg.clone().cross(p0.clone().sub(cam)).normalize().multiplyScalar(w);
      const q = [p0.clone().add(side), p0.clone().sub(side), p1.clone().add(side), p1.clone().sub(side)];
      pos.push(...q[0].toArray(), ...q[1].toArray(), ...q[2].toArray(), ...q[1].toArray(), ...q[3].toArray(), ...q[2].toArray());
    }
  };
  const walk = (start, h, n, w, depth) => {
    const pts = [start.clone()];
    let p = start.clone();
    for (let i = 0; i < n; i++) {
      p = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * h * 0.5, -h, (Math.random() - 0.5) * h * 0.5));
      if (p.y < 0) p.y = 0;
      pts.push(p);
      if (depth < 2 && Math.random() < 0.18) walk(p, h * 0.7, Math.round(n * 0.3), w * 0.5, depth + 1);
      if (p.y <= 0) break;
    }
    ribbon(pts, w);
  };
  walk(new THREE.Vector3(c.x, 240, c.z), 12, 24, 1.1, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.MeshBasicMaterial({color: new THREE.Color(0.85, 0.9, 1).multiplyScalar(3), toneMapped: false, fog: false, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
  WX.bolt = new THREE.Mesh(g, m);
  WX.bolt.frustumCulled = false;
  WX.bolt.userData.noPick = true;
  WX.bolt.visible = false;
  V.scene.add(WX.bolt);
}

function wxSet(p) {
  Object.assign(WX, p);
  WX.snow = clamp(WX.snow, 0, 1);
  WX.wet = clamp(WX.wet, 0, 1);
  WX.pud = clamp(WX.pud, 0, 1);
  WX.wind = clamp(WX.wind, 0, 30);
  WX.windDir = ((Math.round(WX.windDir) % 360) + 360) % 360;
  wxUniforms();
  wxSync();
  V.need = true;
  saveUI();
}

function wxWeather(w) {
  const W = WEATHER[w] || WEATHER.clear;
  WX.wind = W.wind || 0;
  if (W.rain && WX.wet < 0.3) WX.wet = 0.3;
}

function wxSync() {
  const box = $("#wxpop");
  if (!box || box.hidden) return;
  const set = (id, v, txt) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = String(v);
    const lb = document.getElementById(id + "-v");
    if (lb) lb.textContent = txt;
  };
  set("wx-wind", WX.wind, WX.wind ? `${Math.round(WX.wind)} м/с` : "штиль");
  set("wx-dir", Math.round(WX.windDir / 45) % 8 * 45, "");
  set("wx-snow", Math.round(WX.snow * 100), Math.round(WX.snow * 100) + "%");
  set("wx-wet", Math.round(WX.wet * 100), Math.round(WX.wet * 100) + "%");
  set("wx-pud", Math.round(WX.pud * 100), Math.round(WX.pud * 100) + "%");
  set("wx-speed", SKY.speed, "");
  const t = $("#wx-temp");
  if (t) {
    const T = airTemp(SKY.m, SKY.d, SKY.t);
    const sn = {bare: "зима, деревья голые", spring: "весна, молодая листва", summer: "лето", autumn: "ранняя осень", fall: "золотая осень", late: "поздняя осень"}[WX.season || seasonKey()];
    t.textContent = `Воздух около ${T > 0 ? "+" : T < 0 ? "−" : ""}${Math.abs(Math.round(T))} °C, ${sn}`;
  }
}

function wxUIInit() {
  const b = $("#skwx");
  const box = $("#wxpop");
  if (!b || !box) return;
  const dir = $("#wx-dir");
  if (dir) dir.innerHTML = COMPASS8.map((n, i) => `<option value="${i * 45}">${n}</option>`).join("");
  const sp = $("#wx-speed");
  if (sp) sp.innerHTML = Object.entries(WX_SPEEDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  b.addEventListener("click", () => {
    box.hidden = !box.hidden;
    b.setAttribute("aria-pressed", String(!box.hidden));
    wxSync();
  });
  box.addEventListener("input", e => {
    const id = e.target.id;
    const v = Number(e.target.value);
    if (id === "wx-wind") wxSet({wind: v});
    else if (id === "wx-snow") wxSet({snow: v / 100});
    else if (id === "wx-wet") wxSet({wet: v / 100});
    else if (id === "wx-pud") wxSet({pud: v / 100});
  });
  box.addEventListener("change", e => {
    const id = e.target.id;
    if (id === "wx-dir") wxSet({windDir: Number(e.target.value) || 0});
    else if (id === "wx-speed") {
      SKY.speed = has(WX_SPEEDS, e.target.value) ? Number(e.target.value) : 60;
      saveUI();
    }
  });
  box.addEventListener("click", e => {
    const a = e.target.closest("[data-wx]");
    if (!a) return;
    if (a.dataset.wx === "dry") wxSet({snow: 0, wet: 0, pud: 0});
    else if (a.dataset.wx === "season") wxSet({snow: seasonSnow(), wet: 0, pud: 0});
    else if (a.dataset.wx === "close") {
      box.hidden = true;
      b.setAttribute("aria-pressed", "false");
    }
  });
}
