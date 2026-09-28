"use strict";
const LS = "house-plan-v2";
const LS_UI = "house-plan-ui";
const TYPES = {
  "Спальня": "sleep",
  "Гардеробная": "sleep",
  "Гостиная": "day",
  "Столовая": "day",
  "Кухня": "day",
  "Санузел": "wet",
  "Котельная": "wet",
  "Кладовая": "wet",
  "Прихожая": "pass",
  "Коридор": "pass",
  "Другое": "other"
};
const DOOR_KINDS = {door: "Дверь", entry: "Входная дверь", open: "Проём без двери", arch: "Арка"};
const DOOR_OPS = {swing: "Распашная", double: "Распашная двустворчатая", slide: "Откатная вдоль стены", slide2: "Откатная, створки в стороны", pocket: "Пенал, уезжает в стену", fold: "Складная гармошка"};
const LEAFS = {panel: "Филёнчатая", flat: "Гладкая", glass: "Со стеклом", half: "Стекло сверху", full: "Цельное стекло"};
const WIN_OPS = {tiltturn: "Поворотно-откидное", turn: "Поворотное", tilt: "Откидное", slide: "Раздвижное", lift: "Подъёмно-сдвижное, как дверь", fixed: "Глухое"};
const OP_KINDS = {gate: "Ворота", door: "Дверь", win: "Окно"};
const OP_OPS = {gate: {sectional: "Секционные подъёмные", swing2: "Распашные", slide: "Откатные", roller: "Рулонные"}, door: {swing: "Распашная"}, win: {turn: "Поворотное", fixed: "Глухое"}};
const OP_SIDES = {f: "Спереди", b: "Сзади", l: "Слева", r: "Справа"};
const FILL = {sleep: "var(--f-sleep)", day: "var(--f-day)", wet: "var(--f-wet)", pass: "var(--f-pass)", other: "var(--f-other)"};
const INK = {sleep: "var(--t-sleep)", day: "var(--t-day)", wet: "var(--t-wet)", pass: "var(--t-pass)", other: "var(--t-other)"};
const LISTS = {room: "rooms", door: "doors", win: "windows", item: "items", obj: "objects"};
const UIP = {wheel: "auto", ptab: "props", cat: "all", recent: [], theme: "auto", side: window.innerWidth > 1000, pad2: "orbit", padk: 1, lt: ""};

const WEB = window.PLAN_WEB === true;
const $ = s => document.querySelector(s);
const svg = $("#cv");
const panel = $("#panel");
const has = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const uid = () => Math.random().toString(36).slice(2, 10);
const r2 = v => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const near = (a, b) => Math.abs(a - b) < 0.02;
const fm = v => String(r2(v)).replace(".", ",");
const fa = v => String(Math.round(v * 10) / 10).replace(".", ",");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]));
const along = it => (it.o === "h" ? it.x : it.y);
const across = it => (it.o === "h" ? it.y : it.x);
const normDeg = v => ((Math.round(v * 10) / 10) % 360 + 360) % 360;

function room(name, type, x, y, w, d, open) {
  return {id: uid(), name, type, x, y, w, d, open: !!open};
}

function door(x, y, o, w, side, hinge, kind) {
  const k = kind || "door";
  return {id: uid(), x, y, o, w, side, hinge, kind: k, op: "swing", leaf: k === "entry" ? "flat" : "panel", open: k === "entry" ? 0 : 0.75};
}

function win(x, y, o, w, sill, h) {
  return {id: uid(), x, y, o, w, sill: sill === undefined ? 0.8 : sill, h: h === undefined ? 1.4 : h, op: "tiltturn", n: 0, open: 0, how: "turn"};
}

function thing(kind, x, y, over) {
  const K = MODELS[kind] || MODELS.other;
  return Object.assign({id: uid(), kind, name: K.name, x, y, w: K.w, d: K.d, h: K.h, z: modelZ(K), rot: 0}, over || {});
}

function modelZ(K) {
  if (K.z === "ceil") return Math.max(0, r2(S.house.h - K.h));
  return typeof K.z === "number" ? K.z : 0;
}

function baseHouse(cx, cy) {
  return {cx, cy, rot: 0, wall: 0.4, inner: 0.12, h: 2.8, base: 0.5, doorH: 2.1, roof: "gable", pitch: 30, over: 0.5, ridge: "long", pitch2: 25, overG: 0.4, hipCut: 0.35, low: "b", gutters: true, chim: false, chx: 0, chy: 0, chh: 0.6, autoLights: true};
}

function plotDefault() {
  return {w: 28.3, d: 28.3, street: 5, side: 3, back: 3};
}

function siteDefault() {
  return {lat: 55.75, lon: 37.62, tz: 3, north: 0, city: "Москва"};
}

function presetExample() {
  const p = {
    v: 3,
    snap: 0.1,
    plot: plotDefault(),
    site: siteDefault(),
    house: baseHouse(14.15, 17.9),
    rooms: [
      room("Спальня 1", "Спальня", 0, 0, 3.6, 4),
      room("Спальня 2", "Спальня", 3.6, 0, 3.4, 4),
      room("Гардеробная", "Гардеробная", 7, 0, 2.4, 1.6),
      room("Санузел", "Санузел", 7, 1.6, 2.4, 2.4),
      room("Спальня 3", "Спальня", 9.4, 0, 3.6, 4),
      room("Коридор", "Коридор", 0, 4, 13, 1.2, true),
      room("Кабинет", "Другое", 0, 5.2, 3.6, 4.2),
      room("Туалет", "Санузел", 3.6, 5.2, 2.6, 1.6),
      room("Прихожая", "Прихожая", 3.6, 6.8, 2.6, 2.6, true),
      room("Кухня-гостиная", "Гостиная", 6.2, 5.2, 6.8, 4.2, true)
    ],
    doors: [
      door(4.9, 9.4, "h", 1, -1, 0, "entry"),
      door(1.8, 4, "h", 0.9, -1, 0),
      door(5.3, 4, "h", 0.9, -1, 1),
      door(8.2, 4, "h", 0.9, -1, 0),
      door(11.2, 4, "h", 0.9, -1, 0),
      door(9.4, 0.8, "v", 0.8, -1, 0),
      door(1.8, 5.2, "h", 0.9, 1, 0),
      door(4.9, 5.2, "h", 0.8, 1, 1)
    ],
    windows: [
      win(1.8, 0, "h", 1.5),
      win(5.3, 0, "h", 1.5),
      win(11.2, 0, "h", 1.5),
      win(0, 2, "v", 1.2),
      win(0, 7.3, "v", 1.2),
      win(13, 2, "v", 1.2),
      win(13, 7.3, "v", 1.5),
      win(1.8, 9.4, "h", 1.5),
      win(8.4, 9.4, "h", 3, 0, 2.4)
    ],
    items: [],
    objects: [
      thing("parking", 3, 22.5),
      thing("septic", 3, 1.8),
      thing("well", 24, 2.8)
    ]
  };
  const pan = p.windows[p.windows.length - 1];
  pan.op = "lift";
  pan.n = 2;
  return p;
}

