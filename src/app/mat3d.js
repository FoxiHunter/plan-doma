"use strict";
const TEXS = new Map();
const MATC = new Map();
const CLIP = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6)];

function srng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MGROUPS = [
  ["floor", "Полы"],
  ["wall", "Стены"],
  ["facade", "Фасад"],
  ["roof", "Кровля"],
  ["wood", "Дерево"],
  ["stone", "Камень и керамика"],
  ["paint", "Краска и пластик"],
  ["metal", "Металл"],
  ["fabric", "Ткань и кожа"],
  ["glass", "Стекло"],
  ["ground", "Земля и покрытия"],
  ["plant", "Растения"]
];

const MDEF = {
  grass: {n: "Газон", g: "ground", map: "grass", c: 0x71a04c, r: 1, anti: 0.0667, pud: 0.25},
  meadow: {n: "Трава луговая", g: "ground", map: "grass", c: 0x7f9c55, r: 1, anti: 0.0667, pud: 0.25},
  grass_s: {map: "grass", c: 0x86b852, r: 1, anti: 0.0667, pud: 0.25},
  grass_a: {map: "grass", c: 0x8a9c4e, r: 1, anti: 0.0667, pud: 0.25},
  grass_w: {map: "grass", c: 0x8a8660, r: 1, anti: 0.0667, pud: 0.25},
  meadow_s: {map: "grass", c: 0x8aa857, r: 1, anti: 0.0667, pud: 0.25},
  meadow_a: {map: "grass", c: 0x94985a, r: 1, anti: 0.0667, pud: 0.25},
  meadow_w: {map: "grass", c: 0x928a67, r: 1, anti: 0.0667, pud: 0.25},
  soil: {n: "Земля", g: "ground", map: "soil", c: 0x6a4c38, r: 1, pud: 0.8},
  gravel: {n: "Гравий", g: "ground", map: "gravel", c: 0xafa89c, r: 1, pud: 0.35},
  paving: {n: "Тротуарная плитка", g: "ground", map: "paving", c: 0xb2aa9f, c2: 0x7d776d, r: 0.88, pud: 1},
  sidewalk: {n: "Плитка серая", g: "ground", map: "paving", c: 0xb9b8b4, c2: 0x85847f, r: 0.9, pud: 1},
  asphalt: {n: "Асфальт", g: "ground", map: "asphalt", c: 0x55575b, r: 0.92, anti: 0.1, pud: 1.1},
  deck: {n: "Террасная доска", g: "wood", map: "deck", c: 0xb5865c, r: 0.8, pud: 0.4},
  facade: {n: "Штукатурка фасадная", g: "facade", map: "plaster", c: 0xf3ece0, r: 0.93},
  decor: {n: "Декоративная штукатурка", g: "facade", map: "decor", c: 0xeee6d8, r: 0.95},
  brick: {n: "Кирпич красный", g: "facade", map: "brick", c: 0xc27458, c2: 0xbdb7ad, r: 0.9},
  brick_white: {n: "Кирпич белый", g: "facade", map: "brick", c: 0xf0ece4, c2: 0xcfcac1, r: 0.9},
  clinker: {n: "Клинкер тёмный", g: "facade", map: "clinker", c: 0x7d5a4a, c2: 0xa39e95, r: 0.75},
  planken: {n: "Планкен", g: "facade", map: "planken", c: 0xb98a5e, r: 0.8},
  siding: {n: "Сайдинг", g: "facade", map: "siding", c: 0xe2ded3, r: 0.6},
  stone: {n: "Камень бутовый", g: "facade", map: "stone", c: 0xa99e90, c2: 0x6f6a63, r: 0.95},
  plinth: {n: "Цокольный камень", g: "facade", map: "ashlar", c: 0xa8a197, c2: 0x6c6862, r: 0.92},
  aerated: {n: "Газобетон", g: "facade", map: "aerated", c: 0xeceae4, r: 1},
  fibro: {n: "Фиброцементные панели", g: "facade", map: "fibro", c: 0xa7abab, r: 0.8},
  logs: {n: "Бревно", g: "facade", map: "logs", c: 0xd6a872, r: 0.85},
  planks: {n: "Доска вертикальная", g: "facade", map: "planks", c: 0xaa8a66, r: 0.85},
  plaster: {n: "Штукатурка белая", g: "wall", map: "plaster", c: 0xfaf8f3, r: 0.95},
  wallpaint: {n: "Краска матовая", g: "wall", map: "plaster", c: 0xf2efe8, r: 0.9},
  metro: {n: "Плитка кабанчик", g: "wall", map: "metro", c: 0xf7f7f4, c2: 0xcbc7bf, r: 0.9},
  panel: {n: "Вагонка", g: "wall", map: "panel", c: 0xe2c49c, r: 0.75},
  top: {map: "plaster", c: 0xdcd8cf, r: 0.95},
  cap: {c: 0x3a3f45, r: 0.9},
  roof: {n: "Металлочерепица", g: "roof", map: "roofmetal", c: 0x61666d, r: 0.42, m: 0.45},
  seam: {n: "Фальцевая кровля", g: "roof", map: "seam", c: 0x5d6168, r: 0.35, m: 0.55},
  shingles: {n: "Мягкая черепица", g: "roof", map: "shingles", c: 0x7d5646, r: 0.95},
  ctile: {n: "Керамическая черепица", g: "roof", map: "ctile", c: 0xb8674a, r: 0.75},
  membrane: {n: "Кровельная мембрана", g: "roof", map: "membrane", c: 0x70747a, r: 0.8},
  roofedge: {n: "Металл тёмный", g: "metal", c: 0x3b3f45, r: 0.5, m: 0.4},
  soffit: {n: "Подшив деревом", g: "wood", map: "wood", c: 0xdcc9a8, r: 0.8},
  gutter: {n: "Водосток", g: "metal", c: 0x6d737a, r: 0.35, m: 0.7, side: 2},
  parquet: {n: "Паркет дуб", g: "floor", map: "parquet", c: 0xd7b089, r: 0.55, cc: 0.3, ccr: 0.14},
  parquet_dark: {n: "Паркет орех", g: "floor", map: "parquet", c: 0x8c5f40, r: 0.5, cc: 0.3, ccr: 0.14},
  herring: {n: "Ёлочка дуб", g: "floor", map: "herring", c: 0xcfa378, r: 0.55, cc: 0.3, ccr: 0.14},
  laminate: {n: "Ламинат серый дуб", g: "floor", map: "laminate", c: 0xb7ab9c, r: 0.6, cc: 0.15, ccr: 0.22},
  tile: {n: "Плитка 30×30", g: "floor", map: "tile", c: 0xf4f2ee, c2: 0xbdb9b1, r: 0.9},
  porcelain: {n: "Керамогранит 60×60", g: "floor", map: "porcelain", c: 0xd3ccc0, c2: 0xa29c93, r: 0.9},
  microcement: {n: "Микроцемент", g: "floor", map: "concrete", c: 0xc3beb5, r: 0.7},
  carpet: {n: "Ковролин", g: "floor", map: "carpet", c: 0xa99f92, r: 1},
  marble: {n: "Мрамор", g: "stone", map: "marble", c: 0xf3f1ed, c2: 0xd9d5cf, r: 0.9, cc: 0.55, ccr: 0.05},
  granite: {n: "Гранит", g: "stone", map: "granite", c: 0xa3a09d, r: 0.8, cc: 0.4, ccr: 0.06},
  concrete: {n: "Бетон", g: "stone", map: "concrete", c: 0xbdb9b2, r: 0.9, pud: 0.9},
  ceramic: {n: "Санфаянс", g: "stone", c: 0xf9f9f7, r: 0.3, cc: 1, ccr: 0.03},
  terracotta: {n: "Терракота", g: "stone", c: 0xb86a45, r: 0.8},
  wood_light: {n: "Дуб светлый", g: "wood", map: "wood", c: 0xe6cda6, r: 0.55},
  wood_mid: {n: "Дуб", g: "wood", map: "wood", c: 0xb98b5e, r: 0.55},
  wood_dark: {n: "Орех", g: "wood", map: "wood", c: 0x6b4b33, r: 0.5},
  wenge: {n: "Венге", g: "wood", map: "wood", c: 0x40302a, r: 0.5},
  birch: {n: "Берёза", g: "wood", map: "wood", c: 0xf0e2c6, r: 0.6},
  wood_raw: {n: "Сосна некрашеная", g: "wood", map: "wood", c: 0xdcbb8d, r: 0.8},
  door_int: {n: "Шпон светлый", g: "wood", map: "wood", c: 0xf0e6d4, r: 0.5},
  white: {n: "Белый матовый", g: "paint", c: 0xf1f0ec, r: 0.6},
  white_gloss: {n: "Белый глянец", g: "paint", c: 0xf6f6f4, r: 0.3, cc: 0.6, ccr: 0.05},
  black: {n: "Чёрный", g: "paint", c: 0x1b1c1e, r: 0.4},
  graphite: {n: "Графит", g: "paint", c: 0x3a3d42, r: 0.5},
  lacquer: {n: "Эмаль цветная", g: "paint", c: 0x5b7592, r: 0.35, cc: 0.9, ccr: 0.04},
  frame: {n: "ПВХ графит", g: "paint", c: 0x3b4047, r: 0.45},
  frame_white: {n: "ПВХ белый", g: "paint", c: 0xf2f2f0, r: 0.4},
  sill_in: {n: "Подоконник ПВХ", g: "paint", c: 0xf4f3f0, r: 0.3},
  plastic_green: {n: "Пластик", g: "paint", c: 0x3f6b3a, r: 0.6},
  rubber: {n: "Резина", g: "paint", c: 0x19191b, r: 0.9},
  screen: {n: "Экран", g: "paint", c: 0x0c0d0f, r: 0.3, m: 0.2, cc: 1, ccr: 0.02},
  chrome: {n: "Хром", g: "metal", c: 0xeeeeee, r: 0.12, m: 1},
  steel: {n: "Сталь", g: "metal", c: 0xb9bcc0, r: 0.32, m: 0.85},
  darkmetal: {n: "Чёрный металл", g: "metal", c: 0x2e3135, r: 0.45, m: 0.6},
  brass: {n: "Латунь", g: "metal", c: 0xc9a45c, r: 0.3, m: 1},
  copper: {n: "Медь", g: "metal", c: 0xc0795a, r: 0.35, m: 1},
  aluminium: {n: "Алюминий", g: "metal", c: 0xc4c7ca, r: 0.45, m: 0.9},
  door_entry: {n: "Металл входной двери", g: "metal", c: 0x2e3236, r: 0.45, m: 0.35},
  sill_out: {n: "Отлив металлический", g: "metal", c: 0x8f959c, r: 0.4, m: 0.6},
  post: {n: "Металл зелёный", g: "metal", c: 0x3c4a3f, r: 0.5, m: 0.4},
  glass: {n: "Стекло прозрачное", g: "glass", c: 0xcfe4ee, r: 0.02, op: 0.2, tr: 0.84, env: 1.3},
  glass_frost: {n: "Стекло матовое", g: "glass", c: 0xe8eff2, r: 0.35, op: 0.7, env: 1},
  glass_tint: {n: "Стекло тонированное", g: "glass", c: 0x3d4a52, r: 0.02, op: 0.5, tr: 0.55, env: 1.3},
  mirror: {n: "Зеркало", g: "glass", c: 0xe4eaee, r: 0.02, m: 1},
  poly: {n: "Поликарбонат", g: "glass", c: 0xdff0f5, r: 0.15, op: 0.3, side: 2},
  carglass: {c: 0x1b2127, r: 0.1, m: 0.2, cc: 1, ccr: 0.02},
  fabric_grey: {n: "Ткань серая", g: "fabric", map: "fabric", c: 0x9a9fa6, r: 1, sheen: 1},
  fabric_dark: {n: "Ткань тёмная", g: "fabric", map: "fabric", c: 0x5f636a, r: 1, sheen: 1},
  fabric_beige: {n: "Ткань бежевая", g: "fabric", map: "fabric", c: 0xddcfb8, r: 1, sheen: 1},
  fabric_blue: {n: "Ткань синяя", g: "fabric", map: "fabric", c: 0x5f7a9a, r: 1, sheen: 1},
  fabric_green: {n: "Ткань зелёная", g: "fabric", map: "fabric", c: 0x789472, r: 1, sheen: 1},
  fabric_white: {n: "Ткань белая", g: "fabric", map: "fabric", c: 0xf7f5f0, r: 1, sheen: 1},
  fabric_terra: {n: "Ткань терракотовая", g: "fabric", map: "fabric", c: 0xbd7355, r: 1, sheen: 1},
  velvet: {n: "Велюр", g: "fabric", map: "carpet", c: 0x51627a, r: 0.95, sheen: 1.2},
  leather: {n: "Кожа коричневая", g: "fabric", map: "leather", c: 0x7a5439, r: 0.55, cc: 0.25, ccr: 0.35},
  leather_black: {n: "Кожа чёрная", g: "fabric", map: "leather", c: 0x2c2c2d, r: 0.5, cc: 0.25, ccr: 0.35},
  rug: {n: "Ковёр", g: "fabric", map: "carpet", c: 0xc4b198, r: 1, sheen: 0.6},
  leaf: {n: "Листва", g: "plant", map: "leaf", c: 0x8fb56d, r: 0.9},
  leaf_light: {n: "Листва светлая", g: "plant", map: "leaf", c: 0xb5d18a, r: 0.9},
  leaf_dark: {n: "Хвоя", g: "plant", map: "leaf", c: 0x5f8061, r: 0.9},
  bark: {n: "Кора", g: "plant", map: "bark", c: 0x7a6250, r: 1},
  leaf_spring: {n: "Листва весенняя", g: "plant", map: "leaf", c: 0xa7d06a, r: 0.9},
  leaf_y: {n: "Листва жёлтая", g: "plant", map: "leaf", c: 0xd9ad3a, r: 0.9},
  leaf_o: {n: "Листва оранжевая", g: "plant", map: "leaf", c: 0xcf7a30, r: 0.9},
  leaf_r: {n: "Листва красная", g: "plant", map: "leaf", c: 0xa9452f, r: 0.9},
  leaf_brown: {n: "Листва сухая", g: "plant", map: "leaf", c: 0x8a6a3e, r: 0.95},
  water: {n: "Вода", g: "glass", c: 0x3a8fb3, r: 0.03, m: 0.1, op: 0.82, env: 1.4, wave: 1},
  pondwater: {n: "Вода пруда", g: "glass", c: 0x2d4b3c, r: 0.04, op: 0.9, env: 1.3, wave: 1},
  poolwall: {n: "Стенка бассейна", g: "paint", c: 0x3f6fa3, r: 0.5, side: 2},
  canopy: {n: "Ткань тента", g: "fabric", map: "fabric", c: 0xe8e1d0, r: 1, side: 2, sheen: 0.5},
  curtain: {n: "Ткань штор", g: "fabric", map: "fabric", c: 0xd9cdb8, r: 1, side: 2, sheen: 0.8},
  birchbark: {n: "Кора берёзы", g: "plant", map: "bark", c: 0xe6e2d8, r: 0.9},
  blossom: {c: 0xf6e3ea, r: 0.8},
  rock: {n: "Камень природный", g: "stone", map: "granite", c: 0x8c877e, r: 0.9},
  apple: {c: 0xb8231c, r: 0.45, cc: 0.5, ccr: 0.1},
  snow: {map: "snow", c: 0xf6f8fb, r: 0.75},
  lamp: {c: 0xfff4dc, r: 0.3, em: 0xfff0d0},
  bulb_off: {c: 0xeeeae2, r: 0.25, op: 0.85},
  lampshade: {n: "Абажур", g: "fabric", map: "fabric", c: 0xefe6d2, r: 1, sheen: 0.6, side: 2},
  opal: {n: "Матовый плафон", g: "glass", c: 0xf4f2ee, r: 0.4, op: 0.92},
  shade_metal: {n: "Металл плафона", g: "metal", c: 0x2e3135, r: 0.45, m: 0.6, side: 2},
  redlamp: {c: 0x9e1111, r: 0.3, em: 0x5a0000},
  skin: {c: 0xd6a588, r: 0.65},
  hair: {c: 0x3a2a1f, r: 0.85},
  shirt: {map: "fabric", c: 0x6680a0, r: 0.9},
  pants: {map: "fabric", c: 0x3a3d45, r: 0.9},
  shoes: {c: 0x2a2522, r: 0.6},
  fence: {n: "3D-сетка", g: "metal", map: "fence", c: 0x2f4d3a, r: 0.5, m: 0.35, alpha: 0.5, side: 2},
  chain: {n: "Сетка рабица", g: "metal", map: "chain", c: 0x9aa39c, r: 0.45, m: 0.6, alpha: 0.5, side: 2},
  prof: {n: "Профлист", g: "metal", map: "prof", c: 0x56695c, r: 0.42, m: 0.35},
  euro: {n: "Евроштакетник", g: "metal", c: 0x6a4b38, r: 0.38, m: 0.35},
  picket: {n: "Штакетник", g: "wood", map: "wood", c: 0xc9a77c, r: 0.8},
  sand: {n: "Песок", g: "ground", map: "soil", c: 0xd8c298, r: 1, pud: 0.2},
  solar: {n: "Солнечная панель", g: "glass", map: "solar", c: 0x1d2b45, r: 0.2, m: 0.3, cc: 1, ccr: 0.02},
  garagedoor: {n: "Секционные панели", g: "metal", map: "ribs", c: 0xdbdad6, r: 0.5, m: 0.2},
  redline: {c: 0xd23a2e, r: 0.8},
  zone: {c: 0xffffff, r: 1, op: 0.6},
  sector: {c: 0xf59e0b, r: 1, op: 0.4, side: 2},
  sel: {c: 0x3b82f6, r: 1, op: 0.28},
  ghost: {c: 0x3b82f6, r: 1, op: 0.35},
  flower_r: {c: 0xc7304a, r: 0.8},
  flower_y: {c: 0xf1c232, r: 0.8},
  flower_v: {c: 0x8e5ab8, r: 0.8},
  flower_w: {c: 0xf5f3ee, r: 0.8},
  book_1: {c: 0x8a3b2f, r: 0.8},
  book_2: {c: 0x2f5d7c, r: 0.8},
  book_3: {c: 0xc9a44a, r: 0.8},
  book_4: {c: 0x3f6b4f, r: 0.8}
};

