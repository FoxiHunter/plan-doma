"use strict";
const LAMP = {mode: "auto", lit: false, cands: [], ver: 0, done: -1, halo: null, lk: 0.00055};
const LAMP_MODES = {auto: "Свет сам", on: "Свет вкл.", off: "Свет выкл."};
const LAMP_TEMPS = {2200: "Очень тёплый, 2200 K", 2700: "Тёплый, 2700 K", 3000: "Тёплый белый, 3000 K", 4000: "Нейтральный, 4000 K", 5000: "Дневной, 5000 K", 6500: "Холодный, 6500 K"};
const LAMP_CAP = {fast: [8, 0], nice: [24, 4], max: [48, 8]};
const LAMP_LUX = {"Гостиная": 150, "Кухня": 170, "Кухня-гостиная": 160, "Спальня": 110, "Детская": 150, "Кабинет": 200, "Санузел": 160, "Котельная": 90, "Прихожая": 110, "Коридор": 90, "Гардеробная": 120};

function kelvinColor(K) {
  const t = clamp(K, 1500, 12000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = new THREE.Color(clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255).convertSRGBToLinear();
  const mx = Math.max(c.r, c.g, c.b);
  c.multiplyScalar(1 / mx).lerp(new THREE.Color(1, 1, 1), 0.42);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return c.multiplyScalar(1 / Math.max(0.05, lum));
}

function kelvinHex(K) {
  const c = kelvinColor(K);
  const m = Math.max(c.r, c.g, c.b);
  return c.multiplyScalar(1 / m).convertLinearToSRGB().getHexString();
}

function lampDark(st) {
  const s = st || SKY.st || skyCompute();
  return s.alt < 3 || (s.cov >= 0.95 && s.alt < 12) || (s.fog < 100 && s.alt < 8);
}

function lampsOn(st) {
  if (LAMP.mode === "on") return true;
  if (LAMP.mode === "off") return false;
  return lampDark(st);
}

function lampLit(o) {
  return LAMP.lit && o.on !== false;
}

function lampDef(o) {
  return modelOf(o).lamp || null;
}

function lampTemp(o) {
  const L = lampDef(o);
  return o.k || (L ? L.k : 3000);
}

function lampLm(o) {
  const L = lampDef(o);
  return o.lm || (L ? L.lm : 800);
}

function glowKey(K, kind) {
  return (kind || "glow") + "#" + kelvinHex(K);
}

function roomGroup(r) {
  const out = [r];
  if (!r.open) return out;
  for (let i = 0; i < out.length; i++) {
    const a = out[i];
    for (const b of S.rooms) {
      if (!b.open || out.includes(b)) continue;
      if (b.x <= a.x + a.w + 0.02 && b.x + b.w >= a.x - 0.02 && b.y <= a.y + a.d + 0.02 && b.y + b.d >= a.y - 0.02 && overlapLen(a, b) > 0.3) out.push(b);
    }
  }
  return out;
}

function overlapLen(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
  return Math.max(ox, oy);
}

function houseBoxWorld(x0, y0, x1, y1) {
  const c0 = houseToWorld(x0, y0);
  const c1 = houseToWorld(x1, y1);
  return new THREE.Vector4(Math.min(c0.x, c1.x), Math.min(c0.z, c1.z), Math.max(c0.x, c1.x), Math.max(c0.z, c1.z));
}

function lampMaskHouse(px, py) {
  const Hs = S.house;
  const yb = new THREE.Vector4(Hs.base - 0.05, Hs.base + Hs.h + 0.02, 1, 0);
  const r = roomAt(px, py);
  if (r) {
    const grp = roomGroup(r);
    const x0 = Math.min(...grp.map(q => q.x)) - 0.03;
    const y0 = Math.min(...grp.map(q => q.y)) - 0.03;
    const x1 = Math.max(...grp.map(q => q.x + q.w)) + 0.03;
    const y1 = Math.max(...grp.map(q => q.y + q.d)) + 0.03;
    return {a: houseBoxWorld(x0, y0, x1, y1), b: yb};
  }
  const e = ext();
  if (!e) return {a: new THREE.Vector4(), b: new THREE.Vector4()};
  return {a: houseBoxWorld(e.minX - 0.03, e.minY - 0.03, e.maxX + 0.03, e.maxY + 0.03), b: yb};
}

function lampMaskPlot() {
  return {a: new THREE.Vector4(), b: new THREE.Vector4(0, 0, ext() ? 2 : 0, 0)};
}

function lampAdd(parent, pos, lm, K, mask, prio) {
  LAMP.cands.push({parent, pos, lm, K, mask, prio: prio || 0});
}

function lampThing(g, P, o, isItem) {
  if (!P.lights || !P.lights.length || !lampLit(o)) return;
  const L = lampDef(o);
  const mask = isItem ? lampMaskHouse(o.x + o.w / 2, o.y + o.d / 2) : lampMaskPlot();
  const lm = lampLm(o) / P.lights.length;
  for (const p of P.lights) lampAdd(g, new THREE.Vector3(p[0], p[1], p[2]), lm, lampTemp(o), mask, L && L.ceil ? 2 : 1);
}

function haloTex() {
  if (LAMP.halo) return LAMP.halo;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const x = c.getContext && c.getContext("2d");
  if (!x || !x.createRadialGradient) return null;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.18, "rgba(255,255,255,0.55)");
  gr.addColorStop(0.45, "rgba(255,255,255,0.14)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  LAMP.halo = new THREE.CanvasTexture(c);
  return LAMP.halo;
}

function lampHalo(parent, pos, lm, K) {
  const t = haloTex();
  if (!t) return;
  const col = kelvinColor(K);
  const m = Math.max(col.r, col.g, col.b);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: t, color: col.multiplyScalar(0.55 / m), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));
  const s = 0.14 * Math.pow(lm, 0.33);
  sp.scale.set(s, s, 1);
  sp.position.copy(pos);
  sp.userData.noPick = true;
  sp.renderOrder = 12;
  parent.add(sp);
}

