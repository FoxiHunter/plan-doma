"use strict";
const SNAP_WALL = new Set(["sofa", "sofaL", "bed2", "bed1", "bunk", "crib", "wardrobe", "dresser", "nightstand", "desk", "tv", "shelf", "kitchen", "fridge", "toilet", "basin", "dbasin", "bathtub", "washer", "boiler", "tank", "hanger", "closet", "fireplace", "piano", "vitrine", "sideboard", "radiator", "ac", "towel", "bathcab", "ovencol", "vanity", "wallart", "curtains", "sconce"]);
const SNAP_ROT = {l: 270, r: 90, u: 0, d: 180};

function snapPick(lo, hi, cands, s0, s1) {
  let best = null;
  for (const c of cands) {
    if (c.b < s0 - 0.3 || c.a > s1 + 0.3) continue;
    for (const e of [lo, hi]) {
      const dl = c.v - e;
      if (Math.abs(dl) < c.th && (best === null || Math.abs(dl) < Math.abs(best))) best = dl;
    }
  }
  return best;
}

function snapOut(it, faces) {
  const b = thingBox(it);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.d / 2;
  const axis = (o, p0, p1, q0, q1, c) => {
    let lo = -Infinity;
    let hi = Infinity;
    for (const f of faces) {
      if (f.o !== o || f.b < q0 + 0.02 || f.a > q1 - 0.02 || f.c <= p0 + 0.001 || f.c >= p1 - 0.001) continue;
      if (f.c < c) lo = Math.max(lo, f.c - p0);
      else hi = Math.min(hi, f.c - p1);
    }
    if (lo > -Infinity && hi < Infinity) return 0;
    return lo > -Infinity ? lo : hi < Infinity ? hi : 0;
  };
  const sx = axis("v", b.x, b.x + b.w, b.y, b.y + b.d, cx);
  const sy = axis("h", b.y, b.y + b.d, b.x, b.x + b.w, cy);
  if (sx) it.x = r2(it.x + sx);
  if (sy) it.y = r2(it.y + sy);
}

function snapThing(it, rot0) {
  const r0 = normDeg(rot0 || 0);
  const faces = gapFaces();
  const wallish = SNAP_WALL.has(it.kind) && r0 % 90 === 0;
  if (wallish) it.rot = r0;
  snapOut(it, faces);
  if (wallish) {
    let near1 = null;
    for (const g of gapsOf("item", it)) if (g.v < 0.3 && (!near1 || g.v < near1.v)) near1 = g;
    if (near1) {
      const b0 = thingBox(it);
      const face = {l: b0.x - near1.v, r: b0.x + b0.w + near1.v, u: b0.y - near1.v, d: b0.y + b0.d + near1.v}[near1.dir];
      it.rot = SNAP_ROT[near1.dir];
      const b1 = thingBox(it);
      if (near1.dir === "l") it.x = r2(it.x + face - b1.x);
      else if (near1.dir === "r") it.x = r2(it.x + face - b1.x - b1.w);
      else if (near1.dir === "u") it.y = r2(it.y + face - b1.y);
      else it.y = r2(it.y + face - b1.y - b1.d);
      snapOut(it, faces);
    }
  }
  const b = thingBox(it);
  const xs = [];
  const ys = [];
  for (const f of faces) (f.o === "v" ? xs : ys).push({v: f.c, a: f.a, b: f.b, th: 0.2});
  for (const o of S.items) {
    if (o === it || o.id === it.id || o.kind === "rug") continue;
    const q = thingBox(o);
    xs.push({v: q.x, a: q.y, b: q.y + q.d, th: 0.08}, {v: q.x + q.w, a: q.y, b: q.y + q.d, th: 0.08});
    ys.push({v: q.y, a: q.x, b: q.x + q.w, th: 0.08}, {v: q.y + q.d, a: q.x, b: q.x + q.w, th: 0.08});
  }
  const dx = snapPick(b.x, b.x + b.w, xs, b.y, b.y + b.d);
  const dy = snapPick(b.y, b.y + b.d, ys, b.x, b.x + b.w);
  if (dx !== null) it.x = r2(it.x + dx);
  if (dy !== null) it.y = r2(it.y + dy);
  return dx !== null || dy !== null;
}