function presetExampleFurnished() {
  const p = presetExample();
  const t = (kind, x, y, rot, over) => thing(kind, x, y, Object.assign({rot: rot || 0}, over || {}));
  p.items = [
    t("desk", 1.2, 8.78, 180),
    t("chair", 1.58, 8.2, 0),
    t("bed1", 2.06, 5.98, 90),
    t("bed2", 0.95, 0.02, 0),
    t("nightstand", 0.46, 0.05, 0),
    t("nightstand", 2.69, 0.05, 0),
    t("dresser", 2.38, 3.48, 180),
    t("bed1", 3.7, 0.02, 0),
    t("desk", 4.9, 0.02, 0),
    t("chair", 5.3, 0.65, 180),
    t("wardrobe", 5.78, 1.6, 90),
    t("closet", 7.2, 0.02, 0),
    t("bathtub", 7.1, 1.65, 0),
    t("basin", 8.83, 2.67, 90),
    t("toilet", 7.16, 2.86, 270),
    t("bed2", 10.3, 0.02, 0),
    t("nightstand", 9.83, 0.05, 0),
    t("nightstand", 12.02, 0.05, 0),
    t("dresser", 11.75, 3.48, 180),
    t("toilet", 5.6, 6.1, 180),
    t("basin", 5.65, 5.37, 90),
    t("hanger", 3.22, 7.4, 270),
    t("kitchen", 9.98, 8.78, 180),
    t("fridge", 12.36, 5.28, 90),
    t("island", 10.8, 6.9, 0),
    t("dining", 6.6, 5.6, 0),
    t("plant", 6.3, 8.8, 0),
    t("person", 8, 8, 200)
  ];
  p.objects.push(
    thing("tree", 18, 3),
    thing("pine", 8, 2),
    thing("bush", 25, 12),
    thing("bush", 25, 14.2),
    thing("path", 14.55, 24.1, {d: 4.2}),
    thing("bench", 21.5, 10, {rot: 0})
  );
  return p;
}

function presetBlank(P, site) {
  const plot = P || plotDefault();
  const zd = plot.d - plot.street - plot.back;
  return {
    v: 3,
    snap: 0.1,
    plot,
    site: site || siteDefault(),
    house: baseHouse(r2(plot.w / 2), r2(plot.back + Math.max(zd, 0) / 2)),
    rooms: [],
    doors: [],
    windows: [],
    items: [],
    objects: []
  };
}

function presetEmpty() {
  return {
    v: 3,
    snap: 0.1,
    plot: plotDefault(),
    site: siteDefault(),
    house: baseHouse(14.15, 13),
    rooms: [room("Комната", "Другое", 0, 0, 8, 6)],
    doors: [],
    windows: [],
    items: [],
    objects: []
  };
}

const PRESETS = WEB ? {empty: ["Участок с одной комнатой", presetEmpty]} : {
  example: ["Пример дома 122 м²", presetExample],
  furnished: ["Пример дома с мебелью", presetExampleFurnished],
  empty: ["Участок с одной комнатой", presetEmpty]
};
let PRESET_START = "example";

let S = presetBlank();
let tab = "plot";
let view = "split";
let sel = null;
let tool = null;
let gmode = "move";
let drag = null;
let frozen = null;
let k = 20;
let hist = [];
let redoStack = [];
let lastJSON = "";
let saveTimer = 0;
let loadArm = 0;

const grp = r => (has(TYPES, r.type) ? TYPES[r.type] : "other");
const snapv = v => r2(Math.round(v / S.snap) * S.snap);

function ext() {
  if (!S.rooms.length) return null;
  let a = Infinity;
  let b = Infinity;
  let c = -Infinity;
  let d = -Infinity;
  for (const r of S.rooms) {
    a = Math.min(a, r.x);
    b = Math.min(b, r.y);
    c = Math.max(c, r.x + r.w);
    d = Math.max(d, r.y + r.d);
  }
  return {minX: r2(a), minY: r2(b), maxX: r2(c), maxY: r2(d)};
}

function footprint() {
  const e = ext();
  if (!e) return null;
  const wl = S.house.wall;
  const W = r2(e.maxX - e.minX);
  const D = r2(e.maxY - e.minY);
  let ow = r2(W + 2 * wl);
  let od = r2(D + 2 * wl);
  if (S.house.rot % 180) [ow, od] = [od, ow];
  return {x: r2(S.house.cx - ow / 2), y: r2(S.house.cy - od / 2), w: ow, d: od, W, D, e};
}

function zone() {
  const P = S.plot;
  return {x: P.side, y: P.back, w: r2(P.w - 2 * P.side), d: r2(P.d - P.street - P.back)};
}

function thingBox(o) {
  const a = (o.rot || 0) * Math.PI / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const W = o.w * c + o.d * s;
  const D = o.w * s + o.d * c;
  const cx = o.x + o.w / 2;
  const cy = o.y + o.d / 2;
  return {x: cx - W / 2, y: cy - D / 2, w: W, d: D};
}

function normalize() {
  const e = ext();
  if (!e || (Math.abs(e.minX) < 0.001 && Math.abs(e.minY) < 0.001)) return;
  for (const a of S.rooms.concat(S.doors, S.windows, S.items)) {
    a.x = r2(a.x - e.minX);
    a.y = r2(a.y - e.minY);
  }
}

function roomAt(px, py) {
  for (const r of S.rooms) {
    if (px > r.x + 1e-6 && px < r.x + r.w - 1e-6 && py > r.y + 1e-6 && py < r.y + r.d - 1e-6) return r;
  }
  return null;
}

function pairKey(a, b) {
  return a < b ? a + "|" + b : b + "|" + a;
}

function noWallSet() {
  return new Set((S.nowall || []).map(p => pairKey(p[0], p[1])));
}

function sharedEdge(A, B) {
  if (near(A.x + A.w, B.x) || near(B.x + B.w, A.x)) {
    const c = near(A.x + A.w, B.x) ? B.x : A.x;
    const a = Math.max(A.y, B.y);
    const b = Math.min(A.y + A.d, B.y + B.d);
    if (b - a > 0.05) return {o: "v", c: r2(c), a: r2(a), b: r2(b)};
  }
  if (near(A.y + A.d, B.y) || near(B.y + B.d, A.y)) {
    const c = near(A.y + A.d, B.y) ? B.y : A.y;
    const a = Math.max(A.x, B.x);
    const b = Math.min(A.x + A.w, B.x + B.w);
    if (b - a > 0.05) return {o: "h", c: r2(c), a: r2(a), b: r2(b)};
  }
  return null;
}

