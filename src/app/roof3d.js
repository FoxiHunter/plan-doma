"use strict";
const ROOFS = {gable: "Двускатная", hip: "Вальмовая", halfhip: "Полувальмовая", pyramid: "Шатровая", gambrel: "Ломаная мансардная", shed: "Односкатная", flat: "Плоская"};

function clipPoly(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i];
    const Q = poly[(i + 1) % poly.length];
    const fp = a * P[0] + b * P[1] + c;
    const fq = a * Q[0] + b * Q[1] + c;
    if (fp <= 1e-9) out.push(P);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
      const t = fp / (fp - fq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}

function roofCalc() {
  const Hs = S.house;
  const e = ext();
  if (!e) return null;
  const wl = Hs.wall;
  const Wo = e.maxX - e.minX + 2 * wl;
  const Do = e.maxY - e.minY + 2 * wl;
  const type = has(ROOFS, Hs.roof) ? Hs.roof : "gable";
  if (type === "flat") return {type, Wo, Do, top: 0.65, planes: []};
  let alongX;
  if (type === "shed") alongX = Hs.low === "f" || Hs.low === "b";
  else {
    const longX = Wo >= Do;
    alongX = Hs.ridge === "short" ? !longX : longX;
  }
  const A = (alongX ? Wo : Do) / 2;
  const Bh = (alongX ? Do : Wo) / 2;
  const ta = Math.tan(Hs.pitch * Math.PI / 180);
  const planes = [];
  const P = (a, b, c) => planes.push({a, b, c});
  if (type === "gable" || type === "hip" || type === "halfhip") {
    P(0, -ta, ta * Bh);
    P(0, ta, ta * Bh);
  }
  if (type === "hip") {
    P(-ta, 0, ta * A);
    P(ta, 0, ta * A);
  }
  if (type === "halfhip") {
    const y0 = ta * Bh * (1 - Hs.hipCut);
    P(-ta, 0, y0 + ta * A);
    P(ta, 0, y0 + ta * A);
  }
  if (type === "pyramid") {
    const tb = ta * Bh / A;
    P(0, -ta, ta * Bh);
    P(0, ta, ta * Bh);
    P(-tb, 0, tb * A);
    P(tb, 0, tb * A);
  }
  if (type === "gambrel") {
    const t2 = Math.tan(Hs.pitch2 * Math.PI / 180);
    const db = Bh * 0.32;
    const yb = ta * db;
    P(0, -ta, ta * Bh);
    P(0, ta, ta * Bh);
    P(0, -t2, yb + t2 * (Bh - db));
    P(0, t2, yb + t2 * (Bh - db));
  }
  if (type === "shed") {
    const s = Hs.low === "f" || Hs.low === "r" ? 1 : -1;
    P(0, -s * ta, ta * Bh);
  }
  const gableEnds = type === "gable" || type === "gambrel" || type === "shed" || type === "halfhip";
  const ou = gableEnds ? Hs.overG : Hs.over;
  const ov = Hs.over;
  const dom = [[-A - ou, -Bh - ov], [A + ou, -Bh - ov], [A + ou, Bh + ov], [-A - ou, Bh + ov]];
  const th = 0.2;
  const ofs = th * Math.max(...planes.map(p => Math.sqrt(1 + p.a * p.a + p.b * p.b)));
  const off = planes.map(() => ofs);
  const R = {type, alongX, A, Bh, planes, dom, ou, ov, Wo, Do, off, th};
  R.bot = roofRegions(planes, dom, planes.map(() => 0));
  R.topR = roofRegions(planes, dom, off);
  let top = 0;
  for (const poly of R.topR) if (poly) for (const q of poly) top = Math.max(top, roofY(R, q[0], q[1], off));
  R.top = top;
  R.ridgeY = roofY(R, 0, 0, planes.map(() => 0));
  for (const poly of R.bot) if (poly) for (const q of poly) R.ridgeY = Math.max(R.ridgeY, roofY(R, q[0], q[1], planes.map(() => 0)));
  return R;
}

