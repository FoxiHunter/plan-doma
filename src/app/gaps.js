"use strict";
const GAP = {sig: "", edit: null};

function gapFaces() {
  const e = ext();
  const out = [];
  if (!e) return out;
  const t = S.house.inner / 2;
  for (const L of wallSegs().walls) for (const s of [-1, 1]) out.push({o: L.o, c: L.c + s * t, a: L.a, b: L.b});
  for (const L of extSides(e)) out.push({o: L.o, c: L.c, a: L.a, b: L.b});
  return out;
}

function gapRay(x, y, dx, dy, faces) {
  let best = Infinity;
  for (const f of faces) {
    if (dx && f.o === "v") {
      const d = (f.c - x) * dx;
      if (d > -0.005 && d < best && y >= f.a - 1e-6 && y <= f.b + 1e-6) best = d;
    } else if (dy && f.o === "h") {
      const d = (f.c - y) * dy;
      if (d > -0.005 && d < best && x >= f.a - 1e-6 && x <= f.b + 1e-6) best = d;
    }
  }
  return best < 40 ? Math.max(0, best) : null;
}

function gapBox(t, it) {
  if (t === "house") return footprint();
  return it ? thingBox(it) : null;
}

function gapsOf(t, it) {
  const b = gapBox(t, it);
  if (!b) return [];
  const cx = b.x + b.w / 2;
  const cy = b.y + b.d / 2;
  const starts = [["l", b.x, cy, -1, 0], ["r", b.x + b.w, cy, 1, 0], ["u", cx, b.y, 0, -1], ["d", cx, b.y + b.d, 0, 1]];
  const out = [];
  if (t === "item") {
    const F = gapFaces();
    for (const [dir, x, y, dx, dy] of starts) {
      const v = gapRay(x, y, dx, dy, F);
      if (v !== null) out.push({dir, x1: x, y1: y, x2: x + dx * v, y2: y + dy * v, v});
    }
  } else {
    const P = S.plot;
    const lim = {l: b.x, r: P.w - b.x - b.w, u: b.y, d: P.d - b.y - b.d};
    for (const [dir, x, y, dx, dy] of starts) {
      const v = Math.max(0, lim[dir]);
      out.push({dir, x1: x, y1: y, x2: x + dx * v, y2: y + dy * v, v});
    }
  }
  return out;
}

function gapTarget() {
  if (!sel || selIds()) return null;
  if (sel.t === "house") return footprint() ? {t: "house", it: null} : null;
  if (sel.t === "item" && tab === "house") return {t: "item", it: selItem()};
  if (sel.t === "obj" && tab === "plot") return {t: "obj", it: selItem()};
  return null;
}

function gapPill(x, y, text, dir, anchorLeft) {
  const w = (text.length * 6.6 + 14) / k;
  const h = 18 / k;
  const x0 = anchorLeft ? x : x - w / 2;
  return `<g data-t="gap" data-dir="${dir}" style="cursor:text"><rect x="${x0}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="var(--panel)" stroke="var(--sel)" stroke-width="${1 / k}"/>` +
    T2(x0 + w / 2, y + 0.5 / k, text, {fill: "var(--sel)", size: 11, weight: 600}) + "</g>";
}

function gapsSVG(t, it) {
  let lines = "";
  let pills = "";
  for (const g of gapsOf(t, it)) {
    if (g.v < 0.005 && t === "item") continue;
    const vert = g.dir === "u" || g.dir === "d";
    lines += L2(g.x1, g.y1, g.x2, g.y2, "var(--sel)", 1, [4, 3]);
    lines += `<circle cx="${g.x2}" cy="${g.y2}" r="${2.5 / k}" fill="var(--sel)"/>`;
    if (g.v * k < 26) continue;
    const mx = (g.x1 + g.x2) / 2;
    const my = (g.y1 + g.y2) / 2;
    pills += gapPill(vert ? mx + 6 / k : mx, vert ? my : my - 12 / k, fm(g.v), g.dir, vert);
  }
  return `<g pointer-events="none">${lines}</g>${pills}`;
}

function gap3Segs(t, it) {
  const out = [];
  const Hs = S.house;
  const inHouse = t === "item";
  const y = inHouse ? Hs.base + (it.z || 0) + Math.max(0.02, it.h / 2) : t === "house" ? 0.08 : Math.min(1.2, (it.z || 0) + Math.max(0.05, it.h / 2));
  const W = (x, z) => {
    const p = inHouse ? houseToWorld(x, z) : {x, z};
    return [p.x, p.z];
  };
  for (const g of gapsOf(t, it)) {
    if (g.v < 0.005 && inHouse) continue;
    const [ax, az] = W(g.x1, g.y1);
    const [bx, bz] = W(g.x2, g.y2);
    out.push({dir: g.dir, a: new THREE.Vector3(ax, y, az), b: new THREE.Vector3(bx, y, bz), v: g.v});
  }
  if (inHouse && (it.z || 0) > 0.01) {
    const b = thingBox(it);
    const [cx, cz] = W(b.x + b.w / 2, b.y + b.d / 2);
    const z0 = Hs.base + it.z;
    out.push({dir: "f", a: new THREE.Vector3(cx, z0, cz), b: new THREE.Vector3(cx, Hs.base, cz), v: it.z});
    const top = z0 + it.h;
    const ceil = Hs.base + Hs.h;
    if (top < ceil - 0.005) out.push({dir: "c", a: new THREE.Vector3(cx, top, cz), b: new THREE.Vector3(cx, ceil, cz), v: ceil - top});
  }
  return out;
}

