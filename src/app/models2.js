"use strict";
CATS.splice(CATS.findIndex(c => c[0] === "yard") + 1, 0, ["fence", "Заборы и ворота"]);
CATS.find(c => c[0] === "people")[1] = "Люди и транспорт";

Object.assign(MODELS, {
  fencesec: {cat: "fence", name: "Секция забора", w: 3, d: 0.1, h: 1.8, g: "other", sym: "fence", fs: "euro"},
  gateswing: {cat: "fence", name: "Ворота распашные", w: 4, d: 0.2, h: 1.9, g: "other", sym: "gate", gate: "swing", fs: "euro"},
  gateslide: {cat: "fence", name: "Ворота откатные", w: 4.5, d: 0.2, h: 1.9, g: "other", sym: "gate", gate: "slide", fs: "profile"},
  wicket: {cat: "fence", name: "Калитка", w: 1.1, d: 0.12, h: 1.9, g: "other", sym: "gate", gate: "wicket", fs: "euro"},
  hatch: {cat: "people", name: "Хэтчбек", w: 1.78, d: 4.1, h: 1.48, g: "pass", sym: "car"},
  suv: {cat: "people", name: "Кроссовер", w: 1.9, d: 4.7, h: 1.72, g: "pass", sym: "car"},
  pickup: {cat: "people", name: "Пикап", w: 1.95, d: 5.4, h: 1.85, g: "pass", sym: "car"},
  minivan: {cat: "people", name: "Минивэн", w: 1.92, d: 5, h: 1.8, g: "pass", sym: "car"},
  sport: {cat: "people", name: "Спорткар", w: 1.95, d: 4.5, h: 1.22, g: "pass", sym: "car"},
  moto: {cat: "people", name: "Мотоцикл", w: 0.8, d: 2.1, h: 1.15, g: "pass", sym: "bike"},
  bicycle: {cat: "people", name: "Велосипед", w: 0.6, d: 1.75, h: 1.05, g: "pass", sym: "bike"},
  fireplace: {cat: "living", name: "Камин", w: 1.5, d: 0.55, h: 1.2, sym: "cab", lamp: {lm: 900, k: 1900}},
  piano: {cat: "living", name: "Пианино", w: 1.5, d: 0.6, h: 1.25, sym: "cab"},
  vitrine: {cat: "living", name: "Шкаф-витрина", w: 1, d: 0.42, h: 2, sym: "cab"},
  sideboard: {cat: "living", name: "Комод-буфет", w: 1.8, d: 0.45, h: 0.8, sym: "cab"},
  pouf: {cat: "living", name: "Пуф", w: 0.5, d: 0.5, h: 0.42, sym: "round"},
  beanbag: {cat: "living", name: "Кресло-мешок", w: 0.9, d: 0.9, h: 0.8, sym: "round"},
  wallart: {cat: "living", name: "Картина", w: 0.9, d: 0.04, h: 0.6, z: 1.3, sym: "cab"},
  curtains: {cat: "living", name: "Шторы", w: 2.2, d: 0.14, h: 2.6, sym: "curtain"},
  radiator: {cat: "living", name: "Радиатор", w: 0.8, d: 0.1, h: 0.55, z: 0.15, sym: "cab"},
  ac: {cat: "living", name: "Кондиционер", w: 0.85, d: 0.22, h: 0.3, z: 2.2, sym: "cab"},
  bigplant: {cat: "living", name: "Монстера в кадке", w: 0.8, d: 0.8, h: 1.6, sym: "tree"},
  bunk: {cat: "bed", name: "Двухъярусная кровать", w: 1, d: 2.05, h: 1.75, sym: "bed"},
  crib: {cat: "bed", name: "Детская кроватка", w: 0.7, d: 1.3, h: 0.95, sym: "bed"},
  vanity: {cat: "bed", name: "Туалетный столик", w: 1, d: 0.45, h: 1.45, sym: "table"},
  floormirror: {cat: "bed", name: "Напольное зеркало", w: 0.6, d: 0.35, h: 1.75, sym: "cab"},
  officechair: {cat: "bed", name: "Офисное кресло", w: 0.65, d: 0.65, h: 1.1, sym: "chair"},
  barstool: {cat: "kitchen", name: "Барный стул", w: 0.4, d: 0.4, h: 0.75, sym: "round"},
  ovencol: {cat: "kitchen", name: "Пенал с духовкой", w: 0.6, d: 0.6, h: 2.2, sym: "cab"},
  dbasin: {cat: "bath", name: "Двойная раковина с зеркалом", w: 1.4, d: 0.5, h: 1.9, sym: "basin"},
  towel: {cat: "bath", name: "Полотенцесушитель", w: 0.5, d: 0.1, h: 0.8, z: 0.6, sym: "cab"},
  bathcab: {cat: "bath", name: "Пенал для ванной", w: 0.4, d: 0.32, h: 1.7, sym: "cab"},
  poolround: {cat: "yard", name: "Каркасный бассейн", w: 3.6, d: 3.6, h: 1.2, g: "wet", sym: "round"},
  jacuzzi: {cat: "yard", name: "Джакузи", w: 2.2, d: 2.2, h: 0.9, g: "wet", sym: "pool"},
  trampoline: {cat: "yard", name: "Батут с сеткой", w: 3, d: 3, h: 2.6, g: "other", sym: "round"},
  slide: {cat: "yard", name: "Детская горка", w: 1.1, d: 3.2, h: 2, g: "other"},
  sandbox: {cat: "yard", name: "Песочница", w: 1.6, d: 1.6, h: 0.3, g: "other"},
  lounger: {cat: "yard", name: "Шезлонг", w: 0.7, d: 1.95, h: 0.8, g: "other", sym: "chair"},
  umbrella: {cat: "yard", name: "Уличный зонт", w: 2.6, d: 2.6, h: 2.5, g: "other", sym: "round"},
  hammock: {cat: "yard", name: "Гамак на раме", w: 3.2, d: 1.1, h: 1.2, g: "other"},
  firepit: {cat: "yard", name: "Кострище", w: 1.2, d: 1.2, h: 0.4, g: "other", sym: "round", lamp: {lm: 1100, k: 1800}},
  woodpile: {cat: "yard", name: "Дровник", w: 2, d: 0.8, h: 1.8, g: "other", sym: "cab"},
  doghouse: {cat: "yard", name: "Будка", w: 0.9, d: 1.1, h: 0.95, g: "other"},
  barrel: {cat: "yard", name: "Бочка для воды", w: 0.6, d: 0.6, h: 0.9, g: "wet", sym: "round"},
  bins: {cat: "yard", name: "Мусорные баки", w: 1.3, d: 0.75, h: 1.1, g: "other", sym: "cab"},
  mailbox: {cat: "yard", name: "Почтовый ящик", w: 0.35, d: 0.3, h: 1.2, g: "other", sym: "cab"},
  pond: {cat: "yard", name: "Пруд", w: 3, d: 2, h: 0.12, g: "wet", sym: "pond"},
  boulder: {cat: "yard", name: "Валун", w: 1, d: 0.8, h: 0.6, g: "other", sym: "round"},
  birch: {cat: "yard", name: "Берёза", w: 3.4, d: 3.4, h: 9, g: "day", sym: "tree"},
  apple: {cat: "yard", name: "Яблоня", w: 4, d: 4, h: 4.2, g: "day", sym: "tree"},
  thuja: {cat: "yard", name: "Туя", w: 1, d: 1, h: 2.6, g: "day", sym: "pine"},
  solar: {cat: "yard", name: "Солнечная панель", w: 2, d: 1.2, h: 1.3, g: "other", sym: "cab"},
  heatpump: {cat: "yard", name: "Тепловой насос", w: 1, d: 0.42, h: 0.85, g: "other", sym: "cab"},
  pergola: {cat: "build", name: "Пергола", w: 4, d: 3, h: 2.6, g: "day"},
  carport: {cat: "build", name: "Навес для машины", w: 3.5, d: 6, h: 2.7, g: "pass"}
});

Object.assign(PARTN, {
  posts: "Столбы", infill: "Заполнение", pillars: "Столбы из кирпича", caps: "Колпаки", fire: "Огонь", keys: "Клавиши", canvas: "Холст",
  fins: "Секции", fan: "Решётка", net: "Сетка", mat: "Прыжковое полотно", pad: "Защита пружин", chute: "Скат", sand: "Песок",
  canopy: "Купол", cloth: "Ткань", logs: "Дрова", stones: "Камни", apples: "Яблоки", blossom: "Цвет", panel2: "Панель"
});

