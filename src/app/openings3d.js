"use strict";
const ANIM = new Map();
const OPDEF = {
  garage: () => [{id: "g1", kind: "gate", side: "f", c: 0, w: 3, h: 2.3, sill: 0, op: "sectional", open: 0, hinge: 0}],
  bath: () => [{id: "d1", kind: "door", side: "f", c: 0, w: 0.8, h: 1.8, sill: 0, op: "swing", open: 0, hinge: 0}, {id: "w1", kind: "win", side: "r", c: 0, w: 0.7, h: 0.5, sill: 1.05, op: "turn", open: 0, hinge: 0}],
  shed: () => [{id: "d1", kind: "door", side: "f", c: 0, w: 0.9, h: 1.85, sill: 0, op: "swing", open: 0, hinge: 0}]
};

function animKey(t, id, sub) {
  return t + ":" + id + (sub ? ":" + sub : "");
}

function animClear() {
  for (const a of ANIM.values()) a.fns = [];
}

function animBind(key, val, fn) {
  if (!key) {
    fn(val);
    return;
  }
  let a = ANIM.get(key);
  if (!a) {
    a = {cur: val, target: val, fns: []};
    ANIM.set(key, a);
  } else if (Math.abs(a.target - val) > 1e-6) {
    a.target = val;
  }
  if (V.hq) a.cur = a.target;
  a.fns.push(fn);
  fn(a.cur);
}

function animTick(dt) {
  let moved = false;
  for (const a of ANIM.values()) {
    if (Math.abs(a.cur - a.target) < 1e-4) continue;
    const st = dt * 1.5;
    a.cur = a.cur < a.target ? Math.min(a.target, a.cur + st) : Math.max(a.target, a.cur - st);
    for (const f of a.fns) f(a.cur);
    moved = true;
  }
  if (moved && LAMP.lit) lampShadowsDirty();
  return moved;
}

function animTo(key, val) {
  const a = ANIM.get(key);
  if (a) a.target = val;
  V.need = true;
}

function opsOf(o) {
  return o.opens || (OPDEF[o.kind] ? OPDEF[o.kind]() : []);
}

function ensureOpens(o) {
  if (!o.opens) o.opens = opsOf(o);
  return o.opens;
}

function openable(t, it) {
  if (!it) return false;
  if (t === "door") return it.kind === "door" || it.kind === "entry";
  if (t === "win") return it.op !== "fixed";
  return it.op !== "fixed";
}

function toggleOpen(pk) {
  if (!pk) return false;
  if (toggleFence(pk)) return true;
  if (pk.t === "obj" && pk.gate) {
    const o = S.objects.find(x => x.id === pk.id);
    if (!o) return false;
    o.open = (o.open || 0) > 0.05 ? 0 : 1;
    animTo(animKey("obj", o.id, "gate"), o.open);
    commit();
    save();
    updUndo();
    renderPanel();
    return true;
  }
  if (!pk.open && toggleLamp(pk)) return true;
  let it = null;
  let key = "";
  if (pk.t === "door" || pk.t === "win") {
    it = (pk.t === "door" ? S.doors : S.windows).find(x => x.id === pk.id);
    if (!openable(pk.t, it)) return false;
    key = animKey(pk.t, it.id);
  } else if (pk.t === "obj" && pk.open) {
    const o = S.objects.find(x => x.id === pk.id);
    if (!o) return false;
    it = ensureOpens(o).find(x => x.id === pk.open);
    if (!openable("obj", it)) return false;
    key = animKey("obj", o.id, it.id);
  } else {
    return false;
  }
  it.open = it.open > 0.05 ? 0 : 1;
  animTo(key, it.open);
  commit();
  save();
  updUndo();
  render2D();
  renderPanel();
  return true;
}

function handleLever(g, x, y, lt, ch) {
  for (const s of [1, -1]) {
    const zc = s * (lt / 2 + 0.012);
    CyZ(g, 0.024, Math.min(s * lt / 2, zc), Math.max(s * lt / 2, zc), x, y, ch, 16);
    B(g, x - 0.1, x + 0.01, y - 0.01, y + 0.01, Math.min(zc, zc + s * 0.03), Math.max(zc, zc + s * 0.03), ch);
  }
}