function neighbors(r) {
  const out = [];
  for (const q of S.rooms) {
    if (q === r) continue;
    const e = sharedEdge(r, q);
    if (e) out.push({r: q, e});
  }
  return out;
}

function wallGone(A, B) {
  return (A.open && B.open) || noWallSet().has(pairKey(A.id, B.id));
}

function setNoWall(A, B, off) {
  const key = pairKey(A.id, B.id);
  S.nowall = (S.nowall || []).filter(p => pairKey(p[0], p[1]) !== key);
  if (off) {
    S.nowall.push([A.id, B.id]);
    const sh = sharedEdge(A, B);
    if (sh) S.doors = S.doors.filter(d => !(d.o === sh.o && near(across(d), sh.c) && along(d) > sh.a - 0.01 && along(d) < sh.b + 0.01));
  }
  if (!S.nowall.length) delete S.nowall;
}

function wallPairAt(p, maxDist) {
  const ws = wallSegs();
  const e = ext();
  if (!e) return null;
  let best = null;
  for (const L of ws.walls.concat(ws.soft, extSides(e))) {
    const al = L.o === "h" ? p.x : p.y;
    const ac = L.o === "h" ? p.y : p.x;
    const pos = clamp(al, L.a + 0.02, L.b - 0.02);
    const d = Math.hypot(al - pos, ac - L.c);
    if (!best || d < best.d) best = {L, pos, d};
  }
  if (!best || best.d > (maxDist || 0.6)) return null;
  const {L, pos} = best;
  const A = L.o === "h" ? roomAt(pos, L.c - 0.05) : roomAt(L.c - 0.05, pos);
  const B = L.o === "h" ? roomAt(pos, L.c + 0.05) : roomAt(L.c + 0.05, pos);
  if (!A || !B || A === B) return {L, ext: true};
  return {L, A, B, e: sharedEdge(A, B)};
}

function toggleWallAt(p, maxDist) {
  const h = wallPairAt(p, maxDist);
  if (!h) {
    setStatus("Здесь нет стены, кликни ближе к стене");
    return false;
  }
  if (h.ext) {
    setStatus("Наружную стену убрать нельзя, можно поставить в ней проём");
    return false;
  }
  if (h.A.open && h.B.open) {
    setStatus("Между двумя открытыми зонами стены и так нет. Сними галочку «Открытая зона» у одной из комнат");
    return false;
  }
  const off = !noWallSet().has(pairKey(h.A.id, h.B.id));
  setNoWall(h.A, h.B, off);
  setStatus(off ? `Стены между «${h.A.name}» и «${h.B.name}» больше нет` : `Стена между «${h.A.name}» и «${h.B.name}» вернулась`);
  changed();
  return true;
}

function openingSpan(it) {
  const al = along(it);
  const ac = across(it);
  const A = it.o === "h" ? roomAt(al, ac - 0.05) : roomAt(ac - 0.05, al);
  const B = it.o === "h" ? roomAt(al, ac + 0.05) : roomAt(ac + 0.05, al);
  if (A && B && A !== B) {
    const sh = sharedEdge(A, B);
    return sh ? {a: sh.a, b: sh.b} : null;
  }
  const r = A || B;
  if (!r) return null;
  return it.o === "h" ? {a: r.x, b: r.x + r.w} : {a: r.y, b: r.y + r.d};
}

function wallSegs() {
  const e = ext();
  const walls = [];
  const soft = [];
  if (!e) return {walls, soft};
  const NW = noWallSet();
  const xs = new Set();
  const ys = new Set();
  for (const r of S.rooms) {
    xs.add(r2(r.x));
    xs.add(r2(r.x + r.w));
    ys.add(r2(r.y));
    ys.add(r2(r.y + r.d));
  }
  const XS = [...xs].sort((a, b) => a - b);
  const YS = [...ys].sort((a, b) => a - b);
  const scan = (o, lines, cuts) => {
    const lo = o === "h" ? e.minY : e.minX;
    const hi = o === "h" ? e.maxY : e.maxX;
    for (const c of lines) {
      if (near(c, lo) || near(c, hi)) continue;
      let cw = null;
      let cs = null;
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i];
        const b = cuts[i + 1];
        const m = (a + b) / 2;
        const A = o === "h" ? roomAt(m, c - 0.01) : roomAt(c - 0.01, m);
        const B2 = o === "h" ? roomAt(m, c + 0.01) : roomAt(c + 0.01, m);
        const isSoft = !!(A && B2 && A !== B2 && ((A.open && B2.open) || NW.has(pairKey(A.id, B2.id))));
        const isWall = !!((A || B2) && A !== B2 && !isSoft);
        if (isWall) {
          if (cw && near(cw.b, a)) cw.b = b;
          else {
            cw = {o, c, a, b, ext: false};
            walls.push(cw);
          }
        } else {
          cw = null;
        }
        if (isSoft) {
          if (cs && near(cs.b, a)) cs.b = b;
          else {
            cs = {o, c, a, b};
            soft.push(cs);
          }
        } else {
          cs = null;
        }
      }
    }
  };
  scan("h", YS, XS);
  scan("v", XS, YS);
  return {walls, soft};
}

function extSides(e) {
  return [
    {o: "h", c: e.maxY, a: e.minX, b: e.maxX, out: 1, ext: true},
    {o: "h", c: e.minY, a: e.minX, b: e.maxX, out: -1, ext: true},
    {o: "v", c: e.minX, a: e.minY, b: e.maxY, out: -1, ext: true},
    {o: "v", c: e.maxX, a: e.minY, b: e.maxY, out: 1, ext: true}
  ];
}

function onLine(it, L) {
  return it.o === L.o && near(across(it), L.c) && along(it) - it.w / 2 >= L.a - 0.02 && along(it) + it.w / 2 <= L.b + 0.02;
}

function lineOf(it, ws, sides, winOnly) {
  const s = sides.find(L => onLine(it, L));
  if (s || winOnly) return s || null;
  return ws.walls.find(L => onLine(it, L)) || null;
}

function span(L, across0) {
  const wl = S.house.wall;
  const t = S.house.inner;
  if (!L) return [across0 - t / 2, across0 + t / 2];
  if (L.ext) return L.out > 0 ? [L.c, L.c + wl] : [L.c - wl, L.c];
  return [L.c - t / 2, L.c + t / 2];
}

function cut(a, b, holes) {
  const hs = holes.map(h => [Math.max(a, h[0]), Math.min(b, h[1])]).filter(h => h[1] - h[0] > 0.001).sort((x, y) => x[0] - y[0]);
  const out = [];
  let cur = a;
  for (const [h0, h1] of hs) {
    if (h0 > cur + 0.001) out.push([cur, h0]);
    cur = Math.max(cur, h1);
  }
  if (b > cur + 0.001) out.push([cur, b]);
  return out;
}