const CARS = {
  car: {W: 1.85, H: 1.5, L: 4.6, cols: ["c9ccd1", "24405f", "eeeeec", "8f1f1f", "2b2d30", "5d6b5a"],
    body: [[-2.25, 0.26], [2.25, 0.26], [2.3, 0.4], [2.28, 0.62], [2.05, 0.76], [1.15, 0.84], [-1.35, 0.87], [-2.1, 0.86], [-2.3, 0.72], [-2.3, 0.4]],
    glass: [[-1.42, 0.83], [1.08, 0.8], [0.45, 1.33], [-1.02, 1.35]], roof: [-1.0, 0.43, 1.31, 1.42], wheels: [1.42, -1.38], r: 0.33,
    fl: [0.58, 0.66, 2.24, 2.3], rl: [0.66, 0.74, -2.34, -2.28], bf: [0.26, 0.4, 2.26, 2.34], br: [0.26, 0.4, -2.36, -2.28], plate: [0.42, 0.53, 2.33, 2.345], mir: [0.86, 0.94, 0.95, 1.05]},
  hatch: {W: 1.78, H: 1.48, L: 4.1, cols: ["d9dbdc", "b33a2c", "2f5f8a", "f0efe9", "3d4146", "7a8b4a"],
    body: [[-1.98, 0.26], [1.98, 0.26], [2.05, 0.4], [2.03, 0.6], [1.82, 0.74], [0.95, 0.82], [-1.72, 0.9], [-2.0, 0.88], [-2.05, 0.62], [-2.05, 0.4]],
    glass: [[-1.8, 0.86], [0.9, 0.8], [0.28, 1.3], [-1.6, 1.33]], roof: [-1.62, 0.28, 1.29, 1.4], wheels: [1.3, -1.28], r: 0.31,
    fl: [0.58, 0.66, 1.98, 2.04], rl: [0.7, 0.86, -2.06, -2.0], bf: [0.26, 0.4, 2.0, 2.07], br: [0.26, 0.4, -2.08, -2.0], plate: [0.42, 0.53, 2.06, 2.075], mir: [0.86, 0.94, 0.8, 0.9]},
  suv: {W: 1.9, H: 1.72, L: 4.7, cols: ["2b2d30", "e8e8e4", "6d7278", "30475e", "5b4636", "8c2320"],
    body: [[-2.28, 0.42], [2.28, 0.42], [2.35, 0.56], [2.33, 0.84], [2.12, 0.98], [1.25, 1.06], [-2.2, 1.1], [-2.35, 1.02], [-2.36, 0.56]],
    glass: [[-2.16, 1.04], [1.2, 1.02], [0.62, 1.56], [-2.02, 1.58]], roof: [-2.04, 0.6, 1.54, 1.64], wheels: [1.45, -1.42], r: 0.37, rails: true,
    fl: [0.8, 0.9, 2.28, 2.34], rl: [0.82, 0.98, -2.37, -2.31], bf: [0.42, 0.6, 2.3, 2.38], br: [0.42, 0.6, -2.4, -2.32], plate: [0.62, 0.73, 2.37, 2.385], mir: [1.06, 1.15, 1.05, 1.16]},
  pickup: {W: 1.95, H: 1.85, L: 5.4, cols: ["3a3f45", "c7c9c8", "7a2622", "2c3e50", "d8d6cf"],
    body: [[-2.62, 0.45], [2.62, 0.45], [2.7, 0.6], [2.68, 0.92], [2.45, 1.08], [1.55, 1.12], [-2.68, 1.12], [-2.72, 0.95], [-2.72, 0.6]],
    glass: [[-0.6, 1.1], [1.5, 1.08], [0.9, 1.72], [-0.52, 1.75]], roof: [-0.55, 0.88, 1.7, 1.8], wheels: [1.75, -1.72], r: 0.39, bed: [-2.62, -0.72],
    fl: [0.84, 0.95, 2.63, 2.69], rl: [0.8, 1.0, -2.74, -2.68], bf: [0.45, 0.64, 2.65, 2.73], br: [0.45, 0.62, -2.76, -2.68], plate: [0.66, 0.77, 2.72, 2.735], mir: [1.14, 1.24, 1.2, 1.3]},
  minivan: {W: 1.92, H: 1.8, L: 5, cols: ["e9e9e5", "5a6570", "1f2f45", "a8aaa9", "4a5a3c"],
    body: [[-2.44, 0.36], [2.44, 0.36], [2.5, 0.5], [2.48, 0.76], [2.25, 0.96], [1.62, 1.03], [-2.46, 1.03], [-2.5, 0.9], [-2.5, 0.5]],
    glass: [[-2.42, 0.99], [1.56, 0.99], [0.78, 1.66], [-2.36, 1.69]], roof: [-2.38, 0.76, 1.65, 1.76], wheels: [1.62, -1.62], r: 0.34,
    fl: [0.72, 0.82, 2.43, 2.49], rl: [0.76, 1.0, -2.52, -2.46], bf: [0.36, 0.52, 2.45, 2.53], br: [0.36, 0.52, -2.54, -2.46], plate: [0.55, 0.66, 2.52, 2.535], mir: [1.0, 1.1, 1.45, 1.55]},
  sport: {W: 1.95, H: 1.22, L: 4.5, cols: ["c81d1d", "f1c40f", "15171a", "e8e8e8", "1f5fbf"],
    body: [[-2.18, 0.16], [2.18, 0.16], [2.25, 0.28], [2.2, 0.42], [1.95, 0.55], [0.62, 0.68], [-1.3, 0.78], [-2.12, 0.8], [-2.25, 0.62], [-2.25, 0.3]],
    glass: [[-1.25, 0.74], [0.58, 0.66], [-0.08, 1.08], [-0.95, 1.1]], roof: [-0.96, -0.1, 1.06, 1.16], wheels: [1.38, -1.32], r: 0.33, wing: true,
    fl: [0.46, 0.52, 2.16, 2.22], rl: [0.6, 0.66, -2.27, -2.21], bf: [0.16, 0.3, 2.18, 2.26], br: [0.16, 0.32, -2.27, -2.19], plate: [0.32, 0.42, 2.25, 2.265], mir: [0.72, 0.8, 0.35, 0.45]}
};

function carBody(g, P, m, rnd, C) {
  const paint = m("paint#" + C.cols[Math.floor(rnd() * C.cols.length)], "paint");
  const s = new THREE.Group();
  s.scale.set(P.w / C.W, P.h / C.H, P.d / C.L);
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
  const W = C.W;
  prof(C.body, W, paint);
  prof(C.glass, W * 0.876, m("carglass", "glass"));
  const rw = W * 0.41;
  RB(s, -rw, rw, C.roof[2], C.roof[3], C.roof[0], C.roof[1], 0.05, paint);
  if (C.rails) for (const sx of [-1, 1]) B(s, sx * W * 0.38 - 0.02, sx * W * 0.38 + 0.02, C.roof[3], C.roof[3] + 0.05, C.roof[0] + 0.12, C.roof[1] - 0.15, m("graphite", "bumpers"));
  if (C.bed) B(s, -W * 0.44, W * 0.44, 1.105, 1.13, C.bed[0] + 0.05, C.bed[1], m("black", "bumpers"));
  if (C.wing) {
    B(s, -W * 0.45, W * 0.45, 0.9, 0.93, -2.22, -1.95, paint);
    for (const sx of [-1, 1]) B(s, sx * W * 0.3 - 0.02, sx * W * 0.3 + 0.02, 0.78, 0.9, -2.12, -2.05, m("black", "bumpers"));
  }
  const tw = W * 0.41;
  for (const sx of [-1, 1]) {
    const xc = sx * tw;
    for (const zc of C.wheels) {
      CyX(s, C.r, xc - 0.11, xc + 0.11, C.r, zc, m("rubber", "tires"), 24);
      CyX(s, C.r * 0.62, xc - 0.116, xc + 0.116, C.r, zc, m("steel", "rims"), 16);
    }
    const lx = sx * W * 0.335;
    B(s, lx - 0.17, lx + 0.17, C.fl[0], C.fl[1], C.fl[2], C.fl[3], m("lamp", "lights"));
    B(s, lx - 0.16, lx + 0.16, C.rl[0], C.rl[1], C.rl[2], C.rl[3], m("redlamp", "taillights"));
    B(s, sx * W * 0.525 - 0.05, sx * W * 0.525 + 0.05, C.mir[0], C.mir[1], C.mir[2], C.mir[3], paint);
  }
  B(s, -W * 0.49, W * 0.49, C.bf[0], C.bf[1], C.bf[2], C.bf[3], m("graphite", "bumpers"));
  B(s, -W * 0.49, W * 0.49, C.br[0], C.br[1], C.br[2], C.br[3], m("graphite", "bumpers"));
  B(s, -0.26, 0.26, C.plate[0], C.plate[1], C.plate[2], C.plate[3], m("white", "plate"));
}

