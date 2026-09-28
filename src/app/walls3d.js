"use strict";
const WF = {facade: 0, inner: 1, top: 2, cut: 3};

function wallSolid(boxes, holes, cfg) {
  const q = v => Math.round(v * 1000) / 1000;
  const sx = new Set();
  const sy = new Set();
  const sz = new Set();
  const norm = b => [Math.min(b[0], b[1]), Math.max(b[0], b[1]), Math.min(b[2], b[3]), Math.max(b[2], b[3]), Math.min(b[4], b[5]), Math.max(b[4], b[5])].map(q);
  const bs = boxes.map(norm).filter(b => b[1] - b[0] > 0.0005 && b[3] - b[2] > 0.0005 && b[5] - b[4] > 0.0005);
  const hs = holes.map(norm).filter(b => b[1] - b[0] > 0.0005 && b[3] - b[2] > 0.0005 && b[5] - b[4] > 0.0005);
  if (!bs.length) return null;
  for (const b of bs.concat(hs)) {
    sx.add(b[0]);
    sx.add(b[1]);
    sy.add(b[2]);
    sy.add(b[3]);
    sz.add(b[4]);
    sz.add(b[5]);
  }
  const cut = cfg.cut || null;
  if (cut) (cut.axis === "x" ? sx : cut.axis === "y" ? sy : sz).add(q(cut.at));
  const X = [...sx].sort((a, b) => a - b);
  const Y = [...sy].sort((a, b) => a - b);
  const Z = [...sz].sort((a, b) => a - b);
  const nx = X.length - 1;
  const ny = Y.length - 1;
  const nz = Z.length - 1;
  if (nx < 1 || ny < 1 || nz < 1) return null;
  const IX = new Map(X.map((v, i) => [v, i]));
  const IY = new Map(Y.map((v, i) => [v, i]));
  const IZ = new Map(Z.map((v, i) => [v, i]));
  const cells = new Uint8Array(nx * ny * nz);
  const at = (i, j, kk) => (kk * nz + j) * nx + i;
  const get = (i, j, kk) => (i < 0 || j < 0 || kk < 0 || i >= nx || j >= nz || kk >= ny ? 0 : cells[at(i, j, kk)]);
  const paint = (b, v) => {
    const i0 = IX.get(b[0]);
    const i1 = IX.get(b[1]);
    const k0 = IY.get(b[2]);
    const k1 = IY.get(b[3]);
    const j0 = IZ.get(b[4]);
    const j1 = IZ.get(b[5]);
    for (let kk = k0; kk < k1; kk++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) cells[at(i, j, kk)] = v;
  };
  for (const b of bs) paint(b, 1);
  for (const b of hs) paint(b, 0);
  if (cut) {
    const A = cut.axis === "x" ? X : cut.axis === "y" ? Y : Z;
    const gone = [];
    for (let i = 0; i < A.length - 1; i++) {
      const c = (A[i] + A[i + 1]) / 2;
      gone.push((cut.keep < 0 && c > cut.at) || (cut.keep > 0 && c < cut.at));
    }
    for (let kk = 0; kk < ny; kk++) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const idx = cut.axis === "x" ? i : cut.axis === "y" ? kk : j;
      if (gone[idx]) cells[at(i, j, kk)] = 0;
    }
  }
  const inn = cfg.inner;
  const eps = 0.0002;
  const outside = (x, z) => x < inn.x0 - eps || x > inn.x1 + eps || z < inn.z0 - eps || z > inn.z1 + eps;
  const cls = (axis, sgn, c, um, vm) => {
    if (cut && ((cut.axis === "x" && axis === 0) || (cut.axis === "y" && axis === 1) || (cut.axis === "z" && axis === 2)) && Math.abs(c - cut.at) < 0.0005 && sgn === (cut.keep < 0 ? 1 : -1)) return WF.cut;
    if (axis === 1) {
      if (sgn > 0) return WF.top;
      if (Math.abs(c - cfg.y0) < 0.0005) return -1;
      return outside(um, vm) ? WF.facade : WF.inner;
    }
    if (axis === 0) return outside(c + sgn * 0.001, um) ? WF.facade : side(c + sgn * 0.02, um);
    return outside(um, c + sgn * 0.001) ? WF.facade : side(um, c + sgn * 0.02);
  };
  const side = (x, z) => {
    if (!cfg.room) return WF.inner;
    const gi = cfg.room(x, z);
    return gi >= 0 ? gi : WF.inner;
  };
  const groups = [];
  const emit = (axis, sgn, c, u0, u1, v0, v1, cl) => {
    if (!groups[cl]) groups[cl] = [];
    groups[cl].push([axis, sgn, c, u0, u1, v0, v1]);
  };
  const dims = [[nx, nz, ny], [ny, nx, nz], [nz, nx, ny]];
  const coords = [[X, Z, Y], [Y, X, Z], [Z, X, Y]];
  for (let axis = 0; axis < 3; axis++) {
    const [np, nu, nv] = dims[axis];
    const [P, U, Vv] = coords[axis];
    const mask = new Int8Array(nu * nv);
    for (let p = 0; p <= np; p++) {
      let any = false;
      for (let v = 0; v < nv; v++) {
        for (let u = 0; u < nu; u++) {
          let a;
          let b;
          if (axis === 0) {
            a = get(p - 1, u, v);
            b = get(p, u, v);
          } else if (axis === 1) {
            a = get(u, v, p - 1);
            b = get(u, v, p);
          } else {
            a = get(u, p - 1, v);
            b = get(u, p, v);
          }
          let code = 0;
          if (a && !b) code = 1;
          else if (!a && b) code = -1;
          if (code) {
            const cl = cls(axis, code, P[p], (U[u] + U[u + 1]) / 2, (Vv[v] + Vv[v + 1]) / 2);
            code = cl < 0 ? 0 : code * (cl + 1);
            if (code) any = true;
          }
          mask[u + v * nu] = code;
        }
      }
      if (!any) continue;
      for (let v = 0; v < nv; v++) {
        for (let u = 0; u < nu;) {
          const c = mask[u + v * nu];
          if (!c) {
            u++;
            continue;
          }
          let w = 1;
          while (u + w < nu && mask[u + w + v * nu] === c) w++;
          let h = 1;
          grow: while (v + h < nv) {
            for (let t = 0; t < w; t++) if (mask[u + t + (v + h) * nu] !== c) break grow;
            h++;
          }
          emit(axis, Math.sign(c), P[p], U[u], U[u + w], Vv[v], Vv[v + h], Math.abs(c) - 1);
          for (let dv = 0; dv < h; dv++) for (let t = 0; t < w; t++) mask[u + t + (v + dv) * nu] = 0;
          u += w;
        }
      }
    }
  }
  const pos = [];
  const nor = [];
  const uvs = [];
  const idx = [];
  const geo = new THREE.BufferGeometry();
  let start = 0;
  for (let cl = 0; cl < groups.length; cl++) {
    const list = groups[cl];
    if (!list || !list.length) continue;
    for (const [axis, sgn, c, u0, u1, v0, v1] of list) {
      const n0 = pos.length / 3;
      const corners = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      for (const [u, v] of corners) {
        if (axis === 0) pos.push(c, v, u);
        else if (axis === 1) pos.push(u, c, v);
        else pos.push(u, v, c);
        nor.push(axis === 0 ? sgn : 0, axis === 1 ? sgn : 0, axis === 2 ? sgn : 0);
        uvs.push(u, v);
      }
      const flip = axis === 2 ? sgn < 0 : sgn > 0;
      if (flip) idx.push(n0, n0 + 2, n0 + 1, n0, n0 + 3, n0 + 2);
      else idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
    }
    geo.addGroup(start, idx.length - start, cl);
    start = idx.length;
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