function tex(name) {
  if (TEXS.has(name)) return TEXS.get(name);
  const t = typeof texGen === "function" ? texGen(name) : null;
  TEXS.set(name, t);
  return t;
}

function lin(hex) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

function hex6(n) {
  return "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6);
}

function baseDef(base) {
  let def = MDEF[base];
  if (!def && base.indexOf("#") > 0) {
    const [kind, hx] = base.split("#");
    const c = parseInt(hx, 16);
    if (kind === "paint") def = {c, r: 0.4, m: 0.45, cc: 1, ccr: 0.03};
    else if (kind === "glow") def = {c, r: 0.35, em: c, emi: 5};
    else if (kind === "lacq") def = {c, r: 0.3, cc: 1, ccr: 0.03};
    else if (kind === "soft") def = {c: 0xf4f1ea, r: 0.6, em: c, emi: 1.4};
    else if (kind === "shadeon") def = {map: "fabric", c: 0xefe6d2, r: 1, em: c, emi: 0.8, side: 2};
    else if (kind === "fabric") def = {map: "fabric", c, r: 1, sheen: 1};
    else def = {c, r: 0.7};
  }
  return def || {c: 0xb0b4b8, r: 0.8};
}

function keyDef(name) {
  const at = name.indexOf("@");
  const def = baseDef(at >= 0 ? name.slice(0, at) : name);
  if (at < 0) return def;
  return Object.assign({}, def, {c: parseInt(name.slice(at + 1), 16) || 0});
}

