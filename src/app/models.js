"use strict";
const CATS = [
  ["build", "Постройки"],
  ["yard", "Сад и двор"],
  ["people", "Люди и машины"],
  ["light", "Свет"],
  ["living", "Гостиная"],
  ["bed", "Спальня"],
  ["kitchen", "Кухня и столовая"],
  ["bath", "Санузел и котельная"],
  ["hall", "Прихожая"]
];

const MODELS = {
  parking: {cat: "build", name: "Парковка", w: 2.5, d: 5.3, h: 0.05, g: "pass"},
  septic: {cat: "build", name: "Септик", w: 2, d: 2.5, h: 0.3, g: "wet"},
  well: {cat: "build", name: "Скважина", w: 1, d: 1, h: 0.8, g: "wet"},
  bath: {cat: "build", name: "Баня", w: 4, d: 5, h: 2.6, g: "other", b: true, ops: true},
  garage: {cat: "build", name: "Гараж", w: 4, d: 6, h: 3, g: "other", b: true, ops: true},
  shed: {cat: "build", name: "Сарай", w: 3, d: 3, h: 2.4, g: "other", b: true, ops: true},
  gazebo: {cat: "build", name: "Беседка", w: 3, d: 3, h: 2.5, g: "day"},
  terrace: {cat: "build", name: "Терраса", w: 6, d: 3, h: 0.45, g: "pass"},
  greenhouse: {cat: "build", name: "Теплица", w: 3, d: 6, h: 2.3, g: "day"},
  beds: {cat: "build", name: "Грядки", w: 2, d: 4, h: 0.3, g: "day"},
  other: {cat: "build", name: "Другое", w: 2, d: 2, h: 1, g: "other"},
  tree: {cat: "yard", name: "Дерево", w: 4, d: 4, h: 6, g: "day", sym: "tree"},
  pine: {cat: "yard", name: "Ель", w: 3, d: 3, h: 7, g: "day", sym: "pine"},
  bush: {cat: "yard", name: "Куст", w: 1.2, d: 1.2, h: 1, g: "day", sym: "tree"},
  hedge: {cat: "yard", name: "Живая изгородь", w: 3, d: 0.6, h: 1.5, g: "day", sym: "hedge"},
  flowers: {cat: "yard", name: "Клумба", w: 2, d: 1, h: 0.35, g: "day"},
  path: {cat: "yard", name: "Дорожка из плитки", w: 1.2, d: 6, h: 0.04, g: "pass", sym: "path"},
  pool: {cat: "yard", name: "Бассейн", w: 4, d: 8, h: 0.3, g: "wet", sym: "pool"},
  bbq: {cat: "yard", name: "Мангал", w: 1, d: 0.5, h: 0.95, g: "other"},
  bench: {cat: "yard", name: "Скамейка", w: 1.5, d: 0.55, h: 0.85, g: "other", sym: "chair"},
  swing: {cat: "yard", name: "Качели", w: 2.6, d: 1.6, h: 2.2, g: "other"},
  gardenset: {cat: "yard", name: "Садовый стол и 4 стула", w: 1.9, d: 1.9, h: 0.9, g: "other", sym: "dining4"},
  lamp: {cat: "light", name: "Садовый фонарь", w: 0.3, d: 0.3, h: 2.4, g: "other", sym: "lamp", lamp: {lm: 1500, k: 3000}},
  streetlamp: {cat: "light", name: "Уличный фонарь на столбе", w: 0.4, d: 1.5, h: 6, g: "other", sym: "lamp", lamp: {lm: 8000, k: 4000}},
  bollard: {cat: "light", name: "Светильник-столбик", w: 0.18, d: 0.18, h: 0.6, g: "other", sym: "lamp", lamp: {lm: 250, k: 3000}},
  walllamp: {cat: "light", name: "Настенный уличный фонарь", w: 0.22, d: 0.26, h: 0.38, z: 2, g: "other", sym: "lamp", lamp: {lm: 600, k: 3000}},
  garland: {cat: "light", name: "Гирлянда на столбиках", w: 5, d: 0.12, h: 2.6, g: "other", sym: "garland", lamp: {lm: 600, k: 2200}},
  ceil: {cat: "light", name: "Потолочный светильник", w: 0.5, d: 0.5, h: 0.12, z: "ceil", sym: "lamp", lamp: {lm: 1800, k: 3000, ceil: true}},
  chandelier: {cat: "light", name: "Люстра", w: 0.8, d: 0.8, h: 0.75, z: "ceil", sym: "lamp", lamp: {lm: 3000, k: 2700, ceil: true}},
  pendant: {cat: "light", name: "Подвесной светильник", w: 0.36, d: 0.36, h: 0.9, z: "ceil", sym: "lamp", lamp: {lm: 800, k: 2700, ceil: true}},
  floorlamp: {cat: "light", name: "Торшер", w: 0.45, d: 0.45, h: 1.65, sym: "lamp", lamp: {lm: 1200, k: 2700}},
  tablelamp: {cat: "light", name: "Настольная лампа", w: 0.3, d: 0.3, h: 0.5, z: 0.75, sym: "lamp", lamp: {lm: 450, k: 2700}},
  sconce: {cat: "light", name: "Бра", w: 0.26, d: 0.2, h: 0.32, z: 1.7, sym: "lamp", lamp: {lm: 450, k: 2700}},
  person: {cat: "people", name: "Человек 175 см", w: 0.5, d: 0.3, h: 1.75, g: "other", sym: "person"},
  car: {cat: "people", name: "Легковой автомобиль", w: 1.85, d: 4.6, h: 1.5, g: "pass", sym: "car"},
  sofa: {cat: "living", name: "Диван трёхместный", w: 2.2, d: 0.95, h: 0.85, sym: "sofa"},
  sofaL: {cat: "living", name: "Угловой диван", w: 2.7, d: 1.7, h: 0.85, sym: "sofaL"},
  armchair: {cat: "living", name: "Кресло", w: 0.85, d: 0.85, h: 0.85, sym: "sofa"},
  coffee: {cat: "living", name: "Журнальный столик", w: 1.1, d: 0.6, h: 0.45, sym: "table"},
  tv: {cat: "living", name: "ТВ-тумба и телевизор", w: 1.8, d: 0.45, h: 1.25, sym: "tv"},
  shelf: {cat: "living", name: "Стеллаж с книгами", w: 1, d: 0.35, h: 2, sym: "cab"},
  rug: {cat: "living", name: "Ковёр", w: 2, d: 3, h: 0.01, sym: "rug"},
  plant: {cat: "living", name: "Растение в горшке", w: 0.5, d: 0.5, h: 1.3, sym: "tree"},
  bed2: {cat: "bed", name: "Кровать 160×200", w: 1.7, d: 2.15, h: 1, sym: "bed"},
  bed1: {cat: "bed", name: "Кровать 90×200", w: 1, d: 2.05, h: 0.9, sym: "bed"},
  nightstand: {cat: "bed", name: "Тумбочка", w: 0.45, d: 0.4, h: 0.5, sym: "cab"},
  wardrobe: {cat: "bed", name: "Шкаф распашной", w: 1.8, d: 0.6, h: 2.2, sym: "wardrobe"},
  dresser: {cat: "bed", name: "Комод", w: 1.2, d: 0.5, h: 0.85, sym: "cab"},
  desk: {cat: "bed", name: "Письменный стол", w: 1.2, d: 0.6, h: 0.75, sym: "table"},
  chair: {cat: "bed", name: "Стул", w: 0.45, d: 0.5, h: 0.9, sym: "chair"},
  kitchen: {cat: "kitchen", name: "Кухонный гарнитур", w: 3, d: 0.6, h: 2.2, sym: "kitchen"},
  fridge: {cat: "kitchen", name: "Холодильник", w: 0.6, d: 0.65, h: 2, sym: "fridge"},
  island: {cat: "kitchen", name: "Кухонный остров", w: 1.4, d: 0.9, h: 0.9, sym: "cab"},
  dining: {cat: "kitchen", name: "Стол и 6 стульев", w: 2.6, d: 1.9, h: 0.9, sym: "dining"},
  table: {cat: "kitchen", name: "Обеденный стол", w: 1.6, d: 0.9, h: 0.75, sym: "table"},
  rtable: {cat: "kitchen", name: "Круглый стол", w: 1.1, d: 1.1, h: 0.75, sym: "round"},
  toilet: {cat: "bath", name: "Унитаз", w: 0.4, d: 0.68, h: 0.8, sym: "toilet"},
  basin: {cat: "bath", name: "Раковина с тумбой и зеркалом", w: 0.6, d: 0.47, h: 1.9, sym: "basin"},
  bathtub: {cat: "bath", name: "Ванна", w: 1.7, d: 0.75, h: 0.6, sym: "tub"},
  shower: {cat: "bath", name: "Душ без поддона", w: 0.9, d: 0.9, h: 2, sym: "shower"},
  washer: {cat: "bath", name: "Стиральная машина", w: 0.6, d: 0.6, h: 0.85, sym: "washer"},
  boiler: {cat: "bath", name: "Газовый котёл", w: 0.45, d: 0.35, h: 0.75, z: 1, sym: "cab"},
  tank: {cat: "bath", name: "Бойлер", w: 0.6, d: 0.6, h: 1.4, sym: "round"},
  hanger: {cat: "hall", name: "Вешалка с обувницей", w: 1.2, d: 0.4, h: 2, sym: "cab"},
  closet: {cat: "hall", name: "Шкаф-купе", w: 2, d: 0.65, h: 2.4, sym: "wardrobe"}
};

const MB = {};

function legs4(g, w, d, h, inset, r, mt) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Cy(g, r, 0, h, sx * (w / 2 - inset), sz * (d / 2 - inset), mt, 10);
}

function fronts(g, x0, x1, y0, y1, zf, sgn, cols, rows, fm, hm, vertical) {
  const cw = (x1 - x0) / cols;
  const rh = (y1 - y0) / rows;
  const z0 = sgn > 0 ? zf : zf - 0.018;
  const z1 = sgn > 0 ? zf + 0.018 : zf;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = x0 + i * cw + 0.002;
      const b = x0 + (i + 1) * cw - 0.002;
      const c = y0 + j * rh + 0.002;
      const e = y0 + (j + 1) * rh - 0.002;
      B(g, a, b, c, e, z0, z1, fm);
      if (!hm) continue;
      const zs0 = sgn > 0 ? z1 : z0 - 0.02;
      const zs1 = sgn > 0 ? z1 + 0.02 : z0;
      const zb0 = sgn > 0 ? z1 + 0.012 : z0 - 0.026;
      const zb1 = sgn > 0 ? z1 + 0.026 : z0 - 0.012;
      if (vertical) {
        const hx = cols > 1 ? (i % 2 ? a + 0.045 : b - 0.045) : b - 0.045;
        const hy = rows === 1 ? Math.min(c + 1.05, (c + e) / 2) : (c + e) / 2;
        const hl = Math.min(0.2, (e - c) * 0.4);
        for (const q of [-1, 1]) B(g, hx - 0.004, hx + 0.004, hy + q * (hl / 2 - 0.02) - 0.004, hy + q * (hl / 2 - 0.02) + 0.004, zs0, zs1, hm);
        RB(g, hx - 0.007, hx + 0.007, hy - hl / 2, hy + hl / 2, zb0, zb1, 0.006, hm);
      } else {
        const hw = Math.min(0.18, (b - a) * 0.4);
        const hy = e - Math.min(0.05, (e - c) * 0.25);
        const hx = (a + b) / 2;
        for (const q of [-1, 1]) B(g, hx + q * (hw / 2 - 0.02) - 0.004, hx + q * (hw / 2 - 0.02) + 0.004, hy - 0.004, hy + 0.004, zs0, zs1, hm);
        RB(g, hx - hw / 2, hx + hw / 2, hy - 0.007, hy + 0.007, zb0, zb1, 0.006, hm);
      }
    }
  }
}