function handleBar(g, x, y0, y1, lt, ch) {
  for (const s of [1, -1]) {
    const zf = s * lt / 2;
    const za = Math.min(zf + s * 0.03, zf + s * 0.05);
    const zb = Math.max(zf + s * 0.03, zf + s * 0.05);
    const sa = Math.min(zf, zf + s * 0.04);
    const sb = Math.max(zf, zf + s * 0.04);
    B(g, x - 0.012, x + 0.012, y0, y1, za, zb, ch);
    B(g, x - 0.007, x + 0.007, y0 + 0.05, y0 + 0.07, sa, sb, ch);
    B(g, x - 0.007, x + 0.007, y1 - 0.07, y1 - 0.05, sa, sb, ch);
  }
}

function leafBuild(g, lw, lh, lt, style, M, bar) {
  const z0 = -lt / 2;
  const z1 = lt / 2;
  const hx = lw - 0.07;
  if (style === "full") {
    const gm = B(g, 0.004, lw - 0.004, 0.004, lh, -0.005, 0.005, M.glass);
    if (gm) {
      gm.castShadow = false;
      gm.renderOrder = 2;
    }
    B(g, 0, 0.14, 0, 0.09, -0.012, 0.012, M.handle);
    B(g, 0, 0.14, lh - 0.09, lh, -0.012, 0.012, M.handle);
    handleBar(g, hx - 0.02, 0.75, 1.35, 0.01, M.handle);
    return;
  }
  if (style === "flat") {
    B(g, 0, lw, 0, lh, z0, z1, M.leaf);
  } else if (style === "panel") {
    B(g, 0, lw, 0, lh, z0, z1, M.leaf);
    for (const s of [1, -1]) {
      const za = s > 0 ? z1 : z0 - 0.003;
      const zb = s > 0 ? z1 + 0.003 : z0;
      B(g, 0.1, lw - 0.1, lh * 0.55, lh - 0.12, za, zb, M.leaf);
      B(g, 0.1, lw - 0.1, 0.15, lh * 0.5, za, zb, M.leaf);
    }
  } else {
    const fw = Math.min(0.1, lw * 0.18);
    const gy = style === "half" ? lh * 0.48 : fw + 0.06;
    B(g, 0, fw, 0, lh, z0, z1, M.leaf);
    B(g, lw - fw, lw, 0, lh, z0, z1, M.leaf);
    B(g, fw, lw - fw, lh - fw, lh, z0, z1, M.leaf);
    B(g, fw, lw - fw, 0, gy, z0, z1, M.leaf);
    const gm = B(g, fw, lw - fw, gy, lh - fw, -0.004, 0.004, M.glass);
    if (gm) {
      gm.castShadow = false;
      gm.renderOrder = 2;
    }
  }
  if (bar) handleBar(g, hx, 0.75, 1.55, lt, M.handle);
  else handleLever(g, hx, 1.0, lt, M.handle);
}

function swingRot(u, s, ang) {
  return Math.atan2(-Math.sin(ang) * s, Math.cos(ang) * u);
}

function archFiller(g, d, L, base, m) {
  const sp = span(L, across(d));
  const Hs = S.house;
  const top = Math.min(Hs.doorH, Hs.h);
  const rx = d.w / 2;
  const ry = Math.min(rx, Math.max(0.2, top - 1.4));
  const ys = top - ry;
  const sh = new THREE.Shape();
  sh.moveTo(-rx, 0);
  sh.lineTo(-rx, ry);
  sh.lineTo(rx, ry);
  sh.lineTo(rx, 0);
  sh.absellipse(0, 0, rx, ry - 0.015, 0, Math.PI, false);
  const geo = new THREE.ExtrudeGeometry(sh, {depth: sp[1] - sp[0], bevelEnabled: false, curveSegments: 28});
  const mt = L.ext ? m(hk("facade", "facade")) : m("plaster");
  const mesh = addMesh(g, geo, [mt, mt]);
  if (d.o === "h") mesh.position.set(along(d), base + ys, sp[0]);
  else {
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(sp[0], base + ys, along(d));
  }
  mesh.userData.pick = {t: "door", id: d.id};
}