function matHex(name) {
  return hex6(keyDef(name).c);
}

function matTitle(name) {
  const at = name.indexOf("@");
  const base = at >= 0 ? name.slice(0, at) : name;
  const def = MDEF[base];
  return def && def.n ? def.n : "Свой цвет";
}

function specKey(sp, def) {
  if (!sp) return def;
  const base = sp.m && MDEF[sp.m] && MDEF[sp.m].n ? sp.m : def;
  return sp.c ? base + "@" + sp.c.slice(1).toLowerCase() : base;
}

function patchMat(mt, def, T) {
  const macro = T && T.map && def.anti ? tex("macro") : null;
  const mk = !!(macro && macro.map);
  const c2 = T && T.map && def.c2 !== undefined && T.rough ? lin(def.c2) : null;
  const wind = def.g === "plant";
  const pud = def.pud !== undefined ? def.pud : 0.6;
  const wave = def.wave ? 1 : 0;
  mt.onBeforeCompile = sh => {
    shadePatch(sh, wind, pud, wave);
    if (!mk && !c2) return;
    let code = "#ifdef USE_MAP\n\tvec4 texelColor = texture2D( map, vUv );\n";
    let pre = "";
    if (mk) {
      sh.uniforms.uMacro = {value: macro.map};
      sh.uniforms.uMacroK = {value: def.anti};
      pre += "uniform sampler2D uMacro;\nuniform float uMacroK;\n";
      code += "\tfloat mk = texture2D( uMacro, vUv * uMacroK ).r;\n\tvec4 texB = texture2D( map, mat2( 0.8, -0.6, 0.6, 0.8 ) * vUv + vec2( 0.37, 0.61 ) );\n\ttexelColor = mix( texelColor, texB, smoothstep( 0.4, 0.6, mk ) );\n";
    }
    code += "\ttexelColor = mapTexelToLinear( texelColor );\n";
    if (mk) code += "\ttexelColor.rgb *= 0.8 + 0.4 * mk;\n";
    if (c2) {
      sh.uniforms.uC2 = {value: c2};
      pre += "uniform vec3 uC2;\n";
      code += "\tdiffuseColor.rgb = mix( diffuseColor.rgb, uC2, texture2D( roughnessMap, vUv ).r );\n";
    }
    code += "\tdiffuseColor *= texelColor;\n#endif";
    sh.fragmentShader = pre + sh.fragmentShader.replace("#include <map_fragment>", code);
  };
  mt.customProgramCacheKey = () => "sh3" + (mk ? "macro" : "") + (c2 ? "joint" : "") + (wind ? "wind" : "");
}