function smallRoof(g, w, d, y, deg, ov, roofM, edgeM, gableM) {
  const along = w >= d;
  const Lw = along ? w : d;
  const L = Lw + 2 * ov;
  const Sp = along ? d : w;
  const p = deg * Math.PI / 180;
  const rise = (Sp / 2) * Math.tan(p);
  const half = Sp / 2 + ov;
  const slope = half / Math.cos(p);
  const th = 0.08;
  const rg = new THREE.Group();
  rg.position.y = y;
  if (!along) rg.rotation.y = Math.PI / 2;
  g.add(rg);
  for (const s of [1, -1]) {
    const m = B(rg, -L / 2, L / 2, -th / 2, th / 2, -slope / 2, slope / 2, [edgeM, edgeM, roofM, edgeM, edgeM, edgeM]);
    m.rotation.x = s * p;
    m.position.set(0, rise - (half / 2) * Math.tan(p) + (th / 2) * Math.cos(p), s * (half / 2 + (th / 2) * Math.sin(p)));
  }
  const sh = new THREE.Shape();
  sh.moveTo(-Sp / 2, 0);
  sh.lineTo(Sp / 2, 0);
  sh.lineTo(0, rise);
  sh.lineTo(-Sp / 2, 0);
  for (const x0 of [-Lw / 2, Lw / 2 - 0.05]) {
    const geo = new THREE.ExtrudeGeometry(sh, {depth: 0.05, bevelEnabled: false});
    const m = addMesh(rg, geo, gableM);
    m.rotation.y = Math.PI / 2;
    m.position.set(x0, 0, 0);
  }
  return rise;
}

MB.other = (g, P, m) => {
  RB(g, -P.w / 2, P.w / 2, 0, P.h, -P.d / 2, P.d / 2, 0.03, m("concrete", "body"));
};

MB.parking = (g, P, m, rnd) => {
  const h = Math.max(0.02, P.h);
  B(g, -P.w / 2, P.w / 2, 0, h, -P.d / 2, P.d / 2, m("paving", "paving"));
  if (P.w >= 1.9 && P.d >= 3.6) {
    const c = new THREE.Group();
    c.position.y = h;
    g.add(c);
    MB.car(c, {w: Math.min(1.85, P.w - 0.4), d: Math.min(4.6, P.d - 0.5), h: 1.5}, m, rnd);
  }
};

MB.car = (g, P, m, rnd) => {
  const cols = ["c9ccd1", "24405f", "eeeeec", "8f1f1f", "2b2d30", "5d6b5a"];
  const paint = m("paint#" + cols[Math.floor(rnd() * cols.length)], "paint");
  const s = new THREE.Group();
  s.scale.set(P.w / 1.85, P.h / 1.5, P.d / 4.6);
  g.add(s);
  const bv = 0.06;
  const prof = (pts, width, mt) => {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    const depth = width - 2 * bv;
    const geo = new THREE.ExtrudeGeometry(sh, {depth, bevelEnabled: true, bevelThickness: bv, bevelSize: 0.035, bevelSegments: 3, curveSegments: 4});
    geo.translate(0, 0, -depth / 2);
    const mesh = addMesh(s, geo, mt);
    mesh.rotation.y = -Math.PI / 2;
    return mesh;
  };
  prof([[-2.25, 0.26], [2.25, 0.26], [2.3, 0.4], [2.28, 0.62], [2.05, 0.76], [1.15, 0.84], [-1.35, 0.87], [-2.1, 0.86], [-2.3, 0.72], [-2.3, 0.4]], 1.85, paint);
  prof([[-1.42, 0.83], [1.08, 0.8], [0.45, 1.33], [-1.02, 1.35]], 1.62, m("carglass", "glass"));
  RB(s, -0.76, 0.76, 1.31, 1.42, -1.0, 0.43, 0.05, paint);
  for (const sx of [-1, 1]) {
    const xc = sx * 0.76;
    for (const zc of [1.42, -1.38]) {
      CyX(s, 0.33, xc - 0.11, xc + 0.11, 0.33, zc, m("rubber", "tires"), 24);
      CyX(s, 0.2, xc - 0.116, xc + 0.116, 0.33, zc, m("steel", "rims"), 16);
    }
    const lx = sx * 0.62;
    B(s, lx - 0.17, lx + 0.17, 0.58, 0.66, 2.24, 2.3, m("lamp", "lights"));
    B(s, lx - 0.16, lx + 0.16, 0.66, 0.74, -2.34, -2.28, m("redlamp", "taillights"));
    B(s, sx * 0.97 - 0.05, sx * 0.97 + 0.05, 0.86, 0.94, 0.95, 1.05, paint);
  }
  B(s, -0.9, 0.9, 0.26, 0.4, 2.26, 2.34, m("graphite", "bumpers"));
  B(s, -0.9, 0.9, 0.26, 0.4, -2.36, -2.28, m("graphite", "bumpers"));
  B(s, -0.26, 0.26, 0.42, 0.53, 2.33, 2.345, m("white", "plate"));
};

MB.septic = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, Math.min(0.06, h), -d / 2, d / 2, m("concrete", "base"));
  const n = d > w * 1.2 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? 0 : (i ? 1 : -1) * d / 4;
    const r = Math.min(w, d / n) * 0.28;
    Cy(g, r, 0, h, 0, z, m("plastic_green", "body"), 24);
    Cy(g, r * 0.8, h, h + 0.03, 0, z, m("plastic_green", "body"), 24);
  }
  Cy(g, 0.05, 0, h + 0.4, w / 2 - 0.2, -d / 2 + 0.2, m("plastic_green", "pipes"), 10);
};

MB.well = (g, P, m) => {
  const r = Math.min(P.w, P.d) / 2;
  const h = P.h;
  Cy(g, r, 0, h * 0.6, 0, 0, m("concrete", "ring"), 28);
  Cy(g, r * 1.03, h * 0.6, h * 0.66, 0, 0, m("post", "lid"), 28);
  B(g, -0.1, 0.1, h * 0.66, h * 0.66 + 0.03, -0.02, 0.02, m("steel", "pipes"));
  Cy(g, 0.035, h * 0.66, h, r * 0.45, 0, m("steel", "pipes"), 10);
};

MB.bath = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2 - 0.05, w / 2 + 0.05, 0, 0.3, -d / 2 - 0.05, d / 2 + 0.05, m("concrete", "base"));
  const logs = m("logs", "walls");
  const sh = bldShell(g, P, m, {kind: "bath", t: 0.2, base: 0.3, wall: logs, inner: logs});
  const rise = smallRoof(g, w, d, h, 28, 0.4, m("roof", "roof"), m("roofedge", "roofedge"), logs);
  const M = {trim: m("wood_dark", "trim"), gate: m("planks", "gate"), box: m("darkmetal", "gatebox"), handle: m("steel", "handles"), door: m("wood_dark", "door"), glass: m("glass", "glass"), winframe: m("wood_dark", "winframe"), sill: m("wood_dark", "trim")};
  for (const op of sh.ops) bldOpening(g, P, m, op, sh, M);
  Cy(g, 0.1, h, h + rise + 0.7, -w / 4, -d / 4, m("steel", "chimney"), 14);
  Cone(g, 0.18, h + rise + 0.7, h + rise + 0.85, -w / 4, -d / 4, m("steel", "chimney"), 14);
};

MB.garage = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2 - 0.01, w / 2 + 0.01, 0, 0.12, -d / 2 - 0.01, d / 2 + 0.01, m("plinth", "plinth"));
  const sh = bldShell(g, P, m, {kind: "garage", t: 0.25, base: 0.12, wall: m("facade", "walls"), inner: m("concrete", "inwalls")});
  B(g, -w / 2 + sh.t, w / 2 - sh.t, 0.12, 0.13, -d / 2 + sh.t, d / 2 - sh.t, m("concrete", "floor"));
  B(g, -w / 2 - 0.15, w / 2 + 0.15, h, h + 0.22, -d / 2 - 0.15, d / 2 + 0.15, m("roofedge", "roof"));
  const M = {trim: m("frame", "gateframe"), gate: m("garagedoor", "gate"), box: m("darkmetal", "gatebox"), handle: m("steel", "handles"), door: m("door_entry", "door"), glass: m("glass", "glass"), winframe: m("frame", "winframe"), sill: m("sill_out", "sill")};
  for (const op of sh.ops) bldOpening(g, P, m, op, sh, M);
  Cy(g, 0.05, 0, h, w / 2 + 0.08, d / 2 - 0.1, m("gutter", "gutter"), 10);
};

MB.shed = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2 - 0.05, w / 2 + 0.05, 0, 0.15, -d / 2 - 0.05, d / 2 + 0.05, m("concrete", "base"));
  const pl = m("planks", "walls");
  const sh = bldShell(g, P, m, {kind: "shed", t: 0.06, base: 0.15, wall: pl, inner: pl});
  smallRoof(g, w, d, h, 25, 0.3, m("roof", "roof"), m("roofedge", "roofedge"), pl);
  const M = {trim: m("wood_dark", "trim"), gate: m("planks", "gate"), box: m("darkmetal", "gatebox"), handle: m("steel", "handles"), door: m("wood_dark", "door"), glass: m("glass", "glass"), winframe: m("wood_dark", "winframe"), sill: m("wood_dark", "trim")};
  for (const op of sh.ops) bldOpening(g, P, m, op, sh, M);
};

MB.gazebo = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, 0.15, -d / 2, d / 2, [m("wood_dark", "base"), m("wood_dark", "base"), m("deck", "deck"), m("wood_dark", "base"), m("wood_dark", "base"), m("wood_dark", "base")]);
  const pw = 0.12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - pw / 2);
    const z = sz * (d / 2 - pw / 2);
    B(g, x - pw / 2, x + pw / 2, 0.15, h, z - pw / 2, z + pw / 2, m("wood_mid", "frame"));
  }
  const rail = (x0, x1, z0, z1) => {
    for (const y of [0.45, 0.95]) B(g, x0, x1, y, y + 0.06, z0, z1, m("wood_mid", "frame"));
  };
  rail(-w / 2 + pw, w / 2 - pw, -d / 2 + 0.02, -d / 2 + 0.08);
  rail(-w / 2 + 0.02, -w / 2 + 0.08, -d / 2 + pw, d / 2 - pw);
  rail(w / 2 - 0.08, w / 2 - 0.02, -d / 2 + pw, d / 2 - pw);
  B(g, -w / 2, w / 2, h - 0.12, h, -d / 2, -d / 2 + 0.12, m("wood_mid", "frame"));
  B(g, -w / 2, w / 2, h - 0.12, h, d / 2 - 0.12, d / 2, m("wood_mid", "frame"));
  B(g, -w / 2, -w / 2 + 0.12, h - 0.12, h, -d / 2, d / 2, m("wood_mid", "frame"));
  B(g, w / 2 - 0.12, w / 2, h - 0.12, h, -d / 2, d / 2, m("wood_mid", "frame"));
  const R = (Math.max(w, d) / 2 + 0.35) * Math.SQRT2;
  const roof = Cone(g, R, h, h + 1.0, 0, 0, m("roof", "roof"), 4);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, d / w);
  const tw = Math.min(1.2, w - 1.2);
  if (tw > 0.5) {
    B(g, -tw / 2, tw / 2, 0.85, 0.9, -0.35, 0.35, m("wood_mid", "table"));
    B(g, -0.05, 0.05, 0.15, 0.85, -0.05, 0.05, m("wood_mid", "table"));
    for (const sz of [-1, 1]) B(g, -tw / 2, tw / 2, 0.58, 0.62, sz * 0.62 - 0.15, sz * 0.62 + 0.15, m("wood_mid", "table"));
  }
};

MB.terrace = (g, P, m) => {
  const {w, d, h} = P;
  const side = m("wood_dark", "frame");
  B(g, -w / 2, w / 2, 0, h, -d / 2, d / 2, [side, side, m("deck", "deck"), side, side, side]);
  if (h > 0.22) {
    const n = Math.max(1, Math.round(h / 0.17));
    const sw = Math.min(w * 0.45, 1.6);
    for (let i = 1; i < n; i++) B(g, -sw / 2, sw / 2, 0, h - i * h / n, d / 2, d / 2 + i * 0.3, [side, side, m("deck", "deck"), side, side, side]);
  }
};

