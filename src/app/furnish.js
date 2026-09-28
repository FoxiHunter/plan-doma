"use strict";
const FN_ROT = {u: 0, d: 180, l: 270, r: 90};
const FN_OPP = {u: "d", d: "u", l: "r", r: "l"};

function fnRect(sd, a0, a1, dep) {
  if (sd.o === "h") return sd.inv > 0 ? {x0: a0, x1: a1, y0: sd.c, y1: sd.c + dep} : {x0: a0, x1: a1, y0: sd.c - dep, y1: sd.c};
  return sd.inv > 0 ? {x0: sd.c, x1: sd.c + dep, y0: a0, y1: a1} : {x0: sd.c - dep, x1: sd.c, y0: a0, y1: a1};
}

function fnOvl(a, b) {
  return a.x0 < b.x1 - 0.001 && a.x1 > b.x0 + 0.001 && a.y0 < b.y1 - 0.001 && a.y1 > b.y0 + 0.001;
}

function fnCtx(r) {
  const e = ext();
  if (!e) return null;
  const t = S.house.inner / 2;
  const cb = {x0: r.x + (near(r.x, e.minX) ? 0 : t), x1: r.x + r.w - (near(r.x + r.w, e.maxX) ? 0 : t), y0: r.y + (near(r.y, e.minY) ? 0 : t), y1: r.y + r.d - (near(r.y + r.d, e.maxY) ? 0 : t)};
  const sides = {
    u: {o: "h", c: cb.y0, a: cb.x0, b: cb.x1, edge: r.y, inv: 1},
    d: {o: "h", c: cb.y1, a: cb.x0, b: cb.x1, edge: r.y + r.d, inv: -1},
    l: {o: "v", c: cb.x0, a: cb.y0, b: cb.y1, edge: r.x, inv: 1},
    r: {o: "v", c: cb.x1, a: cb.y0, b: cb.y1, edge: r.x + r.w, inv: -1}
  };
  const C = {r, cb, sides, keep: [], wins: [], doorSides: new Set(), winSides: new Set(), placed: [], out: []};
  const onSide = (it, sd) => it.o === sd.o && near(sd.o === "h" ? it.y : it.x, sd.edge) && (sd.o === "h" ? it.x : it.y) > sd.a - 0.1 && (sd.o === "h" ? it.x : it.y) < sd.b + 0.1;
  for (const d of S.doors) {
    for (const [k, sd] of Object.entries(sides)) {
      if (!onSide(d, sd)) continue;
      const u = sd.o === "h" ? d.x : d.y;
      C.doorSides.add(k);
      C.keep.push(fnRect(sd, u - d.w / 2 - 0.12, u + d.w / 2 + 0.12, Math.max(0.95, d.w * 0.95)));
    }
  }
  for (const w of S.windows) {
    for (const [k, sd] of Object.entries(sides)) {
      if (!onSide(w, sd)) continue;
      const u = sd.o === "h" ? w.x : w.y;
      C.winSides.add(k);
      C.wins.push({s: k, a0: u - w.w / 2 - 0.08, a1: u + w.w / 2 + 0.08, sill: w.sill});
    }
  }
  return C;
}

function fnFits(C, R, h) {
  const cb = C.cb;
  if (R.x0 < cb.x0 - 0.001 || R.x1 > cb.x1 + 0.001 || R.y0 < cb.y0 - 0.001 || R.y1 > cb.y1 + 0.001) return false;
  for (const k of C.keep) if (fnOvl(R, k)) return false;
  for (const p of C.placed) if (fnOvl(R, p)) return false;
  for (const w of C.wins) {
    const sd = C.sides[w.s];
    const gap = sd.o === "h" ? (sd.inv > 0 ? R.y0 - sd.c : sd.c - R.y1) : (sd.inv > 0 ? R.x0 - sd.c : sd.c - R.x1);
    if (gap > 0.12) continue;
    const a0 = sd.o === "h" ? R.x0 : R.y0;
    const a1 = sd.o === "h" ? R.x1 : R.y1;
    if (a0 < w.a1 && a1 > w.a0 && h > w.sill - 0.02) return false;
  }
  return true;
}

function fnAdd(C, kind, cx, cy, rot, w, d, flat) {
  const K = MODELS[kind];
  const over = {rot};
  if (w !== K.w) over.w = r2(w);
  if (d !== K.d) over.d = r2(d);
  const it = thing(kind, r2(cx - w / 2), r2(cy - d / 2), over);
  C.out.push(it);
  if (!flat) {
    const b = thingBox(it);
    C.placed.push({x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.d});
  }
  return it;
}