function roofRegions(planes, dom, off) {
  return planes.map((p, i) => {
    let poly = dom.map(q => q.slice());
    for (let j = 0; j < planes.length && poly.length >= 3; j++) {
      if (j === i) continue;
      const q = planes[j];
      poly = clipPoly(poly, p.a - q.a, p.b - q.b, p.c + off[i] - q.c - off[j]);
    }
    return poly.length >= 3 ? poly : null;
  });
}

function roofY(R, u, v, off) {
  let y = Infinity;
  R.planes.forEach((p, i) => {
    y = Math.min(y, p.a * u + p.b * v + p.c + off[i]);
  });
  return y;
}

function roofXZ(R, u, v) {
  return R.alongX ? [u, v] : [v, u];
}

function roofEdges(R) {
  const out = [];
  const seen = new Set();
  const [x0, z0] = R.dom[0];
  const [x1, z1] = R.dom[2];
  const onB = (a, b) => (Math.abs(a[0] - b[0]) < 1e-6 && (Math.abs(a[0] - x0) < 1e-6 || Math.abs(a[0] - x1) < 1e-6)) || (Math.abs(a[1] - b[1]) < 1e-6 && (Math.abs(a[1] - z0) < 1e-6 || Math.abs(a[1] - z1) < 1e-6));
  for (const poly of R.topR) {
    if (!poly) continue;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (onB(a, b) || Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) continue;
      const k = [a, b].map(q => q.map(v => Math.round(v * 1000)).join(",")).sort().join("|");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([a, b]);
    }
  }
  return out;
}

function roofMesh(R) {
  const pos = [];
  const nor = [];
  const uvs = [];
  const idx = [];
  const geo = new THREE.BufferGeometry();
  const zero = R.planes.map(() => 0);
  let start = 0;
  const addPoly = (pts, want, uvf) => {
    const n0 = pos.length / 3;
    const A = pts[0];
    const Bq = pts[1];
    const C = pts[2];
    const ab = [Bq[0] - A[0], Bq[1] - A[1], Bq[2] - A[2]];
    const ac = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    let nx = ab[1] * ac[2] - ab[2] * ac[1];
    let ny = ab[2] * ac[0] - ab[0] * ac[2];
    let nz = ab[0] * ac[1] - ab[1] * ac[0];
    const flip = nx * want[0] + ny * want[1] + nz * want[2] < 0;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx = (flip ? -nx : nx) / l;
    ny = (flip ? -ny : ny) / l;
    nz = (flip ? -nz : nz) / l;
    for (const p of pts) {
      pos.push(p[0], p[1], p[2]);
      nor.push(nx, ny, nz);
      const t = uvf(p);
      uvs.push(t[0], t[1]);
    }
    for (let i = 1; i < pts.length - 1; i++) {
      if (flip) idx.push(n0, n0 + i + 1, n0 + i);
      else idx.push(n0, n0 + i, n0 + i + 1);
    }
  };
  const surf = (regs, off, down) => {
    regs.forEach((poly, i) => {
      if (!poly) return;
      const p = R.planes[i];
      const gl = Math.hypot(p.a, p.b);
      const du = gl > 1e-6 ? -p.a / gl : 0;
      const dv = gl > 1e-6 ? -p.b / gl : 1;
      const cs = 1 / Math.sqrt(1 + gl * gl);
      const pts = poly.map(q => {
        const xz = roofXZ(R, q[0], q[1]);
        return [xz[0], p.a * q[0] + p.b * q[1] + p.c + off[i], xz[1], q[0], q[1]];
      });
      const uvf = pt => [pt[3] * dv - pt[4] * du, -(pt[3] * du + pt[4] * dv) / cs];
      addPoly(pts, down ? [0, -1, 0] : [0, 1, 0], uvf);
    });
    geo.addGroup(start, idx.length - start, down ? 1 : 0);
    start = idx.length;
  };
  surf(R.topR, R.off, false);
  surf(R.bot, zero, true);
  const sides = [[R.dom[0], R.dom[1], [0, 0, -1]], [R.dom[1], R.dom[2], [1, 0, 0]], [R.dom[2], R.dom[3], [0, 0, 1]], [R.dom[3], R.dom[0], [-1, 0, 0]]];
  for (const [P0, P1, nrm] of sides) {
    const ts = [0, 1];
    const du = P1[0] - P0[0];
    const dv = P1[1] - P0[1];
    for (const off of [zero, R.off]) {
      for (let i = 0; i < R.planes.length; i++) {
        for (let j = i + 1; j < R.planes.length; j++) {
          const a = R.planes[i].a - R.planes[j].a;
          const b = R.planes[i].b - R.planes[j].b;
          const c = R.planes[i].c + off[i] - R.planes[j].c - off[j];
          const den = a * du + b * dv;
          if (Math.abs(den) < 1e-9) continue;
          const t = -(a * P0[0] + b * P0[1] + c) / den;
          if (t > 1e-6 && t < 1 - 1e-6) ts.push(t);
        }
      }
    }
    ts.sort((a, b) => a - b);
    const want = R.alongX ? nrm : [nrm[2], 0, nrm[0]];
    for (let k = 0; k < ts.length - 1; k++) {
      const q = [ts[k], ts[k + 1]].map(t => [P0[0] + du * t, P0[1] + dv * t]);
      if (Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) < 1e-5) continue;
      const pts = [];
      for (const [u, v, off] of [[q[0][0], q[0][1], zero], [q[1][0], q[1][1], zero], [q[1][0], q[1][1], R.off], [q[0][0], q[0][1], R.off]]) {
        const xz = roofXZ(R, u, v);
        pts.push([xz[0], roofY(R, u, v, off), xz[1], u, v]);
      }
      addPoly(pts, want, pt => [Math.hypot(pt[3], pt[4]), pt[1]]);
    }
  }
  geo.addGroup(start, idx.length - start, 2);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