MB.greenhouse = (g, P, m) => {
  const {w, d, h} = P;
  const r = w / 2;
  const sy = h / r;
  B(g, -w / 2, w / 2, 0, 0.02, -d / 2, d / 2, m("soil", "soil"));
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, 28, 1, true, -Math.PI / 2, Math.PI), m("poly", "sheet"));
  shell.rotation.x = -Math.PI / 2;
  shell.scale.set(1, 1, sy);
  shell.position.y = 0.02;
  g.add(shell);
  const n = Math.max(2, Math.round(d / 1) + 1);
  for (let i = 0; i < n; i++) {
    const z = -d / 2 + i * d / (n - 1);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 4, 24, Math.PI), m("steel", "frame"));
    rib.scale.set(1, sy, 1);
    rib.position.set(0, 0.02, z);
    rib.castShadow = true;
    g.add(rib);
  }
  for (const sz of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0, Math.PI), m("poly", "sheet"));
    end.scale.set(1, sy, 1);
    end.position.set(0, 0.02, sz * d / 2);
    g.add(end);
  }
  B(g, -0.4, -0.36, 0.02, 1.9, d / 2 - 0.02, d / 2 + 0.02, m("steel", "frame"));
  B(g, 0.36, 0.4, 0.02, 1.9, d / 2 - 0.02, d / 2 + 0.02, m("steel", "frame"));
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -w / 2 + 0.15 : 0.35;
    const x1 = sx < 0 ? -0.35 : w / 2 - 0.15;
    if (x1 - x0 > 0.2) B(g, x0, x1, 0, 0.25, -d / 2 + 0.3, d / 2 - 0.3, m("soil", "soil"));
  }
};

MB.beds = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_raw", "sides");
  B(g, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + 0.04, wood);
  B(g, -w / 2, w / 2, 0, h, d / 2 - 0.04, d / 2, wood);
  B(g, -w / 2, -w / 2 + 0.04, 0, h, -d / 2 + 0.04, d / 2 - 0.04, wood);
  B(g, w / 2 - 0.04, w / 2, 0, h, -d / 2 + 0.04, d / 2 - 0.04, wood);
  B(g, -w / 2 + 0.04, w / 2 - 0.04, 0, h - 0.04, -d / 2 + 0.04, d / 2 - 0.04, m("soil", "soil"));
  const ss = WX.season || "summer";
  if (ss === "bare" || ss === "late") return;
  const rows = Math.max(1, Math.floor((w - 0.2) / 0.35));
  const cols = Math.max(1, Math.floor((d - 0.2) / 0.3));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = -w / 2 + 0.1 + (i + 0.5) * (w - 0.2) / rows;
      const z = -d / 2 + 0.1 + (j + 0.5) * (d - 0.2) / cols;
      Sp(g, 0.09, x, h - 0.02, z, m("leaf_light", "plants"), 1, 0.7, 1, 8);
    }
  }
};

function leafSet(m) {
  const s = WX.season || "summer";
  if (s === "spring") return {k: 0.78, n: 1, mats: [m("leaf_spring", "crown"), m("leaf_light", "crown2")]};
  if (s === "autumn") return {k: 0.95, n: 1, mats: [m("leaf", "crown"), m("leaf_y", "crown2"), m("leaf_light", "crown2"), m("leaf_o", "crown2")]};
  if (s === "fall") return {k: 0.8, n: 0.75, mats: [m("leaf_y", "crown"), m("leaf_o", "crown2"), m("leaf_r", "crown2"), m("leaf_y", "crown")]};
  if (s === "late") return {k: 0.45, n: 0.4, mats: [m("leaf_brown", "crown"), m("leaf_o", "crown2")]};
  if (s === "bare") return {k: 0, n: 0, mats: []};
  return {k: 1, n: 1, mats: [m("leaf", "crown"), m("leaf", "crown"), m("leaf_light", "crown2")]};
}

function bareBranches(g, x, y0, y1, R, tr, bark, rnd, n) {
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.7;
    const ys = y0 + (y1 - y0) * (0.15 + rnd() * 0.45);
    const len = R * (0.55 + rnd() * 0.4);
    const end = [x + Math.cos(a) * len, ys + (y1 - ys) * (0.45 + rnd() * 0.5), Math.sin(a) * len];
    Lb(g, [x, ys, 0], end, tr * 0.42, tr * 0.1, bark, 5);
    for (let j = 0; j < 3; j++) {
      const f = 0.35 + j * 0.22;
      const st = [x + (end[0] - x) * f, ys + (end[1] - ys) * f, end[2] * f];
      const b = a + (rnd() - 0.5) * 1.6;
      const l2 = len * (0.25 + rnd() * 0.25);
      Lb(g, st, [st[0] + Math.cos(b) * l2, st[1] + l2 * (0.4 + rnd() * 0.6), st[2] + Math.sin(b) * l2], tr * 0.12, tr * 0.03, bark, 4);
    }
  }
}

MB.tree = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const trunkH = h * 0.42;
  const crownH = h - trunkH;
  const tr = Math.max(0.06, R * 0.07);
  const bark = m("bark", "trunk");
  const L = leafSet(m);
  Cy(g, tr, 0, trunkH + crownH * (L.k ? 0.35 : 0.6), 0, 0, bark, 10, tr * 0.6);
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2;
    Lb(g, [0, trunkH * (0.8 + i * 0.15), 0], [Math.cos(a) * R * 0.5, trunkH + crownH * 0.35, Math.sin(a) * R * 0.5], tr * 0.5, tr * 0.25, bark, 6);
  }
  if (L.k < 0.6) bareBranches(g, 0, trunkH * 0.85, h * 0.98, R, tr, bark, rnd, 9);
  if (!L.k) return;
  const cy = trunkH + crownH * 0.5;
  const r0 = Math.min(R * 0.72, crownH * 0.45);
  if (L.n > 0.5) Lump(g, r0 * L.k, 0, cy, 0, L.mats[0], rnd, 1);
  const n = Math.round((5 + Math.floor(rnd() * 3)) * (L.n > 0.5 ? 1 : 1.6));
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = R * (0.2 + rnd() * 0.25);
    const s = Math.min(R * (0.36 + rnd() * 0.16), crownH * 0.32);
    const y = trunkH + s + rnd() * Math.max(0.01, crownH - 2 * s);
    if (rnd() > L.n + 0.05) continue;
    Lump(g, s * L.k, Math.cos(a) * rr, y, Math.sin(a) * rr, L.mats[i % L.mats.length], rnd, 0.9);
  }
};

MB.pine = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  Cy(g, Math.max(0.07, R * 0.06), 0, h * 0.35, 0, 0, m("bark", "trunk"), 8, Math.max(0.05, R * 0.04));
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y0 = h * 0.16 + t * h * 0.56;
    const y1 = Math.min(h, y0 + h * 0.38 * (1 - t * 0.35));
    const c = Cone(g, R * (1 - t * 0.72), y0, y1, 0, 0, m("leaf_dark", "needles"), 9);
    c.rotation.y = rnd() * Math.PI;
  }
};

MB.bush = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const s = Math.min(R * 0.55, h * 0.45);
  const L = leafSet(m);
  if (L.k < 0.6) {
    const bark = m("bark", "twigs");
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2 + rnd() * 0.5;
      const r = R * (0.6 + rnd() * 0.4);
      Lb(g, [0, 0, 0], [Math.cos(a) * r, h * (0.7 + rnd() * 0.3), Math.sin(a) * r], 0.018, 0.005, bark, 4);
    }
  }
  if (!L.k) return;
  if (L.n > 0.5) Lump(g, s * L.k, 0, h - s, 0, L.mats[0], rnd, 0.95);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + rnd() * 0.8;
    if (rnd() > L.n + 0.1) continue;
    Lump(g, s * 0.85 * L.k, Math.cos(a) * (R - s * 0.85), s * 0.85, Math.sin(a) * (R - s * 0.85), L.mats[(i + 1) % L.mats.length], rnd, 0.9);
  }
};

MB.hedge = (g, P, m) => {
  RB(g, -P.w / 2, P.w / 2, 0, P.h, -P.d / 2, P.d / 2, Math.min(0.15, P.d / 3), m("leaf", "crown"));
};

MB.flowers = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const st = m("concrete", "curb");
  B(g, -w / 2, w / 2, 0, 0.15, -d / 2, -d / 2 + 0.08, st);
  B(g, -w / 2, w / 2, 0, 0.15, d / 2 - 0.08, d / 2, st);
  B(g, -w / 2, -w / 2 + 0.08, 0, 0.15, -d / 2 + 0.08, d / 2 - 0.08, st);
  B(g, w / 2 - 0.08, w / 2, 0, 0.15, -d / 2 + 0.08, d / 2 - 0.08, st);
  B(g, -w / 2 + 0.08, w / 2 - 0.08, 0, 0.12, -d / 2 + 0.08, d / 2 - 0.08, m("soil", "soil"));
  const cols = ["flower_r", "flower_y", "flower_v", "flower_w"];
  const ss = WX.season || "summer";
  if (ss === "bare" || ss === "late") return;
  const n = Math.min(80, Math.round(w * d * 14 * (ss === "spring" || ss === "fall" ? 0.5 : 1)));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.14 + rnd() * (w - 0.28);
    const z = -d / 2 + 0.14 + rnd() * (d - 0.28);
    if (i % 2) Sp(g, 0.07, x, 0.16, z, m("leaf_light", "plants"), 1, 0.7, 1, 8);
    else {
      const ci = Math.floor(rnd() * cols.length);
      Sp(g, 0.035, x, Math.min(h, 0.2 + rnd() * 0.12), z, m(cols[ci], "fl" + (ci + 1)), 1, 0.8, 1, 8);
    }
  }
};

MB.path = (g, P, m) => {
  const {w, d} = P;
  const h = Math.max(0.02, P.h);
  B(g, -w / 2 + 0.06, w / 2 - 0.06, 0, h, -d / 2, d / 2, m("paving", "paving"));
  B(g, -w / 2, -w / 2 + 0.06, 0, h + 0.02, -d / 2, d / 2, m("concrete", "curb"));
  B(g, w / 2 - 0.06, w / 2, 0, h + 0.02, -d / 2, d / 2, m("concrete", "curb"));
};

MB.pool = (g, P, m) => {
  const {w, d} = P;
  const h = Math.max(0.1, P.h);
  const c = Math.min(0.3, w / 6, d / 6);
  const st = m("concrete", "curb");
  B(g, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + c, st);
  B(g, -w / 2, w / 2, 0, h, d / 2 - c, d / 2, st);
  B(g, -w / 2, -w / 2 + c, 0, h, -d / 2 + c, d / 2 - c, st);
  B(g, w / 2 - c, w / 2, 0, h, -d / 2 + c, d / 2 - c, st);
  B(g, -w / 2 + c, w / 2 - c, 0, h - 0.12, -d / 2 + c, d / 2 - c, m("col#6fb2c8", "bowl"));
  B(g, -w / 2 + c, w / 2 - c, h - 0.12, h - 0.1, -d / 2 + c, d / 2 - c, m("water", "water"));
  for (const sx of [-1, 1]) Tube(g, [[sx * 0.25, h, -d / 2 + c + 0.05], [sx * 0.25, h + 0.6, -d / 2 + c - 0.05], [sx * 0.25, h + 0.6, -d / 2 + c + 0.2], [sx * 0.25, h - 0.3, -d / 2 + c + 0.3]], 0.022, m("chrome", "ladder"), 20);
};