function fnSides(C, noWin, skip) {
  return Object.keys(C.sides).filter(k => !(skip || []).includes(k)).map(k => {
    const sd = C.sides[k];
    return [k, (C.doorSides.has(k) ? 10 : 0) + (noWin && C.winSides.has(k) ? 5 : 0) - (sd.b - sd.a) * 0.1];
  }).sort((a, b) => a[1] - b[1]).map(x => x[0]);
}

function fnWall(C, kind, keys, pref, opt) {
  const o = opt || {};
  if (o.ws) {
    for (const w of o.ws) {
      const r = fnWall(C, kind, keys, pref, Object.assign({}, o, {ws: null, w}));
      if (r) return r;
    }
    return null;
  }
  const K = MODELS[kind];
  const w = o.w || K.w;
  const d = o.d || K.d;
  const span = Math.max(w, o.span || 0);
  let best = null;
  keys.forEach((k, si) => {
    const sd = C.sides[k];
    if (sd.b - sd.a < span - 0.001) return;
    const us = [];
    for (let u = sd.a + span / 2; u < sd.b - span / 2; u += 0.05) us.push(u);
    us.push(sd.b - span / 2);
    for (const u of us) {
      if (!fnFits(C, fnRect(sd, u - span / 2, u + span / 2, d), o.h || K.h)) continue;
      const mid = o.at !== undefined && o.atSide === k ? o.at : (sd.a + sd.b) / 2;
      let sc = si * 100;
      if (pref === "corner") sc += Math.min(u - span / 2 - sd.a, sd.b - span / 2 - u);
      else sc += Math.abs(u - mid);
      if (!best || sc < best.sc) best = {sc, k, u};
    }
  });
  if (!best) return null;
  const sd = C.sides[best.k];
  const R = fnRect(sd, best.u - w / 2, best.u + w / 2, d);
  const it = fnAdd(C, kind, (R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, FN_ROT[best.k], w, d);
  return {it, k: best.k, u: best.u, w, d};
}

function fnAt(C, k, u, off, kind, rot, flat) {
  const sd = C.sides[k];
  const K = MODELS[kind];
  const ax = rot % 180 ? K.d : K.w;
  const ay = rot % 180 ? K.w : K.d;
  const along = sd.o === "h" ? ax : ay;
  const across = sd.o === "h" ? ay : ax;
  const R0 = fnRect(sd, u - along / 2, u + along / 2, off + across);
  const R = sd.o === "h"
    ? {x0: R0.x0, x1: R0.x1, y0: sd.inv > 0 ? R0.y1 - across : R0.y0, y1: sd.inv > 0 ? R0.y1 : R0.y0 + across}
    : {y0: R0.y0, y1: R0.y1, x0: sd.inv > 0 ? R0.x1 - across : R0.x0, x1: sd.inv > 0 ? R0.x1 : R0.x0 + across};
  if (!flat && !fnFits(C, R, K.h)) return null;
  return fnAdd(C, kind, (R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, rot, K.w, K.d, flat);
}

function fnFree(C, kinds, clear) {
  const cb = C.cb;
  const cx = (cb.x0 + cb.x1) / 2;
  const cy = (cb.y0 + cb.y1) / 2;
  for (const kind of kinds) {
    const K = MODELS[kind];
    for (const rot of [0, 90]) {
      const w = rot ? K.d : K.w;
      const d = rot ? K.w : K.d;
      let best = null;
      for (let x = cb.x0 + w / 2; x <= cb.x1 - w / 2 + 1e-6; x += 0.1) {
        for (let y = cb.y0 + d / 2; y <= cb.y1 - d / 2 + 1e-6; y += 0.1) {
          const R = {x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2};
          const Rc = {x0: R.x0 - clear, x1: R.x1 + clear, y0: R.y0 - clear, y1: R.y1 + clear};
          if (!fnFits(C, R, 0.8) || C.placed.some(p => fnOvl(Rc, p)) || C.keep.some(p => fnOvl(Rc, p))) continue;
          const sc = Math.hypot(x - cx, y - cy);
          if (!best || sc < best.sc) best = {sc, x, y};
        }
      }
      if (best) return fnAdd(C, kind, best.x, best.y, rot, K.w, K.d);
    }
  }
  return null;
}

function fnFacing(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 270 : 90;
  return dy > 0 ? 0 : 180;
}

function fnBedroom(C, kids) {
  const cb = C.cb;
  const small = Math.min(cb.x1 - cb.x0, cb.y1 - cb.y0) < 2.7;
  const bedK = kids || small ? "bed1" : "bed2";
  const keys = fnSides(C, true);
  const ns = MODELS.nightstand;
  const bw = MODELS[bedK].w;
  let b = fnWall(C, bedK, keys, "center", {span: bw + 2 * (ns.w + 0.04), h: 0.55});
  if (!b && bedK === "bed2") b = fnWall(C, "bed1", keys, "center", {span: MODELS.bed1.w + 2 * (ns.w + 0.04), h: 0.55});
  if (b) {
    const sd = C.sides[b.k];
    for (const s of [-1, 1]) {
      const u = b.u + s * (b.w / 2 + 0.03 + ns.w / 2);
      const Rn = fnRect(sd, u - ns.w / 2, u + ns.w / 2, ns.d);
      if (fnFits(C, Rn, ns.h)) fnAdd(C, "nightstand", (Rn.x0 + Rn.x1) / 2, (Rn.y0 + Rn.y1) / 2, FN_ROT[b.k], ns.w, ns.d);
    }
  } else b = fnWall(C, bedK, keys, "center", {h: 0.55}) || fnWall(C, "bed1", keys, "center", {h: 0.55});
  const rest = fnSides(C, true, b ? [b.k] : []);
  const wr = fnWall(C, "wardrobe", rest, "corner", {ws: [1.8, 1.6, 1.4, 1.2, 1]});
  const dr = wr ? null : fnWall(C, "dresser", rest, "corner");
  if (kids) {
    const dk = fnWall(C, "desk", fnSides(C, false, b ? [b.k] : []).sort((a, z) => (C.winSides.has(z) ? 1 : 0) - (C.winSides.has(a) ? 1 : 0)), "center");
    if (dk) fnAt(C, dk.k, dk.u, dk.d + 0.05, "chair", (FN_ROT[dk.k] + 180) % 360);
  } else if (!dr && (cb.x1 - cb.x0) * (cb.y1 - cb.y0) > 13) fnWall(C, "dresser", fnSides(C, true, b ? [b.k] : []), "center");
}

function fnLiving(C, lite) {
  const keys = fnSides(C, false);
  const s = fnWall(C, "sofa", keys, "center") || fnWall(C, "armchair", keys, "center");
  if (!s) return;
  const sd = C.sides[s.k];
  const cof = MODELS.coffee;
  const ct = s.it.kind === "sofa" ? fnAt(C, s.k, s.u, s.d + 0.42, "coffee", FN_ROT[s.k]) : null;
  fnWall(C, "tv", [FN_OPP[s.k]], "center", {at: s.u, atSide: FN_OPP[s.k]});
  if (ct) {
    const b = thingBox(ct);
    const ccx = b.x + b.w / 2;
    const ccy = b.y + b.d / 2;
    const A = MODELS.armchair;
    if (lite) return;
    const along = sd.o === "h" ? [1, 0] : [0, 1];
    for (const sg of [1, -1]) {
      const off = cof.w / 2 + 0.35 + A.d / 2;
      const x = ccx + along[0] * sg * off;
      const y = ccy + along[1] * sg * off;
      const R = {x0: x - A.w / 2, x1: x + A.w / 2, y0: y - A.d / 2, y1: y + A.d / 2};
      if (!fnFits(C, R, A.h)) continue;
      fnAdd(C, "armchair", x, y, fnFacing(ccx - x, ccy - y), A.w, A.d);
      break;
    }
    const rug = MODELS.rug;
    const rr = sd.o === "h" ? 90 : 0;
    const rw = rr ? rug.d : rug.w;
    const rd = rr ? rug.w : rug.d;
    const cb = C.cb;
    if (ccx - rw / 2 > cb.x0 && ccx + rw / 2 < cb.x1 && ccy - rd / 2 > cb.y0 && ccy + rd / 2 < cb.y1) fnAdd(C, "rug", ccx, ccy, rr, rug.w, rug.d, true);
  }
  if (lite) return;
  fnWall(C, "shelf", fnSides(C, true, [s.k, FN_OPP[s.k]]), "corner");
  fnWall(C, "plant", fnSides(C, false), "corner");
}

function fnKitchen(C, withKitchen, living) {
  let run = null;
  if (withKitchen) {
    const keys = fnSides(C, true);
    for (const k of keys) {
      const sd = C.sides[k];
      const L = Math.min(3.6, sd.b - sd.a - 0.6);
      for (let w = Math.floor(L / 0.6) * 0.6; w >= 1.8 && !run; w -= 0.6) run = fnWall(C, "kitchen", [k], "corner", {w: r2(w)});
      if (run) break;
    }
    if (run) {
      const sd = C.sides[run.k];
      const F = MODELS.fridge;
      for (const s of [1, -1]) {
        const u = run.u + s * (run.w / 2 + F.w / 2 + 0.02);
        const R = fnRect(sd, u - F.w / 2, u + F.w / 2, F.d);
        if (!fnFits(C, R, F.h)) continue;
        fnAdd(C, "fridge", (R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, FN_ROT[run.k], F.w, F.d);
        break;
      }
    }
  }
  if (living) fnLiving(C, true);
  fnFree(C, ["dining", "rtable"], 0.25);
  if (!withKitchen) fnWall(C, "sideboard", fnSides(C, true), "center");
}

function fnBath(C) {
  const keys = fnSides(C, false);
  fnWall(C, "toilet", keys, "corner");
  fnWall(C, "basin", keys, "corner");
  const byShort = Object.keys(C.sides).sort((a, b) => (C.sides[a].b - C.sides[a].a) - (C.sides[b].b - C.sides[b].a));
  fnWall(C, "bathtub", byShort.filter(k => !C.doorSides.has(k)), "corner") || fnWall(C, "shower", keys, "corner");
  fnWall(C, "washer", keys, "corner");
}

function fnOffice(C) {
  const keys = fnSides(C, false).sort((a, z) => (C.winSides.has(z) ? 1 : 0) - (C.winSides.has(a) ? 1 : 0));
  const dk = fnWall(C, "desk", keys, "center");
  if (dk) fnAt(C, dk.k, dk.u, dk.d + 0.05, "officechair", (FN_ROT[dk.k] + 180) % 360);
  fnWall(C, "shelf", fnSides(C, true, dk ? [dk.k] : []), "corner");
  fnWall(C, "armchair", fnSides(C, false, dk ? [dk.k] : []), "corner");
}

function fnPlan(r) {
  const C = fnCtx(r);
  if (!C) return null;
  const nm = String(r.name || "").toLowerCase();
  const t = r.type;
  if (/кабинет/.test(nm)) fnOffice(C);
  else if (/детск/.test(nm)) fnBedroom(C, true);
  else if (/кухн/.test(nm) && (t === "Гостиная" || t === "Кухня") && (C.cb.x1 - C.cb.x0) * (C.cb.y1 - C.cb.y0) > 18) fnKitchen(C, true, true);
  else if (t === "Спальня") fnBedroom(C, false);
  else if (t === "Гостиная") fnLiving(C);
  else if (t === "Кухня") fnKitchen(C, true);
  else if (t === "Столовая") fnKitchen(C, false);
  else if (t === "Санузел") fnBath(C);
  else if (t === "Прихожая") fnWall(C, "hanger", fnSides(C, false), "corner") || fnWall(C, "closet", fnSides(C, false), "corner");
  else if (t === "Гардеробная") {
    for (let i = 0; i < 3; i++) if (!fnWall(C, "wardrobe", fnSides(C, false), "corner", {ws: [1.8, 1.6, 1.4, 1.2, 1, 0.8]})) break;
  } else if (t === "Котельная") {
    fnWall(C, "boiler", fnSides(C, false), "corner");
    fnWall(C, "tank", fnSides(C, false), "corner");
  } else if (t === "Кладовая") {
    for (let i = 0; i < 2; i++) if (!fnWall(C, "shelf", fnSides(C, false), "corner")) break;
  } else return null;
  return C.out;
}

function furnishRoom(r) {
  const list = fnPlan(r);
  if (!list) {
    setStatus("Для этого типа комнаты набора нет. Поменяй тип или назови комнату «Кабинет» или «Детская»");
    return 0;
  }
  const old = new Set(itemsIn(r).map(it => it.id));
  S.items = S.items.filter(it => !old.has(it.id)).concat(list);
  changed();
  setStatus(list.length ? `Расставил ${list.length} предм. в комнате «${r.name}», Ctrl+Z вернёт как было` : "Места под мебель не нашлось, двери и окна заняли все стены");
  return list.length;
}