MB.car = (g, P, m, rnd) => carBody(g, P, m, rnd, CARS.car);
for (const kd of ["hatch", "suv", "pickup", "minivan", "sport"]) MB[kd] = (g, P, m, rnd) => carBody(g, P, m, rnd, CARS[kd]);

function wheelRing(p, r, tube, x, y, z, mt) {
  const g = new THREE.TorusGeometry(r, tube, 10, 32);
  const mesh = addMesh(p, g, mt);
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

MB.moto = (g, P, m, rnd) => {
  const s = new THREE.Group();
  s.scale.set(P.w / 0.8, P.h / 1.15, P.d / 2.1);
  g.add(s);
  const paint = m("paint#" + ["b3261e", "15171a", "1f5fbf", "e8e8e8"][Math.floor(rnd() * 4)], "paint");
  const met = m("steel", "rims");
  const blk = m("graphite", "body");
  for (const z of [0.72, -0.7]) {
    wheelRing(s, 0.28, 0.065, 0, 0.33, z, m("rubber", "tires"));
    CyX(s, 0.2, -0.03, 0.03, 0.33, z, met, 20);
  }
  Lb(s, [0, 0.33, 0.72], [0, 0.95, 0.5], 0.025, 0.025, met, 8);
  Lb(s, [0, 0.33, -0.7], [0, 0.5, -0.05], 0.03, 0.03, blk, 8);
  RB(s, -0.16, 0.16, 0.3, 0.62, -0.25, 0.3, 0.04, blk);
  Sp(s, 1, 0, 0.8, 0.22, paint, 0.17, 0.12, 0.28, 20);
  RB(s, -0.14, 0.14, 0.72, 0.8, -0.55, -0.02, 0.03, m("leather_black", "seat"));
  B(s, -0.1, 0.1, 0.66, 0.74, -0.7, -0.45, paint);
  Lb(s, [-0.36, 0.98, 0.45], [0.36, 0.98, 0.45], 0.013, 0.013, blk, 8);
  Sp(s, 0.075, 0, 0.88, 0.62, m("lamp", "lights"), 1, 1, 0.7, 14);
  Lb(s, [0.18, 0.35, 0.05], [0.2, 0.42, -0.75], 0.035, 0.03, m("chrome", "exhaust"), 10);
  B(s, -0.07, 0.07, 0.62, 0.66, 0.55, 0.9, paint);
};

MB.bicycle = (g, P, m, rnd) => {
  const s = new THREE.Group();
  s.scale.set(P.w / 0.6, P.h / 1.05, P.d / 1.75);
  g.add(s);
  const fr = m("paint#" + ["2f6f4f", "1f5fbf", "b3261e", "15171a"][Math.floor(rnd() * 4)], "paint");
  const blk = m("graphite", "body");
  const zf = 0.53;
  const zr = -0.52;
  for (const z of [zf, zr]) {
    wheelRing(s, 0.33, 0.018, 0, 0.35, z, m("rubber", "tires"));
    wheelRing(s, 0.3, 0.008, 0, 0.35, z, m("steel", "rims"));
    CyX(s, 0.03, -0.04, 0.04, 0.35, z, blk, 10);
  }
  const bb = [0, 0.3, -0.02];
  const st = [0, 0.82, -0.2];
  const ht = [0, 0.84, 0.38];
  for (const [a, b] of [[bb, st], [bb, ht], [st, ht], [bb, [0, 0.35, zr]], [st, [0, 0.35, zr]], [ht, [0, 0.35, zf]]]) Lb(s, a, b, 0.017, 0.017, fr, 8);
  Lb(s, st, [0, 0.95, -0.24], 0.012, 0.012, blk, 6);
  RB(s, -0.07, 0.07, 0.95, 0.99, -0.34, -0.14, 0.02, m("leather_black", "seat"));
  Lb(s, ht, [0, 1.0, 0.34], 0.014, 0.014, blk, 6);
  Lb(s, [-0.28, 1.0, 0.34], [0.28, 1.0, 0.34], 0.012, 0.012, blk, 6);
  Cy(s, 0.06, 0.28, 0.32, 0, -0.02, blk, 12);
};

MB.fencesec = (g, P, m) => {
  const st = (P.o && P.o.fs) || "euro";
  fenceRun(g, -P.w / 2, 0, P.w / 2, 0, has(FENCES, st) ? st : "euro", P.h, m);
};

function gateObj(kind) {
  return (g, P, m) => {
    const o = P.o;
    const st = o && has(FENCES, o.fs) ? o.fs : MODELS[kind].fs;
    const grp = new THREE.Group();
    grp.position.x = -P.w / 2;
    g.add(grp);
    const key = o && o.id ? animKey("obj", o.id, "gate") : null;
    gateAssembly(grp, MODELS[kind].gate, st, P.w, P.h, m, key, o ? o.open || 0 : 0, o && o.id ? {t: "obj", id: o.id, gate: true} : null);
  };
}
MB.gateswing = gateObj("gateswing");
MB.gateslide = gateObj("gateslide");
MB.wicket = gateObj("wicket");

function flames(g, P, m, x, y, z, s) {
  if (!P.lit) return;
  const fm = m(glowKey(1900, "glow"), "fire");
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    const r = i ? 0.08 * s : 0;
    ns(Cone(g, (i ? 0.045 : 0.07) * s, y, y + (i ? 0.18 : 0.3) * s, x + Math.cos(a) * r, z + Math.sin(a) * r, fm, 8));
  }
  lightAt(P, x, y + 0.2 * s, z);
}

MB.fireplace = (g, P, m) => {
  const {w, d, h} = P;
  const st = m("stone", "body");
  B(g, -w / 2, w / 2, 0, 0.12, -d / 2, d / 2 + 0.1, m("granite", "base"));
  B(g, -w / 2, -w / 2 + 0.3, 0.12, h - 0.08, -d / 2, d / 2, st);
  B(g, w / 2 - 0.3, w / 2, 0.12, h - 0.08, -d / 2, d / 2, st);
  B(g, -w / 2 + 0.3, w / 2 - 0.3, h * 0.62, h - 0.08, -d / 2, d / 2, st);
  B(g, -w / 2 + 0.3, w / 2 - 0.3, 0.12, h * 0.62, -d / 2, -d / 2 + 0.08, m("black", "inside"));
  B(g, -w / 2 - 0.05, w / 2 + 0.05, h - 0.08, h, -d / 2, d / 2 + 0.06, m("wood_dark", "mantel"));
  for (const x of [-0.12, 0.1]) CyX(g, 0.05, x - 0.2, x + 0.2, 0.2, 0, m("bark", "logs"), 10);
  flames(g, P, m, 0, 0.22, 0, 1);
};

MB.piano = (g, P, m) => {
  const {w, d, h} = P;
  const body = m("lacq#15171a", "body");
  B(g, -w / 2, w / 2, 0.02, h, -d / 2, -d / 2 + 0.3, body);
  B(g, -w / 2, -w / 2 + 0.06, 0, 0.75, -d / 2, d / 2, body);
  B(g, w / 2 - 0.06, w / 2, 0, 0.75, -d / 2, d / 2, body);
  B(g, -w / 2 + 0.06, w / 2 - 0.06, 0.66, 0.72, -d / 2 + 0.3, d / 2, body);
  const mg = MG();
  const kw = (w - 0.2) / 52;
  mgBox(mg, m("white", "keys"), -w / 2 + 0.1, w / 2 - 0.1, 0.72, 0.745, -d / 2 + 0.32, d / 2 - 0.02);
  for (let i = 0; i < 51; i++) {
    if (![0, 1, 3, 4, 5].includes(i % 7)) continue;
    const x = -w / 2 + 0.1 + (i + 1) * kw;
    mgBox(mg, m("black", "keys"), x - kw * 0.3, x + kw * 0.3, 0.745, 0.765, -d / 2 + 0.32, d / 2 - 0.08);
  }
  mgEnd(mg, g);
  B(g, -w / 2 + 0.1, w / 2 - 0.1, 0.9, 1.05, -d / 2 + 0.28, -d / 2 + 0.32, body);
};