function doorGeo(dr, L) {
  const sp = span(L, across(dr));
  const face = dr.side > 0 ? sp[1] : sp[0];
  const p0 = along(dr) - dr.w / 2;
  const p1 = along(dr) + dr.w / 2;
  const hA = dr.hinge ? p1 : p0;
  const jA = dr.hinge ? p0 : p1;
  const P = (al, ac) => (dr.o === "h" ? {x: al, y: ac} : {x: ac, y: al});
  return {
    H: P(hA, face),
    J: P(jA, face),
    leaf: P(hA, face + dr.side * dr.w),
    u: P(Math.sign(jA - hA), 0),
    n: P(0, dr.side),
    sp,
    p0,
    p1
  };
}

function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const d = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
  return w > 0 && d > 0 ? w * d : 0;
}

function hit(a, b) {
  return a.x < b.x + b.w - 0.001 && b.x < a.x + a.w - 0.001 && a.y < b.y + b.d - 0.001 && b.y < a.y + a.d - 0.001;
}

function distRect(a, b) {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.d), a.y - (b.y + b.d));
  return Math.hypot(dx, dy);
}

function unionArea(rs) {
  const xs = [...new Set(rs.flatMap(r => [r2(r.x), r2(r.x + r.w)]))].sort((a, b) => a - b);
  const ys = [...new Set(rs.flatMap(r => [r2(r.y), r2(r.y + r.d)]))].sort((a, b) => a - b);
  let s = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const mx = (xs[i] + xs[i + 1]) / 2;
      const my = (ys[j] + ys[j + 1]) / 2;
      if (rs.some(r => mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.d)) s += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
    }
  }
  return s;
}

function attachedTo(r) {
  const out = [];
  for (const d of S.doors) {
    if (d.o === "h") {
      const inX = d.x > r.x - 0.01 && d.x < r.x + r.w + 0.01;
      if (inX && ((near(d.y, r.y) && d.side === 1) || (near(d.y, r.y + r.d) && d.side === -1))) out.push(d);
    } else {
      const inY = d.y > r.y - 0.01 && d.y < r.y + r.d + 0.01;
      if (inY && ((near(d.x, r.x) && d.side === 1) || (near(d.x, r.x + r.w) && d.side === -1))) out.push(d);
    }
  }
  for (const w of S.windows) {
    const ok = w.o === "h"
      ? w.x > r.x - 0.01 && w.x < r.x + r.w + 0.01 && (near(w.y, r.y) || near(w.y, r.y + r.d))
      : w.y > r.y - 0.01 && w.y < r.y + r.d + 0.01 && (near(w.x, r.x) || near(w.x, r.x + r.w));
    if (ok) out.push(w);
  }
  return out;
}

function itemsIn(r) {
  return S.items.filter(it => {
    const cx = it.x + it.w / 2;
    const cy = it.y + it.d / 2;
    return cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.d;
  });
}

function roomHasDoor(r) {
  return S.doors.some(d => (d.o === "h"
    ? d.x > r.x && d.x < r.x + r.w && (near(d.y, r.y) || near(d.y, r.y + r.d))
    : d.y > r.y && d.y < r.y + r.d && (near(d.x, r.x) || near(d.x, r.x + r.w))));
}

function doorLabel(dr) {
  if (dr.kind === "entry") return "Входная дверь";
  const a = along(dr);
  const c = across(dr);
  const at = s => (dr.o === "h" ? roomAt(a, c + s * 0.3) : roomAt(c + s * 0.3, a));
  const nm = r => (r ? r.name : "улица");
  const pre = dr.kind === "open" ? "Проём " : dr.kind === "arch" ? "Арка " : "Дверь ";
  return pre + nm(at(-dr.side)) + " → " + nm(at(dr.side));
}

function winLabel(wn) {
  const e = ext();
  if (!e) return "Окно";
  const L = extSides(e).find(s => onLine(wn, s));
  const a = along(wn);
  const c = across(wn) - (L ? L.out : 1) * 0.3;
  const r = wn.o === "h" ? roomAt(a, c) : roomAt(c, a);
  return "Окно" + (r ? ", " + r.name : "");
}

function listOf(t) {
  return LISTS[t] ? S[LISTS[t]] : null;
}

function selItem() {
  if (!sel) return null;
  const list = listOf(sel.t);
  if (!list) return null;
  return list.find(x => x.id === sel.id) || null;
}

function magnetRoom(r, mode) {
  const TH = 0.25;
  const others = S.rooms.filter(o => o.id !== r.id);
  const out = {x: r.x, y: r.y, w: r.w, d: r.d};
  const close = (a0, a1, b0, b1) => a0 < b1 + 0.6 && b0 < a1 + 0.6;
  const shift = (vals, cands) => {
    let best = null;
    for (const v of vals) {
      for (const c of cands) {
        const d = c - v;
        if (Math.abs(d) > 0.0005 && Math.abs(d) < TH && (best === null || Math.abs(d) < Math.abs(best))) best = d;
        if (Math.abs(d) <= 0.0005) return 0;
      }
    }
    return best;
  };
  const xs = others.filter(o => close(r.y, r.y + r.d, o.y, o.y + o.d)).flatMap(o => [o.x, o.x + o.w]);
  const ys = others.filter(o => close(r.x, r.x + r.w, o.x, o.x + o.w)).flatMap(o => [o.y, o.y + o.d]);
  if (mode === "move") {
    const dx = shift([r.x, r.x + r.w], xs);
    if (dx) out.x = r2(r.x + dx);
    const dy = shift([r.y, r.y + r.d], ys);
    if (dy) out.y = r2(r.y + dy);
    return out;
  }
  const E = mode.indexOf("x") >= 0 ? (mode[0] === "+" ? "e" : "w") : mode.indexOf("z") >= 0 ? (mode[0] === "+" ? "s" : "n") : mode;
  if (E.indexOf("e") >= 0) {
    const d = shift([r.x + r.w], xs);
    if (d) out.w = r2(r.w + d);
  }
  if (E.indexOf("w") >= 0) {
    const d = shift([r.x], xs);
    if (d) {
      out.x = r2(r.x + d);
      out.w = r2(out.w - d);
    }
  }
  if (E.indexOf("s") >= 0) {
    const d = shift([r.y + r.d], ys);
    if (d) out.d = r2(r.d + d);
  }
  if (E.indexOf("n") >= 0) {
    const d = shift([r.y], ys);
    if (d) {
      out.y = r2(r.y + d);
      out.d = r2(out.d - d);
    }
  }
  return out;
}

