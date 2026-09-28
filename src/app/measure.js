"use strict";
const MEAS = {a: null, b: null, cur: null, g: null};

function measHouseCand() {
  const e = ext();
  const pts = [];
  const lines = [];
  if (!e) return {pts, lines};
  const wl = S.house.wall;
  const t = S.house.inner;
  for (const r of S.rooms) {
    const x0 = r.x + (near(r.x, e.minX) ? 0 : t / 2);
    const x1 = r.x + r.w - (near(r.x + r.w, e.maxX) ? 0 : t / 2);
    const y0 = r.y + (near(r.y, e.minY) ? 0 : t / 2);
    const y1 = r.y + r.d - (near(r.y + r.d, e.maxY) ? 0 : t / 2);
    pts.push([x0, y0], [x1, y0], [x0, y1], [x1, y1]);
  }
  pts.push([e.minX - wl, e.minY - wl], [e.maxX + wl, e.minY - wl], [e.minX - wl, e.maxY + wl], [e.maxX + wl, e.maxY + wl]);
  for (const L of wallSegs().walls) {
    for (const s of [-1, 1]) {
      const c = L.c + s * t / 2;
      lines.push({o: L.o, c, a: L.a, b: L.b});
      if (L.o === "h") pts.push([L.a, c], [L.b, c]);
      else pts.push([c, L.a], [c, L.b]);
    }
  }
  for (const L of extSides(e)) {
    lines.push({o: L.o, c: L.c, a: L.a, b: L.b});
    lines.push({o: L.o, c: L.c + L.out * wl, a: L.a - wl, b: L.b + wl});
  }
  for (const d of S.doors.concat(S.windows)) {
    if (d.o === "h") pts.push([d.x - d.w / 2, d.y], [d.x + d.w / 2, d.y]);
    else pts.push([d.x, d.y - d.w / 2], [d.x, d.y + d.w / 2]);
  }
  for (const o of S.items) {
    if ((o.rot || 0) % 90) continue;
    const b = thingBox(o);
    pts.push([b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]);
  }
  return {pts, lines};
}

function measPlotCand() {
  const P = S.plot;
  const pts = [[0, 0], [P.w, 0], [0, P.d], [P.w, P.d]];
  const lines = [{o: "h", c: 0, a: 0, b: P.w}, {o: "h", c: P.d, a: 0, b: P.w}, {o: "v", c: 0, a: 0, b: P.d}, {o: "v", c: P.w, a: 0, b: P.d}];
  const box = (x, y, w, d) => {
    pts.push([x, y], [x + w, y], [x, y + d], [x + w, y + d]);
    lines.push({o: "h", c: y, a: x, b: x + w}, {o: "h", c: y + d, a: x, b: x + w}, {o: "v", c: x, a: y, b: y + d}, {o: "v", c: x + w, a: y, b: y + d});
  };
  const f = footprint();
  if (f) box(f.x, f.y, f.w, f.d);
  for (const o of S.objects) {
    if ((o.rot || 0) % 90) continue;
    const b = thingBox(o);
    box(b.x, b.y, b.w, b.d);
  }
  return {pts, lines};
}

function measToWorld(x, y) {
  if (tab === "house") {
    const w = houseToWorld(x, y);
    return {x: w.x, y: S.house.base + 0.03, z: w.z};
  }
  return {x, y: 0.03, z: y};
}

function measToTab(p) {
  if (tab === "house") return worldToHouse(p.x, p.z);
  return {x: p.x, y: p.z};
}

function measOrtho(x, y) {
  if (!MEAS.a || MEAS.b) return [x, y];
  const a = measToTab(MEAS.a);
  return Math.abs(x - a.x) >= Math.abs(y - a.y) ? [x, a.y] : [a.x, y];
}

function measAt2(p, e) {
  let x = p.x;
  let y = p.y;
  let snap = "";
  if (e && e.shiftKey) [x, y] = measOrtho(x, y);
  else if (!(e && e.altKey)) {
    const C = tab === "house" ? measHouseCand() : measPlotCand();
    const R = 12 / k;
    const cx = x;
    const cy = y;
    let best = R;
    for (const [px, py] of C.pts) {
      const d = Math.hypot(px - cx, py - cy);
      if (d < best) {
        best = d;
        x = px;
        y = py;
        snap = "corner";
      }
    }
    if (!snap) {
      for (const L of C.lines) {
        const u = L.o === "h" ? cx : cy;
        const v = L.o === "h" ? cy : cx;
        const d = Math.abs(v - L.c);
        if (d < best && u > L.a - R && u < L.b + R) {
          best = d;
          snap = "edge";
          x = L.o === "h" ? cx : L.c;
          y = L.o === "h" ? L.c : cy;
        }
      }
    }
  }
  return Object.assign(measToWorld(r2(x), r2(y)), {snap});
}

function measCand3() {
  const out = [];
  const Hs = S.house;
  const C = measHouseCand();
  for (const [x, y] of C.pts) {
    const w = houseToWorld(x, y);
    out.push(new THREE.Vector3(w.x, Hs.base, w.z), new THREE.Vector3(w.x, Hs.base + Hs.h, w.z));
  }
  const f = footprint();
  if (f) for (const [x, y] of [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.d], [f.x + f.w, f.y + f.d]]) out.push(new THREE.Vector3(x, 0, y));
  const P = S.plot;
  for (const [x, y] of [[0, 0], [P.w, 0], [0, P.d], [P.w, P.d]]) out.push(new THREE.Vector3(x, 0, y));
  for (const o of S.objects) {
    if ((o.rot || 0) % 90) continue;
    const b = thingBox(o);
    const z0 = o.z || 0;
    for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]]) out.push(new THREE.Vector3(x, z0, y), new THREE.Vector3(x, z0 + o.h, y));
  }
  return out;
}