function door3D(g, d, L, base, m) {
  const Hs = S.house;
  if (d.kind === "arch") archFiller(g, d, L, base, m);
  if (d.kind === "open" || d.kind === "arch") return;
  const dg = new THREE.Group();
  dg.userData.pick = {t: "door", id: d.id};
  g.add(dg);
  const sp = span(L, across(d));
  const isExt = !!L.ext;
  const h = d.o === "h";
  const zs = h ? 1 : -1;
  const aC = along(d);
  const cC = (sp[0] + sp[1]) / 2;
  dg.position.set(h ? aC : cC, base, h ? cC : aC);
  dg.rotation.y = h ? 0 : -Math.PI / 2;
  const zl = c => (c - cC) * zs;
  const top = Math.min(Hs.doorH, Hs.h);
  const hw = d.w / 2;
  const T = sp[1] - sp[0];
  const fr = 0.035;
  let f0 = -T / 2;
  let f1 = T / 2;
  if (isExt) {
    const fc = zl(L.c + L.out * Hs.wall * 0.35);
    f0 = fc - 0.05;
    f1 = fc + 0.05;
  }
  const ddef = isExt || d.kind === "entry" ? "door_entry" : "door_int";
  const M = {frame: m(objKey(d, "dframe", ddef)), leaf: m(objKey(d, "leaf", ddef)), handle: m(objKey(d, "handle", "chrome")), glass: m(objKey(d, "glass", "glass"))};
  const op = d.op || "swing";
  B(dg, -hw, -hw + fr, 0, top, f0, f1, M.frame);
  B(dg, hw - fr, hw, 0, top, f0, f1, M.frame);
  B(dg, -hw + fr, hw - fr, top - fr, top, f0, f1, M.frame);
  const cas = (zf, dir) => {
    const za = Math.min(zf, zf + dir * 0.012);
    const zb = Math.max(zf, zf + dir * 0.012);
    B(dg, -hw - 0.065, -hw + 0.004, 0.02, top - 0.004, za, zb, M.frame);
    B(dg, hw - 0.004, hw + 0.065, 0.02, top - 0.004, za, zb, M.frame);
    B(dg, -hw - 0.065, hw + 0.065, top - 0.004, top + 0.065, za, zb, M.frame);
  };
  if (!isExt) {
    cas(-T / 2, -1);
    cas(T / 2, 1);
  } else {
    cas(zl(L.c), -L.out * zs);
  }
  const heavy = isExt || d.kind === "entry";
  const lt = heavy ? 0.07 : 0.04;
  const lh = top - fr - 0.01;
  const sl = d.side * zs;
  const fcL = (f0 + f1) / 2;
  const fhw = (f1 - f0) / 2;
  const pz = fcL + sl * fhw - sl * lt / 2;
  const inner = d.w - 2 * fr - 0.006;
  const style = d.leaf || (d.kind === "entry" ? "flat" : "panel");
  const key = animKey("door", d.id);
  const bar = heavy && style !== "full";
  if (op === "swing" || op === "double") {
    const leaves = op === "double"
      ? [[-hw + fr + 0.003, 1, inner / 2 - 0.002], [hw - fr - 0.003, -1, inner / 2 - 0.002]]
      : [[d.hinge ? hw - fr - 0.003 : -hw + fr + 0.003, d.hinge ? -1 : 1, inner]];
    const pvs = leaves.map(([hx, u, lw]) => {
      const pv = new THREE.Group();
      pv.position.set(hx, 0.005, pz);
      dg.add(pv);
      leafBuild(pv, lw, lh, lt, style, M, bar);
      return [pv, u];
    });
    animBind(key, d.open, t => {
      for (const [pv, u] of pvs) pv.rotation.y = swingRot(u, sl, t * 1.66);
    });
  } else if (op === "slide" || op === "slide2") {
    const wz = zl(d.side > 0 ? sp[1] : sp[0]);
    const lt2 = 0.04;
    const pzs = wz + sl * (0.03 + lt2 / 2);
    const two = op === "slide2";
    const lw = two ? (d.w + 0.08) / 2 : d.w + 0.08;
    const dir = d.hinge ? 1 : -1;
    const parts = [];
    for (let i = 0; i < (two ? 2 : 1); i++) {
      const g2 = new THREE.Group();
      const x0 = two ? (i === 0 ? -lw : 0) : -lw / 2;
      const dr = two ? (i === 0 ? -1 : 1) : dir;
      g2.position.set(x0, 0.01, pzs);
      dg.add(g2);
      leafBuild(g2, lw, lh + 0.03, lt2, style, M, true);
      parts.push([g2, x0, dr]);
    }
    const reach = two ? lw : lw - 0.06;
    const r0 = two ? -2 * lw : Math.min(-lw / 2, -lw / 2 + dir * reach);
    const r1 = two ? 2 * lw : Math.max(lw / 2, lw / 2 + dir * reach);
    B(dg, r0, r1, lh + 0.05, lh + 0.09, pzs - 0.012, pzs + 0.012, M.handle);
    animBind(key, d.open, t => {
      for (const [g2, x0, dr] of parts) g2.position.x = x0 + dr * t * reach;
    });
  } else if (op === "pocket") {
    const lw = inner + 0.04;
    const dir = d.hinge ? 1 : -1;
    const g2 = new THREE.Group();
    const x0 = -lw / 2;
    g2.position.set(x0, 0.005, fcL);
    dg.add(g2);
    leafBuild(g2, lw, lh, 0.035, style, M, false);
    animBind(key, d.open, t => {
      g2.position.x = x0 + dir * t * (lw - 0.08);
    });
  } else if (op === "fold") {
    const sets = d.w >= 1.2
      ? [[-hw + fr + 0.003, 1, inner / 2 - 0.002], [hw - fr - 0.003, -1, inner / 2 - 0.002]]
      : [[d.hinge ? hw - fr - 0.003 : -hw + fr + 0.003, d.hinge ? -1 : 1, inner]];
    const fl = sets.map(([hx, u, wd]) => {
      const pw = wd / 2 - 0.002;
      const p1 = new THREE.Group();
      p1.position.set(hx, 0.005, pz);
      dg.add(p1);
      const b1 = new THREE.Group();
      p1.add(b1);
      const p2 = new THREE.Group();
      p2.position.set(pw, 0, 0);
      p1.add(p2);
      B(b1, 0, pw, 0, lh, -0.018, 0.018, M.leaf);
      B(p2, 0, pw, 0, lh, -0.018, 0.018, M.leaf);
      B(p2, pw - 0.06, pw - 0.04, 0.9, 1.2, -0.035, 0.035, M.handle);
      return [p1, p2, u];
    });
    animBind(key, d.open, t => {
      const a = t * 1.45;
      for (const [p1, p2, u] of fl) {
        const r1 = swingRot(u, sl, a);
        const r2 = swingRot(u, -sl, a);
        p1.rotation.y = r1;
        p2.rotation.y = r2 - r1;
      }
    });
  }
  if (!V.hq && sel && sel.t === "door" && sel.id === d.id && (op === "swing" || op === "double")) {
    const gd = doorGeo(d, L);
    const tu = Math.atan2(-gd.u.y, gd.u.x);
    const tn = Math.atan2(-gd.n.y, gd.n.x);
    let dl = tn - tu;
    while (dl <= -Math.PI) dl += 2 * Math.PI;
    while (dl > Math.PI) dl -= 2 * Math.PI;
    const sector = new THREE.Mesh(new THREE.CircleGeometry(op === "double" ? d.w / 2 : d.w, 28, dl > 0 ? tu : tn, Math.PI / 2), mat("sector", false));
    sector.rotation.x = -Math.PI / 2;
    sector.position.set(gd.H.x, base + 0.035, gd.H.y);
    sector.userData.noPick = true;
    g.add(sector);
  }
}