function nearestWall(p, w, isWin) {
  const e = ext();
  if (!e) return null;
  const sides = extSides(e);
  const lines = isWin ? sides : wallSegs().walls.concat(sides);
  let best = null;
  for (const L of lines) {
    if (L.b - L.a < w + 0.02) continue;
    const al = L.o === "h" ? p.x : p.y;
    const ac = L.o === "h" ? p.y : p.x;
    const pos = clamp(snapv(al), L.a + w / 2, L.b - w / 2);
    const dist = Math.hypot(al - pos, ac - L.c);
    if (!best || dist < best.dist) best = {L, pos, dist};
  }
  return best;
}

function snapToWall(it, p, isWin) {
  const e = ext();
  if (!e) return;
  const pl = isWin ? null : lineOf(it, wallSegs(), extSides(e), false);
  const inward = pl && pl.ext ? it.side === -pl.out : true;
  const best = nearestWall(p, it.w, isWin);
  if (!best) return;
  const {L, pos} = best;
  it.o = L.o;
  if (L.o === "h") {
    it.x = r2(pos);
    it.y = L.c;
  } else {
    it.x = L.c;
    it.y = r2(pos);
  }
  if (!isWin && L.ext && it.kind !== "open" && it.kind !== "arch") it.side = inward ? -L.out : L.out;
}

function openingAt(kind, p, maxDist) {
  const isWin = kind === "win";
  const w = isWin ? 1.5 : kind === "open" ? 1 : kind === "arch" ? 1.2 : 0.9;
  const best = nearestWall(p, w, isWin);
  if (!best || best.dist > (maxDist || 1.5)) return null;
  const L = best.L;
  const x = L.o === "h" ? best.pos : L.c;
  const y = L.o === "h" ? L.c : best.pos;
  if (isWin) return win(x, y, L.o, w);
  let side;
  if (L.ext) side = -L.out;
  else side = (L.o === "h" ? p.y : p.x) >= L.c ? 1 : -1;
  return door(x, y, L.o, w, side, 0, kind);
}

function rotAround(a, cx, cy) {
  const nx = cx - (a.y - cy);
  const ny = cy + (a.x - cx);
  a.x = r2(nx);
  a.y = r2(ny);
  if (a.o === "h") {
    a.o = "v";
    if (a.side !== undefined) a.side = -a.side;
  } else {
    a.o = "h";
    if (a.hinge !== undefined) a.hinge = 1 - a.hinge;
  }
}

function rotItemAround(it, cx, cy) {
  const icx = it.x + it.w / 2;
  const icy = it.y + it.d / 2;
  const nx = cx - (icy - cy);
  const ny = cy + (icx - cx);
  it.x = r2(nx - it.w / 2);
  it.y = r2(ny - it.d / 2);
  it.rot = normDeg((it.rot || 0) + 90);
}

function rotateSel() {
  if (!sel) return false;
  if (sel.t === "house") {
    S.house.rot = (S.house.rot + 90) % 360;
    return true;
  }
  const it = selItem();
  if (!it) return false;
  if (sel.t === "room") {
    const cx = it.x + it.w / 2;
    const cy = it.y + it.d / 2;
    const att = attachedTo(it);
    const inside = itemsIn(it);
    [it.w, it.d] = [it.d, it.w];
    it.x = r2(cx - it.w / 2);
    it.y = r2(cy - it.d / 2);
    for (const a of att) rotAround(a, cx, cy);
    for (const a of inside) rotItemAround(a, cx, cy);
    return true;
  }
  if (sel.t === "obj" || sel.t === "item") {
    it.rot = normDeg((it.rot || 0) + 90);
    return true;
  }
  if (sel.t === "door") {
    const states = [[0, 1], [1, 1], [1, -1], [0, -1]];
    const i = states.findIndex(s => s[0] === it.hinge && s[1] === it.side);
    const nx = states[(i + 1) % 4];
    it.hinge = nx[0];
    it.side = nx[1];
    return true;
  }
  return false;
}

function delSel() {
  if (!sel) return;
  if (sel.t === "room") {
    const r = selItem();
    if (r) {
      const att = new Set(attachedTo(r));
      const inside = new Set(itemsIn(r));
      S.doors = S.doors.filter(d => !att.has(d));
      S.windows = S.windows.filter(w => !att.has(w));
      S.items = S.items.filter(i => !inside.has(i));
    }
    S.rooms = S.rooms.filter(x => x.id !== sel.id);
  }
  if (sel.t === "obj") S.objects = S.objects.filter(o => o.id !== sel.id);
  if (sel.t === "item") S.items = S.items.filter(o => o.id !== sel.id);
  if (sel.t === "door") S.doors = S.doors.filter(o => o.id !== sel.id);
  if (sel.t === "win") S.windows = S.windows.filter(o => o.id !== sel.id);
  sel = null;
}

function dupSel() {
  const it = selItem();
  if (!it) return false;
  const c = Object.assign({}, it, {id: uid()});
  if (sel.t === "room" || sel.t === "obj" || sel.t === "item") {
    const b = sel.t === "room" ? it : thingBox(it);
    c.x = r2(it.x + b.w + (sel.t === "room" ? 0 : 0.2));
  } else if (it.o === "h") c.x = r2(it.x + it.w + 0.3);
  else c.y = r2(it.y + it.w + 0.3);
  listOf(sel.t).push(c);
  sel = {t: sel.t, id: c.id};
  return true;
}

function addOpening(kind) {
  const e = ext();
  if (!e) return null;
  const sides = extSides(e);
  const w = kind === "win" ? 1.5 : kind === "open" ? 1 : kind === "arch" ? 1.2 : 0.9;
  let lines = kind === "win" ? sides : wallSegs().walls.concat(sides);
  const r = sel && sel.t === "room" ? selItem() : null;
  if (r) {
    lines = lines.filter(L => (L.o === "h"
      ? (near(L.c, r.y) || near(L.c, r.y + r.d)) && L.a < r.x + r.w && L.b > r.x
      : (near(L.c, r.x) || near(L.c, r.x + r.w)) && L.a < r.y + r.d && L.b > r.y));
  }
  const taken = S.doors.concat(S.windows);
  for (const L of lines) {
    let lo = L.a;
    let hi = L.b;
    if (r) {
      lo = Math.max(lo, L.o === "h" ? r.x : r.y);
      hi = Math.min(hi, L.o === "h" ? r.x + r.w : r.y + r.d);
    }
    if (hi - lo < w + 0.1) continue;
    const mid = (lo + hi) / 2;
    const cands = [];
    for (let q = lo + w / 2 + 0.05; q <= hi - w / 2 - 0.05 + 1e-9; q += 0.1) cands.push(r2(q));
    cands.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    const pos = cands.find(q => !taken.some(t => t.o === L.o && near(across(t), L.c) && Math.abs(along(t) - q) < (t.w + w) / 2 + 0.1));
    if (pos === undefined) continue;
    const x = L.o === "h" ? pos : L.c;
    const y = L.o === "h" ? L.c : pos;
    if (kind === "win") return win(x, y, L.o, w);
    let side = 1;
    if (L.ext) side = -L.out;
    else if (r) side = L.o === "h" ? (r.y + r.d / 2 > L.c ? 1 : -1) : (r.x + r.w / 2 > L.c ? 1 : -1);
    return door(x, y, L.o, w, side, 0, kind === "win" ? "door" : kind);
  }
  return null;
}