function roofInfill(rg, R, wl, mt) {
  const zero = R.planes.map(() => 0);
  const lines = [[R.A, [0, 1]], [-R.A, [0, 1]], [R.Bh, [1, 0]], [-R.Bh, [1, 0]]];
  lines.forEach(([c, dirv], li) => {
    const alongU = dirv[0] === 1;
    const half = alongU ? R.A : R.Bh;
    const at = s => (alongU ? [s, c] : [c, s]);
    const ts = [-half, half];
    for (let i = 0; i < R.planes.length; i++) {
      for (let j = i + 1; j < R.planes.length; j++) {
        const pi = R.planes[i];
        const pj = R.planes[j];
        const ka = alongU ? pi.a - pj.a : pi.b - pj.b;
        const kc = (alongU ? (pi.b - pj.b) * c : (pi.a - pj.a) * c) + pi.c - pj.c;
        if (Math.abs(ka) < 1e-9) continue;
        const s = -kc / ka;
        if (s > -half && s < half) ts.push(s);
      }
    }
    ts.sort((a, b) => a - b);
    const prof = ts.map(s => [s, roofY(R, ...at(s), zero)]);
    if (prof.every(q => q[1] < 0.02)) return;
    const sh = new THREE.Shape();
    sh.moveTo(-half, 0);
    for (const [s, y] of prof) sh.lineTo(s, Math.max(0, y));
    sh.lineTo(half, 0);
    const geo = new THREE.ExtrudeGeometry(sh, {depth: wl, bevelEnabled: false});
    const mesh = addMesh(rg, geo, mt);
    const worldX = alongU === R.alongX;
    if (worldX) mesh.position.z = c - (c > 0 ? wl : 0);
    else {
      mesh.rotation.y = -Math.PI / 2;
      mesh.position.x = c + (c > 0 ? 0 : wl);
    }
    mesh.userData.infill = li;
  });
}

