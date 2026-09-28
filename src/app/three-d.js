"use strict";
const V = {
  ok: false,
  scene: null,
  camera: null,
  renderer: null,
  root: null,
  sun: null,
  hemi: null,
  sky: null,
  ray: null,
  need: true,
  rebuild: true,
  mode: "noroof",
  labels: true,
  fence: true,
  sunbar: true,
  cut: {side: "top", t: 0.43},
  walk: null,
  last: 0,
  hg: null,
  hgi: null,
  hq: false,
  sunDir: new THREE.Vector3(22, 42, 30).normalize(),
  env: null
};
const LABELS = new Map();
const EYE = 1.63;

function selColor() {
  return 0x2f6fdf;
}

function makeLabel(text, sub) {
  const c = document.createElement("canvas");
  const ctx = c.getContext && c.getContext("2d");
  if (!ctx) return null;
  const font = "\"Golos Text\", \"Segoe UI\", system-ui, -apple-system, Roboto, Arial, sans-serif";
  const f1 = "600 40px " + font;
  const f2 = "400 32px " + font;
  ctx.font = f1;
  const w1 = ctx.measureText(text).width;
  ctx.font = f2;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const W = Math.ceil(Math.max(w1, w2) + 44);
  const H = sub ? 104 : 64;
  c.width = W;
  c.height = H;
  const r = 18;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(W - r, 0);
  ctx.quadraticCurveTo(W, 0, W, r);
  ctx.lineTo(W, H - r);
  ctx.quadraticCurveTo(W, H, W - r, H);
  ctx.lineTo(r, H);
  ctx.quadraticCurveTo(0, H, 0, H - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1d2126";
  ctx.font = f1;
  ctx.fillText(text, W / 2, sub ? 36 : H / 2);
  if (sub) {
    ctx.font = f2;
    ctx.fillStyle = "#5d646c";
    ctx.fillText(sub, W / 2, 76);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.encoding = THREE.sRGBEncoding;
  return {tex, W, H};
}

function label(text, sub) {
  const key = text + "|" + (sub || "");
  let rec = LABELS.get(key);
  if (!rec) {
    rec = makeLabel(text, sub);
    if (!rec) return null;
    LABELS.set(key, rec);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: rec.tex, depthTest: false, transparent: true, sizeAttenuation: false, toneMapped: false}));
  const s = 0.034 * rec.H / 104;
  sp.scale.set(s * rec.W / rec.H, s, 1);
  sp.renderOrder = 20;
  return sp;
}

function edges(parent, w, h, d, x, y, z, color) {
  const bg = new THREE.BoxGeometry(w, h, d);
  const eg = new THREE.EdgesGeometry(bg);
  bg.dispose();
  const ln = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({color, depthTest: false, transparent: true, opacity: 0.95, toneMapped: false}));
  ln.position.set(x, y, z);
  ln.renderOrder = 15;
  parent.add(ln);
  return ln;
}

function clear3D() {
  V.root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.isSprite || o.isLine || o.isLineSegments) o.material.dispose();
  });
  while (V.root.children.length) V.root.remove(V.root.children[0]);
  V.hg = null;
  V.hgi = null;
}

function floorMat(r) {
  if (r.type === "Санузел" || r.type === "Котельная") return "tile";
  if (r.type === "Прихожая" || r.type === "Коридор" || r.type === "Кухня") return "porcelain";
  return "parquet";
}

function houseToWorld(px, py) {
  const e = ext();
  const bcx = e ? (e.minX + e.maxX) / 2 : 0;
  const bcy = e ? (e.minY + e.maxY) / 2 : 0;
  const a = S.house.rot * Math.PI / 180;
  const lx = px - bcx;
  const ly = py - bcy;
  return {x: S.house.cx + lx * Math.cos(a) - ly * Math.sin(a), z: S.house.cy + lx * Math.sin(a) + ly * Math.cos(a)};
}

function worldToHouse(x, z) {
  const e = ext();
  const bcx = e ? (e.minX + e.maxX) / 2 : 0;
  const bcy = e ? (e.minY + e.maxY) / 2 : 0;
  const a = S.house.rot * Math.PI / 180;
  const lx = x - S.house.cx;
  const lz = z - S.house.cy;
  return {x: bcx + lx * Math.cos(a) + lz * Math.sin(a), y: bcy - lx * Math.sin(a) + lz * Math.cos(a)};
}