function moveSel(mx, my, step) {
  if (sel.t === "house") {
    S.house.cx = r2(S.house.cx + mx * step);
    S.house.cy = r2(S.house.cy + my * step);
    return true;
  }
  const it = selItem();
  if (!it) return false;
  if (sel.t === "door" || sel.t === "win") {
    if (it.o === "h" && mx) it.x = r2(it.x + mx * step);
    else if (it.o === "v" && my) it.y = r2(it.y + my * step);
    else return false;
    return true;
  }
  if (sel.t === "room") {
    const old = Object.assign({}, it);
    const moving = attachedTo(old).concat(itemsIn(old));
    for (const a of moving) {
      a.x = r2(a.x + mx * step);
      a.y = r2(a.y + my * step);
    }
  }
  it.x = r2(it.x + mx * step);
  it.y = r2(it.y + my * step);
  return true;
}

function placeOpening(it, keep) {
  if ("kind" in it) S.doors.push(it);
  else S.windows.push(it);
  sel = {t: "kind" in it ? "door" : "win", id: it.id};
  tab = "house";
  if (!keep) setTool(null);
  changed();
}

function placeRoom(r, keep, free) {
  const type = tool && tool.type && has(TYPES, tool.type) ? tool.type : "Другое";
  const m2 = free ? r : magnetRoom({id: "", x: r.x, y: r.y, w: r.w, d: r.d}, "nsew");
  const rm = room(type === "Другое" ? "Комната" : type, type, r2(m2.x), r2(m2.y), r2(m2.w), r2(m2.d));
  S.rooms.push(rm);
  sel = {t: "room", id: rm.id};
  tab = "house";
  if (!keep) setTool(null);
  changed();
}

function dropThing(kind, wx, wz, inHouse, keep) {
  const K = MODELS[kind] || MODELS.other;
  if (inHouse && ext()) {
    const hp = worldToHouse(wx, wz);
    const it = thing(kind, snapv(hp.x - K.w / 2), snapv(hp.y - K.d / 2));
    S.items.push(it);
    sel = {t: "item", id: it.id};
    tab = "house";
  } else {
    const o = thing(kind, snapv(wx - K.w / 2), snapv(wz - K.d / 2));
    S.objects.push(o);
    sel = {t: "obj", id: o.id};
    tab = "plot";
  }
  if (!keep) setTool(null);
  changed();
}

function plotStats() {
  const P = S.plot;
  const A = P.w * P.d;
  const rows = [["Участок", `${fm(P.w)} × ${fm(P.d)} м`], ["Площадь", `${fa(A)} м², ${fa(A / 100)} сот.`]];
  const f = footprint();
  if (f) {
    const bld = S.objects.filter(o => modelOf(o).b).reduce((s, o) => s + o.w * o.d, 0);
    rows.push(["Пятно дома", `${fm(f.w)} × ${fm(f.d)} м`]);
    rows.push(["Застройка (дом, баня, гараж, сарай)", `${fa((f.w * f.d + bld) / A * 100)} %`]);
    rows.push(["Дом до красной линии", fm(P.d - f.y - f.d) + " м"]);
    rows.push(["Дом до левой границы", fm(f.x) + " м"]);
    rows.push(["Дом до правой границы", fm(P.w - f.x - f.w) + " м"]);
    rows.push(["Дом до задней границы", fm(f.y) + " м"]);
    const it = sel && sel.t === "obj" ? selItem() : null;
    if (it) rows.push([it.name + " до дома", fm(distRect(thingBox(it), f)) + " м"]);
  }
  rows.push(["Объектов на участке", String(S.objects.length)]);
  return rows;
}

function houseStats() {
  const e = ext();
  if (!e) return [];
  const Hs = S.house;
  const W = e.maxX - e.minX;
  const D = e.maxY - e.minY;
  const Wo = W + 2 * Hs.wall;
  const Do = D + 2 * Hs.wall;
  const sum = S.rooms.reduce((s, r) => s + r.w * r.d, 0);
  const un = Math.max(0, W * D - unionArea(S.rooms));
  const rc = roofCalc();
  const rise = rc ? (rc.type === "flat" ? rc.top : rc.ridgeY) : 0;
  return [
    ["Площадь комнат", fa(sum) + " м²"],
    ["Внутри по стенам", `${fm(W)} × ${fm(D)} м`],
    ["Не занято комнатами", fa(un) + " м²"],
    ["Снаружи со стенами", `${fm(Wo)} × ${fm(Do)} м`],
    ["Пятно застройки", fa(Wo * Do) + " м²"],
    ["Дверей и проёмов", String(S.doors.length)],
    ["Окон", String(S.windows.length)],
    ["Мебели и техники", String(S.items.length)],
    ["Конёк от земли", "≈ " + fm(Hs.base + Hs.h + rise) + " м"]
  ];
}