MB.vitrine = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_dark", "body");
  B(g, -w / 2, w / 2, 0, 0.08, -d / 2, d / 2, wood);
  B(g, -w / 2, w / 2, h - 0.04, h, -d / 2, d / 2, wood);
  B(g, -w / 2, -w / 2 + 0.03, 0.08, h - 0.04, -d / 2, d / 2, wood);
  B(g, w / 2 - 0.03, w / 2, 0.08, h - 0.04, -d / 2, d / 2, wood);
  B(g, -w / 2 + 0.03, w / 2 - 0.03, 0.08, h - 0.04, -d / 2, -d / 2 + 0.015, wood);
  const n = 4;
  for (let i = 1; i < n; i++) B(g, -w / 2 + 0.03, w / 2 - 0.03, 0.08 + i * (h - 0.12) / n, 0.1 + i * (h - 0.12) / n, -d / 2 + 0.015, d / 2 - 0.03, m("glass", "glass"));
  B(g, -w / 2 + 0.03, w / 2 - 0.03, 0.08, h - 0.04, d / 2 - 0.02, d / 2 - 0.01, m("glass", "glass"));
  for (let i = 0; i < n; i++) {
    const y = 0.1 + i * (h - 0.12) / n;
    for (let j = 0; j < 3; j++) Cy(g, 0.04, y, y + 0.1 + (j % 2) * 0.08, -w / 2 + 0.2 + j * (w - 0.4) / 2, 0, m(["ceramic", "brass", "glass_tint"][j], "decor"), 14);
  }
};

MB.sideboard = (g, P, m) => {
  const {w, d, h} = P;
  legs4(g, w, d, 0.14, 0.05, 0.015, m("black", "legs"));
  B(g, -w / 2, w / 2, 0.14, h, -d / 2, d / 2 - 0.018, m("wood_mid", "body"));
  fronts(g, -w / 2, w / 2, 0.15, h - 0.01, d / 2 - 0.018, 1, Math.max(2, Math.round(w / 0.45)), 1, m("wood_mid", "fronts"), m("brass", "handles"), true);
};

MB.pouf = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  const p = Cy(g, r, 0, h, 0, 0, m("velvet", "uph"), 28);
  p.scale.set(w / 2 / r, 1, d / 2 / r);
};

MB.beanbag = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const s = Lump(g, 1, 0, h * 0.42, 0, m("fabric_terra", "uph"), rnd, 1);
  s.scale.set(w / 2, h * 0.45, d / 2);
  const b = Lump(g, 1, 0, h * 0.62, -d * 0.22, m("fabric_terra", "uph"), rnd, 1);
  b.scale.set(w * 0.42, h * 0.38, d * 0.22);
};

MB.wallart = (g, P, m, rnd) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, h, -d / 2, d / 2, m("black", "frame"));
  B(g, -w / 2 + 0.03, w / 2 - 0.03, 0.03, h - 0.03, d / 2 - 0.005, d / 2 + 0.002, m("fabric_white", "canvas"));
  const cols = ["c9713c", "2f5d7c", "d8b34a", "8a3b2f", "5f7f5a", "e5ddd0"];
  for (let i = 0; i < 5; i++) {
    const x0 = -w / 2 + 0.06 + rnd() * (w - 0.3);
    const y0 = 0.06 + rnd() * (h - 0.3);
    B(g, x0, Math.min(w / 2 - 0.05, x0 + 0.1 + rnd() * 0.3), y0, Math.min(h - 0.05, y0 + 0.08 + rnd() * 0.25), d / 2 + 0.002, d / 2 + 0.004, m("col#" + cols[i], "canvas"));
  }
};

function wavy(p, w, h, amp, n, mt) {
  const geo = new THREE.PlaneGeometry(w, h, Math.max(4, n * 6), 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / w + 0.5) * n * Math.PI * 2) * amp);
  geo.computeVertexNormals();
  uvPlane(geo, w, h);
  return addMesh(p, geo, mt);
}

MB.curtains = (g, P, m) => {
  const {w, d, h} = P;
  Cy(g, 0.012, h - 0.04, h - 0.02, 0, 0, m("brass", "rod"), 6);
  const rod = CyX(g, 0.012, -w / 2, w / 2, h - 0.05, 0, m("brass", "rod"), 10);
  if (rod) rod.castShadow = false;
  const cw = w * 0.3;
  const fab = m("curtain", "cloth");
  for (const sx of [-1, 1]) {
    const c = wavy(g, cw, h - 0.1, Math.min(0.04, d * 0.3), Math.round(cw / 0.12), fab);
    c.position.set(sx * (w / 2 - cw / 2), (h - 0.1) / 2, 0);
  }
};

MB.radiator = (g, P, m) => {
  const {w, d, h} = P;
  const mg = MG();
  const n = Math.max(3, Math.round(w / 0.08));
  const mt = m("white", "fins");
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * w / n;
    mgBox(mg, mt, x - w / n * 0.42, x + w / n * 0.42, 0.02, h - 0.02, -d / 2, d / 2);
  }
  mgBox(mg, mt, -w / 2, w / 2, 0, 0.05, -d * 0.2, d * 0.2);
  mgBox(mg, mt, -w / 2, w / 2, h - 0.05, h, -d * 0.2, d * 0.2);
  mgEnd(mg, g);
};

MB.ac = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, 0, h, -d / 2, d / 2, 0.05, m("white", "body"));
  B(g, -w / 2 + 0.05, w / 2 - 0.05, 0.03, 0.07, d / 2 - 0.06, d / 2 + 0.002, m("graphite", "fan"));
  B(g, w / 2 - 0.12, w / 2 - 0.08, h * 0.6, h * 0.6 + 0.01, d / 2, d / 2 + 0.003, m("screen", "screen"));
};

MB.bigplant = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const potH = Math.min(0.45, h * 0.28);
  Cy(g, R * 0.42, 0, potH, 0, 0, m("concrete", "pot"), 20, R * 0.5);
  Cy(g, R * 0.47, potH - 0.03, potH - 0.01, 0, 0, m("soil", "soil"), 20);
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4 + rnd() * 0.4;
    const lean = 0.35 + rnd() * 0.5;
    const top = [Math.cos(a) * R * lean, potH + (h - potH) * (0.5 + rnd() * 0.45), Math.sin(a) * R * lean];
    Lb(g, [0, potH - 0.02, 0], top, 0.01, 0.008, m("leaf_dark", "stems"), 5);
    const lf = Sp(g, 1, top[0], top[1], top[2], m(i % 3 ? "leaf_dark" : "leaf", "leaves"), R * 0.36, 0.02, R * 0.26, 12);
    lf.rotation.y = -a;
    lf.rotation.z = (rnd() - 0.5) * 0.6;
  }
};

MB.bunk = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_light", "frame");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, sx * w / 2 - (sx > 0 ? 0.06 : 0), sx * w / 2 + (sx < 0 ? 0.06 : 0), 0, h, sz * d / 2 - (sz > 0 ? 0.06 : 0), sz * d / 2 + (sz < 0 ? 0.06 : 0), wood);
  for (const y of [0.25, 1.2]) {
    B(g, -w / 2 + 0.06, w / 2 - 0.06, y - 0.06, y, -d / 2 + 0.06, d / 2 - 0.06, wood);
    RB(g, -w / 2 + 0.07, w / 2 - 0.07, y, y + 0.16, -d / 2 + 0.07, d / 2 - 0.07, 0.04, m("fabric_white", "mattress"));
    RB(g, -w / 2 + 0.08, w / 2 - 0.08, y + 0.14, y + 0.2, -d / 2 + 0.5, d / 2 - 0.08, 0.03, m("fabric_blue", "blanket"));
    RB(g, -w / 2 + 0.15, w / 2 - 0.15, y + 0.14, y + 0.25, -d / 2 + 0.1, -d / 2 + 0.42, 0.04, m("fabric_white", "pillows"));
  }
  B(g, -w / 2 + 0.06, w / 2 - 0.06, h - 0.12, h - 0.06, -d / 2 + 0.06, -d / 2 + 0.1, wood);
  B(g, w / 2 - 0.05, w / 2, 1.45, 1.53, -d / 2 + 0.06, d / 2 - 0.6, wood);
  for (let i = 1; i < 5; i++) CyX(g, 0.015, w / 2 - 0.02, w / 2 + 0.02, i * 0.28, d / 2 - 0.3, wood, 8);
  B(g, w / 2 - 0.01, w / 2 + 0.03, 0, 1.45, d / 2 - 0.47, d / 2 - 0.43, wood);
};