MB.bbq = (g, P, m) => {
  const {w, d, h} = P;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Cy(g, 0.015, 0, h - 0.28, sx * (w / 2 - 0.08), sz * (d / 2 - 0.08), m("darkmetal", "body"), 8);
  B(g, -w / 2 + 0.05, w / 2 - 0.05, h - 0.3, h - 0.06, -d / 2 + 0.03, d / 2 - 0.03, m("darkmetal", "body"));
  const n = Math.max(3, Math.round((d - 0.1) / 0.05));
  for (let i = 0; i < n; i++) CyX(g, 0.005, -w / 2 + 0.07, w / 2 - 0.07, h - 0.05, -d / 2 + 0.06 + i * (d - 0.12) / (n - 1), m("steel", "grill"), 6);
  B(g, -w / 2 + 0.05, w / 2 - 0.05, h - 0.45, h - 0.43, -d / 2 + 0.06, d / 2 - 0.06, m("wood_mid", "shelf"));
};

MB.bench = (g, P, m) => {
  const {w, d, h} = P;
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.08);
    B(g, x - 0.03, x + 0.03, 0, 0.42, -d / 2 + 0.05, d / 2 - 0.05, m("darkmetal", "frame"));
    B(g, x - 0.03, x + 0.03, 0.42, h, -d / 2 + 0.02, -d / 2 + 0.08, m("darkmetal", "frame"));
  }
  const sd = (d - 0.12) / 4;
  for (let i = 0; i < 4; i++) {
    const z0 = -d / 2 + 0.06 + i * sd;
    B(g, -w / 2, w / 2, 0.42, 0.45, z0 + 0.008, z0 + sd - 0.008, m("wood_mid", "seat"));
  }
  for (let i = 0; i < 3; i++) {
    const y0 = 0.55 + i * (h - 0.6) / 3;
    B(g, -w / 2, w / 2, y0, y0 + 0.08, -d / 2 + 0.08, -d / 2 + 0.11, m("wood_mid", "seat"));
  }
};

MB.swing = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_raw", "frame");
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.08);
    Lb(g, [x, 0, -d / 2 + 0.1], [x, h - 0.06, 0], 0.045, 0.04, wood, 8);
    Lb(g, [x, 0, d / 2 - 0.1], [x, h - 0.06, 0], 0.045, 0.04, wood, 8);
  }
  CyX(g, 0.06, -w / 2, w / 2, h - 0.06, 0, wood, 12);
  for (const sx of [-1, 1]) Cy(g, 0.01, 0.45, h - 0.1, sx * 0.28, 0, m("wood_dark", "ropes"), 6);
  B(g, -0.32, 0.32, 0.42, 0.46, -0.13, 0.13, m("wood_mid", "seat"));
};

MB.chair = (g, P, m) => {
  const {w, d, h} = P;
  const sy = Math.min(0.46, h * 0.52);
  const wood = m("wood_mid", "chair");
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.035);
    TLeg(g, x, d / 2 - 0.04, 0, sy - 0.03, 0.013, 0.019, wood);
    Lb(g, [x, 0, -d / 2 + 0.035], [x, h - 0.05, -d / 2 + 0.01], 0.014, 0.019, wood, 10);
  }
  RB(g, -w / 2 + 0.01, w / 2 - 0.01, sy - 0.055, sy - 0.03, -d / 2 + 0.02, d / 2 - 0.01, 0.008, wood);
  Cushion(g, -w / 2, w / 2, sy - 0.035, sy + 0.01, -d / 2 + 0.03, d / 2, 0.018, 0.012, m("fabric_grey", "seat"));
  const bk = new THREE.Group();
  bk.position.set(0, h - 0.16, -d / 2 + 0.03);
  bk.rotation.x = Math.PI / 2 - 0.13;
  g.add(bk);
  Cushion(bk, -w / 2 + 0.02, w / 2 - 0.02, -0.02, 0.02, -0.11, 0.11, 0.015, 0.008, m("fabric_grey", "seat"));
  CyX(g, 0.012, -w / 2 + 0.035, w / 2 - 0.035, sy * 0.45, d / 2 - 0.04, wood, 8);
};

MB.gardenset = (g, P, m) => {
  const {w, d} = P;
  const tw = Math.max(0.6, Math.min(w, d) - 1);
  const wood = m("wood_mid", "table");
  B(g, -tw / 2, tw / 2, 0.72, 0.75, -tw / 2, tw / 2, wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, sx * (tw / 2 - 0.06) - 0.025, sx * (tw / 2 - 0.06) + 0.025, 0, 0.72, sz * (tw / 2 - 0.06) - 0.025, sz * (tw / 2 - 0.06) + 0.025, wood);
  const pos = [[0, -tw / 2 - 0.2, 0], [0, tw / 2 + 0.2, Math.PI], [-tw / 2 - 0.2, 0, Math.PI / 2], [tw / 2 + 0.2, 0, -Math.PI / 2]];
  for (const [x, z, a] of pos) {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = a;
    g.add(c);
    MB.chair(c, {w: 0.45, d: 0.5, h: 0.9}, m);
  }
};

function ns(mesh) {
  if (mesh) mesh.castShadow = false;
  return mesh;
}

function bulbMat(P, m, soft) {
  return P.lit ? m(glowKey(P.K, soft ? "soft" : "glow"), "bulb") : m(soft ? "opal" : "bulb_off", "bulb");
}

function shadeMat(P, m) {
  return P.lit ? m(glowKey(P.K, "shadeon"), "shade") : m("lampshade", "shade");
}

function Shell(p, rTop, rBot, y0, y1, x, z, mt, seg) {
  const g = new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg || 24, 1, true);
  uvScale(g, 2 * Math.PI * Math.max(rTop, rBot), y1 - y0);
  const mesh = addMesh(p, g, mt);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return mesh;
}

function lightAt(P, x, y, z) {
  if (P.lights) P.lights.push([x, y, z]);
}

MB.lamp = (g, P, m) => {
  const h = P.h;
  Cy(g, 0.1, 0, 0.1, 0, 0, m("darkmetal", "body"), 12);
  Cy(g, 0.035, 0.1, h - 0.3, 0, 0, m("darkmetal", "body"), 10);
  ns(B(g, -0.1, 0.1, h - 0.3, h - 0.08, -0.1, 0.1, bulbMat(P, m, true)));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ns(B(g, sx * 0.1 - 0.012, sx * 0.1 + 0.012, h - 0.3, h - 0.08, sz * 0.1 - 0.012, sz * 0.1 + 0.012, m("darkmetal", "body")));
  const cap = ns(Cone(g, 0.17, h - 0.08, h, 0, 0, m("darkmetal", "body"), 4));
  cap.rotation.y = Math.PI / 4;
  lightAt(P, 0, h - 0.19, 0);
};

MB.streetlamp = (g, P, m) => {
  const {w, d, h} = P;
  const pz = -d / 2 + 0.15;
  Cy(g, 0.14, 0, 0.5, 0, pz, m("concrete", "base"), 16);
  Cy(g, 0.075, 0.5, h - 0.25, 0, pz, m("graphite", "body"), 16, 0.05);
  const hz = d / 2 - 0.25;
  Lb(g, [0, h - 0.3, pz], [0, h - 0.12, hz - 0.1], 0.04, 0.035, m("graphite", "body"), 10);
  ns(RB(g, -Math.min(0.2, w / 2), Math.min(0.2, w / 2), h - 0.2, h - 0.08, hz - 0.3, hz + 0.22, 0.03, m("graphite", "body")));
  ns(B(g, -Math.min(0.17, w / 2 - 0.03), Math.min(0.17, w / 2 - 0.03), h - 0.215, h - 0.2, hz - 0.26, hz + 0.18, bulbMat(P, m, true)));
  lightAt(P, 0, h - 0.4, hz);
};

MB.bollard = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  Cy(g, r, 0, h - 0.14, 0, 0, m("graphite", "body"), 20);
  ns(Cy(g, r * 0.92, h - 0.14, h - 0.04, 0, 0, bulbMat(P, m, true), 20));
  ns(Cy(g, r * 1.05, h - 0.04, h, 0, 0, m("graphite", "body"), 20));
  lightAt(P, 0, h - 0.09, 0);
};

MB.walllamp = (g, P, m) => {
  const {w, d, h} = P;
  const zb = -d / 2;
  B(g, -0.05, 0.05, h * 0.2, h * 0.8, zb, zb + 0.02, m("graphite", "body"));
  Lb(g, [0, h * 0.5, zb + 0.02], [0, h * 0.5, zb + 0.08], 0.012, 0.012, m("graphite", "body"), 8);
  const bw = Math.min(w, d - 0.08) / 2;
  const zc = zb + 0.08 + bw;
  ns(B(g, -bw, bw, 0.02, h - 0.08, zc - bw, zc + bw, m("glass_frost", "glass")));
  ns(Sp(g, 0.035, 0, h * 0.45, zc, bulbMat(P, m), 1, 1.4, 1, 12));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ns(B(g, sx * bw - 0.01, sx * bw + 0.01, 0.02, h - 0.08, zc + sz * bw - 0.01, zc + sz * bw + 0.01, m("graphite", "body")));
  ns(B(g, -bw - 0.02, bw + 0.02, 0, 0.025, zc - bw - 0.02, zc + bw + 0.02, m("graphite", "body")));
  const cap = ns(Cone(g, bw * 1.6, h - 0.08, h, 0, zc, m("graphite", "body"), 4));
  cap.rotation.y = Math.PI / 4;
  lightAt(P, 0, h * 0.45, zc);
};

MB.garland = (g, P, m) => {
  const {w, h} = P;
  const x0 = -w / 2 + 0.05;
  const x1 = w / 2 - 0.05;
  for (const x of [x0, x1]) Cy(g, 0.04, 0, h, x, 0, m("wood_dark", "body"), 10);
  const sag = Math.min(0.5, w * 0.08);
  const yAt = t => h - 0.08 - sag * 4 * t * (1 - t);
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([x0 + (x1 - x0) * t, yAt(t), 0]);
  }
  ns(Tube(g, pts, 0.004, m("black", "wire"), 32));
  const n = Math.max(2, Math.round((x1 - x0) / 0.45));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    ns(Sp(g, 0.03, x0 + (x1 - x0) * t, yAt(t) - 0.05, 0, bulbMat(P, m), 1, 1.25, 1, 10));
  }
  for (const t of [0.25, 0.75]) lightAt(P, x0 + (x1 - x0) * t, yAt(t) - 0.1, 0);
};

MB.ceil = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  ns(Cy(g, r * 0.96, h - 0.02, h, 0, 0, m("white", "body"), 32));
  ns(Cy(g, r, 0, h - 0.02, 0, 0, bulbMat(P, m, true), 32, r * 0.96));
  lightAt(P, 0, -0.06, 0);
};

MB.chandelier = (g, P, m) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2 * 0.82;
  const met = m("brass", "body");
  ns(Cy(g, 0.07, h - 0.03, h, 0, 0, met, 20));
  ns(Cy(g, 0.008, 0.3, h - 0.03, 0, 0, met, 8));
  ns(Sp(g, 0.05, 0, 0.3, 0, met, 1, 0.8, 1, 16));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    ns(Tube(g, [[0, 0.3, 0], [x * 0.5, 0.2, z * 0.5], [x * 0.95, 0.24, z * 0.95], [x, 0.33, z]], 0.008, met, 12));
    ns(Cy(g, 0.022, 0.33, 0.36, x, z, met, 10));
    ns(Shell(g, 0.05, 0.075, 0.36, 0.5, x, z, shadeMat(P, m), 16));
    ns(Sp(g, 0.022, x, 0.41, z, bulbMat(P, m), 1, 1.3, 1, 10));
  }
  lightAt(P, 0, 0.4, 0);
};

MB.pendant = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  ns(Cy(g, 0.05, h - 0.02, h, 0, 0, m("shade_metal", "body"), 16));
  ns(Cy(g, 0.004, 0.24, h - 0.02, 0, 0, m("black", "wire"), 6));
  ns(Shell(g, 0.05, r, 0.02, 0.24, 0, 0, m("shade_metal", "body"), 28));
  ns(Cy(g, 0.05, 0.24, 0.25, 0, 0, m("shade_metal", "body"), 16));
  ns(Sp(g, 0.04, 0, 0.08, 0, bulbMat(P, m), 1, 1.2, 1, 12));
  lightAt(P, 0, 0.0, 0);
};