function warnings(which) {
  const out = [];
  const w0 = which || tab;
  if (w0 === "plot") {
    const P = S.plot;
    const z = zone();
    const f = footprint();
    if (z.w <= 0 || z.d <= 0) {
      out.push("Отступы больше самого участка, дому негде встать");
    } else if (f) {
      const over = [[f.y + f.d - z.y - z.d, "от улицы"], [z.y - f.y, "сзади"], [z.x - f.x, "слева"], [f.x + f.w - z.x - z.w, "справа"]];
      for (const [v, s] of over) if (v > 0.005) out.push(`Дом заходит в отступ ${s} на ${fm(v)} м`);
    }
    const blds = S.objects.filter(o => modelOf(o).cat === "build");
    for (const o of S.objects) {
      const b = thingBox(o);
      if (b.x < -0.001 || b.y < -0.001 || b.x + b.w > P.w + 0.001 || b.y + b.d > P.d + 0.001) out.push(`${o.name} выходит за границу участка`);
    }
    for (const o of blds) if (f && hit(thingBox(o), f)) out.push(`${o.name} стоит на доме`);
    for (let i = 0; i < blds.length; i++) {
      for (let j = i + 1; j < blds.length; j++) {
        if (hit(thingBox(blds[i]), thingBox(blds[j]))) out.push(`${blds[i].name} и ${blds[j].name} пересекаются`);
      }
    }
    return out;
  }
  const rs = S.rooms;
  for (let i = 0; i < rs.length; i++) {
    for (let j = i + 1; j < rs.length; j++) {
      const a = overlapArea(rs[i], rs[j]);
      if (a > 0.001) out.push(`${rs[i].name} и ${rs[j].name} пересекаются на ${fm(a)} м²`);
      else {
        const gap = wallGap(rs[i], rs[j]);
        if (gap) out.push(`Стены «${rs[i].name}» и «${rs[j].name}» почти совпадают, между ними ${Math.round(gap * 100)} см. Сдвинь комнату вплотную`);
      }
    }
  }
  const e = ext();
  if (!e) return out;
  const un = (e.maxX - e.minX) * (e.maxY - e.minY) - unionArea(rs);
  if (un > 0.05) out.push(`Внутри дома ${fa(un)} м² не заняты комнатами, на плане это штриховка`);
  const ws = wallSegs();
  const sides = extSides(e);
  for (const d of S.doors) if (!lineOf(d, ws, sides, false)) out.push(`${doorLabel(d)} не стоит на стене`);
  for (const w of S.windows) if (!lineOf(w, ws, sides, true)) out.push(`${winLabel(w)} не стоит на наружной стене`);
  for (const r of rs) if (!r.open && !roomHasDoor(r)) out.push(`В «${r.name}» нет двери`);
  if (!S.doors.some(d => d.kind === "entry")) out.push("Нет входной двери");
  return out;
}

function wallGap(a, b) {
  const lim = Math.max(0.2, S.house.inner + 0.05);
  const ov = (p0, p1, q0, q1) => Math.min(p1, q1) - Math.max(p0, q0) > 0.3;
  let best = 0;
  if (ov(a.y, a.y + a.d, b.y, b.y + b.d)) {
    for (const g of [b.x - (a.x + a.w), a.x - (b.x + b.w)]) if (g > 0.005 && g < lim) best = best || g;
  }
  if (ov(a.x, a.x + a.w, b.x, b.x + b.w)) {
    for (const g of [b.y - (a.y + a.d), a.y - (b.y + b.d)]) if (g > 0.005 && g < lim) best = best || g;
  }
  return best;
}

function setStatus(s) {
  $("#st").textContent = s;
}

function hhmm() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function save() {
  clearTimeout(saveTimer);
  setStatus("Сохраняю…");
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({plan: S, at: Date.now()}));
      setStatus("Сохранено в браузере, " + hhmm());
    } catch (err) {
      setStatus("Браузер не дал сохранить, сохрани в файл");
    }
  }, 350);
}

function saveUI() {
  try {
    localStorage.setItem(LS_UI, JSON.stringify({view, mode: V.mode, labels: V.labels, fence: V.fence, sunbar: V.sunbar, cut: V.cut, wheel: UIP.wheel, ptab: UIP.ptab, gmode, recent: UIP.recent, q: RF.q, sky: {m: SKY.m, d: SKY.d, t: Math.round(SKY.t), weather: SKY.weather, path: SKY.path, speed: SKY.speed}, lights: LAMP.mode, theme: UIP.theme, side: UIP.side, pad2: UIP.pad2, padk: UIP.padk, lt: UIP.lt, wx: {snow: r2(WX.snow), wet: r2(WX.wet), pud: r2(WX.pud), wind: WX.wind, dir: WX.windDir}}));
  } catch (err) {
    return;
  }
}

function commit() {
  const cur = JSON.stringify(S);
  if (cur === lastJSON) return;
  hist.push(lastJSON);
  if (hist.length > 150) hist.shift();
  redoStack = [];
  lastJSON = cur;
}

function changed() {
  normalize();
  commit();
  save();
  renderAll();
}

function undo() {
  if (!hist.length) return;
  redoStack.push(JSON.stringify(S));
  S = JSON.parse(hist.pop());
  lastJSON = JSON.stringify(S);
  sel = null;
  save();
  renderAll();
}

function redo() {
  if (!redoStack.length) return;
  hist.push(JSON.stringify(S));
  S = JSON.parse(redoStack.pop());
  lastJSON = JSON.stringify(S);
  sel = null;
  save();
  renderAll();
}