function roofGutters(rg, R, topY, gut) {
  const zero = R.planes.map(() => 0);
  const [x0, z0] = R.dom[0];
  const [x1, z1] = R.dom[2];
  R.bot.forEach((poly, i) => {
    if (!poly) return;
    const p = R.planes[i];
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k];
      const b = poly[(k + 1) % poly.length];
      let out = null;
      if (Math.abs(a[0] - x0) < 1e-6 && Math.abs(b[0] - x0) < 1e-6) out = [-1, 0];
      else if (Math.abs(a[0] - x1) < 1e-6 && Math.abs(b[0] - x1) < 1e-6) out = [1, 0];
      else if (Math.abs(a[1] - z0) < 1e-6 && Math.abs(b[1] - z0) < 1e-6) out = [0, -1];
      else if (Math.abs(a[1] - z1) < 1e-6 && Math.abs(b[1] - z1) < 1e-6) out = [0, 1];
      if (!out) continue;
      const gl = Math.hypot(p.a, p.b);
      if (gl < 1e-6 || (-p.a * out[0] - p.b * out[1]) / gl < 0.7) continue;
      const ya = roofY(R, a[0], a[1], zero);
      const yb = roofY(R, b[0], b[1], zero);
      if (Math.abs(ya - yb) > 0.02) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.4) continue;
      const mu = (a[0] + b[0]) / 2 + out[0] * 0.07;
      const mv = (a[1] + b[1]) / 2 + out[1] * 0.07;
      const gy = ya - 0.05;
      const xz = roofXZ(R, mu, mv);
      const du = (b[0] - a[0]) / L;
      const dv = (b[1] - a[1]) / L;
      const dxz = roofXZ(R, du, dv);
      const gg = new THREE.CylinderGeometry(0.075, 0.075, L, 14, 1, true, Math.PI, Math.PI);
      const hold = new THREE.Group();
      hold.position.set(xz[0], gy, xz[1]);
      hold.rotation.y = Math.atan2(-dxz[1], dxz[0]);
      rg.add(hold);
      const gm = addMesh(hold, gg, gut);
      gm.rotation.z = Math.PI / 2;
      for (const end of [a, b]) {
        let pu;
        let pv;
        if (out[0] !== 0) {
          pu = out[0] * (R.A + 0.09);
          pv = clamp(end[1], -R.Bh + 0.25, R.Bh - 0.25);
        } else {
          pv = out[1] * (R.Bh + 0.09);
          pu = clamp(end[0], -R.A + 0.25, R.A - 0.25);
        }
        const reach = (out[0] !== 0 ? R.ou : R.ov) - 0.02;
        const pxz = roofXZ(R, pu, pv);
        const gxz = roofXZ(R, pu + out[0] * reach, pv + out[1] * reach);
        const kxz = roofXZ(R, pu + out[0] * 0.2, pv + out[1] * 0.2);
        Cy(rg, 0.045, -topY + 0.12, gy - 0.25, pxz[0], pxz[1], gut, 12);
        Lb(rg, [pxz[0], gy - 0.25, pxz[1]], [gxz[0], gy - 0.02, gxz[1]], 0.045, 0.045, gut, 12);
        Lb(rg, [pxz[0], -topY + 0.12, pxz[1]], [kxz[0], -topY + 0.02, kxz[1]], 0.045, 0.045, gut, 12);
      }
    }
  });
}