function autoLights(g, base, H, m) {
  if (!S.house.autoLights || !LAMP.lit) return;
  const own = new Set();
  for (const it of S.items) {
    const L = lampDef(it);
    if (!L || !L.ceil || it.on === false) continue;
    const r = roomAt(it.x + it.w / 2, it.y + it.d / 2);
    if (r) own.add(r.id);
  }
  const show = V.walk || V.mode === "roof" || (V.mode === "cut" && V.cut.side !== "top");
  for (const r of S.rooms) {
    if (own.has(r.id) || r.w < 0.8 || r.d < 0.8) continue;
    const area = r.w * r.d;
    const lux = LAMP_LUX[r.type] || 120;
    const n = Math.max(r.w, r.d) > 6.5 ? 2 : 1;
    const lm = clamp(area * lux * 0.9, 500, 7000) / n;
    const mask = lampMaskHouse(r.x + r.w / 2, r.y + r.d / 2);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      const x = r.w >= r.d ? r.x + r.w * f : r.x + r.w / 2;
      const z = r.w >= r.d ? r.y + r.d / 2 : r.y + r.d * f;
      if (show) {
        const d0 = Cy(g, 0.2, base + H - 0.07, base + H - 0.005, x, z, m("white"), 28);
        const d1 = Cy(g, 0.18, base + H - 0.075, base + H - 0.065, x, z, m(glowKey(3000, "soft")), 28);
        for (const d of [d0, d1]) if (d) {
          d.castShadow = false;
          d.userData.noPick = true;
        }
      }
      lampAdd(g, new THREE.Vector3(x, base + H - 0.28, z), lm, 3000, mask, 2);
    }
  }
}

function lampsBegin() {
  LAMP.lit = lampsOn();
  LAMP.cands = [];
}

function lampsFinish() {
  const cap = LAMP_CAP[RF.q] || LAMP_CAP.nice;
  const list = LAMP.cands.slice().sort((a, b) => b.prio - a.prio || b.lm - a.lm);
  list.forEach((c, i) => {
    if (i >= cap[0]) return;
    const range = clamp(Math.sqrt(c.lm) * 0.32, 3.5, 18);
    const pl = new THREE.PointLight(kelvinColor(c.K), c.lm * LAMP.lk, range, 2);
    pl.position.copy(c.pos);
    pl.userData.la = c.mask.a;
    pl.userData.lb = c.mask.b;
    if (i < cap[1]) {
      pl.castShadow = true;
      pl.shadow.mapSize.set(256, 256);
      pl.shadow.camera.near = 0.06;
      pl.shadow.camera.far = range;
      pl.shadow.bias = -0.004;
      pl.shadow.normalBias = 0.02;
      pl.shadow.autoUpdate = false;
      pl.shadow.needsUpdate = true;
    }
    c.parent.add(pl);
    if (!V.walk || c.prio < 2) lampHalo(c.parent, c.pos, c.lm, c.K);
  });
  LAMP.cands = [];
  LAMP.ver++;
}

function lampShadowsDirty() {
  if (!V.root) return;
  V.root.traverse(o => {
    if (o.isPointLight && o.castShadow) o.shadow.needsUpdate = true;
  });
}

function lampSync() {
  if (LAMP.done === LAMP.ver) return;
  LAMP.done = LAMP.ver;
  const list = [];
  V.scene.traverseVisible(o => {
    if (o.isPointLight) list.push(o);
  });
  const ord = list.filter(l => l.castShadow).concat(list.filter(l => !l.castShadow));
  const A = SHU.uPLA.value;
  const Bv = SHU.uPLB.value;
  for (let i = 0; i < A.length; i++) {
    const l = ord[i];
    if (l && l.userData.la) {
      A[i].copy(l.userData.la);
      Bv[i].copy(l.userData.lb);
    } else {
      A[i].set(0, 0, 0, 0);
      Bv[i].set(0, 0, 0, 0);
    }
  }
}

function lampSkyCheck(st) {
  if (lampsOn(st) !== LAMP.lit) schedule3D();
}

function setLampMode(m) {
  LAMP.mode = has(LAMP_MODES, m) ? m : "auto";
  schedule3D();
  saveUI();
  syncSkyUI();
}

function toggleLamp(pk) {
  if (!pk || (pk.t !== "item" && pk.t !== "obj")) return false;
  const o = (pk.t === "item" ? S.items : S.objects).find(x => x.id === pk.id);
  if (!o || !lampDef(o)) return false;
  o.on = o.on === false;
  if (o.on && !LAMP.lit) setStatus("Лампа включена, но свет сейчас выключен общим выключателем");
  commit();
  save();
  updUndo();
  schedule3D();
  renderPanel();
  return true;
}