function makeMat(name) {
  const def = keyDef(name);
  const o = {color: lin(def.c), roughness: def.r, metalness: def.m || 0};
  const T = def.map ? tex(def.map) : null;
  if (T && T.map) {
    o.map = T.map;
    if (T.normal) o.normalMap = T.normal;
    if (T.rough) o.roughnessMap = T.rough;
  }
  if (def.op !== undefined) {
    o.transparent = true;
    o.opacity = def.op;
    o.depthWrite = false;
  }
  if (def.alpha) {
    o.alphaTest = def.alpha;
    o.transparent = false;
  }
  if (def.side === 2) o.side = THREE.DoubleSide;
  if (def.em) {
    o.emissive = lin(def.em);
    o.emissiveIntensity = def.emi || 1.2;
  }
  if (def.env) o.envMapIntensity = def.env;
  const phys = def.cc || def.sheen || def.tr;
  if (def.cc) {
    o.clearcoat = def.cc;
    o.clearcoatRoughness = def.ccr || 0.04;
  }
  if (def.sheen) o.sheen = lin(def.c).lerp(new THREE.Color(1, 1, 1), 0.25).multiplyScalar(def.sheen);
  if (def.tr) {
    o.transmission = def.tr;
    o.opacity = 1;
  }
  const mt = phys ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o);
  patchMat(mt, def, T);
  return mt;
}