function roof3D(g, e, m) {
  const Hs = S.house;
  const wl = Hs.wall;
  const top = Hs.base + Hs.h;
  const Wo = e.maxX - e.minX + 2 * wl;
  const Do = e.maxY - e.minY + 2 * wl;
  const rg = new THREE.Group();
  rg.position.set((e.minX + e.maxX) / 2, top, (e.minY + e.maxY) / 2);
  rg.userData.pick = {t: "house"};
  g.add(rg);
  const snow = SKY.snowOn;
  if (Hs.roof === "flat") {
    B(rg, -Wo / 2 - 0.05, Wo / 2 + 0.05, 0, 0.25, -Do / 2 - 0.05, Do / 2 + 0.05, m(hk("trim", "roofedge")));
    const fa = m(hk("facade", "facade"));
    const pt = 0.14;
    B(rg, -Wo / 2 - 0.05, Wo / 2 + 0.05, 0.25, 0.62, -Do / 2 - 0.05, -Do / 2 - 0.05 + pt, fa);
    B(rg, -Wo / 2 - 0.05, Wo / 2 + 0.05, 0.25, 0.62, Do / 2 + 0.05 - pt, Do / 2 + 0.05, fa);
    B(rg, -Wo / 2 - 0.05, -Wo / 2 - 0.05 + pt, 0.25, 0.62, -Do / 2 - 0.05 + pt, Do / 2 + 0.05 - pt, fa);
    B(rg, Wo / 2 + 0.05 - pt, Wo / 2 + 0.05, 0.25, 0.62, -Do / 2 - 0.05 + pt, Do / 2 + 0.05 - pt, fa);
    const cp = m("sill_out");
    B(rg, -Wo / 2 - 0.08, Wo / 2 + 0.08, 0.62, 0.65, -Do / 2 - 0.08, -Do / 2 - 0.02 + pt, cp);
    B(rg, -Wo / 2 - 0.08, Wo / 2 + 0.08, 0.62, 0.65, Do / 2 + 0.02 - pt, Do / 2 + 0.08, cp);
    B(rg, -Wo / 2 - 0.08, -Wo / 2 - 0.02 + pt, 0.62, 0.65, -Do / 2 - 0.02 + pt, Do / 2 + 0.02 - pt, cp);
    B(rg, Wo / 2 + 0.02 - pt, Wo / 2 + 0.08, 0.62, 0.65, -Do / 2 - 0.02 + pt, Do / 2 + 0.02 - pt, cp);
    B(rg, -Wo / 2 + 0.09, Wo / 2 - 0.09, 0.25, 0.27, -Do / 2 + 0.09, Do / 2 - 0.09, m(snow ? "snow" : hk("roof", "membrane")));
    chimney3D(rg, e, 0.65, m);
    return;
  }
  const R = roofCalc();
  if (!R) return;
  const trim = m(hk("trim", "roofedge"));
  const mesh = addMesh(rg, roofMesh(R), [m(snow ? "snow" : hk("roof", "roof")), m(hk("soffit", "soffit")), trim]);
  mesh.userData.roof = true;
  roofInfill(rg, R, wl, m(hk("facade", "facade")));
  for (const [a, b] of roofEdges(R)) {
    const pa = roofXZ(R, a[0], a[1]);
    const pb = roofXZ(R, b[0], b[1]);
    const ya = roofY(R, a[0], a[1], R.off);
    const yb = roofY(R, b[0], b[1], R.off);
    Lb(rg, [pa[0], ya + 0.02, pa[1]], [pb[0], yb + 0.02, pb[1]], 0.07, 0.07, trim, 8);
  }
  if (Hs.gutters) roofGutters(rg, R, top, m(hk("gutter", "gutter")));
  chimney3D(rg, e, R.top, m);
}

function chimney3D(rg, e, roofTop, m) {
  const Hs = S.house;
  if (!Hs.chim) return;
  const cx = clamp(Hs.chx, e.minX + 0.3, e.maxX - 0.3) - (e.minX + e.maxX) / 2;
  const cz = clamp(Hs.chy, e.minY + 0.3, e.maxY - 0.3) - (e.minY + e.maxY) / 2;
  const y1 = roofTop + Hs.chh;
  const cm = m(hk("chimney", "brick"));
  B(rg, cx - 0.26, cx + 0.26, -0.05, y1, cz - 0.26, cz + 0.26, cm);
  B(rg, cx - 0.32, cx + 0.32, y1, y1 + 0.06, cz - 0.32, cz + 0.32, m("darkmetal"));
  Cy(rg, 0.09, y1 + 0.06, y1 + 0.28, cx, cz, m("steel"), 16);
}

function roofSVG() {
  const R = roofCalc();
  const e = ext();
  if (!R || !e) return "";
  const bcx = (e.minX + e.maxX) / 2;
  const bcy = (e.minY + e.maxY) / 2;
  const pt = (u, v) => {
    const xz = roofXZ(R, u, v);
    return [bcx + xz[0], bcy + xz[1]];
  };
  if (R.type === "flat") return "";
  const d = R.dom.map((q, i) => (i ? "L " : "M ") + pt(q[0], q[1]).join(" ")).join(" ") + " Z";
  let h = `<path d="${d}" fill="none" stroke="var(--ink-2)" stroke-width="${1 / k}" stroke-dasharray="${5 / k} ${3 / k}"/>`;
  for (const [a, b] of roofEdges(R)) {
    const A = pt(a[0], a[1]);
    const Bq = pt(b[0], b[1]);
    h += L2(A[0], A[1], Bq[0], Bq[1], "var(--ink-2)", 1.2);
  }
  return `<g pointer-events="none">${h}</g>`;
}