MB.crib = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("white", "frame");
  const mg = MG();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mgBox(mg, wood, sx * (w / 2 - 0.025) - 0.025, sx * (w / 2 - 0.025) + 0.025, 0, h, sz * (d / 2 - 0.025) - 0.025, sz * (d / 2 - 0.025) + 0.025);
  for (const sz of [-1, 1]) {
    mgBox(mg, wood, -w / 2, w / 2, h - 0.05, h - 0.02, sz * d / 2 - 0.015, sz * d / 2 + 0.015);
    mgBox(mg, wood, -w / 2, w / 2, 0.3, 0.33, sz * d / 2 - 0.015, sz * d / 2 + 0.015);
  }
  for (const sx of [-1, 1]) {
    mgBox(mg, wood, sx * w / 2 - 0.015, sx * w / 2 + 0.015, h - 0.05, h - 0.02, -d / 2, d / 2);
    mgBox(mg, wood, sx * w / 2 - 0.015, sx * w / 2 + 0.015, 0.3, 0.33, -d / 2, d / 2);
    const n = Math.round(d / 0.07);
    for (let i = 1; i < n; i++) mgBox(mg, wood, sx * w / 2 - 0.01, sx * w / 2 + 0.01, 0.33, h - 0.05, -d / 2 + i * d / n - 0.012, -d / 2 + i * d / n + 0.012);
  }
  mgEnd(mg, g);
  RB(g, -w / 2 + 0.04, w / 2 - 0.04, 0.3, 0.4, -d / 2 + 0.04, d / 2 - 0.04, 0.03, m("fabric_white", "mattress"));
  RB(g, -w / 2 + 0.05, w / 2 - 0.05, 0.39, 0.44, -d / 2 + 0.35, d / 2 - 0.06, 0.02, m("fabric_beige", "blanket"));
};

MB.vanity = (g, P, m) => {
  const {w, d, h} = P;
  const top = Math.min(0.78, h);
  legs4(g, w, d, top - 0.03, 0.04, 0.018, m("wood_light", "legs"));
  RB(g, -w / 2, w / 2, top - 0.03, top, -d / 2, d / 2, 0.008, m("white", "top"));
  B(g, -w / 2 + 0.05, w / 2 - 0.05, top - 0.18, top - 0.03, -d / 2 + 0.04, d / 2 - 0.02, m("white", "body"));
  fronts(g, -w / 2 + 0.05, w / 2 - 0.05, top - 0.18, top - 0.035, d / 2 - 0.02, 1, 2, 1, m("white", "fronts"), m("brass", "handles"), false);
  if (h > top + 0.3) {
    const r = Math.min(w * 0.35, (h - top) * 0.45);
    const mir = CyZ(g, r, -d / 2 + 0.02, -d / 2 + 0.035, 0, top + r + 0.05, m("mirror", "mirror"), 40);
    if (mir) mir.castShadow = false;
    CyZ(g, r + 0.02, -d / 2 + 0.005, -d / 2 + 0.025, 0, top + r + 0.05, m("brass", "mirrorframe"), 40);
  }
};

MB.floormirror = (g, P, m) => {
  const {w, d, h} = P;
  const f = new THREE.Group();
  f.position.set(0, 0, -d / 2 + 0.05);
  f.rotation.x = -0.12;
  g.add(f);
  B(f, -w / 2, w / 2, 0, h, 0, 0.04, m("wood_dark", "mirrorframe"));
  const mm = B(f, -w / 2 + 0.04, w / 2 - 0.04, 0.04, h - 0.04, 0.04, 0.046, m("mirror", "mirror"));
  if (mm) mm.castShadow = false;
};

MB.officechair = (g, P, m) => {
  const {w, d, h} = P;
  const blk = m("graphite", "base");
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const x = Math.cos(a) * w * 0.44;
    const z = Math.sin(a) * d * 0.44;
    Lb(g, [0, 0.08, 0], [x, 0.05, z], 0.02, 0.018, blk, 6);
    Sp(g, 0.03, x, 0.03, z, m("black", "base"), 1, 1, 1, 8);
  }
  Cy(g, 0.025, 0.08, 0.42, 0, 0, m("chrome", "base"), 10);
  RB(g, -w * 0.38, w * 0.38, 0.42, 0.5, -d * 0.35, d * 0.38, 0.03, m("fabric_dark", "seat"));
  const b = RB(g, -w * 0.34, w * 0.34, 0.55, h, -d * 0.4, -d * 0.33, 0.04, m("fabric_dark", "seat"));
  if (b) b.rotation.x = -0.08;
  for (const sx of [-1, 1]) {
    B(g, sx * w * 0.38 - 0.02, sx * w * 0.38 + 0.02, 0.5, 0.66, -d * 0.1, -d * 0.06, blk);
    B(g, sx * w * 0.38 - 0.035, sx * w * 0.38 + 0.035, 0.66, 0.69, -d * 0.2, d * 0.15, blk);
  }
};

MB.barstool = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  Cy(g, r * 0.95, h - 0.05, h, 0, 0, m("leather", "seat"), 24);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    Lb(g, [Math.cos(a) * r * 0.5, h - 0.05, Math.sin(a) * r * 0.5], [Math.cos(a) * r * 0.85, 0, Math.sin(a) * r * 0.85], 0.013, 0.013, m("black", "legs"), 6);
  }
  const ring = addMesh(g, new THREE.TorusGeometry(r * 0.7, 0.01, 6, 24), m("black", "legs"));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = h * 0.35;
};

MB.ovencol = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0, 0.1, -d / 2, d / 2 - 0.07, m("graphite", "plinth"));
  B(g, -w / 2, w / 2, 0.1, h, -d / 2, d / 2 - 0.02, m("white", "body"));
  fronts(g, -w / 2, w / 2, 0.1, 0.8, d / 2 - 0.02, 1, 1, 2, m("white_gloss", "fronts"), m("steel", "handles"), false);
  B(g, -w / 2 + 0.01, w / 2 - 0.01, 0.82, 1.4, d / 2 - 0.02, d / 2, m("screen", "oven"));
  B(g, -w / 2 + 0.06, w / 2 - 0.06, 1.34, 1.36, d / 2, d / 2 + 0.025, m("steel", "handles"));
  B(g, -w / 2 + 0.01, w / 2 - 0.01, 1.42, 1.8, d / 2 - 0.02, d / 2, m("screen", "oven"));
  fronts(g, -w / 2, w / 2, 1.82, h, d / 2 - 0.02, 1, 1, 1, m("white_gloss", "fronts"), m("steel", "handles"), false);
};

MB.dbasin = (g, P, m) => {
  const {w, d, h} = P;
  const top = Math.min(0.86, h);
  B(g, -w / 2, w / 2, 0.35, top - 0.05, -d / 2, d / 2 - 0.02, m("wood_mid", "body"));
  fronts(g, -w / 2, w / 2, 0.35, top - 0.05, d / 2 - 0.02, 1, Math.max(2, Math.round(w / 0.45)), 1, m("wood_mid", "fronts"), m("black", "handles"), false);
  RB(g, -w / 2, w / 2, top - 0.05, top, -d / 2, d / 2, 0.02, m("marble", "ceramic"));
  for (const sx of [-1, 1]) {
    const x = sx * w / 4;
    const bowl = Cy(g, 1, top - 0.001, top + 0.001, x, 0.02, m("col#d9dad8", "ceramic"), 28);
    bowl.scale.set(Math.min(w / 4 - 0.05, 0.22), 1, d * 0.3);
    Cy(g, 0.015, top, top + 0.19, x, -d / 2 + 0.06, m("black", "faucet"), 10);
    Lb(g, [x, top + 0.18, -d / 2 + 0.06], [x, top + 0.18, -d / 2 + 0.16], 0.01, 0.01, m("black", "faucet"), 8);
  }
  if (h > 1.3) {
    const y1 = Math.min(h, top + 1);
    B(g, -w / 2 + 0.01, w / 2 - 0.01, top + 0.2, y1, -d / 2, -d / 2 + 0.01, m("black", "mirrorframe"));
    const mm = B(g, -w / 2 + 0.03, w / 2 - 0.03, top + 0.22, y1 - 0.02, -d / 2 + 0.01, -d / 2 + 0.016, m("mirror", "mirror"));
    if (mm) mm.castShadow = false;
  }
};