function mat(name, clip) {
  const key = name + (clip ? "|c" : "");
  let m = MATC.get(key);
  if (!m) {
    m = makeMat(name);
    if (clip) {
      m.clippingPlanes = CLIP;
      m.clipShadows = true;
    }
    m.userData.env = m.envMapIntensity;
    m.userData.key = key;
    MATC.set(key, m);
  }
  return m;
}

function matPlot(name) {
  return mat(name, false);
}

function matHouse(name) {
  return mat(name, true);
}

function pruneMats(root) {
  const used = new Set();
  root.traverse(o => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) used.add(m);
  });
  for (const [key, m] of MATC) {
    if (key.indexOf("@") < 0 || used.has(m)) continue;
    m.dispose();
    MATC.delete(key);
  }
}

function ghostMat() {
  let m = MATC.get("|ghost");
  if (!m) {
    m = new THREE.MeshBasicMaterial({color: 0x2f6fdf, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false});
    MATC.set("|ghost", m);
  }
  return m;
}

function uvBox(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const s = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * s[f][0], uv.getY(i) * s[f][1]);
    }
  }
}

function uvScale(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

function addMesh(p, geo, mt) {
  const m = new THREE.Mesh(geo, mt);
  m.castShadow = true;
  m.receiveShadow = true;
  if (p) p.add(m);
  return m;
}

function B(p, x0, x1, y0, y1, z0, z1, mt) {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = z1 - z0;
  if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
  const g = new THREE.BoxGeometry(w, h, d);
  uvBox(g, w, h, d);
  const m = addMesh(p, g, mt);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

function RB(p, x0, x1, y0, y1, z0, z1, rad, mt) {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = z1 - z0;
  const r = Math.min(rad, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
  if (r < 0.004) return B(p, x0, x1, y0, y1, z0, z1, mt);
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const e = 0.0005;
  const sh = new THREE.Shape();
  sh.moveTo(-hw + e, -hh);
  sh.lineTo(hw - e, -hh);
  sh.quadraticCurveTo(hw, -hh, hw, -hh + e);
  sh.lineTo(hw, hh - e);
  sh.quadraticCurveTo(hw, hh, hw - e, hh);
  sh.lineTo(-hw + e, hh);
  sh.quadraticCurveTo(-hw, hh, -hw, hh - e);
  sh.lineTo(-hw, -hh + e);
  sh.quadraticCurveTo(-hw, -hh, -hw + e, -hh);
  const depth = Math.max(0.0005, d - 2 * r);
  const g = new THREE.ExtrudeGeometry(sh, {depth, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 3});
  g.translate(0, 0, -depth / 2);
  const m = addMesh(p, g, mt);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

function Cy(p, r, y0, y1, x, z, mt, seg, rTop) {
  if (y1 - y0 <= 0.001) return null;
  const g = new THREE.CylinderGeometry(rTop === undefined ? r : rTop, r, y1 - y0, seg || 20);
  uvScale(g, 2 * Math.PI * r, y1 - y0);
  const m = addMesh(p, g, mt);
  m.position.set(x, (y0 + y1) / 2, z);
  return m;
}

function CyX(p, r, x0, x1, y, z, mt, seg) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg || 20);
  uvScale(g, 2 * Math.PI * r, x1 - x0);
  const m = addMesh(p, g, mt);
  m.rotation.z = Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, z);
  return m;
}

function CyZ(p, r, z0, z1, x, y, mt, seg) {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg || 20);
  uvScale(g, 2 * Math.PI * r, z1 - z0);
  const m = addMesh(p, g, mt);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, (z0 + z1) / 2);
  return m;
}