function dirToWorld(dx, dy) {
  const a = S.house.rot * Math.PI / 180;
  return {x: dx * Math.cos(a) - dy * Math.sin(a), z: dx * Math.sin(a) + dy * Math.cos(a)};
}

function dirToHouse(dx, dz) {
  const a = S.house.rot * Math.PI / 180;
  return {x: dx * Math.cos(a) + dz * Math.sin(a), y: -dx * Math.sin(a) + dz * Math.cos(a)};
}

function thingGroup(o, parent, mfn, y0, pick) {
  const g = new THREE.Group();
  g.position.set(o.x + o.w / 2, y0 + (o.z || 0), o.y + o.d / 2);
  g.rotation.y = -(o.rot || 0) * Math.PI / 180;
  g.userData.pick = pick;
  g.userData.dims = o.w + "|" + o.d + "|" + o.h + "|" + o.kind;
  buildModel(g, o, mfn, false);
  parent.add(g);
  if (!V.hq && sel && sel.t === pick.t && sel.id === pick.id) edges(g, o.w + 0.04, o.h + 0.04, o.d + 0.04, 0, o.h / 2, 0, selColor());
  return g;
}

function syncThing3D() {
  if (!sel || (sel.t !== "item" && sel.t !== "obj") || V.rebuild || !V.root) return false;
  const it = selItem();
  const parent = sel.t === "item" ? V.hgi : V.root;
  if (!it || !parent) return false;
  const g = parent.children.find(c => c.userData.pick && c.userData.pick.t === sel.t && c.userData.pick.id === it.id);
  if (!g || g.userData.dims !== it.w + "|" + it.d + "|" + it.h + "|" + it.kind) return false;
  const y0 = sel.t === "item" ? S.house.base + 0.02 : 0;
  g.position.set(it.x + it.w / 2, y0 + (it.z || 0), it.y + it.d / 2);
  g.rotation.y = -(it.rot || 0) * Math.PI / 180;
  V.need = true;
  return true;
}

function cutCfg(e) {
  if (V.mode !== "cut") return null;
  const Hs = S.house;
  const wl = Hs.wall;
  const t = clamp(V.cut.t, 0.02, 0.98);
  if (V.cut.side === "top") return {axis: "y", at: Hs.base + clamp(V.cut.t, 0.03, 1) * Hs.h, keep: -1};
  const wd = {front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0]}[V.cut.side] || [0, 1];
  const hd = dirToHouse(wd[0], wd[1]);
  const x0 = e.minX - wl;
  const x1 = e.maxX + wl;
  const y0 = e.minY - wl;
  const y1 = e.maxY + wl;
  if (Math.abs(hd.x) > 0.5) return hd.x > 0 ? {axis: "x", at: x1 - t * (x1 - x0), keep: -1} : {axis: "x", at: x0 + t * (x1 - x0), keep: 1};
  return hd.y > 0 ? {axis: "z", at: y1 - t * (y1 - y0), keep: -1} : {axis: "z", at: y0 + t * (y1 - y0), keep: 1};
}

function setClip(cut) {
  const pl = CLIP[0];
  if (!cut || !V.hgi) {
    pl.set(new THREE.Vector3(0, 1, 0), 1e6);
    return;
  }
  const n = new THREE.Vector3(cut.axis === "x" ? 1 : 0, cut.axis === "y" ? 1 : 0, cut.axis === "z" ? 1 : 0).multiplyScalar(cut.keep);
  const local = new THREE.Plane(n, cut.keep < 0 ? cut.at + 0.004 : -cut.at + 0.004);
  V.root.updateMatrixWorld(true);
  local.applyMatrix4(V.hgi.matrixWorld);
  pl.copy(local);
}