MB.floorlamp = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  Cy(g, r * 0.62, 0, 0.03, 0, 0, m("graphite", "body"), 24);
  Cy(g, 0.012, 0.03, h - 0.3, 0, 0, m("graphite", "body"), 8);
  ns(Shell(g, r * 0.78, r, h - 0.34, h, 0, 0, shadeMat(P, m), 28));
  ns(Sp(g, 0.035, 0, h - 0.18, 0, bulbMat(P, m), 1, 1.3, 1, 12));
  lightAt(P, 0, h - 0.17, 0);
};

MB.tablelamp = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  Sp(g, 1, 0, h * 0.2, 0, m("ceramic", "body"), r * 0.42, h * 0.2, r * 0.42, 20);
  Cy(g, 0.01, h * 0.35, h - 0.16, 0, 0, m("brass", "stem"), 8);
  ns(Shell(g, r * 0.72, r, h - 0.22, h, 0, 0, shadeMat(P, m), 24));
  ns(Sp(g, 0.025, 0, h - 0.12, 0, bulbMat(P, m), 1, 1.3, 1, 10));
  lightAt(P, 0, h - 0.11, 0);
};

MB.sconce = (g, P, m) => {
  const {w, d, h} = P;
  const zb = -d / 2;
  B(g, -0.05, 0.05, h * 0.25, h * 0.6, zb, zb + 0.015, m("brass", "body"));
  Lb(g, [0, h * 0.42, zb + 0.015], [0, h * 0.4, zb + d * 0.55], 0.008, 0.008, m("brass", "body"), 8);
  const r = Math.min(w / 2, d * 0.45);
  const zc = zb + d * 0.55;
  ns(Shell(g, r, r * 0.7, h * 0.4, h, 0, zc, shadeMat(P, m), 20));
  ns(Sp(g, 0.022, 0, h * 0.55, zc, bulbMat(P, m), 1, 1.3, 1, 10));
  lightAt(P, 0, h * 0.62, zc);
};

MB.person = (g, P, m) => {
  const s = new THREE.Group();
  s.scale.set(P.w / 0.5, P.h / 1.75, P.d / 0.3);
  g.add(s);
  const sk = m("skin");
  const sh = m("shirt");
  const pa = m("pants");
  for (const sx of [-1, 1]) {
    const x = sx * 0.1;
    RB(s, x - 0.055, x + 0.055, 0, 0.075, -0.07, 0.19, 0.03, m("shoes"));
    Lb(s, [x, 0.07, 0], [x, 0.49, 0.005], 0.045, 0.058, pa);
    Sp(s, 0.058, x, 0.49, 0.005, pa);
    Lb(s, [x, 0.49, 0.005], [x * 0.95, 0.9, 0], 0.06, 0.085, pa);
    Sp(s, 0.065, sx * 0.195, 1.415, -0.005, sh);
    Lb(s, [sx * 0.2, 1.42, -0.005], [sx * 0.235, 1.12, 0], 0.05, 0.043, sh);
    Sp(s, 0.042, sx * 0.235, 1.12, 0, sh);
    Lb(s, [sx * 0.235, 1.12, 0], [sx * 0.245, 0.87, 0.035], 0.04, 0.031, sk);
    Sp(s, 0.042, sx * 0.247, 0.81, 0.04, sk, 0.6, 1.45, 0.9);
  }
  Sp(s, 1, 0, 0.94, 0, pa, 0.175, 0.11, 0.115);
  Sp(s, 1, 0, 1.07, 0, sh, 0.165, 0.16, 0.11);
  Sp(s, 1, 0, 1.28, 0, sh, 0.195, 0.2, 0.12);
  Cy(s, 0.05, 1.44, 1.56, 0, 0.005, sk, 12);
  Sp(s, 1, 0, 1.635, 0.008, sk, 0.08, 0.11, 0.1);
  Sp(s, 1, 0, 1.662, -0.012, m("hair"), 0.083, 0.088, 0.098);
};

MB.sofa = (g, P, m, rnd, opt) => {
  const {w, d, h} = P;
  const o = opt || {};
  const fab = m(o.fab || "fabric_grey", "uph");
  const armL = o.armL !== false;
  const armR = o.armR !== false;
  const arm = Math.min(0.19, w * 0.13);
  const bf = Math.min(0.13, d * 0.14);
  const bc = Math.min(0.19, d * 0.2);
  const seatY = Math.min(0.45, h * 0.53);
  const legs = m("wood_dark", "legs");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) TLeg(g, sx * (w / 2 - 0.07), sz * (d / 2 - 0.07), 0, 0.1, 0.014, 0.022, legs);
  const xl = -w / 2 + (armL ? arm : 0);
  const xr = w / 2 - (armR ? arm : 0);
  Cushion(g, xl - 0.01, xr + 0.01, 0.1, seatY - 0.13, -d / 2 + bf - 0.02, d / 2, 0.03, 0, fab);
  Cushion(g, -w / 2, w / 2, 0.1, h - 0.07, -d / 2, -d / 2 + bf, 0.045, 0, fab);
  const armTop = Math.min(h - 0.05, seatY + 0.2);
  if (armL) Cushion(g, -w / 2, -w / 2 + arm, 0.1, armTop, -d / 2, d / 2, 0.07, 0.01, fab);
  if (armR) Cushion(g, w / 2 - arm, w / 2, 0.1, armTop, -d / 2, d / 2, 0.07, 0.01, fab);
  const inner = xr - xl;
  const n = inner > 1.5 ? 3 : inner > 0.95 ? 2 : 1;
  const cw = inner / n;
  const zb = -d / 2 + bf;
  const ch = h - seatY + 0.02;
  for (let i = 0; i < n; i++) {
    const x0 = xl + i * cw;
    Cushion(g, x0 + 0.004, x0 + cw - 0.004, seatY - 0.135, seatY, zb + bc - 0.03, d / 2 - 0.005, 0.045, 0.028, fab);
    const bg = new THREE.Group();
    bg.position.set(x0 + cw / 2, seatY + ch / 2 - 0.03, zb + bc / 2);
    bg.rotation.x = Math.PI / 2 - 0.16;
    g.add(bg);
    Cushion(bg, -cw / 2 + 0.006, cw / 2 - 0.006, -bc / 2, bc / 2, -ch / 2, ch / 2, 0.06, 0.035, fab);
  }
  if (inner > 1.1) {
    const cm = m(o.pill || "fabric_terra", "cushions");
    for (const sx of [-1, 1]) {
      if ((sx < 0 && !armL) || (sx > 0 && !armR)) continue;
      const x = sx < 0 ? xl + 0.25 : xr - 0.25;
      Pillow(g, x, seatY + 0.2, zb + bc + 0.07, 0.42, 0.42, 0.15, cm, -0.32, sx * -0.18);
    }
  }
};

MB.armchair = (g, P, m, rnd) => MB.sofa(g, P, m, rnd, {fab: "fabric_green", pill: "fabric_beige"});

MB.sofaL = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const sd = Math.min(0.95, d * 0.6);
  const main = new THREE.Group();
  main.position.set(0, 0, -d / 2 + sd / 2);
  g.add(main);
  MB.sofa(main, {w, d: sd, h}, m, rnd, {armR: false});
  const cw = Math.min(0.95, w * 0.4);
  const fab = m("fabric_grey", "uph");
  const seatY = Math.min(0.45, h * 0.53);
  Cushion(g, w / 2 - cw, w / 2, 0.1, seatY - 0.13, -d / 2 + sd - 0.05, d / 2, 0.03, 0, fab);
  Cushion(g, w / 2 - cw + 0.004, w / 2 - 0.004, seatY - 0.135, seatY, -d / 2 + sd - 0.02, d / 2 - 0.005, 0.045, 0.028, fab);
  const legs = m("wood_dark", "legs");
  TLeg(g, w / 2 - 0.07, d / 2 - 0.07, 0, 0.1, 0.014, 0.022, legs);
  TLeg(g, w / 2 - cw + 0.07, d / 2 - 0.07, 0, 0.1, 0.014, 0.022, legs);
};

MB.coffee = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, h - 0.04, h, -d / 2, d / 2, 0.016, m("wood_mid", "top"));
  RB(g, -w / 2 + 0.06, w / 2 - 0.06, 0.1, 0.12, -d / 2 + 0.06, d / 2 - 0.06, 0.006, m("wood_mid", "shelf"));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) TLeg(g, sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), 0, h - 0.04, 0.011, 0.018, m("black", "legs"));
};

MB.tv = (g, P, m) => {
  const {w, d, h} = P;
  const cab = Math.min(0.5, h * 0.42);
  legs4(g, w, d, 0.08, 0.06, 0.015, m("black", "legs"));
  B(g, -w / 2, w / 2, 0.08, cab, -d / 2, d / 2 - 0.02, m("white", "body"));
  fronts(g, -w / 2, w / 2, 0.08, cab, d / 2 - 0.02, 1, Math.max(2, Math.round(w / 0.6)), 1, m("wood_light", "fronts"), null, false);
  const tw = Math.min(w - 0.1, 1.45);
  const th = tw * 0.575;
  const y0 = Math.max(cab + 0.08, h - th);
  if (h - cab > 0.3) {
    B(g, -0.16, 0.16, cab, cab + 0.012, -0.1, 0.06, m("black", "tv"));
    B(g, -0.03, 0.03, cab, y0 + 0.1, -0.06, -0.03, m("black", "tv"));
    B(g, -tw / 2, tw / 2, y0, Math.min(h, y0 + th), -0.03, 0, m("black", "tv"));
    B(g, -tw / 2 + 0.008, tw / 2 - 0.008, y0 + 0.008, Math.min(h, y0 + th) - 0.008, 0, 0.002, m("screen", "screen"));
  }
};

MB.shelf = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const t = 0.022;
  const wood = m("wood_light", "body");
  B(g, -w / 2, -w / 2 + t, 0, h, -d / 2, d / 2, wood);
  B(g, w / 2 - t, w / 2, 0, h, -d / 2, d / 2, wood);
  B(g, -w / 2 + t, w / 2 - t, 0, h, -d / 2, -d / 2 + 0.008, wood);
  const n = Math.max(2, Math.round(h / 0.38));
  const lh = (h - t) / n;
  for (let i = 0; i <= n; i++) B(g, -w / 2 + t, w / 2 - t, i * lh, i * lh + t, -d / 2, d / 2, wood);
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.2) continue;
    let x = -w / 2 + t + 0.01;
    const y = i * lh + t;
    const lim = w / 2 - t - 0.05 - rnd() * w * 0.3;
    while (x < lim) {
      const bw = 0.02 + rnd() * 0.035;
      const bh = Math.min(0.32, lh - 0.05) * (0.7 + rnd() * 0.3);
      B(g, x, x + bw, y, y + bh, -d / 2 + 0.02, d / 2 - 0.03 - rnd() * 0.03, m("book_" + (1 + Math.floor(rnd() * 4)), "books"));
      x += bw + 0.002;
    }
  }
};

MB.rug = (g, P, m) => {
  const {w, d} = P;
  const h = Math.max(0.006, P.h);
  B(g, -w / 2, w / 2, 0, h, -d / 2, d / 2, m("rug", "rug"));
  if (w > 0.5 && d > 0.5) B(g, -w / 2 + 0.12, w / 2 - 0.12, h, h + 0.001, -d / 2 + 0.12, d / 2 - 0.12, m("fabric_beige", "center"));
};

MB.plant = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const potH = Math.min(0.4, h * 0.3);
  Cy(g, R * 0.52, 0, potH, 0, 0, m("terracotta", "pot"), 16, R * 0.68);
  Cy(g, R * 0.62, potH - 0.03, potH - 0.01, 0, 0, m("soil", "soil"), 16);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.5;
    const lean = 0.25 + rnd() * 0.45;
    const top = [Math.cos(a) * R * lean, potH + (h - potH) * (0.55 + rnd() * 0.4), Math.sin(a) * R * lean];
    Lb(g, [0, potH - 0.02, 0], top, 0.008, 0.005, m("leaf_dark", "stems"), 5);
    const lf = Sp(g, 1, top[0], top[1], top[2], m(i % 2 ? "leaf" : "leaf_light", "leaves"), R * 0.32, 0.03, R * 0.14, 10);
    lf.rotation.y = -a;
    lf.rotation.z = (rnd() - 0.5) * 0.8;
  }
};