function Sp(p, r, x, y, z, mt, sx, sy, sz, seg) {
  const g = new THREE.SphereGeometry(r, seg || 18, Math.max(6, Math.round((seg || 18) * 0.66)));
  uvScale(g, 2 * Math.PI * r * (sx || 1), Math.PI * r * (sy || 1));
  const m = addMesh(p, g, mt);
  m.position.set(x, y, z);
  m.scale.set(sx || 1, sy || 1, sz || 1);
  return m;
}

function Lb(p, a, b, r0, r1, mt, seg) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const Bv = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = Bv.clone().sub(A);
  const len = dir.length();
  if (len < 0.001) return null;
  const g = new THREE.CylinderGeometry(r1, r0, len, seg || 12);
  uvScale(g, 2 * Math.PI * Math.max(r0, r1), len);
  const m = addMesh(p, g, mt);
  m.position.copy(A).add(Bv).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function Cone(p, r, y0, y1, x, z, mt, seg) {
  const g = new THREE.ConeGeometry(r, y1 - y0, seg || 12);
  uvScale(g, 2 * Math.PI * r, Math.hypot(r, y1 - y0));
  const m = addMesh(p, g, mt);
  m.position.set(x, (y0 + y1) / 2, z);
  return m;
}

function Lump(p, r, x, y, z, mt, rnd, sy) {
  const g = new THREE.SphereGeometry(r, 14, 10);
  const pos = g.attributes.position;
  const f1 = 2 + rnd() * 2;
  const f2 = 2 + rnd() * 2;
  const f3 = 2 + rnd() * 2;
  const p1 = rnd() * 6;
  const p2 = rnd() * 6;
  const p3 = rnd() * 6;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n = (Math.sin(vx / r * f1 + p1) + Math.sin(vy / r * f2 + p2) + Math.sin(vz / r * f3 + p3)) / 3;
    const h = Math.sin(vx * 17.1 + vy * 13.7 + vz * 11.3) * 0.5;
    const k = 1 + n * 0.2 + h * 0.06;
    pos.setXYZ(i, vx * k, vy * k * (sy || 1), vz * k);
  }
  g.computeVertexNormals();
  uvScale(g, r * 6.2, r * 3.1);
  const m = addMesh(p, g, mt);
  m.position.set(x, y, z);
  return m;
}