function sashBox(g, x0, x1, y0, y1, M, sw) {
  B(g, x0, x0 + sw, y0, y1, -0.028, 0.028, M.frame);
  B(g, x1 - sw, x1, y0, y1, -0.028, 0.028, M.frame);
  B(g, x0 + sw, x1 - sw, y0, y0 + sw, -0.028, 0.028, M.frame);
  B(g, x0 + sw, x1 - sw, y1 - sw, y1, -0.028, 0.028, M.frame);
  const gm = B(g, x0 + sw, x1 - sw, y0 + sw, y1 - sw, -0.004, 0.004, M.glass);
  if (gm) {
    gm.castShadow = false;
    gm.renderOrder = 2;
  }
}

function winSashes(w) {
  return w.n || (w.w > 2.3 ? 3 : w.w > 1.05 ? 2 : 1);
}

function win3D(g, w, L, base, m) {
  const Hs = S.house;
  const wg = new THREE.Group();
  wg.userData.pick = {t: "win", id: w.id};
  g.add(wg);
  const out = L.out;
  const wl = Hs.wall;
  const h = w.o === "h";
  const zs = h ? 1 : -1;
  const aC = along(w);
  const fcA = L.c + out * wl * 0.4;
  wg.position.set(h ? aC : fcA, 0, h ? fcA : aC);
  wg.rotation.y = h ? 0 : -Math.PI / 2;
  const zl = c => (c - fcA) * zs;
  const zo = out * zs;
  const zin = -zo;
  const yb = base + Math.min(w.sill, Hs.h - 0.05);
  const yt = base + Math.min(w.sill + w.h, Hs.h - 0.01);
  if (yt - yb < 0.05) return;
  const hw = w.w / 2;
  const M = {frame: m(specKey(specMix(S.house.mats && S.house.mats.winframe, w.mats && w.mats.wframe), "frame")), glass: m(objKey(w, "glass", "glass")), handle: m("white")};
  const fw = 0.065;
  B(wg, -hw, -hw + fw, yb, yt, -0.035, 0.035, M.frame);
  B(wg, hw - fw, hw, yb, yt, -0.035, 0.035, M.frame);
  B(wg, -hw + fw, hw - fw, yb, yb + fw, -0.035, 0.035, M.frame);
  B(wg, -hw + fw, hw - fw, yt - fw, yt, -0.035, 0.035, M.frame);
  const op = w.op || "tiltturn";
  const n = winSashes(w);
  const slide = op === "slide" || op === "lift";
  const inW = w.w - 2 * fw;
  const mul = 0.08;
  const pw = slide ? (inW + (n - 1) * 0.06) / n : (inW - (n - 1) * mul) / n;
  const q0 = yb + fw;
  const q1 = yt - fw;
  const sw = 0.05;
  const key = animKey("win", w.id);
  const movers = [];
  for (let i = 0; i < n; i++) {
    const p0 = slide ? -hw + fw + i * (pw - 0.06) : -hw + fw + i * (pw + mul);
    const p1 = p0 + pw;
    if (!slide && i > 0) B(wg, p0 - mul, p0, q0, q1, -0.035, 0.035, M.frame);
    if (p1 - p0 < 0.12 || q1 - q0 < 0.12) continue;
    const opens = op !== "fixed" && (slide ? (n === 1 || i % 2 === 1) : (n <= 2 || i === 0 || i === n - 1));
    if (slide) {
      const zt = (i % 2 === 0 ? 0.018 : -0.018) * zo;
      const sg = new THREE.Group();
      sg.position.set(p0, 0, zt);
      wg.add(sg);
      sashBox(sg, 0, pw, q0, q1, M, sw);
      const hx = i % 2 === 1 || n === 1 ? 0.03 : pw - 0.03;
      B(sg, hx - 0.012, hx + 0.012, (q0 + q1) / 2 - 0.12, (q0 + q1) / 2 + 0.12, Math.min(zin * 0.028, zin * 0.05), Math.max(zin * 0.028, zin * 0.05), M.handle);
      if (opens) movers.push({kind: "slide", g: sg, x0: p0, dist: n === 1 ? pw * 0.6 : pw - 0.07, lift: op === "lift"});
      continue;
    }
    const left = n === 1 || i < n / 2;
    const u = left ? 1 : -1;
    const hx = left ? p0 : p1;
    const tg = new THREE.Group();
    tg.position.set((p0 + p1) / 2, q0, 0);
    wg.add(tg);
    const rg = new THREE.Group();
    rg.position.set(hx - (p0 + p1) / 2, 0, 0);
    tg.add(rg);
    const a = u > 0 ? 0 : -pw;
    sashBox(rg, a, a + pw, 0, q1 - q0, M, sw);
    if (op !== "fixed") {
      const fx = u > 0 ? pw - 0.03 : -pw + 0.03;
      const hy = (q1 - q0) / 2;
      B(rg, fx - 0.012, fx + 0.012, hy - 0.08, hy + 0.02, Math.min(zin * 0.028, zin * 0.055), Math.max(zin * 0.028, zin * 0.055), M.handle);
    }
    if (opens) movers.push({kind: "hinge", tg, rg, u});
  }
  const mode = op === "tiltturn" ? (w.how === "tilt" ? "tilt" : "turn") : op;
  if (movers.length) {
    animBind(key, w.open, t => {
      for (const mv of movers) {
        if (mv.kind === "slide") {
          mv.g.position.x = mv.x0 - t * mv.dist;
          mv.g.position.y = mv.lift ? Math.min(1, t * 8) * 0.012 : 0;
        } else if (mode === "tilt") {
          mv.rg.rotation.y = 0;
          mv.tg.rotation.x = zin * t * 0.2;
        } else {
          mv.tg.rotation.x = 0;
          mv.rg.rotation.y = -zin * mv.u * t * 1.45;
        }
      }
    });
  }
  const inner = zl(L.c);
  const outer = zl(L.c + out * wl);
  const frameIn = zin * 0.035;
  const frameOut = zo * 0.035;
  if (w.sill > 0.15) {
    const za = inner + zin * 0.06;
    B(wg, -hw - 0.05, hw + 0.05, yb - 0.02, yb + 0.006, Math.min(za, frameIn), Math.max(za, frameIn), m(objKey(w, "sill_in", "sill_in")));
  }
  const zb = outer + zo * 0.05;
  B(wg, -hw - 0.03, hw + 0.03, yb - 0.02, yb + 0.004, Math.min(frameOut, zb), Math.max(frameOut, zb), m(objKey(w, "sill_out", "sill_out")));
  if (!V.hq && sel && sel.t === "win" && sel.id === w.id) {
    const a0 = aC - hw;
    const a1 = aC + hw;
    const cc = L.c + out * wl / 2;
    const ln = w.o === "h"
      ? edges(g, w.w + 0.06, yt - yb + 0.06, wl + 0.1, (a0 + a1) / 2, (yb + yt) / 2, cc, selColor())
      : edges(g, wl + 0.1, yt - yb + 0.06, w.w + 0.06, cc, (yb + yt) / 2, (a0 + a1) / 2, selColor());
    ln.userData.noPick = true;
  }
}