function sanitize(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.rooms) || !d.plot || !d.house) return null;
  const n = (v, def) => (typeof v === "number" && isFinite(v) ? v : def);
  const sid = v => String(v || uid()).slice(0, 24);
  const arr = a => (Array.isArray(a) ? a.filter(x => x && typeof x === "object").slice(0, 500) : []);
  const H0 = baseHouse(14.15, 14);
  const P0 = plotDefault();
  const D0 = siteDefault();
  const ds = d.site && typeof d.site === "object" ? d.site : {};
  const rots = [0, 90, 180, 270];
  const v3 = d.v === 3;
  const mats = v => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const out = {};
    let cnt = 0;
    for (const [key, sp] of Object.entries(v)) {
      if (cnt >= 40 || !/^[a-z0-9_]{1,24}$/.test(key) || !sp || typeof sp !== "object") continue;
      const e = {};
      if (typeof sp.m === "string" && has(MDEF, sp.m) && MDEF[sp.m].n) e.m = sp.m;
      if (typeof sp.c === "string" && /^#[0-9a-fA-F]{6}$/.test(sp.c)) e.c = sp.c.toLowerCase();
      if (e.m || e.c) {
        out[key] = e;
        cnt++;
      }
    }
    return cnt ? out : null;
  };
  const wm = (o, src) => {
    const x = mats(src && src.mats);
    if (x) o.mats = x;
    return o;
  };
  const opens = a => arr(a).slice(0, 12).map(x => {
    const kind = has(OP_KINDS, x.kind) ? x.kind : "door";
    const ops = OP_OPS[kind];
    return {
      id: sid(x.id),
      kind,
      side: has(OP_SIDES, x.side) ? x.side : "f",
      c: clamp(n(x.c, 0), -50, 50),
      w: clamp(n(x.w, kind === "gate" ? 3 : kind === "win" ? 0.8 : 0.9), 0.3, 20),
      h: clamp(n(x.h, kind === "gate" ? 2.3 : kind === "win" ? 0.8 : 1.9), 0.3, 10),
      sill: clamp(n(x.sill, kind === "win" ? 1 : 0), 0, 5),
      op: has(ops, x.op) ? x.op : Object.keys(ops)[0],
      open: clamp(n(x.open, 0), 0, 1),
      hinge: x.hinge === 1 ? 1 : 0
    };
  });
  const things = a => arr(a).map(o => {
    const kind = has(MODELS, o.kind) ? o.kind : "other";
    const K = MODELS[kind];
    let w = clamp(n(o.w, K.w), 0.05, 100);
    let dd = clamp(n(o.d, K.d), 0.05, 100);
    let x = n(o.x, 0);
    let y = n(o.y, 0);
    let rot = n(o.rot, 0);
    if (!v3 && (rot === 90 || rot === 270)) {
      const cx = x + w / 2;
      const cy = y + dd / 2;
      [w, dd] = [dd, w];
      x = r2(cx - w / 2);
      y = r2(cy - dd / 2);
    }
    const res = wm({
      id: sid(o.id),
      kind,
      name: String(o.name || K.name).slice(0, 40),
      x,
      y,
      w,
      d: dd,
      h: clamp(n(o.h, K.h), 0.01, 20),
      z: clamp(n(o.z, typeof K.z === "number" ? K.z : 0), 0, 20),
      rot: normDeg(rot)
    }, o);
    if (K.ops && Array.isArray(o.opens)) res.opens = opens(o.opens);
    if (K.fs && typeof o.fs === "string" && has(FENCES, o.fs)) res.fs = o.fs;
    if (K.gate && typeof o.open === "number" && isFinite(o.open)) res.open = clamp(o.open, 0, 1);
    if (K.lamp) {
      if (o.on === false) res.on = false;
      if (typeof o.k === "number" && isFinite(o.k)) res.k = clamp(Math.round(o.k / 100) * 100, 1800, 7000);
      if (typeof o.lm === "number" && isFinite(o.lm)) res.lm = clamp(Math.round(o.lm), 20, 20000);
    }
    return res;
  });
  const out = {
    v: 3,
    snap: [0.05, 0.1, 0.5].includes(d.snap) ? d.snap : 0.1,
    plot: Object.assign({
      w: clamp(n(d.plot.w, P0.w), 5, 300),
      d: clamp(n(d.plot.d, P0.d), 5, 300),
      street: clamp(n(d.plot.street, P0.street), 0, 300),
      side: clamp(n(d.plot.side, P0.side), 0, 300),
      back: clamp(n(d.plot.back, P0.back), 0, 300)
    }, d.plot.fence ? {fence: fenceSanitize(d.plot.fence, d.plot)} : {}),
    site: {
      lat: clamp(n(ds.lat, D0.lat), -89, 89),
      lon: clamp(n(ds.lon, D0.lon), -180, 180),
      tz: clamp(Math.round(n(ds.tz, D0.tz)), -12, 14),
      north: normDeg(n(ds.north, D0.north)),
      city: typeof ds.city === "string" ? ds.city.slice(0, 40) : ""
    },
    house: wm({
      cx: n(d.house.cx, H0.cx),
      cy: n(d.house.cy, H0.cy),
      rot: rots.includes(d.house.rot) ? d.house.rot : 0,
      wall: clamp(n(d.house.wall, H0.wall), 0.1, 1),
      inner: clamp(n(d.house.inner, H0.inner), 0.05, 0.4),
      h: clamp(n(d.house.h, H0.h), 2.2, 5),
      base: clamp(n(d.house.base, H0.base), 0, 1.5),
      doorH: clamp(n(d.house.doorH, H0.doorH), 1.8, 3),
      roof: ["gable", "hip", "halfhip", "pyramid", "gambrel", "shed", "flat"].includes(d.house.roof) ? d.house.roof : "gable",
      pitch: clamp(n(d.house.pitch, H0.pitch), 5, 70),
      over: clamp(n(d.house.over, H0.over), 0, 1.5),
      ridge: d.house.ridge === "short" ? "short" : "long",
      pitch2: clamp(n(d.house.pitch2, H0.pitch2), 5, 45),
      overG: clamp(n(d.house.overG, H0.overG), 0, 1.5),
      hipCut: clamp(n(d.house.hipCut, H0.hipCut), 0.15, 0.7),
      low: ["f", "b", "l", "r"].includes(d.house.low) ? d.house.low : "b",
      gutters: d.house.gutters !== false,
      chim: !!d.house.chim,
      chx: n(d.house.chx, 0),
      chy: n(d.house.chy, 0),
      chh: clamp(n(d.house.chh, H0.chh), 0.2, 3),
      autoLights: d.house.autoLights !== false
    }, d.house),
    rooms: arr(d.rooms).map(r => wm({
      id: sid(r.id),
      name: String(r.name || "Комната").slice(0, 40),
      type: has(TYPES, r.type) ? r.type : "Другое",
      x: n(r.x, 0),
      y: n(r.y, 0),
      w: clamp(n(r.w, 3), 0.3, 100),
      d: clamp(n(r.d, 3), 0.3, 100),
      open: !!r.open
    }, r)),
    doors: arr(d.doors).map(x => {
      const kind = has(DOOR_KINDS, x.kind) ? x.kind : "door";
      return wm({
        id: sid(x.id),
        x: n(x.x, 0),
        y: n(x.y, 0),
        o: x.o === "v" ? "v" : "h",
        w: clamp(n(x.w, 0.9), 0.5, 20),
        side: x.side === -1 ? -1 : 1,
        hinge: x.hinge === 1 ? 1 : 0,
        kind,
        op: has(DOOR_OPS, x.op) ? x.op : "swing",
        leaf: has(LEAFS, x.leaf) ? x.leaf : (kind === "entry" ? "flat" : "panel"),
        open: clamp(n(x.open, kind === "entry" ? 0 : 0.75), 0, 1)
      }, x);
    }),
    windows: arr(d.windows).map(x => wm({
      id: sid(x.id),
      x: n(x.x, 0),
      y: n(x.y, 0),
      o: x.o === "v" ? "v" : "h",
      w: clamp(n(x.w, 1.5), 0.3, 6),
      sill: clamp(n(x.sill, 0.8), 0, 2.5),
      h: clamp(n(x.h, 1.4), 0.3, 3),
      op: has(WIN_OPS, x.op) ? x.op : "tiltturn",
      n: [0, 1, 2, 3, 4].includes(x.n) ? x.n : 0,
      open: clamp(n(x.open, 0), 0, 1),
      how: x.how === "tilt" ? "tilt" : "turn"
    }, x)),
    items: things(d.items),
    objects: things(d.objects)
  };
  const ids = new Set(out.rooms.map(r => r.id));
  const nw = (Array.isArray(d.nowall) ? d.nowall : []).filter(p => Array.isArray(p) && p.length === 2).map(p => [sid(p[0]), sid(p[1])]).filter(p => p[0] !== p[1] && ids.has(p[0]) && ids.has(p[1])).slice(0, 300);
  if (nw.length) out.nowall = nw;
  return out;
}

function loadLocal() {
  try {
    const t = localStorage.getItem(LS);
    if (!t) return false;
    const d = JSON.parse(t);
    const p = sanitize(d && d.plan ? d.plan : d);
    if (!p) return false;
    S = p;
    return true;
  } catch (err) {
    return false;
  }
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