function baseboards(g, ws, sides, base, m) {
  const t = S.house.inner;
  const bm = m("white");
  const lines = ws.walls.concat(sides);
  for (const r of S.rooms) {
    const E4 = [
      {o: "h", c: r.y, a: r.x, b: r.x + r.w, inw: 1},
      {o: "h", c: r.y + r.d, a: r.x, b: r.x + r.w, inw: -1},
      {o: "v", c: r.x, a: r.y, b: r.y + r.d, inw: 1},
      {o: "v", c: r.x + r.w, a: r.y, b: r.y + r.d, inw: -1}
    ];
    for (const E of E4) {
      for (const L of lines) {
        if (L.o !== E.o || !near(L.c, E.c) || L.b <= E.a + 0.01 || L.a >= E.b - 0.01) continue;
        const lo = Math.max(E.a, L.a);
        const hi = Math.min(E.b, L.b);
        const face = L.ext ? L.c : L.c + E.inw * t / 2;
        const holes = S.doors.filter(d => onLine(d, L)).map(d => [along(d) - d.w / 2 - (d.kind === "door" || d.kind === "entry" ? 0.07 : 0), along(d) + d.w / 2 + (d.kind === "door" || d.kind === "entry" ? 0.07 : 0)]);
        for (const [p0, p1] of cut(lo, hi, holes)) {
          const c1 = face + E.inw * 0.012;
          const y0 = base + 0.02;
          const y1 = base + 0.09;
          const mm = E.o === "h" ? B(g, p0, p1, y0, y1, Math.min(face, c1), Math.max(face, c1), bm) : B(g, Math.min(face, c1), Math.max(face, c1), y0, y1, p0, p1, bm);
          if (mm) mm.castShadow = false;
        }
      }
    }
  }
}