function sideFrame(side, P) {
  if (side === "b") return {rot: Math.PI, ux: -1, uz: 0, px: 0, pz: -P.d / 2, len: P.w};
  if (side === "l") return {rot: -Math.PI / 2, ux: 0, uz: 1, px: -P.w / 2, pz: 0, len: P.d};
  if (side === "r") return {rot: Math.PI / 2, ux: 0, uz: -1, px: P.w / 2, pz: 0, len: P.d};
  return {rot: 0, ux: 1, uz: 0, px: 0, pz: P.d / 2, len: P.w};
}

function fitOp(op, P, y0) {
  const F = sideFrame(op.side, P);
  const w = clamp(op.w, 0.3, Math.max(0.3, F.len - 0.4));
  const sill = op.kind === "win" ? clamp(op.sill, 0, Math.max(0, P.h - y0 - 0.5)) : 0;
  const h = clamp(op.h, 0.3, Math.max(0.3, P.h - y0 - sill - 0.12));
  const lim = Math.max(0, F.len / 2 - w / 2 - 0.2);
  return Object.assign({}, op, {w, h, sill, c: clamp(op.c, -lim, lim)});
}

function bldShell(g, P, m, cfg) {
  const {w, d, h} = P;
  const t = Math.min(cfg.t, w / 4, d / 4);
  const y0 = cfg.base;
  const x0 = -w / 2;
  const x1 = w / 2;
  const z0 = -d / 2;
  const z1 = d / 2;
  const boxes = [[x0, x1, y0, h, z1 - t, z1], [x0, x1, y0, h, z0, z0 + t], [x0, x0 + t, y0, h, z0 + t, z1 - t], [x1 - t, x1, y0, h, z0 + t, z1 - t]];
  const ops = opsOf(P.o || {kind: cfg.kind}).map(op => fitOp(op, P, y0));
  const holes = [];
  for (const op of ops) {
    const F = sideFrame(op.side, P);
    const ya = y0 + op.sill;
    const yb = ya + op.h;
    const a0 = op.c - op.w / 2;
    const a1 = op.c + op.w / 2;
    if (op.side === "f") holes.push([a0, a1, ya, yb, z1 - t - 0.01, z1 + 0.01]);
    else if (op.side === "b") holes.push([-a1, -a0, ya, yb, z0 - 0.01, z0 + t + 0.01]);
    else if (op.side === "l") holes.push([x0 - 0.01, x0 + t + 0.01, ya, yb, a0, a1]);
    else holes.push([x1 - t - 0.01, x1 + 0.01, ya, yb, -a1, -a0]);
    op.F = F;
  }
  const geo = wallSolid(boxes, holes, {inner: {x0: x0 + t, x1: x1 - t, z0: z0 + t, z1: z1 - t}, y0});
  if (geo) addMesh(g, geo, [cfg.wall, cfg.inner || cfg.wall, cfg.wall, cfg.wall]);
  return {ops, t, y0};
}