function measAt3(e) {
  const h = pointAt(e.clientX, e.clientY);
  if (!h) return null;
  let p = h.clone();
  let snap = "";
  if (e.shiftKey && MEAS.a && !MEAS.b) {
    const d = [p.x - MEAS.a.x, p.y - MEAS.a.y, p.z - MEAS.a.z].map(Math.abs);
    const i = d.indexOf(Math.max(...d));
    p = new THREE.Vector3(i === 0 ? p.x : MEAS.a.x, i === 1 ? p.y : MEAS.a.y, i === 2 ? p.z : MEAS.a.z);
  } else if (!e.altKey) {
    const rect = V.renderer.domElement.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const v = new THREE.Vector3();
    let best = 14;
    for (const c of measCand3()) {
      v.copy(c).project(V.camera);
      if (v.z > 1) continue;
      const d = Math.hypot((v.x + 1) / 2 * rect.width - sx, (1 - v.y) / 2 * rect.height - sy);
      if (d < best) {
        best = d;
        p = c.clone();
        snap = "corner";
      }
    }
  }
  return {x: r2(p.x), y: r2(p.y), z: r2(p.z), snap};
}

function measLen(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function measText(a, b) {
  const pa = measToTab(a);
  const pb = measToTab(b);
  const dx = Math.abs(pb.x - pa.x);
  const dy = Math.abs(pb.y - pa.y);
  const dh = Math.abs(b.y - a.y);
  const sub = [];
  if (dx > 0.005 && dy > 0.005) sub.push("↔ " + fm(dx), "↕ " + fm(dy));
  if (dh > 0.005 && (dx > 0.005 || dy > 0.005)) sub.push("по высоте " + fm(dh));
  return {main: fm(measLen(a, b)) + " м", sub: sub.join("  ")};
}

function measClick(p) {
  if (!p) return;
  if (!MEAS.a || MEAS.b) {
    MEAS.a = p;
    MEAS.b = null;
  } else {
    MEAS.b = p;
    const t = measText(MEAS.a, MEAS.b);
    setStatus("Рулетка: " + t.main + (t.sub ? ", " + t.sub : ""));
  }
  MEAS.cur = p;
  measSync3();
  render2D();
}

function measClear() {
  MEAS.a = null;
  MEAS.b = null;
  MEAS.cur = null;
  measSync3();
}

function measSync3() {
  if (!V.ok || !V.scene) return;
  if (MEAS.g) {
    V.scene.remove(MEAS.g);
    MEAS.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    MEAS.g = null;
  }
  V.need = true;
  const on = tool && tool.t === "meas" && !V.hq;
  if (!on || (!MEAS.a && !MEAS.cur)) return;
  const g = new THREE.Group();
  const col = 0xe5484d;
  const dots = [];
  if (MEAS.cur) dots.push(MEAS.cur);
  const end = MEAS.b || MEAS.cur;
  if (MEAS.a) {
    dots.push(MEAS.a);
    const va = new THREE.Vector3(MEAS.a.x, MEAS.a.y, MEAS.a.z);
    const vb = end ? new THREE.Vector3(end.x, end.y, end.z) : null;
    const L = vb ? va.distanceTo(vb) : 0;
    if (L > 0.005) {
      const mid = va.clone().add(vb).multiplyScalar(0.5);
      const rad = clamp(V.camera.position.distanceTo(mid) * 0.0018, 0.008, 0.08);
      const ln = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, L, 6, 1), new THREE.MeshBasicMaterial({color: col, depthTest: false, transparent: true, toneMapped: false}));
      ln.position.copy(mid);
      ln.quaternion.setFromUnitVectors(YUP, vb.clone().sub(va).normalize());
      ln.renderOrder = 30;
      g.add(ln);
    }
    if (MEAS.b) {
      const sp = label(measText(MEAS.a, MEAS.b).main);
      if (sp) {
        sp.position.set((MEAS.a.x + MEAS.b.x) / 2, (MEAS.a.y + MEAS.b.y) / 2 + 0.05, (MEAS.a.z + MEAS.b.z) / 2);
        sp.renderOrder = 31;
        g.add(sp);
      }
    }
  }
  const pg = new THREE.BufferGeometry().setFromPoints(dots.map(p => new THREE.Vector3(p.x, p.y, p.z)));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({color: col, size: 9, sizeAttenuation: false, depthTest: false, transparent: true, toneMapped: false}));
  pts.renderOrder = 30;
  g.add(pts);
  g.traverse(o => {
    o.userData.noPick = true;
  });
  V.scene.add(g);
  MEAS.g = g;
}

function measHover3(e) {
  MEAS.cur = measAt3(e);
  measSync3();
  if (MEAS.a && !MEAS.b && MEAS.cur) {
    const t = measText(MEAS.a, MEAS.cur);
    showTip(e.clientX, e.clientY, t.main + (t.sub ? "  " + t.sub : ""));
  } else hideTip();
  if (view !== "3d") render2D();
}