MB.bed = (g, P, m) => {
  const {w, d, h} = P;
  const fab = m("fabric_beige", "bed");
  const hb = 0.09;
  const legs = m("wood_dark", "legs");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) TLeg(g, sx * (w / 2 - 0.08), sz * (d / 2 - 0.08), 0, 0.09, 0.016, 0.022, legs);
  Cushion(g, -w / 2, w / 2, 0.09, 0.36, -d / 2 + hb - 0.01, d / 2, 0.035, 0, fab);
  Cushion(g, -w / 2 + 0.03, w / 2 - 0.03, 0.34, 0.56, -d / 2 + hb + 0.02, d / 2 - 0.03, 0.06, 0.012, m("fabric_white", "mattress"));
  Cushion(g, -w / 2, w / 2, 0.09, 0.4, -d / 2, -d / 2 + hb, 0.03, 0, fab);
  const hbTop = Math.max(0.8, h);
  const nc = Math.max(3, Math.round(w / 0.2));
  const cw = w / nc;
  const hm = m("fabric_beige", "headboard");
  for (let i = 0; i < nc; i++) {
    const hg = new THREE.Group();
    hg.position.set(-w / 2 + (i + 0.5) * cw, (0.36 + hbTop) / 2, -d / 2 + hb / 2 + 0.01);
    hg.rotation.x = Math.PI / 2;
    g.add(hg);
    Cushion(hg, -cw / 2 + 0.003, cw / 2 - 0.003, -hb / 2, hb / 2, -(hbTop - 0.36) / 2, (hbTop - 0.36) / 2, 0.035, 0.018, hm);
  }
  const zd = -d / 2 + hb + 0.52;
  Cushion(g, -w / 2 - 0.02, w / 2 + 0.02, 0.4, 0.63, zd, d / 2 + 0.03, 0.08, 0.03, m("fabric_blue", "blanket"));
  CyX(g, 0.045, -w / 2 - 0.015, w / 2 + 0.015, 0.6, zd + 0.02, m("fabric_white", "blanket"), 14);
  const np = w > 1.3 ? 2 : 1;
  const pw = Math.min(0.68, (w - 0.12) / np - 0.03);
  const pm = m("fabric_white", "pillows");
  for (let i = 0; i < np; i++) {
    const x = np === 1 ? 0 : (i ? 1 : -1) * (w / 4);
    Pillow(g, x, 0.66, -d / 2 + hb + 0.2, pw, 0.44, 0.17, pm, -1.2, 0);
  }
  if (w > 1.3) Pillow(g, 0, 0.72, -d / 2 + hb + 0.36, 0.45, 0.32, 0.13, m("fabric_terra", "cushions"), -0.55, 0);
  Cushion(g, -w / 2 - 0.03, w / 2 + 0.03, 0.5, 0.645, d / 2 - 0.5, d / 2 + 0.035, 0.05, 0.012, m("fabric_grey", "throw"));
};

MB.bed2 = MB.bed;
MB.bed1 = MB.bed;

MB.nightstand = (g, P, m) => {
  const {w, d, h} = P;
  legs4(g, w, d, 0.08, 0.04, 0.012, m("wood_dark", "legs"));
  B(g, -w / 2, w / 2, 0.08, h, -d / 2, d / 2 - 0.018, m("wood_light", "body"));
  fronts(g, -w / 2, w / 2, 0.1, h - 0.03, d / 2 - 0.018, 1, 1, 2, m("wood_light", "fronts"), m("steel", "handles"), false);
};

MB.dresser = (g, P, m) => {
  const {w, d, h} = P;
  legs4(g, w, d, 0.1, 0.05, 0.015, m("wood_dark", "legs"));
  B(g, -w / 2, w / 2, 0.1, h, -d / 2, d / 2 - 0.018, m("white", "body"));
  fronts(g, -w / 2 + 0.01, w / 2 - 0.01, 0.12, h - 0.03, d / 2 - 0.018, 1, w > 1 ? 2 : 1, Math.max(2, Math.round((h - 0.15) / 0.2)), m("wood_light", "fronts"), m("steel", "handles"), false);
};

MB.wardrobe = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, 0.08, -d / 2 + 0.02, d / 2 - 0.05, m("graphite", "plinth"));
  B(g, -w / 2, w / 2, 0.08, h, -d / 2, d / 2 - 0.018, m("white", "body"));
  fronts(g, -w / 2, w / 2, 0.08, h, d / 2 - 0.018, 1, Math.max(2, Math.round(w / 0.5)), 1, m("white_gloss", "fronts"), m("steel", "handles"), true);
};

MB.desk = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, h - 0.03, h, -d / 2, d / 2, 0.008, m("wood_light", "top"));
  B(g, -w / 2 + 0.02, -w / 2 + 0.05, 0, h - 0.03, -d / 2 + 0.03, d / 2 - 0.03, m("white", "legs"));
  B(g, w / 2 - 0.05, w / 2 - 0.02, 0, h - 0.03, -d / 2 + 0.03, d / 2 - 0.03, m("white", "legs"));
  B(g, -w / 2 + 0.05, w / 2 - 0.05, h - 0.35, h - 0.03, -d / 2 + 0.04, -d / 2 + 0.06, m("white", "legs"));
  if (w > 0.95) {
    B(g, w / 2 - 0.47, w / 2 - 0.05, 0.02, h - 0.05, -d / 2 + 0.06, d / 2 - 0.05, m("white", "body"));
    fronts(g, w / 2 - 0.47, w / 2 - 0.05, 0.02, h - 0.05, d / 2 - 0.05, 1, 1, 3, m("white_gloss", "fronts"), m("steel", "handles"), false);
  }
};

MB.fridge = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, 0.02, h, -d / 2, d / 2 - 0.05, 0.02, m("steel", "body"));
  const split = h * 0.62;
  RB(g, -w / 2 + 0.005, w / 2 - 0.005, 0.03, split - 0.005, d / 2 - 0.06, d / 2, 0.015, m("steel", "fronts"));
  RB(g, -w / 2 + 0.005, w / 2 - 0.005, split + 0.005, h - 0.005, d / 2 - 0.06, d / 2, 0.015, m("steel", "fronts"));
  B(g, w / 2 - 0.07, w / 2 - 0.05, split - 0.45, split - 0.05, d / 2, d / 2 + 0.035, m("chrome", "handles"));
  B(g, w / 2 - 0.07, w / 2 - 0.05, split + 0.05, split + 0.4, d / 2, d / 2 + 0.035, m("chrome", "handles"));
};

MB.island = (g, P, m) => {
  const {w, d, h} = P;
  const ov = Math.min(0.3, d * 0.3);
  B(g, -w / 2 + 0.02, w / 2 - 0.02, 0, 0.1, -d / 2 + 0.07, d / 2 - ov - 0.05, m("graphite", "plinth"));
  B(g, -w / 2 + 0.02, w / 2 - 0.02, 0.1, h - 0.04, -d / 2 + 0.02, d / 2 - ov, m("white", "body"));
  fronts(g, -w / 2 + 0.02, w / 2 - 0.02, 0.1, h - 0.04, -d / 2 + 0.02, -1, Math.max(1, Math.round(w / 0.6)), 1, m("white_gloss", "fronts"), m("steel", "handles"), true);
  B(g, -w / 2, w / 2, h - 0.04, h, -d / 2, d / 2, m("wood_light", "top"));
};

MB.table = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, h - 0.04, h, -d / 2, d / 2, 0.014, m("wood_light", "top"));
  const lg = m("wood_light", "legs");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) TLeg(g, sx * (w / 2 - 0.08), sz * (d / 2 - 0.08), 0, h - 0.04, 0.018, 0.028, lg);
  const rl = m("wood_light", "rails");
  RB(g, -w / 2 + 0.1, w / 2 - 0.1, h - 0.11, h - 0.04, -d / 2 + 0.07, -d / 2 + 0.09, 0.004, rl);
  RB(g, -w / 2 + 0.1, w / 2 - 0.1, h - 0.11, h - 0.04, d / 2 - 0.09, d / 2 - 0.07, 0.004, rl);
  RB(g, -w / 2 + 0.07, -w / 2 + 0.09, h - 0.11, h - 0.04, -d / 2 + 0.1, d / 2 - 0.1, 0.004, rl);
  RB(g, w / 2 - 0.09, w / 2 - 0.07, h - 0.11, h - 0.04, -d / 2 + 0.1, d / 2 - 0.1, 0.004, rl);
};

MB.dining = (g, P, m) => {
  const {w, d} = P;
  const tw = Math.max(0.8, w - 1);
  const td = Math.max(0.7, d - 1);
  const tg = new THREE.Group();
  g.add(tg);
  MB.table(tg, {w: tw, d: td, h: 0.75}, m);
  const chair = (x, z, a) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = a;
    g.add(c);
    MB.chair(c, {w: 0.45, d: 0.5, h: 0.9}, m);
  };
  const n = Math.max(1, Math.floor(tw / 0.6));
  for (let i = 0; i < n; i++) {
    const x = -tw / 2 + (i + 0.5) * tw / n;
    chair(x, -td / 2 - 0.12, 0);
    chair(x, td / 2 + 0.12, Math.PI);
  }
  chair(-tw / 2 - 0.12, 0, Math.PI / 2);
  chair(tw / 2 + 0.12, 0, -Math.PI / 2);
};

MB.rtable = (g, P, m) => {
  const {w, d, h} = P;
  const top = Cy(g, w / 2, h - 0.035, h, 0, 0, m("wood_light", "top"), 40);
  top.scale.set(1, 1, d / w);
  Cy(g, 0.05, 0.03, h - 0.035, 0, 0, m("black", "legs"), 12);
  const foot = Cy(g, Math.min(w, d) * 0.22, 0, 0.03, 0, 0, m("black", "legs"), 24);
  foot.castShadow = true;
};

MB.toilet = (g, P, m) => {
  const {w, d, h} = P;
  const c = m("ceramic", "ceramic");
  RB(g, -w / 2, w / 2, 0.4, h, -d / 2, -d / 2 + 0.18, 0.03, c);
  B(g, -0.035, 0.035, h, h + 0.005, -d / 2 + 0.06, -d / 2 + 0.12, m("chrome", "button"));
  const zc = -d / 2 + 0.18 + (d - 0.18) * 0.45;
  const ped = Cy(g, w * 0.28, 0, 0.3, 0, zc - 0.05, c, 20, w * 0.33);
  ped.scale.set(1, 1, 1.25);
  Sp(g, 1, 0, 0.33, zc, c, w * 0.46, 0.09, (d - 0.18) * 0.5, 22);
  const seat = Cy(g, 1, 0.4, 0.43, 0, zc, m("white_gloss", "lid2"), 28);
  seat.scale.set(w * 0.47, 1, (d - 0.2) * 0.52);
  B(g, -w * 0.4, w * 0.4, 0.43, 0.43 + Math.min(0.42, h - 0.45), -d / 2 + 0.18, -d / 2 + 0.2, m("white_gloss", "lid2"));
};