MB.towel = (g, P, m) => {
  const {w, d, h} = P;
  const ch = m("chrome", "pipes");
  for (const sx of [-1, 1]) Cy(g, 0.014, 0, h, sx * (w / 2 - 0.02), 0, ch, 10);
  const n = Math.max(3, Math.round(h / 0.1));
  for (let i = 0; i < n; i++) CyX(g, 0.01, -w / 2 + 0.02, w / 2 - 0.02, 0.04 + i * (h - 0.08) / (n - 1), 0, ch, 8);
  B(g, -w / 2 + 0.06, w / 2 - 0.06, h * 0.45, h * 0.8, d * 0.1, d * 0.3, m("fabric_white", "clothes"));
};

MB.bathcab = (g, P, m) => {
  const {w, d, h} = P;
  B(g, -w / 2, w / 2, 0.05, h, -d / 2, d / 2 - 0.018, m("white", "body"));
  fronts(g, -w / 2, w / 2, 0.05, h, d / 2 - 0.018, 1, 1, 3, m("white_gloss", "fronts"), m("black", "handles"), true);
  B(g, -w / 2 + 0.02, w / 2 - 0.02, 0, 0.05, -d / 2 + 0.02, d / 2 - 0.05, m("graphite", "plinth"));
};

MB.poolround = (g, P, m) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  Shell(g, R, R, 0, h, 0, 0, m("poolwall", "body"), 48);
  Cy(g, R - 0.02, 0, 0.02, 0, 0, m("col#6fb2c8", "bowl"), 48);
  Cy(g, R - 0.01, h - 0.12, h - 0.1, 0, 0, m("water", "water"), 48);
  const top = addMesh(g, new THREE.TorusGeometry(R, 0.035, 8, 64), m("col#d8dde2", "rim"));
  top.rotation.x = Math.PI / 2;
  top.position.y = h;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    B(g, Math.cos(a) * R - 0.025, Math.cos(a) * R + 0.025, 0, h, Math.sin(a) * R - 0.025, Math.sin(a) * R + 0.025, m("col#d8dde2", "rim"));
  }
  for (const sx of [-1, 1]) Lb(g, [sx * 0.25, 0, R + 0.55], [sx * 0.25, h + 0.25, R + 0.05], 0.02, 0.02, m("steel", "ladder"), 8);
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    B(g, -0.25, 0.25, (h + 0.25) * t - 0.02, (h + 0.25) * t + 0.02, R + 0.55 - 0.5 * t - 0.08, R + 0.55 - 0.5 * t + 0.08, m("steel", "ladder"));
  }
};

MB.jacuzzi = (g, P, m) => {
  const {w, d, h} = P;
  const c = Math.min(w, d);
  const t = 0.16;
  const wood = m("wood_dark", "body");
  B(g, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + t, wood);
  B(g, -w / 2, w / 2, 0, h, d / 2 - t, d / 2, wood);
  B(g, -w / 2, -w / 2 + t, 0, h, -d / 2 + t, d / 2 - t, wood);
  B(g, w / 2 - t, w / 2, 0, h, -d / 2 + t, d / 2 - t, wood);
  B(g, -w / 2 + t, w / 2 - t, 0, h * 0.35, -d / 2 + t, d / 2 - t, m("col#cfe0ea", "bowl"));
  for (const [x0, x1, z0, z1] of [[-w / 2 + t, w / 2 - t, -d / 2 + t, -d / 2 + t + 0.35], [-w / 2 + t, -w / 2 + t + 0.35, -d / 2 + t + 0.35, d / 2 - t]]) B(g, x0, x1, 0, h * 0.62, z0, z1, m("col#cfe0ea", "bowl"));
  B(g, -w / 2 + t, w / 2 - t, h - 0.14, h - 0.12, -d / 2 + t, d / 2 - t, m("water", "water"));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    Cy(g, 0.025, h - 0.02, h - 0.015, Math.cos(a) * c * 0.3, Math.sin(a) * c * 0.3, m("chrome", "jets"), 10);
  }
  B(g, -0.4, 0.4, 0, 0.22, d / 2, d / 2 + 0.35, m("wood_dark", "steps"));
};

MB.trampoline = (g, P, m) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const y = 0.75;
  const met = m("graphite", "frame");
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    Lb(g, [x * 1.02, 0, z * 1.02], [x, y, z], 0.022, 0.022, met, 8);
    Cy(g, 0.018, y, h, x, z, m("fabric_dark", "pad"), 8);
  }
  const ring = addMesh(g, new THREE.TorusGeometry(R, 0.03, 8, 64), met);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  const pad = addMesh(g, new THREE.TorusGeometry(R - 0.12, 0.09, 8, 64), m("col#2f6fdf", "pad"));
  pad.rotation.x = Math.PI / 2;
  pad.scale.z = 0.3;
  pad.position.y = y + 0.02;
  Cy(g, R - 0.22, y - 0.01, y + 0.005, 0, 0, m("black", "mat"), 48);
  const net = Shell(g, R, R, y + 0.05, h, 0, 0, m("chain", "net"), 48);
  net.castShadow = false;
};

MB.slide = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_raw", "frame");
  const zb = -d / 2 + 0.6;
  for (const sx of [-1, 1]) for (const z of [-d / 2 + 0.05, zb]) B(g, sx * (w / 2 - 0.05) - 0.04, sx * (w / 2 - 0.05) + 0.04, 0, h + 0.8, z - 0.04, z + 0.04, wood);
  B(g, -w / 2 + 0.05, w / 2 - 0.05, h - 0.05, h, -d / 2 + 0.05, zb, wood);
  for (let i = 1; i < 6; i++) B(g, -w / 2 + 0.1, w / 2 - 0.1, i * h / 6 - 0.02, i * h / 6 + 0.02, -d / 2 + 0.01, -d / 2 + 0.09, wood);
  const L = Math.hypot(d / 2 - zb, h - 0.2);
  const ch = new THREE.Group();
  ch.position.set(0, h, zb);
  ch.rotation.x = Math.atan2(h - 0.2, d / 2 - zb);
  g.add(ch);
  B(ch, -0.28, 0.28, -0.03, 0, 0, L, m("plastic_green", "chute"));
  for (const sx of [-1, 1]) B(ch, sx * 0.28 - 0.02, sx * 0.28 + 0.02, 0, 0.12, 0, L, m("plastic_green", "chute"));
  const roof = Cone(g, w * 0.8, h + 0.8, h + 1.15, 0, (-d / 2 + zb) / 2, m("col#d23a2e", "roof"), 4);
  roof.rotation.y = Math.PI / 4;
};

MB.sandbox = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_raw", "sides");
  B(g, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + 0.2, wood);
  B(g, -w / 2, w / 2, 0, h, d / 2 - 0.2, d / 2, wood);
  B(g, -w / 2, -w / 2 + 0.2, 0, h, -d / 2 + 0.2, d / 2 - 0.2, wood);
  B(g, w / 2 - 0.2, w / 2, 0, h, -d / 2 + 0.2, d / 2 - 0.2, wood);
  B(g, -w / 2 + 0.2, w / 2 - 0.2, 0, h - 0.08, -d / 2 + 0.2, d / 2 - 0.2, m("sand", "sand"));
};