function buildHouse3D() {
  const e = ext();
  if (!e) return;
  const Hs = S.house;
  const wl = Hs.wall;
  const t = Hs.inner;
  const base = Hs.base;
  const H = Hs.h;
  const bcx = (e.minX + e.maxX) / 2;
  const bcy = (e.minY + e.maxY) / 2;
  const hg = new THREE.Group();
  hg.position.set(Hs.cx, 0, Hs.cy);
  hg.rotation.y = -Hs.rot * Math.PI / 180;
  V.root.add(hg);
  const g = new THREE.Group();
  g.position.set(-bcx, 0, -bcy);
  hg.add(g);
  V.hg = hg;
  V.hgi = g;
  const m = matHouse;
  const hp = {t: "house"};
  const pl = B(g, e.minX - wl - 0.03, e.maxX + wl + 0.03, 0, base, e.minY - wl - 0.03, e.maxY + wl + 0.03, m(hk("plinth", "plinth")));
  if (pl) pl.userData.pick = hp;
  const ba = 0.8;
  const bam = m(hk("blind", "paving"));
  const blind = [
    [e.minX - wl - ba, e.maxX + wl + ba, e.minY - wl - ba, e.minY - wl],
    [e.minX - wl - ba, e.maxX + wl + ba, e.maxY + wl, e.maxY + wl + ba],
    [e.minX - wl - ba, e.minX - wl, e.minY - wl, e.maxY + wl],
    [e.maxX + wl, e.maxX + wl + ba, e.minY - wl, e.maxY + wl]
  ];
  for (const [x0, x1, z0, z1] of blind) {
    const bm = B(g, x0, x1, 0, 0.04, z0, z1, bam);
    if (bm) bm.userData.pick = hp;
  }
  for (const r of S.rooms) {
    const f = B(g, r.x, r.x + r.w, base, base + 0.02, r.y, r.y + r.d, m(objKey(r, "floor", floorMat(r))));
    if (f) {
      f.userData.pick = {t: "room", id: r.id};
      f.castShadow = false;
    }
  }
  const ws = wallSegs();
  const sides = extSides(e);
  const boxes = [];
  const holes = [];
  const y0 = base;
  const y1 = base + H;
  for (const s of ws.walls) {
    const a = s.a - t / 2;
    const b = s.b + t / 2;
    if (s.o === "h") boxes.push([a, b, y0, y1, s.c - t / 2, s.c + t / 2]);
    else boxes.push([s.c - t / 2, s.c + t / 2, y0, y1, a, b]);
  }
  boxes.push([e.minX - wl, e.maxX + wl, y0, y1, e.minY - wl, e.minY]);
  boxes.push([e.minX - wl, e.maxX + wl, y0, y1, e.maxY, e.maxY + wl]);
  boxes.push([e.minX - wl, e.minX, y0, y1, e.minY, e.maxY]);
  boxes.push([e.maxX, e.maxX + wl, y0, y1, e.minY, e.maxY]);
  const doorLines = [];
  for (const d of S.doors) {
    const L = lineOf(d, ws, sides, false);
    if (!L) continue;
    doorLines.push([d, L]);
    const sp = span(L, across(d));
    const a0 = along(d) - d.w / 2;
    const a1 = along(d) + d.w / 2;
    const ht = base + Math.min(Hs.doorH, H);
    if (d.o === "h") holes.push([a0, a1, base, ht, sp[0], sp[1]]);
    else holes.push([sp[0], sp[1], base, ht, a0, a1]);
  }
  const winLines = [];
  for (const w of S.windows) {
    const L = lineOf(w, ws, sides, true);
    if (!L) continue;
    const yb = base + Math.min(w.sill, H - 0.05);
    const yt = base + Math.min(w.sill + w.h, H - 0.01);
    if (yt - yb < 0.05) continue;
    winLines.push([w, L]);
    const sp = span(L, across(w));
    const a0 = along(w) - w.w / 2;
    const a1 = along(w) + w.w / 2;
    if (w.o === "h") holes.push([a0, a1, yb, yt, sp[0], sp[1]]);
    else holes.push([sp[0], sp[1], yb, yt, a0, a1]);
  }
  const cutc = cutCfg(e);
  const wmats = [m(hk("facade", "facade")), m("plaster"), m(cutc ? "cap" : "top"), m("cap")];
  const rgi = new Map();
  for (const r of S.rooms) {
    if (!r.mats || !r.mats.wall) continue;
    rgi.set(r.id, wmats.length);
    wmats.push(m(objKey(r, "wall", "plaster")));
  }
  const roomFn = rgi.size ? (x, z) => {
    const r = roomAt(x, z);
    return r && rgi.has(r.id) ? rgi.get(r.id) : -1;
  } : null;
  const geo = wallSolid(boxes, holes, {inner: {x0: e.minX, x1: e.maxX, z0: e.minY, z1: e.maxY}, y0: base, cut: cutc, room: roomFn});
  if (geo) {
    const wm = new THREE.Mesh(geo, wmats);
    wm.castShadow = true;
    wm.receiveShadow = true;
    wm.userData.pick = hp;
    wm.userData.walls = true;
    g.add(wm);
  }
  for (const [d, L] of doorLines) door3D(g, d, L, base, m);
  for (const [w, L] of winLines) win3D(g, w, L, base, m);
  baseboards(g, ws, sides, base, m);
  for (const it of S.items) thingGroup(it, g, m, base + 0.02, {t: "item", id: it.id});
  if (V.mode === "roof") {
    const c = B(g, e.minX, e.maxX, base + H - 0.02, base + H - 0.001, e.minY, e.maxY, m(hk("ceiling", "plaster")));
    if (c) c.userData.pick = hp;
    roof3D(g, e, m);
  }
  if (V.labels && V.mode !== "roof" && !V.hq && !V.walk) {
    const ly = cutc && cutc.axis === "y" ? cutc.at + 0.3 : base + H + 0.35;
    for (const r of S.rooms) {
      if (cutc && cutc.axis !== "y") {
        const c = cutc.axis === "x" ? r.x + r.w / 2 : r.y + r.d / 2;
        if ((cutc.keep < 0 && c > cutc.at) || (cutc.keep > 0 && c < cutc.at)) continue;
      }
      const sp = label(r.name, fa(r.w * r.d) + " м²");
      if (!sp) continue;
      sp.position.set(r.x + r.w / 2, ly, r.y + r.d / 2);
      g.add(sp);
    }
  }
  if (!V.hq && sel && sel.t === "room") {
    const r = selItem();
    if (r) {
      const ov = B(g, r.x, r.x + r.w, base + 0.021, base + 0.03, r.y, r.y + r.d, mat("sel", false));
      if (ov) {
        ov.castShadow = false;
        ov.receiveShadow = false;
        ov.userData.noPick = true;
      }
      edges(g, r.w, 0.06, r.d, r.x + r.w / 2, base + 0.05, r.y + r.d / 2, selColor());
    }
  }
  if (!V.hq && sel && sel.t === "house") edges(g, e.maxX - e.minX + 2 * wl + 0.1, base + H + 0.1, e.maxY - e.minY + 2 * wl + 0.1, bcx, (base + H) / 2, bcy, selColor());
  setClip(cutc);
}