MB.basin = (g, P, m) => {
  const {w, d, h} = P;
  const top = Math.min(0.86, h);
  B(g, -w / 2, w / 2, 0.35, top - 0.05, -d / 2, d / 2 - 0.02, m("wood_light", "body"));
  fronts(g, -w / 2, w / 2, 0.35, top - 0.05, d / 2 - 0.02, 1, w > 0.7 ? 2 : 1, 1, m("wood_light", "fronts"), m("steel", "handles"), false);
  RB(g, -w / 2, w / 2, top - 0.05, top, -d / 2, d / 2, 0.02, m("ceramic", "ceramic"));
  const bowl = Cy(g, 1, top - 0.001, top + 0.001, 0, 0.02, m("col#d9dad8", "ceramic"), 28);
  bowl.scale.set(w * 0.34, 1, d * 0.3);
  Cy(g, 0.016, top, top + 0.19, 0, -d / 2 + 0.06, m("chrome", "faucet"), 10);
  Lb(g, [0, top + 0.18, -d / 2 + 0.06], [0, top + 0.18, -d / 2 + 0.16], 0.01, 0.01, m("chrome", "faucet"), 8);
  if (h > 1.3) {
    const y1 = Math.min(h, top + 1.0);
    B(g, -w / 2 + 0.01, w / 2 - 0.01, top + 0.2, y1, -d / 2, -d / 2 + 0.01, m("black", "mirrorframe"));
    B(g, -w / 2 + 0.03, w / 2 - 0.03, top + 0.22, y1 - 0.02, -d / 2 + 0.01, -d / 2 + 0.016, m("mirror", "mirror"));
  }
};

MB.bathtub = (g, P, m) => {
  const {w, d, h} = P;
  const c = m("ceramic", "ceramic");
  const t = 0.07;
  RB(g, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + t, 0.02, c);
  RB(g, -w / 2, w / 2, 0, h, d / 2 - t, d / 2, 0.02, c);
  RB(g, -w / 2, -w / 2 + t, 0, h, -d / 2, d / 2, 0.02, c);
  RB(g, w / 2 - t, w / 2, 0, h, -d / 2, d / 2, 0.02, c);
  B(g, -w / 2 + t, w / 2 - t, 0, 0.14, -d / 2 + t, d / 2 - t, c);
  Cy(g, 0.02, h, h + 0.14, 0, -d / 2 + 0.035, m("chrome", "faucet"), 10);
  Lb(g, [0, h + 0.13, -d / 2 + 0.035], [0, h + 0.1, -d / 2 + 0.17], 0.013, 0.013, m("chrome", "faucet"), 8);
};

MB.shower = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, 0.004, -d / 2, d / 2, m("porcelain", "floor"));
  B(g, -w / 2 + 0.1, w / 2 - 0.1, 0.004, 0.007, -d / 2 + 0.06, -d / 2 + 0.12, m("steel", "drain"));
  const gh = Math.min(h, 2);
  B(g, w / 2 - 0.01, w / 2, 0, gh, -d / 2, d / 2 - 0.1, m("glass", "glass"));
  B(g, w / 2 - 0.016, w / 2 + 0.006, gh - 0.03, gh, -d / 2, d / 2 - 0.1, m("chrome", "faucet"));
  Cy(g, 0.012, 0.9, gh - 0.05, 0, -d / 2 + 0.04, m("chrome", "faucet"), 10);
  Lb(g, [0, gh - 0.05, -d / 2 + 0.04], [0, gh - 0.05, -d / 2 + 0.3], 0.01, 0.01, m("chrome", "faucet"), 8);
  Cy(g, 0.11, gh - 0.08, gh - 0.065, 0, -d / 2 + 0.32, m("chrome", "faucet"), 28);
  B(g, -0.05, 0.05, 1.0, 1.1, -d / 2, -d / 2 + 0.05, m("chrome", "faucet"));
};

MB.washer = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, 0.01, h, -d / 2, d / 2, 0.02, m("white", "body"));
  const r = Math.min(w, h) * 0.28;
  CyZ(g, r, d / 2 - 0.01, d / 2 + 0.03, 0, h * 0.45, m("steel", "drum"), 32);
  CyZ(g, r * 0.75, d / 2, d / 2 + 0.035, 0, h * 0.45, m("screen", "drum"), 32);
  B(g, -w / 2 + 0.02, w / 2 - 0.02, h - 0.12, h - 0.02, d / 2, d / 2 + 0.005, m("col#e1e1de", "panel"));
  CyZ(g, 0.03, d / 2, d / 2 + 0.03, w / 2 - 0.1, h - 0.07, m("steel", "drum"), 16);
};

MB.boiler = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, 0, h, -d / 2, d / 2, 0.02, m("white", "body"));
  B(g, -0.08, 0.08, h * 0.15, h * 0.25, d / 2, d / 2 + 0.004, m("screen", "screen"));
  for (let i = 0; i < 4; i++) Cy(g, 0.012, -0.3, 0, -w / 2 + 0.08 + i * (w - 0.16) / 3, 0, m("steel", "pipes"), 8);
  Cy(g, 0.05, h, h + 0.22, 0, 0, m("white", "flue"), 16);
  Lb(g, [0, h + 0.2, 0], [0, h + 0.2, -d / 2 - 0.1], 0.05, 0.05, m("white", "flue"), 16);
};

MB.tank = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  Cy(g, r, 0.06, h - r * 0.3, 0, 0, m("white", "body"), 28);
  Sp(g, r, 0, h - r * 0.3, 0, m("white", "body"), 1, 0.3, 1, 28);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    Cy(g, 0.02, 0, 0.06, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, m("graphite", "legs"), 8);
  }
};

MB.hanger = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0.02, 0.5, -d / 2, d / 2 - 0.018, m("white", "body"));
  fronts(g, -w / 2, w / 2, 0.02, 0.5, d / 2 - 0.018, 1, Math.max(1, Math.round(w / 0.5)), 1, m("white_gloss", "fronts"), m("steel", "handles"), false);
  RB(g, -w / 2 + 0.02, w / 2 - 0.02, 0.5, 0.56, -d / 2 + 0.02, d / 2 - 0.02, 0.02, m("fabric_grey", "seat"));
  B(g, -w / 2, w / 2, 0.56, h, -d / 2, -d / 2 + 0.02, m("wood_light", "panel"));
  B(g, -w / 2, w / 2, h - 0.25, h - 0.23, -d / 2, d / 2 - 0.05, m("wood_light", "panel"));
  const n = Math.max(2, Math.floor(w / 0.25));
  const cols = ["fabric_blue", "fabric_dark", "fabric_beige", "fabric_terra"];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * w / n;
    B(g, x - 0.01, x + 0.01, 1.6, 1.62, -d / 2 + 0.02, -d / 2 + 0.1, m("chrome", "hooks"));
    if (i % 2 === 0) Sp(g, 1, x, 1.22, -d / 2 + 0.14, m(cols[i % cols.length], "clothes"), Math.min(0.2, w / n * 0.8), 0.4, 0.08, 14);
  }
};

MB.closet = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, h, -d / 2, d / 2 - 0.07, m("white", "body"));
  B(g, -w / 2, w / 2, h - 0.06, h, d / 2 - 0.07, d / 2, m("steel", "rails2"));
  B(g, -w / 2, 0.02, 0.02, h - 0.06, d / 2 - 0.035, d / 2 - 0.01, m("mirror", "mirror"));
  B(g, -0.02, w / 2, 0.02, h - 0.06, d / 2 - 0.065, d / 2 - 0.04, m("wood_light", "door"));
  B(g, -w / 2, w / 2, 0, 0.02, d / 2 - 0.07, d / 2, m("steel", "rails2"));
};

function modelOf(o) {
  return MODELS[o.kind] || MODELS.other;
}

const PARTN = {
  body: "Корпус", top: "Столешница", legs: "Ножки", rails: "Царги", fronts: "Фасады", handles: "Ручки", plinth: "Цоколь",
  chair: "Каркас стульев", seat: "Сиденье", uph: "Обивка", cushions: "Декоративные подушки", bed: "Кровать", headboard: "Изголовье", mattress: "Матрас",
  pillows: "Подушки", blanket: "Одеяло", throw: "Плед", shelf: "Полка", books: "Книги", tv: "Телевизор", screen: "Экран",
  rug: "Ковёр", center: "Середина ковра", pot: "Горшок", soil: "Земля", stems: "Стебли", leaves: "Листья", trunk: "Ствол",
  crown: "Крона", crown2: "Светлая листва", needles: "Хвоя", paving: "Покрытие", paint: "Кузов", glass: "Стекло", tires: "Шины",
  rims: "Диски", lights: "Фары", taillights: "Задние фонари", bumpers: "Бамперы", plate: "Номер", base: "Основание",
  ring: "Кольцо", lid: "Крышка", pipes: "Трубы", walls: "Стены", roof: "Кровля", roofedge: "Края кровли", door: "Дверь",
  trim: "Наличники", chimney: "Труба", gate: "Ворота", gateframe: "Обрамление ворот", frame: "Каркас", gutter: "Водосток",
  deck: "Настил", table: "Стол", sheet: "Обшивка", sides: "Борта", plants: "Растения", fl1: "Цветы красные",
  fl2: "Цветы жёлтые", fl3: "Цветы фиолетовые", fl4: "Цветы белые", curb: "Бордюр", bowl: "Чаша", water: "Вода",
  ladder: "Поручни", grill: "Решётка", ropes: "Верёвки", lamp: "Плафон", skin: "Кожа", hair: "Волосы", shirt: "Футболка",
  pants: "Брюки", shoes: "Обувь", oven: "Духовка", sink: "Мойка", faucet: "Смеситель", hob: "Варочная панель",
  splash: "Фартук", hood: "Вытяжка", ceramic: "Керамика", button: "Кнопка смыва", lid2: "Сиденье", mirror: "Зеркало",
  mirrorframe: "Рама зеркала", floor: "Пол", drain: "Трап", drum: "Люк и ручки", panel: "Панель", flue: "Дымоход",
  hooks: "Крючки", clothes: "Одежда", rails2: "Направляющие", inwalls: "Стены внутри", gatebox: "Короб и направляющие",
  winframe: "Рамы окон", sill: "Отлив", twigs: "Ветки", bulb: "Лампа", shade: "Абажур", stem: "Ножка", wire: "Провод"
};
const SLOTC = new Map();
let SLOTM = null;

function slotLabel(slot) {
  if (has(PARTN, slot)) return PARTN[slot];
  const def = MDEF[slot];
  return def && def.n ? def.n : slot;
}

function slotMat(o, m) {
  const ov = o.mats || null;
  return (name, slot) => {
    const s = slot || name;
    const sp = ov && ov[s];
    return m(sp ? specKey(sp, name) : name);
  };
}

function modelSlots(o) {
  const key = o.kind + "|" + o.w + "|" + o.d + "|" + o.h + "|" + (o.opens ? JSON.stringify(o.opens.map(x => x.kind + x.op)) : "") + (o.mods ? JSON.stringify(o.mods) + o.up : "");
  if (SLOTC.has(key)) return SLOTC.get(key);
  if (!SLOTM) SLOTM = new THREE.MeshBasicMaterial();
  const seen = new Map();
  const g = new THREE.Group();
  const rec = (name, slot) => {
    const s = slot || name;
    if (!seen.has(s)) seen.set(s, name);
    return SLOTM;
  };
  const P = {w: Math.max(0.05, o.w), d: Math.max(0.05, o.d), h: Math.max(0.01, o.h), o: {kind: o.kind, opens: o.opens, mods: o.mods, up: o.up}};
  (MB[o.kind] || MB.other)(g, P, rec, srng(hashStr(o.id || o.kind)));
  g.traverse(x => {
    if (x.geometry) x.geometry.dispose();
  });
  const out = [...seen].map(([slot, def]) => ({slot, def, label: slotLabel(slot)}));
  if (SLOTC.size > 300) SLOTC.clear();
  SLOTC.set(key, out);
  return out;
}

function buildModel(g, o, m, ghost) {
  const P = {w: Math.max(0.05, o.w), d: Math.max(0.05, o.d), h: Math.max(0.01, o.h), o: o.id && !ghost && o.id !== "ghost" && o.id.indexOf("thumb-") !== 0 ? o : null, lights: []};
  if (P.o && modelOf(o).lamp && typeof lampLit === "function") {
    P.lit = lampLit(o);
    P.K = lampTemp(o);
  }
  const rnd = srng(hashStr(o.id || o.kind));
  const mm = ghost ? () => ghostMat() : slotMat(o, m);
  const fn = MB[o.kind] || MB.other;
  fn(g, P, mm, rnd);
  return P;
}