MB.lounger = (g, P, m) => {
  const {w, d, h} = P;
  const fr = m("wood_mid", "frame");
  for (const sx of [-1, 1]) B(g, sx * (w / 2 - 0.03) - 0.03, sx * (w / 2 - 0.03) + 0.03, 0.05, 0.3, -d / 2 + 0.05, d / 2 - 0.05, fr);
  for (const z of [-d / 2 + 0.1, d / 2 - 0.1]) for (const sx of [-1, 1]) B(g, sx * (w / 2 - 0.03) - 0.03, sx * (w / 2 - 0.03) + 0.03, 0, 0.3, z - 0.03, z + 0.03, fr);
  RB(g, -w / 2 + 0.03, w / 2 - 0.03, 0.3, 0.37, -d / 2 + 0.7, d / 2 - 0.02, 0.03, m("fabric_white", "cushions"));
  const bk = new THREE.Group();
  bk.position.set(0, 0.34, -d / 2 + 0.7);
  bk.rotation.x = -0.9;
  g.add(bk);
  RB(bk, -w / 2 + 0.03, w / 2 - 0.03, 0, 0.07, -0.72, 0, 0.03, m("fabric_white", "cushions"));
};

MB.umbrella = (g, P, m) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  Cy(g, 0.25, 0, 0.08, 0, 0, m("concrete", "base"), 20);
  Cy(g, 0.022, 0.08, h - 0.05, 0, 0, m("wood_mid", "pole"), 10);
  Cone(g, R, h - 0.45, h, 0, 0, m("canopy", "canopy"), 8);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2;
    Lb(g, [0, h - 0.1, 0], [Math.cos(a) * R * 0.92, h - 0.46, Math.sin(a) * R * 0.92], 0.008, 0.008, m("wood_mid", "pole"), 4);
  }
};

MB.hammock = (g, P, m) => {
  const {w, d, h} = P;
  const fr = m("wood_mid", "frame");
  for (const sx of [-1, 1]) {
    Lb(g, [sx * w / 2, 0, -d / 2], [sx * (w / 2 - 0.35), h, 0], 0.04, 0.035, fr, 8);
    Lb(g, [sx * w / 2, 0, d / 2], [sx * (w / 2 - 0.35), h, 0], 0.04, 0.035, fr, 8);
  }
  Lb(g, [-w / 2, 0.05, 0], [w / 2, 0.05, 0], 0.04, 0.04, fr, 8);
  const L = w - 0.9;
  const geo = new THREE.PlaneGeometry(L, 0.8, 24, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const t = x / L + 0.5;
    pos.setXYZ(i, x, h - 0.2 - 0.45 * 4 * t * (1 - t) - 0.08 * (1 - Math.pow(z / 0.4, 2)), z * (0.3 + 0.7 * 4 * t * (1 - t)));
  }
  geo.computeVertexNormals();
  uvPlane(geo, L, 0.8);
  addMesh(g, geo, m("canopy", "cloth"));
};

MB.firepit = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const s = Lump(g, 1, Math.cos(a) * R * 0.82, h * 0.45, Math.sin(a) * R * 0.82, m("rock", "stones"), rnd, 1);
    s.scale.set(R * 0.22, h * 0.5, R * 0.22);
  }
  B(g, -R * 0.6, R * 0.6, 0, 0.03, -R * 0.6, R * 0.6, m("gravel", "base"));
  for (let i = 0; i < 4; i++) {
    const lg = Lb(g, [Math.cos(i * 1.6) * R * 0.45, 0.04, Math.sin(i * 1.6) * R * 0.45], [0, 0.28, 0], 0.045, 0.035, m("bark", "logs"), 8);
    if (lg) lg.castShadow = false;
  }
  flames(g, P, m, 0, 0.08, 0, 1.3);
};

MB.woodpile = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const wood = m("wood_dark", "frame");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, sx * (w / 2 - 0.04) - 0.04, sx * (w / 2 - 0.04) + 0.04, 0, h - 0.1 + (sz < 0 ? 0.1 : 0), sz * (d / 2 - 0.04) - 0.04, sz * (d / 2 - 0.04) + 0.04, wood);
  const rf = B(g, -w / 2 - 0.1, w / 2 + 0.1, h - 0.06, h, -d / 2 - 0.15, d / 2 + 0.15, m("roof", "roof"));
  if (rf) rf.rotation.x = -0.05;
  B(g, -w / 2 + 0.08, w / 2 - 0.08, 0.1, 0.14, -d / 2 + 0.04, d / 2 - 0.04, wood);
  const mg = MG();
  const r = 0.07;
  const cols = Math.floor((w - 0.2) / (2 * r));
  const rows = Math.floor((h - 0.45) / (2 * r * 0.9));
  const lg = m("logs", "logs");
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = -w / 2 + 0.1 + r + i * 2 * r + (j % 2) * r * 0.5;
    if (x > w / 2 - 0.1 - r) continue;
    const geo = new THREE.CylinderGeometry(r * (0.85 + rnd() * 0.15), r * (0.85 + rnd() * 0.15), d - 0.12, 8);
    uvScale(geo, 2 * Math.PI * r, d);
    geo.rotateX(Math.PI / 2);
    geo.translate(x, 0.14 + r + j * 2 * r * 0.9, 0);
    mgAdd(mg, lg, geo);
  }
  mgEnd(mg, g);
};

MB.doghouse = (g, P, m) => {
  const {w, d, h} = P;
  const walls = h * 0.6;
  const pl = m("planks", "walls");
  B(g, -w / 2, w / 2, 0, 0.06, -d / 2, d / 2, m("wood_dark", "base"));
  B(g, -w / 2, w / 2, 0.06, walls, -d / 2, d / 2, pl);
  B(g, -0.17, 0.17, 0.08, walls * 0.8, d / 2 - 0.01, d / 2 + 0.002, m("black", "door"));
  smallRoof(g, w, d, walls, 32, 0.08, m("shingles", "roof"), m("roofedge", "roofedge"), pl);
};

MB.barrel = (g, P, m) => {
  const {w, d, h} = P;
  const r = Math.min(w, d) / 2;
  Cy(g, r * 0.92, 0, h, 0, 0, m("plastic_green", "body"), 28, r * 0.92);
  for (const y of [0.1, h / 2, h - 0.1]) {
    const t = addMesh(g, new THREE.TorusGeometry(r * 0.93, 0.02, 6, 32), m("plastic_green", "body"));
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
  }
  Cy(g, r * 0.88, h - 0.03, h - 0.02, 0, 0, m("water", "water"), 28);
};

MB.bins = (g, P, m) => {
  const {w, d, h} = P;
  const bw = w / 2 - 0.04;
  const cols = ["plastic_green", "col#2f5f9a"];
  for (let i = 0; i < 2; i++) {
    const x = -w / 2 + bw / 2 + i * (bw + 0.08);
    RB(g, x - bw / 2, x + bw / 2, 0.08, h - 0.06, -d / 2, d / 2 - 0.02, 0.03, m(cols[i], "body"));
    RB(g, x - bw / 2 - 0.02, x + bw / 2 + 0.02, h - 0.06, h, -d / 2 - 0.03, d / 2 + 0.02, 0.02, m(cols[i], "lid"));
    for (const sx of [-1, 1]) CyX(g, 0.08, x + sx * bw * 0.35 - 0.03, x + sx * bw * 0.35 + 0.03, 0.08, -d / 2 + 0.1, m("rubber", "tires"), 14);
  }
};

MB.mailbox = (g, P, m) => {
  const {w, d, h} = P;
  Cy(g, 0.03, 0, h - 0.3, 0, 0, m("graphite", "body"), 10);
  RB(g, -w / 2, w / 2, h - 0.35, h, -d / 2, d / 2, 0.02, m("col#2f5f9a", "body"));
  B(g, -w * 0.35, w * 0.35, h - 0.08, h - 0.06, d / 2, d / 2 + 0.004, m("black", "slot"));
};

MB.pond = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), m("pondwater", "water"));
  water.rotation.x = -Math.PI / 2;
  water.scale.set(w - 0.3, d - 0.3, 1);
  water.position.y = Math.max(0.02, h - 0.06);
  water.receiveShadow = true;
  g.add(water);
  const n = Math.round((w + d) * 3.2);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const s = Lump(g, 1, Math.cos(a) * (w / 2 - 0.12), 0.05, Math.sin(a) * (d / 2 - 0.12), m("rock", "stones"), rnd, 1);
    const k = 0.12 + rnd() * 0.08;
    s.scale.set(k, 0.08 + rnd() * 0.05, k);
  }
};