function buildFence(R, P) {
  const H = 1.6;
  const post = matPlot("post");
  const mesh = matPlot("fence");
  const posts = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.ceil(L / 2.5));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n;
      const z = z0 + (z1 - z0) * i / n;
      B(R, x - 0.03, x + 0.03, 0, H + 0.08, z - 0.03, z + 0.03, post);
    }
  };
  const panel = (x0, z0, x1, z1) => {
    const pm = Math.abs(z1 - z0) < 0.001
      ? B(R, Math.min(x0, x1), Math.max(x0, x1), 0.05, H, z0 - 0.004, z0 + 0.004, mesh)
      : B(R, x0 - 0.004, x0 + 0.004, 0.05, H, Math.min(z0, z1), Math.max(z0, z1), mesh);
    if (pm) pm.castShadow = false;
  };
  const seg = (x0, z0, x1, z1) => {
    if (Math.hypot(x1 - x0, z1 - z0) < 0.05) return;
    posts(x0, z0, x1, z1);
    panel(x0, z0, x1, z1);
  };
  seg(0, 0, P.w, 0);
  seg(0, 0, 0, P.d);
  seg(P.w, 0, P.w, P.d);
  const gw = Math.min(4, P.w * 0.4);
  const gx0 = P.w / 2 - gw / 2;
  const gx1 = P.w / 2 + gw / 2;
  const wk = gx1 + 1.1 < P.w - 0.3;
  seg(0, P.d, gx0, P.d);
  seg(wk ? gx1 + 1.2 : gx1, P.d, P.w, P.d);
  panel(gx0 + 0.05, P.d, gx1 - 0.05, P.d);
  for (const [a, b] of [[gx0, gx1]].concat(wk ? [[gx1 + 0.1, gx1 + 1.1]] : [])) {
    B(R, a, b, 0.05, 0.1, P.d - 0.02, P.d + 0.02, post);
    B(R, a, b, H - 0.05, H, P.d - 0.02, P.d + 0.02, post);
    B(R, a, a + 0.05, 0.05, H, P.d - 0.02, P.d + 0.02, post);
    B(R, b - 0.05, b, 0.05, H, P.d - 0.02, P.d + 0.02, post);
  }
  if (wk) {
    panel(gx1 + 0.15, P.d, gx1 + 1.05, P.d);
    B(R, gx1 + 1.1, gx1 + 1.2, 0, H + 0.08, P.d - 0.05, P.d + 0.05, post);
  }
}

function build3D() {
  if (!V.scene) return;
  clear3D();
  animClear();
  setClip(null);
  const P = S.plot;
  const R = V.root;
  const far = 450;
  ground(R, -far, P.w + far, -far, P.d + far, -0.02, matPlot(SKY.snowOn ? "snow" : "meadow"));
  ground(R, 0, P.w, 0, P.d, 0, matPlot(SKY.snowOn ? "snow" : "grass"));
  const X0 = -far;
  const X1 = P.w + far;
  B(R, X0, X1, -0.02, 0.03, P.d, P.d + 1.8, matPlot("sidewalk"));
  B(R, X0, X1, -0.02, 0.12, P.d + 1.8, P.d + 1.95, matPlot("concrete"));
  ground(R, X0, X1, P.d + 1.95, P.d + 8.95, 0.0, matPlot("asphalt"));
  B(R, X0, X1, -0.02, 0.12, P.d + 8.95, P.d + 9.1, matPlot("concrete"));
  B(R, X0, X1, -0.02, 0.03, P.d + 9.1, P.d + 11, matPlot("sidewalk"));
  for (let x = Math.floor(X0 / 6) * 6; x < X1; x += 6) {
    const mk = B(R, x, x + 3, 0, 0.004, P.d + 5.4, P.d + 5.52, matPlot("white"));
    if (mk) {
      mk.castShadow = false;
      mk.receiveShadow = true;
    }
  }
  if (!V.hq) {
    const rl = B(R, 0, P.w, 0.03, 0.045, P.d - 0.07, P.d + 0.07, matPlot("redline"));
    if (rl) rl.castShadow = false;
    const z = zone();
    if (z.w > 0 && z.d > 0) {
      const pts = [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.d], [z.x, z.y + z.d], [z.x, z.y]].map(([x, y]) => new THREE.Vector3(x, 0.03, y));
      R.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.7})));
    }
  }
  if (V.fence) buildFence(R, P);
  for (const o of S.objects) {
    const g = thingGroup(o, R, matPlot, 0, {t: "obj", id: o.id});
    const md = modelOf(o);
    if (V.labels && !V.hq && !V.walk && (md.cat === "build" || o.name !== md.name)) {
      const sp = label(o.name);
      if (sp) {
        sp.position.set(0, Math.max(o.h, 0.3) + 0.9, 0);
        g.add(sp);
      }
    }
  }
  buildHouse3D();
  fitSun();
  pruneMats(V.scene);
}