function bldOpening(g, P, m, op, sh, M) {
  const F = op.F || sideFrame(op.side, P);
  const ag = new THREE.Group();
  ag.position.set(F.px + F.ux * op.c, sh.y0 + op.sill, F.pz + F.uz * op.c);
  ag.rotation.y = F.rot;
  if (P.o && P.o.id) ag.userData.pick = {t: "obj", id: P.o.id, open: op.id};
  g.add(ag);
  const W = op.w;
  const H = op.h;
  const t = sh.t;
  const key = P.o && P.o.id ? animKey("obj", P.o.id, op.id) : "";
  const tr = M.trim;
  const fw = 0.07;
  B(ag, -W / 2 - fw, -W / 2, 0, H + fw, 0, 0.03, tr);
  B(ag, W / 2, W / 2 + fw, 0, H + fw, 0, 0.03, tr);
  B(ag, -W / 2, W / 2, H, H + fw, 0, 0.03, tr);
  if (op.kind === "gate") {
    const gm = M.gate;
    if (op.op === "roller") {
      B(ag, -W / 2 - 0.05, W / 2 + 0.05, H, H + 0.3, 0, 0.28, M.box);
      const cg = new THREE.Group();
      cg.position.set(0, H, 0.12);
      ag.add(cg);
      B(cg, -W / 2, W / 2, -H, 0, -0.015, 0.015, gm);
      animBind(key, op.open, v => {
        cg.scale.y = Math.max(0.02, 1 - v);
      });
    } else if (op.op === "swing2") {
      const ls = [[-W / 2, 1], [W / 2, -1]].map(([hx, u]) => {
        const pv = new THREE.Group();
        pv.position.set(hx, 0.01, 0.03);
        ag.add(pv);
        const a = u > 0 ? 0 : -W / 2;
        B(pv, a, a + W / 2, 0, H - 0.02, -0.025, 0.025, gm);
        B(pv, u > 0 ? W / 2 - 0.08 : -W / 2 + 0.06, u > 0 ? W / 2 - 0.06 : -W / 2 + 0.08, H * 0.4, H * 0.55, 0.025, 0.05, M.handle);
        return [pv, u];
      });
      animBind(key, op.open, v => {
        for (const [pv, u] of ls) pv.rotation.y = -u * v * 1.66;
      });
    } else if (op.op === "slide") {
      const sg = new THREE.Group();
      sg.position.set(-W / 2 - 0.05, 0.01, -t - 0.04);
      ag.add(sg);
      B(sg, 0, W + 0.1, 0, H + 0.02, -0.025, 0.025, gm);
      B(ag, -W / 2 - 0.1, W * 1.5 + 0.2, H + 0.04, H + 0.1, -t - 0.08, -t - 0.02, M.box);
      animBind(key, op.open, v => {
        sg.position.x = -W / 2 - 0.05 + v * (W + 0.05);
      });
    } else {
      const ns = Math.max(3, Math.round(H / 0.55));
      const shh = H / ns;
      const zf = -t - 0.03;
      const secs = [];
      for (let i = 0; i < ns; i++) {
        const sg = new THREE.Group();
        ag.add(sg);
        B(sg, -W / 2 - 0.04, W / 2 + 0.04, 0.004, shh - 0.004, -0.022, 0.022, gm);
        if (i === 0) B(sg, W / 2 - 0.3, W / 2 - 0.1, 0.1, 0.13, 0.022, 0.04, M.handle);
        secs.push(sg);
      }
      for (const s of [-1, 1]) {
        B(ag, s * (W / 2 + 0.06) - 0.02, s * (W / 2 + 0.06) + 0.02, 0, H + 0.06, zf - 0.03, zf + 0.03, M.box);
        B(ag, s * (W / 2 + 0.06) - 0.02, s * (W / 2 + 0.06) + 0.02, H + 0.06, H + 0.1, zf - H - 0.2, zf + 0.03, M.box);
      }
      animBind(key, op.open, v => {
        secs.forEach((sg, i) => {
          const s = i * shh + v * H;
          if (s + shh <= H) {
            sg.position.set(0, s, zf);
            sg.rotation.x = 0;
          } else if (s >= H) {
            sg.position.set(0, H + 0.03, zf - (s - H));
            sg.rotation.x = -Math.PI / 2;
          } else {
            const k = (s + shh - H) / shh;
            sg.position.set(0, s, zf);
            sg.rotation.x = -k * Math.PI / 2;
          }
        });
      });
    }
  } else if (op.kind === "door") {
    const u = op.hinge ? -1 : 1;
    const pv = new THREE.Group();
    pv.position.set(u > 0 ? -W / 2 : W / 2, 0.01, 0.02);
    ag.add(pv);
    const lf = new THREE.Group();
    lf.position.set(u > 0 ? 0 : -W, 0, 0);
    pv.add(lf);
    B(lf, 0.002, W - 0.002, 0, H - 0.02, -0.02, 0.02, M.door);
    const hx = u > 0 ? W - 0.08 : 0.08;
    B(lf, hx - 0.012, hx + 0.012, 0.95, 1.1, 0.02, 0.045, M.handle);
    B(lf, hx - 0.012, hx + 0.012, 0.95, 1.1, -0.045, -0.02, M.handle);
    animBind(key, op.open, v => {
      pv.rotation.y = -u * v * 1.66;
    });
  } else {
    const u = op.hinge ? -1 : 1;
    const pv = new THREE.Group();
    pv.position.set(u > 0 ? -W / 2 : W / 2, 0, -t / 2);
    ag.add(pv);
    const a = u > 0 ? 0 : -W;
    const gm = B(pv, a + 0.05, a + W - 0.05, 0.05, H - 0.05, -0.004, 0.004, M.glass);
    if (gm) {
      gm.castShadow = false;
      gm.renderOrder = 2;
    }
    B(pv, a, a + 0.05, 0, H, -0.03, 0.03, M.winframe);
    B(pv, a + W - 0.05, a + W, 0, H, -0.03, 0.03, M.winframe);
    B(pv, a + 0.05, a + W - 0.05, 0, 0.05, -0.03, 0.03, M.winframe);
    B(pv, a + 0.05, a + W - 0.05, H - 0.05, H, -0.03, 0.03, M.winframe);
    if (op.op !== "fixed") {
      animBind(key, op.open, v => {
        pv.rotation.y = u * v * 1.45;
      });
    }
    B(ag, -W / 2 - 0.03, W / 2 + 0.03, -0.02, 0, 0, 0.06, M.sill);
  }
}