MB.boulder = (g, P, m, rnd) => {
  const s = Lump(g, 1, 0, P.h * 0.45, 0, m("rock", "stones"), rnd, 1);
  s.scale.set(P.w / 2, P.h * 0.55, P.d / 2);
};

MB.birch = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const tr = Math.max(0.07, R * 0.06);
  const bark = m("birchbark", "trunk");
  Cy(g, tr, 0, h * 0.85, 0, 0, bark, 12, tr * 0.4);
  const L = leafSet(m);
  if (L.k < 0.6) bareBranches(g, 0, h * 0.35, h * 0.97, R * 0.8, tr * 0.8, bark, rnd, 10);
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    Lb(g, [0, h * (0.4 + i * 0.1), 0], [Math.cos(a) * R * 0.45, h * (0.55 + i * 0.1), Math.sin(a) * R * 0.45], tr * 0.35, tr * 0.12, bark, 5);
  }
  if (!L.k) return;
  const n = Math.round(9 * (L.n > 0.5 ? 1 : 1.5));
  for (let i = 0; i < n; i++) {
    if (rnd() > L.n + 0.05) continue;
    const a = rnd() * Math.PI * 2;
    const y = h * (0.42 + rnd() * 0.5);
    const rr = R * (0.15 + rnd() * 0.35) * (1 - (y / h - 0.4) * 0.6);
    const s = R * (0.28 + rnd() * 0.12) * L.k;
    const lp = Lump(g, s, Math.cos(a) * rr, y, Math.sin(a) * rr, L.mats[i % L.mats.length], rnd, 1.35);
    lp.scale.y = 1.25;
  }
};

MB.apple = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  const bark = m("bark", "trunk");
  const tr = Math.max(0.08, R * 0.05);
  Cy(g, tr, 0, h * 0.45, 0, 0, bark, 10, tr * 0.8);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + rnd() * 0.5;
    Lb(g, [0, h * 0.4, 0], [Math.cos(a) * R * 0.5, h * 0.72, Math.sin(a) * R * 0.5], tr * 0.6, tr * 0.25, bark, 6);
  }
  const L = leafSet(m);
  const s = WX.season || "summer";
  if (L.k < 0.6) bareBranches(g, 0, h * 0.45, h * 0.95, R, tr, bark, rnd, 8);
  if (!L.k) return;
  const pts = [];
  for (let i = 0; i < 9; i++) {
    if (rnd() > L.n + 0.05) continue;
    const a = rnd() * Math.PI * 2;
    const rr = R * (0.1 + rnd() * 0.4);
    const y = h * (0.6 + rnd() * 0.25);
    const r = R * (0.35 + rnd() * 0.15) * L.k;
    Lump(g, r, Math.cos(a) * rr, y, Math.sin(a) * rr, L.mats[i % L.mats.length], rnd, 0.85);
    pts.push([Math.cos(a) * rr, y, Math.sin(a) * rr, r]);
  }
  const fruit = s === "spring" ? m("blossom", "blossom") : (s === "summer" && SKY.m >= 7) || s === "autumn" ? m("apple", "apples") : null;
  if (!fruit) return;
  for (const [x, y, z, r] of pts) {
    for (let j = 0; j < 7; j++) {
      const a = rnd() * Math.PI * 2;
      const b = rnd() * Math.PI * 0.8;
      Sp(g, s === "spring" ? 0.05 : 0.04, x + Math.cos(a) * Math.sin(b) * r * 0.95, y + Math.cos(b) * r * 0.85, z + Math.sin(a) * Math.sin(b) * r * 0.95, fruit, 1, 1, 1, 8);
    }
  }
};

MB.thuja = (g, P, m, rnd) => {
  const {w, d, h} = P;
  const R = Math.min(w, d) / 2;
  Cy(g, 0.05, 0, h * 0.2, 0, 0, m("bark", "trunk"), 8);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = R * (1 - t * 0.75);
    const lp = Lump(g, r, 0, h * (0.2 + t * 0.62), 0, m("leaf_dark", "needles"), rnd, 1.1);
    lp.scale.y = 1.35;
  }
};

MB.solar = (g, P, m) => {
  const {w, d, h} = P;
  const fr = m("aluminium", "frame");
  for (const sx of [-1, 1]) {
    Lb(g, [sx * (w / 2 - 0.1), 0, -d / 2 + 0.1], [sx * (w / 2 - 0.1), h - 0.05, -d / 2 + 0.15], 0.025, 0.025, fr, 6);
    Lb(g, [sx * (w / 2 - 0.1), 0, d / 2 - 0.1], [sx * (w / 2 - 0.1), 0.4, d / 2 - 0.12], 0.025, 0.025, fr, 6);
  }
  const pg = new THREE.Group();
  pg.position.set(0, (h + 0.4) / 2, 0);
  pg.rotation.x = Math.atan2(h - 0.45, d - 0.25);
  g.add(pg);
  const L = Math.hypot(d, h - 0.4);
  B(pg, -w / 2, w / 2, -0.02, 0.02, -L / 2, L / 2, fr);
  B(pg, -w / 2 + 0.03, w / 2 - 0.03, 0.02, 0.024, -L / 2 + 0.03, L / 2 - 0.03, m("solar", "panel2"));
};

MB.heatpump = (g, P, m) => {
  const {w, d, h} = P;
  RB(g, -w / 2, w / 2, 0.08, h, -d / 2, d / 2, 0.02, m("white", "body"));
  for (const sx of [-1, 1]) B(g, sx * (w / 2 - 0.1) - 0.04, sx * (w / 2 - 0.1) + 0.04, 0, 0.08, -d / 2, d / 2, m("graphite", "base"));
  const r = Math.min(w * 0.3, (h - 0.1) * 0.4);
  CyZ(g, r, d / 2 - 0.01, d / 2 + 0.005, -w * 0.12, 0.08 + (h - 0.08) / 2, m("graphite", "fan"), 32);
  for (let i = -3; i <= 3; i++) B(g, -w * 0.12 - r, -w * 0.12 + r, 0.08 + (h - 0.08) / 2 + i * r / 3.5 - 0.004, 0.08 + (h - 0.08) / 2 + i * r / 3.5 + 0.004, d / 2 + 0.005, d / 2 + 0.012, m("steel", "fan"));
};

MB.pergola = (g, P, m) => {
  const {w, d, h} = P;
  const wood = m("wood_mid", "frame");
  const mg = MG();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mgBox(mg, wood, sx * (w / 2 - 0.1) - 0.07, sx * (w / 2 - 0.1) + 0.07, 0, h, sz * (d / 2 - 0.1) - 0.07, sz * (d / 2 - 0.1) + 0.07);
  for (const sz of [-1, 1]) mgBox(mg, wood, -w / 2, w / 2, h - 0.2, h, sz * (d / 2 - 0.1) - 0.05, sz * (d / 2 - 0.1) + 0.05);
  const n = Math.max(3, Math.round(w / 0.3));
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + 0.05 + i * (w - 0.1) / n;
    mgBox(mg, wood, x - 0.025, x + 0.025, h, h + 0.15, -d / 2 - 0.1, d / 2 + 0.1);
  }
  mgEnd(mg, g);
};

MB.carport = (g, P, m) => {
  const {w, d, h} = P;
  const met = m("graphite", "frame");
  const n = Math.max(2, Math.round(d / 3) + 1);
  for (const sx of [-1, 1]) for (let i = 0; i < n; i++) {
    const z = -d / 2 + 0.1 + i * (d - 0.2) / (n - 1);
    B(g, sx * (w / 2 - 0.08) - 0.05, sx * (w / 2 - 0.08) + 0.05, 0, h - (sx > 0 ? 0.25 : 0), z - 0.05, z + 0.05, met);
  }
  const rg = new THREE.Group();
  rg.position.set(0, h - 0.125, 0);
  rg.rotation.z = -Math.atan2(0.25, w);
  g.add(rg);
  const W2 = Math.hypot(w, 0.25) + 0.3;
  B(rg, -W2 / 2, W2 / 2, -0.06, 0, -d / 2 - 0.15, d / 2 + 0.15, met);
  const sh = B(rg, -W2 / 2, W2 / 2, 0, 0.012, -d / 2 - 0.15, d / 2 + 0.15, m("poly", "roof"));
  if (sh) sh.castShadow = true;
};