function fitSun() {
  const P = S.plot;
  const cx = P.w / 2;
  const cz = P.d / 2;
  const sz = Math.max(P.w, P.d) * 0.62 + 8;
  V.sun.position.set(cx + V.sunDir.x * 80, V.sunDir.y * 80, cz + V.sunDir.z * 80);
  V.sun.target.position.set(cx, 0, cz);
  V.sun.target.updateMatrixWorld();
  const cam = V.sun.shadow.camera;
  cam.left = -sz;
  cam.right = sz;
  cam.top = sz;
  cam.bottom = -sz;
  cam.near = 20;
  cam.far = 160;
  cam.updateProjectionMatrix();
}

function schedule3D() {
  V.rebuild = true;
  V.need = true;
}

function visible3D() {
  return view !== "2d";
}

function size3D() {
  if (!V.ok) return;
  const host = $("#gl");
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (!w || !h) return;
  V.renderer.setSize(w, h, false);
  V.camera.aspect = w / h;
  V.camera.updateProjectionMatrix();
  V.need = true;
}

function render3D() {
  if (V.sky) V.sky.position.copy(V.camera.position);
  V.renderer.render(V.scene, V.camera);
}

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - (V.last || ts)) / 1000);
  V.last = ts;
  if (!visible3D() || V.busy) return;
  if (V.rebuild) {
    V.rebuild = false;
    build3D();
    V.need = true;
  }
  if (tick3D(dt)) V.need = true;
  if (skyTick(dt)) V.need = true;
  if (animTick(dt)) V.need = true;
  if (V.need) {
    V.need = false;
    updateGizmo();
    render3D();
    refineReset();
  } else {
    refineTick(ts);
  }
}

function init3D() {
  V.scene = new THREE.Scene();
  V.camera = new THREE.PerspectiveCamera(50, 1.6, 0.05, 3000);
  V.root = new THREE.Group();
  V.scene.add(V.root);
  V.scene.fog = new THREE.Fog(new THREE.Color(0xdce6ec), 160, 900);
  V.hemi = new THREE.HemisphereLight(lin(0xdfe9f5), lin(0x8d8a82), 0.12);
  V.scene.add(V.hemi);
  const sun = new THREE.DirectionalLight(lin(0xfff0da), 3);
  sun.castShadow = true;
  const qs = (QUALITY[RF.q] || QUALITY.nice)[2];
  sun.shadow.mapSize.set(qs, qs);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  V.scene.add(sun);
  V.scene.add(sun.target);
  V.sun = sun;
  V.ray = new THREE.Raycaster();
  try {
    V.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: false});
    V.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    V.renderer.shadowMap.enabled = true;
    V.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    V.renderer.outputEncoding = THREE.sRGBEncoding;
    V.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    V.renderer.toneMappingExposure = 0.72;
    V.renderer.localClippingEnabled = true;
    $("#gl").appendChild(V.renderer.domElement);
    V.ok = true;
  } catch (err) {
    V.ok = false;
    $("#nogl").hidden = false;
  }
  V.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMaterial(1));
  V.sky.renderOrder = -10;
  V.sky.frustumCulled = false;
  V.sky.userData.noPick = true;
  V.scene.add(V.sky);
  initGizmo();
  if (!V.ok) return;
  applySky(true);
  attach3D();
  size3D();
  if (window.ResizeObserver) new ResizeObserver(size3D).observe($("#gl"));
  else window.addEventListener("resize", size3D);
  requestAnimationFrame(loop);
}