function Tube(p, pts, r, mt, seg) {
  const curve = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(q[0], q[1], q[2])));
  const g = new THREE.TubeGeometry(curve, seg || 16, r, 8, false);
  return addMesh(p, g, mt);
}

function MG() {
  return new Map();
}

function mgAdd(mg, mt, geo, mx) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  if (mx) g.applyMatrix4(mx);
  if (!mg.has(mt)) mg.set(mt, []);
  mg.get(mt).push(g);
}

function mgBox(mg, mt, x0, x1, y0, y1, z0, z1) {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = z1 - z0;
  if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
  const g = new THREE.BoxGeometry(w, h, d);
  uvBox(g, w, h, d);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mgAdd(mg, mt, g);
}

function mgCy(mg, mt, r, y0, y1, x, z, seg, rTop) {
  if (y1 - y0 <= 0.001) return;
  const g = new THREE.CylinderGeometry(rTop === undefined ? r : rTop, r, y1 - y0, seg || 12);
  uvScale(g, 2 * Math.PI * r, y1 - y0);
  g.translate(x, (y0 + y1) / 2, z);
  mgAdd(mg, mt, g);
}

function mgEnd(mg, parent, noShadow) {
  const out = [];
  for (const [mt, list] of mg) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
      g.dispose();
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    bg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    bg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const mesh = addMesh(parent, bg, mt);
    if (noShadow) mesh.castShadow = false;
    out.push(mesh);
  }
  mg.clear();
  return out;
}

function uvPlane(geo, w, d) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
}

function ground(p, x0, x1, z0, z1, y, mt) {
  const w = x1 - x0;
  const d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d);
  uvPlane(g, w, d);
  const m = new THREE.Mesh(g, mt);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  p.add(m);
  return m;
}