function gaps3Sync() {
  const el = document.getElementById("gaps3");
  if (!el || !V.ok) return;
  const T = !V.walk && !V.hq && visible3D() ? gapTarget() : null;
  let h = "";
  if (T && (T.it || T.t === "house")) {
    const rect = V.renderer.domElement.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const pr = (p, o) => {
      o.copy(p).project(V.camera);
      return o.z > 1 ? null : [(o.x + 1) / 2 * W, (1 - o.y) / 2 * H];
    };
    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    let pills = "";
    for (const s of gap3Segs(T.t, T.it)) {
      const a = pr(s.a, va);
      const b = pr(s.b, vb);
      if (!a || !b) continue;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 14) continue;
      h += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/><circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="3"/>`;
      const txt = fm(s.v);
      const w = txt.length * 7 + 16;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      pills += `<g class="gp" data-dir="${s.dir}"><rect x="${(mx - w / 2).toFixed(1)}" y="${(my - 10).toFixed(1)}" width="${w}" height="20" rx="10"/><text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}">${txt}</text></g>`;
    }
    h += pills;
  }
  if (h !== GAP.sig) {
    GAP.sig = h;
    el.innerHTML = h;
  }
}

function gapApply(t, it, dir, val) {
  if (!isFinite(val) || val < 0) return false;
  if (dir === "f" || dir === "c") {
    if (t !== "item") return false;
    const z = dir === "f" ? val : S.house.h - it.h - val;
    it.z = r2(clamp(z, 0, Math.max(0, S.house.h - it.h)));
    return true;
  }
  const g = gapsOf(t, it).find(q => q.dir === dir);
  if (!g) return false;
  const dv = val - g.v;
  const sx = dir === "l" ? dv : dir === "r" ? -dv : 0;
  const sy = dir === "u" ? dv : dir === "d" ? -dv : 0;
  if (t === "house") {
    S.house.cx = r2(S.house.cx + sx);
    S.house.cy = r2(S.house.cy + sy);
  } else {
    it.x = r2(it.x + sx);
    it.y = r2(it.y + sy);
  }
  return true;
}

function gapEdit(dir, cx, cy) {
  const T = gapTarget();
  if (!T) return;
  const inp = document.getElementById("gapin");
  if (!inp) return;
  let cur = null;
  if (dir === "f" || dir === "c") {
    const s = gap3Segs(T.t, T.it).find(q => q.dir === dir);
    cur = s ? s.v : null;
  } else {
    const g = gapsOf(T.t, T.it).find(q => q.dir === dir);
    cur = g ? g.v : null;
  }
  if (cur === null) return;
  GAP.edit = {t: T.t, id: T.it ? T.it.id : null, dir};
  inp.value = String(r2(cur)).replace(".", ",");
  inp.hidden = false;
  inp.style.left = Math.round(cx - 40) + "px";
  inp.style.top = Math.round(cy - 16) + "px";
  setTimeout(() => {
    inp.focus();
    inp.select();
  }, 0);
}

function gapCommit() {
  const inp = document.getElementById("gapin");
  const E = GAP.edit;
  GAP.edit = null;
  if (inp) inp.hidden = true;
  if (!E) return;
  const v = parseFloat(String(inp.value).replace(",", "."));
  const T = gapTarget();
  if (!T || T.t !== E.t || (T.it ? T.it.id : null) !== E.id) return;
  if (gapApply(T.t, T.it, E.dir, v)) changed();
}

function gapCancel() {
  GAP.edit = null;
  const inp = document.getElementById("gapin");
  if (inp) inp.hidden = true;
}

function gapInit() {
  const inp = document.getElementById("gapin");
  if (inp) {
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        gapCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        gapCancel();
      }
    });
    inp.addEventListener("blur", () => setTimeout(gapCancel, 0));
  }
  const el = document.getElementById("gaps3");
  if (el) el.addEventListener("pointerdown", e => {
    const g = e.target.closest(".gp");
    if (!g) return;
    e.preventDefault();
    e.stopPropagation();
    gapEdit(g.dataset.dir, e.clientX, e.clientY);
  });
}