function sym2D(o) {
  const w = o.w;
  const d = o.d;
  const kd = modelOf(o).sym;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const sw = (1 / k).toFixed(4);
  const st = "var(--item-line)";
  const f = "var(--item)";
  const R = (x, y, ww, dd, fill, rx) => `<rect x="${x}" y="${y}" width="${Math.max(0, ww)}" height="${Math.max(0, dd)}" rx="${rx || 0}" fill="${fill || "none"}" stroke="${st}" stroke-width="${sw}"/>`;
  const Ln = (a, b, c, e, dash) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}" stroke="${st}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${3 / k} ${2 / k}"` : ""}/>`;
  const El = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0, rx)}" ry="${Math.max(0, ry)}" fill="${fill || "none"}" stroke="${st}" stroke-width="${sw}"/>`;
  const chairAt = (cx, cy, a) => `<g transform="translate(${cx} ${cy}) rotate(${a})">${R(-0.225, -0.25, 0.45, 0.5, f, 0.04)}${Ln(-0.225, -0.2, 0.225, -0.2)}</g>`;
  switch (kd) {
    case "bed": {
      let s = R(x0, y0, w, d, f, 0.04);
      const np = w > 1.3 ? 2 : 1;
      const pw = (w - 0.1) / np;
      for (let i = 0; i < np; i++) s += R(x0 + 0.07 + i * pw, y0 + 0.14, pw - 0.04, 0.38, f, 0.06);
      s += Ln(x0, y0 + 0.63, x0 + w, y0 + 0.63) + Ln(x0, y0 + 0.08, x0 + w, y0 + 0.08);
      return s + Ln(x0 + 0.05, y0 + 0.63, x0 + w * 0.35, y0 + 0.9);
    }
    case "sofa": {
      const arm = Math.min(0.2, w * 0.14);
      const back = Math.min(0.22, d * 0.25);
      let s = R(x0, y0, w, d, f, 0.05) + R(x0, y0, w, back, "none", 0.03);
      s += R(x0, y0, arm, d, "none", 0.03) + R(x0 + w - arm, y0, arm, d, "none", 0.03);
      const inner = w - 2 * arm;
      const n = inner > 1.5 ? 3 : inner > 0.95 ? 2 : 1;
      for (let i = 1; i < n; i++) s += Ln(x0 + arm + i * inner / n, y0 + back, x0 + arm + i * inner / n, y0 + d);
      return s;
    }
    case "sofaL": {
      const sd = Math.min(0.95, d * 0.6);
      const cw = Math.min(0.95, w * 0.4);
      const path = `M ${x0} ${y0} H ${x0 + w} V ${y0 + d} H ${x0 + w - cw} V ${y0 + sd} H ${x0} Z`;
      return `<path d="${path}" fill="${f}" stroke="${st}" stroke-width="${sw}"/>` + R(x0, y0, w, 0.22, "none", 0.03) + R(x0, y0, 0.2, sd, "none", 0.03) + Ln(x0 + w - cw, y0 + sd, x0 + w, y0 + sd, true);
    }
    case "table":
      return R(x0, y0, w, d, f, 0.02) + R(x0 + 0.05, y0 + 0.05, w - 0.1, d - 0.1, "none", 0.02);
    case "round":
      return El(0, 0, w / 2, d / 2, f);
    case "chair":
      return R(x0, y0, w, d, f, 0.04) + Ln(x0, y0 + Math.min(0.1, d * 0.2), x0 + w, y0 + Math.min(0.1, d * 0.2));
    case "dining":
    case "dining4": {
      const tw = Math.max(kd === "dining4" ? 0.6 : 0.8, (kd === "dining4" ? Math.min(w, d) : w) - 1);
      const td = kd === "dining4" ? tw : Math.max(0.7, d - 1);
      let s = "";
      if (kd === "dining4") {
        s += chairAt(0, -tw / 2 - 0.2, 0) + chairAt(0, tw / 2 + 0.2, 180) + chairAt(-tw / 2 - 0.2, 0, -90) + chairAt(tw / 2 + 0.2, 0, 90);
      } else {
        const n = Math.max(1, Math.floor(tw / 0.6));
        for (let i = 0; i < n; i++) {
          const x = -tw / 2 + (i + 0.5) * tw / n;
          s += chairAt(x, -td / 2 - 0.12, 0) + chairAt(x, td / 2 + 0.12, 180);
        }
        s += chairAt(-tw / 2 - 0.12, 0, -90) + chairAt(tw / 2 + 0.12, 0, 90);
      }
      return s + R(-tw / 2, -td / 2, tw, td, f, 0.02);
    }
    case "toilet":
      return R(x0, y0, w, 0.18, f, 0.03) + El(0, y0 + 0.18 + (d - 0.18) * 0.45, w * 0.46, (d - 0.18) * 0.5, f);
    case "basin":
      return R(x0, y0, w, d, f, 0.03) + El(0, 0.02, w * 0.34, d * 0.3);
    case "tub":
      return R(x0, y0, w, d, f, 0.08) + R(x0 + 0.07, y0 + 0.07, w - 0.14, d - 0.14, "none", Math.min(0.2, d * 0.3)) + `<circle cx="${x0 + w - 0.25}" cy="0" r="0.03" fill="none" stroke="${st}" stroke-width="${sw}"/>`;
    case "shower":
      return R(x0, y0, w, d, f) + Ln(x0, y0, x0 + w, y0 + d) + Ln(x0 + w, y0, x0, y0 + d) + Ln(x0 + w - 0.01, y0, x0 + w - 0.01, y0 + d - 0.1) + R(x0 + 0.1, y0 + 0.06, w - 0.2, 0.06, "none");
    case "washer":
      return R(x0, y0, w, d, f, 0.03) + `<circle cx="0" cy="0" r="${Math.min(w, d) * 0.3}" fill="none" stroke="${st}" stroke-width="${sw}"/>`;
    case "kitchen":
      return kitSym(o, x0, y0, st, sw, R, Ln);
    case "fridge":
      return R(x0, y0, w, d, f, 0.02) + Ln(x0, y0 + d - 0.06, x0 + w, y0 + d - 0.06);
    case "wardrobe":
      return R(x0, y0, w, d, f) + Ln(x0, y0 + d * 0.5, x0 + w, y0 + d * 0.5, true) + Ln(x0, y0 + d, x0 + w, y0);
    case "cab":
      return R(x0, y0, w, d, f) + Ln(x0, y0 + d - Math.min(0.05, d * 0.15), x0 + w, y0 + d - Math.min(0.05, d * 0.15));
    case "tv":
      return R(x0, y0, w, d, f) + Ln(-Math.min(w - 0.1, 1.45) / 2, 0, Math.min(w - 0.1, 1.45) / 2, 0);
    case "rug":
      return R(x0, y0, w, d, f) + R(x0 + 0.12, y0 + 0.12, w - 0.24, d - 0.24, "none").replace("/>", ` stroke-dasharray="${4 / k} ${3 / k}"/>`);
    case "tree": {
      const rx = w / 2;
      const ry = d / 2;
      let p = "";
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = i % 2 ? 0.86 : 1;
        p += (i ? " L " : "M ") + (Math.cos(a) * rx * rr).toFixed(3) + " " + (Math.sin(a) * ry * rr).toFixed(3);
      }
      return `<path d="${p} Z" fill="var(--tree)" fill-opacity="0.55" stroke="var(--tree-line)" stroke-width="${sw}"/><circle cx="0" cy="0" r="${Math.min(w, d) * 0.06}" fill="var(--tree-line)"/>`;
    }
    case "pine": {
      let s = El(0, 0, w / 2, d / 2, "var(--tree)").replace("fill=\"var(--tree)\"", "fill=\"var(--tree)\" fill-opacity=\"0.6\"");
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        s += Ln(0, 0, Math.cos(a) * w / 2, Math.sin(a) * d / 2);
      }
      return s;
    }
    case "hedge":
      return R(x0, y0, w, d, "var(--tree)", Math.min(0.15, d / 3)).replace("fill=\"var(--tree)\"", "fill=\"var(--tree)\" fill-opacity=\"0.6\"");
    case "path":
      return R(x0, y0, w, d, "var(--f-pass)") + R(x0 + 0.06, y0, w - 0.12, d, "none");
    case "pool":
      return R(x0, y0, w, d, "var(--f-pass)") + R(x0 + 0.3, y0 + 0.3, w - 0.6, d - 0.6, "var(--water)");
    case "car": {
      const r = Math.min(w, d) * 0.18;
      return R(x0, y0, w, d, f, r) + R(x0 + 0.12, y0 + d * 0.2, w - 0.24, d * 0.52, "none", r * 0.6) + Ln(x0 + 0.12, y0 + d * 0.72 - 0.35, x0 + w - 0.12, y0 + d * 0.72 - 0.35);
    }
    case "lamp": {
      const r = Math.min(w, d) / 2;
      const q = r * 0.7071;
      return `<circle cx="0" cy="0" r="${r}" fill="${f}" stroke="${st}" stroke-width="${sw}"/>` + Ln(-q, -q, q, q) + Ln(-q, q, q, -q);
    }
    case "garland": {
      let s = Ln(x0, 0, x0 + w, 0, true);
      const n = Math.max(2, Math.round(w / 0.45));
      for (let i = 1; i < n; i++) s += `<circle cx="${x0 + w * i / n}" cy="0" r="0.05" fill="#f5c542" stroke="${st}" stroke-width="${sw}"/>`;
      return s + `<circle cx="${x0}" cy="0" r="0.06" fill="${f}" stroke="${st}" stroke-width="${sw}"/><circle cx="${x0 + w}" cy="0" r="0.06" fill="${f}" stroke="${st}" stroke-width="${sw}"/>`;
    }
    case "fence": {
      const n = Math.max(1, Math.ceil(w / 2.5));
      let s = Ln(x0, 0, x0 + w, 0);
      for (let i = 0; i <= n; i++) s += `<rect x="${x0 + w * i / n - 0.05}" y="-0.05" width="0.1" height="0.1" fill="${st}"/>`;
      return s;
    }
    case "gate": {
      const r = w / 2;
      return R(x0, -0.05, 0.1, 0.1, st) + R(x0 + w - 0.1, -0.05, 0.1, 0.1, st) + `<path d="M ${x0} 0 L ${x0} ${-r} A ${r} ${r} 0 0 1 ${x0 + r} 0" fill="none" stroke="${st}" stroke-width="${sw}"/><path d="M ${x0 + w} 0 L ${x0 + w} ${-r} A ${r} ${r} 0 0 0 ${x0 + w - r} 0" fill="none" stroke="${st}" stroke-width="${sw}" stroke-dasharray="${3 / k} ${2 / k}"/>`;
    }
    case "bike":
      return El(0, y0 + d * 0.22, w * 0.18, d * 0.2, f) + El(0, y0 + d * 0.78, w * 0.18, d * 0.2, f) + Ln(0, y0 + d * 0.2, 0, y0 + d * 0.8) + Ln(-w / 2, y0 + d * 0.72, w / 2, y0 + d * 0.72);
    case "curtain": {
      let p = `M ${x0} ${y0 + d / 2}`;
      const n = Math.max(4, Math.round(w / 0.12));
      for (let i = 1; i <= n; i++) p += ` Q ${x0 + (i - 0.5) * w / n} ${y0 + (i % 2 ? 0 : d)} ${x0 + i * w / n} ${y0 + d / 2}`;
      return `<path d="${p}" fill="none" stroke="${st}" stroke-width="${sw}"/>`;
    }
    case "pond":
      return El(0, 0, w / 2, d / 2, "var(--water)") + El(0, 0, w / 2 - 0.12, d / 2 - 0.12, "none");
    case "person":
      return El(0, 0, w / 2, d / 2, f) + `<circle cx="0" cy="0" r="${Math.min(w, d) * 0.33}" fill="${f}" stroke="${st}" stroke-width="${sw}"/>` + Ln(0, d * 0.3, 0, d / 2 + 0.08);
    default:
      return R(x0, y0, w, d, f);
  }
}
