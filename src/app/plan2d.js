"use strict";
const V2 = {plot: {z: 1, ox: 0, oy: 0}, house: {z: 1, ox: 0, oy: 0}};
let ghost2 = null;
let EXP = false;
let spaceDown = false;
const P2 = {ptrs: new Map(), pinch: null};

function baseBounds() {
  if ((drag || (typeof GZ !== "undefined" && GZ.drag)) && frozen) return frozen;
  let b;
  if (tab === "plot") {
    b = {x0: -3, y0: -3.5, x1: S.plot.w + 3, y1: S.plot.d + 3.5};
  } else {
    const e = ext() || {minX: 0, minY: 0, maxX: 10, maxY: 8};
    const m = S.house.wall + (EXP ? 2.2 : 3);
    b = {x0: e.minX - m, y0: e.minY - m, x1: e.maxX + m, y1: e.maxY + m};
  }
  frozen = b;
  return b;
}

function bounds() {
  const b = baseBounds();
  if (EXP) return b;
  const t = V2[tab];
  const cx = (b.x0 + b.x1) / 2 + t.ox;
  const cy = (b.y0 + b.y1) / 2 + t.oy;
  const hw = (b.x1 - b.x0) / 2 / t.z;
  const hh = (b.y1 - b.y0) / 2 / t.z;
  return {x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh};
}

function zoom2D(f, cx, cy) {
  const t = V2[tab];
  const nz = clamp(t.z * f, 0.35, 14);
  const ff = nz / t.z;
  if (Math.abs(ff - 1) < 1e-4) return;
  const b = bounds();
  const C = {x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2};
  const p = cx === undefined ? C : pt({clientX: cx, clientY: cy});
  t.ox += (p.x - C.x) * (1 - 1 / ff);
  t.oy += (p.y - C.y) * (1 - 1 / ff);
  t.z = nz;
  render2D();
}

function pan2D(dx, dy) {
  const t = V2[tab];
  t.ox -= dx / k;
  t.oy -= dy / k;
  render2D();
}

function fit2D() {
  V2[tab] = {z: 1, ox: 0, oy: 0};
  frozen = null;
  render2D();
}

function L2(x1, y1, x2, y2, stroke, w, dash) {
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${(w || 1) / k}"`;
  if (dash) s += ` stroke-dasharray="${dash[0] / k} ${dash[1] / k}"`;
  return s + "/>";
}

function R2(x, y, w, h, fill, stroke, sw, dash, op) {
  let s = `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${fill}"`;
  if (stroke) s += ` stroke="${stroke}" stroke-width="${(sw || 1) / k}"`;
  if (dash) s += ` stroke-dasharray="${dash[0] / k} ${dash[1] / k}"`;
  if (op) s += ` fill-opacity="${op}"`;
  return s + "/>";
}

function T2(x, y, s, o) {
  o = o || {};
  let a = `<text x="${x}" y="${y}" font-size="${(o.size || 12) / k}" fill="${o.fill || "var(--ink)"}" text-anchor="${o.anchor || "middle"}" dominant-baseline="middle" font-weight="${o.weight || 400}"`;
  if (o.rot) a += ` transform="rotate(${o.rot} ${x} ${y})"`;
  if (o.halo) a += ` paint-order="stroke" stroke="${o.halo}" stroke-width="${3 / k}" stroke-linejoin="round"`;
  return a + `>${esc(s)}</text>`;
}

function defs2() {
  return `<defs>
<pattern id="hz" patternUnits="userSpaceOnUse" width="0.5" height="0.5" patternTransform="rotate(45)"><rect width="0.5" height="0.5" fill="var(--land)"/><line x1="0" y1="0" x2="0" y2="0.5" stroke="var(--zone)" stroke-width="0.16"/></pattern>
<pattern id="hu" patternUnits="userSpaceOnUse" width="0.3" height="0.3" patternTransform="rotate(45)"><rect width="0.3" height="0.3" fill="var(--paper)"/><line x1="0" y1="0" x2="0" y2="0.3" stroke="var(--line-2)" stroke-width="0.05"/></pattern>
</defs>`;
}

function handles(r) {
  const s = 9 / k;
  const hs = 24 / k;
  const pts = {
    nw: [r.x, r.y], n: [r.x + r.w / 2, r.y], ne: [r.x + r.w, r.y], e: [r.x + r.w, r.y + r.d / 2],
    se: [r.x + r.w, r.y + r.d], s: [r.x + r.w / 2, r.y + r.d], sw: [r.x, r.y + r.d], w: [r.x, r.y + r.d / 2]
  };
  const cur = {nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize"};
  let h = "";
  for (const [dir, [x, y]] of Object.entries(pts)) {
    h += `<g data-t="h" data-h="${dir}" style="cursor:${cur[dir]}">`;
    h += `<rect x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" fill="transparent"/>`;
    h += R2(x - s / 2, y - s / 2, s, s, "var(--panel)", "var(--sel)", 1.5);
    h += "</g>";
  }
  return h;
}

function thingHandles(o) {
  const s = 9 / k;
  const hs = 22 / k;
  const w = o.w;
  const d = o.d;
  const pts = {nw: [-w / 2, -d / 2], n: [0, -d / 2], ne: [w / 2, -d / 2], e: [w / 2, 0], se: [w / 2, d / 2], s: [0, d / 2], sw: [-w / 2, d / 2], w: [-w / 2, 0]};
  let h = `<g transform="translate(${o.x + w / 2} ${o.y + d / 2}) rotate(${o.rot || 0})">`;
  h += R2(-w / 2, -d / 2, w, d, "none", "var(--sel)", 2);
  for (const [dir, [x, y]] of Object.entries(pts)) {
    h += `<g data-t="th" data-h="${dir}" style="cursor:pointer">`;
    h += `<rect x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" fill="transparent"/>`;
    h += R2(x - s / 2, y - s / 2, s, s, "var(--panel)", "var(--sel)", 1.5);
    h += "</g>";
  }
  const ry = -d / 2 - 26 / k;
  h += L2(0, -d / 2, 0, ry, "var(--sel)", 1.2);
  h += `<g data-t="rh" style="cursor:grab"><circle cx="0" cy="${ry}" r="${14 / k}" fill="transparent"/><circle cx="0" cy="${ry}" r="${6 / k}" fill="var(--panel)" stroke="var(--sel)" stroke-width="${1.6 / k}"/></g>`;
  return h + "</g>";
}

function dimLine(x1, y1, x2, y2, lbl, halo) {
  if (Math.hypot(x2 - x1, y2 - y1) < 0.05) return "";
  const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  let h = L2(x1, y1, x2, y2, "var(--sel)", 1, [4, 3]);
  h += `<circle cx="${x1}" cy="${y1}" r="${2.5 / k}" fill="var(--sel)"/><circle cx="${x2}" cy="${y2}" r="${2.5 / k}" fill="var(--sel)"/>`;
  h += T2(vertical ? mx + 5 / k : mx, vertical ? my : my - 9 / k, lbl, {fill: "var(--sel)", size: 11, weight: 500, anchor: vertical ? "start" : "middle", halo});
  return h;
}

function plotDims(r) {
  const P = S.plot;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.d / 2;
  let h = dimLine(0, cy, r.x, cy, fm(r.x) + " м", "var(--land)");
  h += dimLine(r.x + r.w, cy, P.w, cy, fm(P.w - r.x - r.w) + " м", "var(--land)");
  h += dimLine(cx, 0, cx, r.y, fm(r.y) + " м", "var(--land)");
  h += dimLine(cx, r.y + r.d, cx, P.d, fm(P.d - r.y - r.d) + " м", "var(--land)");
  return h;
}

function fitLabel(x, y, w, d, name, sub, fill, third) {
  const W = w * k;
  const H = d * k;
  const cx = x + w / 2;
  const cy = y + d / 2;
  const nw = name.length * 6.6 + 10;
  const aw = sub.length * 6.2 + 10;
  const tw = third ? third.length * 6.2 + 10 : 0;
  if (third && W >= Math.max(nw, aw, tw) && H >= 54) return T2(cx, cy - 15 / k, name, {fill, weight: 500}) + T2(cx, cy + 1 / k, sub, {fill, size: 11}) + T2(cx, cy + 16 / k, third, {fill, size: 10});
  if (W >= Math.max(nw, aw) && H >= 38) return T2(cx, cy - 8 / k, name, {fill, weight: 500}) + T2(cx, cy + 9 / k, sub, {fill, size: 11});
  if (H >= Math.max(nw, aw) && W >= 38) return T2(cx - 8 / k, cy, name, {fill, weight: 500, rot: -90}) + T2(cx + 9 / k, cy, sub, {fill, size: 11, rot: -90});
  if (W >= nw && H >= 20) return T2(cx, cy, name, {fill, weight: 500});
  if (H >= nw && W >= 20) return T2(cx, cy, name, {fill, weight: 500, rot: -90});
  if (W >= aw && H >= 18) return T2(cx, cy, sub, {fill, size: 11});
  if (H >= aw && W >= 18) return T2(cx, cy, sub, {fill, size: 11, rot: -90});
  return "";
}

function drawThing(o, t, live) {
  const md = modelOf(o);
  const plotBuild = t === "obj" && md.cat === "build";
  const tr = `translate(${o.x + o.w / 2} ${o.y + o.d / 2}) rotate(${o.rot || 0})`;
  let h = live ? `<g data-t="${t}" data-id="${esc(o.id)}" style="cursor:move">` : `<g pointer-events="none">`;
  h += `<g transform="${tr}">`;
  if (plotBuild) h += R2(-o.w / 2, -o.d / 2, o.w, o.d, FILL[md.g || "other"], "var(--ink-2)", 1) + (md.ops ? opsSym(o) : "");
  else h += sym2D(o);
  h += "</g>";
  if (plotBuild) {
    const b = thingBox(o);
    h += fitLabel(b.x, b.y, b.w, b.d, o.name, fm(o.w) + " × " + fm(o.d) + " м", INK[md.g || "other"]);
  }
  return h + "</g>";
}

function drawHouseOnPlot() {
  const f = footprint();
  if (!f) return "";
  const e = f.e;
  const wl = S.house.wall;
  const bcx = (e.minX + e.maxX) / 2;
  const bcy = (e.minY + e.maxY) / 2;
  let h = `<g data-t="house" style="cursor:move" transform="translate(${S.house.cx} ${S.house.cy}) rotate(${S.house.rot}) translate(${-bcx} ${-bcy})">`;
  h += R2(e.minX - wl, e.minY - wl, f.W + 2 * wl, f.D + 2 * wl, "var(--wall)");
  h += R2(e.minX, e.minY, f.W, f.D, "var(--paper)");
  for (const r of S.rooms) h += R2(r.x, r.y, r.w, r.d, FILL[grp(r)]);
  const ws = wallSegs();
  for (const s of ws.walls) h += s.o === "h" ? L2(s.a, s.c, s.b, s.c, "var(--wall)", 1.2) : L2(s.c, s.a, s.c, s.b, "var(--wall)", 1.2);
  for (const it of S.items) h += drawThing(it, "item", false);
  for (const d of S.doors) {
    if (d.kind !== "entry") continue;
    h += d.o === "h" ? L2(d.x - d.w / 2, d.y, d.x + d.w / 2, d.y, "var(--red)", 3) : L2(d.x, d.y - d.w / 2, d.x, d.y + d.w / 2, "var(--red)", 3);
  }
  h += roofSVG();
  h += "</g>";
  const z = zone();
  const inside = f.x >= z.x - 0.001 && f.y >= z.y - 0.001 && f.x + f.w <= z.x + z.w + 0.001 && f.y + f.d <= z.y + z.d + 0.001;
  if (!inside && !EXP) h += `<g pointer-events="none">${R2(f.x, f.y, f.w, f.d, "none", "var(--red)", 2.5)}</g>`;
  const area = S.rooms.reduce((s, r) => s + r.w * r.d, 0);
  h += `<g pointer-events="none">${T2(S.house.cx, S.house.cy, "Дом " + fa(area) + " м²", {weight: 600, halo: "var(--paper)"})}</g>`;
  return h;
}

function drawPlot() {
  const P = S.plot;
  let h = R2(0, 0, P.w, P.d, "var(--land)");
  for (let i = 1; i < P.w; i++) h += L2(i, 0, i, P.d, i % 5 ? "var(--line)" : "var(--line-2)", i % 5 ? 0.5 : 1);
  for (let j = 1; j < P.d; j++) h += L2(0, j, P.w, j, j % 5 ? "var(--line)" : "var(--line-2)", j % 5 ? 0.5 : 1);
  const z = zone();
  if (z.w > 0 && z.d > 0) h += R2(z.x, z.y, z.w, z.d, "url(#hz)", "var(--ink-2)", 1, [5, 4]);
  h += R2(0, 0, P.w, P.d, "none", "var(--ink)", 1.5);
  h += L2(0, P.d, P.w, P.d, "var(--red)", 3);
  h += T2(P.w / 2, P.d + 1.5, "красная линия, улица", {fill: "var(--red)", weight: 500});
  h += T2(P.w / 2, -1.5, fm(P.w) + " м", {fill: "var(--ink-2)"});
  h += T2(-1.5, P.d / 2, fm(P.d) + " м", {fill: "var(--ink-2)", rot: -90});
  const nr = S.site ? S.site.north : 0;
  const ncx = P.w + 1.7;
  const ncy = -1.9;
  const nrr = 0.9;
  const na = nr * Math.PI / 180;
  h += `<g pointer-events="none"><g transform="translate(${ncx} ${ncy}) rotate(${nr})"><circle r="${nrr}" fill="var(--panel)" stroke="var(--ink-2)" stroke-width="${1 / k}"/><path d="M 0 ${-nrr * 0.82} L ${nrr * 0.34} ${nrr * 0.4} L 0 ${nrr * 0.14} L ${-nrr * 0.34} ${nrr * 0.4} Z" fill="var(--red)"/></g>`;
  h += T2(ncx + Math.sin(na) * (nrr + 0.5), ncy - Math.cos(na) * (nrr + 0.5), "С", {fill: "var(--red)", weight: 600, size: 12, halo: "var(--land)"}) + "</g>";
  const flat = S.objects.filter(o => modelOf(o).h < 0.1 || ["path", "parking", "pool", "terrace", "beds", "flowers"].includes(o.kind));
  const rest = S.objects.filter(o => !flat.includes(o));
  for (const o of flat) h += drawThing(o, "obj", !EXP);
  h += drawHouseOnPlot();
  for (const o of rest) h += drawThing(o, "obj", !EXP);
  if (EXP) return h;
  let r = null;
  if (sel && sel.t === "obj") r = selItem();
  if (sel && sel.t === "house") r = footprint();
  if (r) {
    const b = sel.t === "obj" ? thingBox(r) : r;
    h += `<g pointer-events="none">${plotDims(b)}${sel.t === "house" ? R2(b.x, b.y, b.w, b.d, "none", "var(--sel)", 2.5) : ""}</g>`;
  }
  if (sel && sel.t === "obj" && r) h += thingHandles(r);
  h += ghostSVG();
  return h;
}

function outerDims(e) {
  const wl = S.house.wall;
  const x0 = e.minX - wl;
  const y0 = e.minY - wl;
  const x1 = e.maxX + wl;
  const y1 = e.maxY + wl;
  const ty = y0 - 1;
  const lx = x0 - 1;
  const t = 0.2;
  let h = L2(x0, ty, x1, ty, "var(--ink-2)") + L2(x0, ty - t, x0, ty + t, "var(--ink-2)") + L2(x1, ty - t, x1, ty + t, "var(--ink-2)");
  h += T2((x0 + x1) / 2, ty - 9 / k, fm(x1 - x0) + " м снаружи", {fill: "var(--ink-2)", size: 11, halo: "var(--panel)"});
  h += L2(lx, y0, lx, y1, "var(--ink-2)") + L2(lx - t, y0, lx + t, y0, "var(--ink-2)") + L2(lx - t, y1, lx + t, y1, "var(--ink-2)");
  h += T2(lx - 9 / k, (y0 + y1) / 2, fm(y1 - y0) + " м снаружи", {fill: "var(--ink-2)", size: 11, halo: "var(--panel)", rot: -90});
  return h;
}

function streetLabel(e) {
  const wl = S.house.wall;
  const x0 = e.minX - wl;
  const y0 = e.minY - wl;
  const x1 = e.maxX + wl;
  const y1 = e.maxY + wl;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const o = 2.3;
  const st = {fill: "var(--red)", weight: 500};
  if (S.house.rot === 0) return T2(cx, y1 + o, "сторона улицы", st);
  if (S.house.rot === 90) return T2(x1 + o, cy, "сторона улицы", Object.assign({rot: 90}, st));
  if (S.house.rot === 180) return T2(cx, y0 - o, "сторона улицы", st);
  return T2(x0 - o, cy, "сторона улицы", Object.assign({rot: -90}, st));
}

function drawDoor(dr, L, isSel, ghost) {
  const g = doorGeo(dr, L);
  const col = ghost ? "var(--sel)" : isSel ? "var(--sel)" : L ? "var(--wall)" : "var(--red)";
  const ac = [g.sp[0], g.sp[1], dr.side > 0 ? g.sp[1] + dr.w : g.sp[0] - dr.w];
  const a0 = Math.min(...ac);
  const a1 = Math.max(...ac);
  const box = dr.o === "h" ? [g.p0, a0, g.p1 - g.p0, a1 - a0] : [a0, g.p0, a1 - a0, g.p1 - g.p0];
  let h = ghost || EXP ? `<g pointer-events="none"${ghost ? " opacity=\"0.8\"" : ""}>` : `<g data-t="door" data-id="${esc(dr.id)}" style="cursor:move">`;
  if (!ghost && !EXP) h += `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="transparent"/>`;
  if (ghost) h += dr.o === "h" ? R2(g.p0, g.sp[0], dr.w, g.sp[1] - g.sp[0], "var(--sel)", null, 0, null, 0.35) : R2(g.sp[0], g.p0, g.sp[1] - g.sp[0], dr.w, "var(--sel)", null, 0, null, 0.35);
  if (dr.kind === "door" || dr.kind === "entry") {
    h += doorSym(dr, g, col, isSel);
  } else {
    h += dr.o === "h"
      ? L2(g.p0, g.sp[0], g.p0, g.sp[1], col, 1) + L2(g.p1, g.sp[0], g.p1, g.sp[1], col, 1)
      : L2(g.sp[0], g.p0, g.sp[1], g.p0, col, 1) + L2(g.sp[0], g.p1, g.sp[1], g.p1, col, 1);
    if (dr.kind === "arch") {
      for (const c of g.sp) h += dr.o === "h" ? L2(g.p0, c, g.p1, c, col, 1, [4, 3]) : L2(c, g.p0, c, g.p1, col, 1, [4, 3]);
    }
  }
  if (isSel) {
    h += dr.o === "h" ? R2(g.p0, g.sp[0], dr.w, g.sp[1] - g.sp[0], "none", "var(--sel)", 2) : R2(g.sp[0], g.p0, g.sp[1] - g.sp[0], dr.w, "none", "var(--sel)", 2);
  }
  return h + "</g>";
}

function doorSym(dr, g, col, isSel) {
  const op = dr.op || "swing";
  const Q = (al, ac) => (dr.o === "h" ? [al, ac] : [ac, al]);
  const face = dr.side > 0 ? g.sp[1] : g.sp[0];
  const lw = dr.kind === "entry" ? 3.5 : 2.2;
  const swing = (ha, u, wd) => {
    const H = Q(ha, face);
    const Lf = Q(ha, face + dr.side * wd);
    const J = Q(ha + u * wd, face);
    const a1 = Math.atan2(Lf[1] - H[1], Lf[0] - H[0]);
    const a2 = Math.atan2(J[1] - H[1], J[0] - H[0]);
    let dA = a2 - a1;
    while (dA <= -Math.PI) dA += 2 * Math.PI;
    while (dA > Math.PI) dA -= 2 * Math.PI;
    const sw = dA > 0 ? 1 : 0;
    let t = `<path d="M ${H[0]} ${H[1]} L ${Lf[0]} ${Lf[1]} A ${wd} ${wd} 0 0 ${sw} ${J[0]} ${J[1]} Z" fill="${isSel ? "var(--sel)" : "var(--ink)"}" fill-opacity="${isSel ? 0.12 : 0.05}" stroke="none"/>`;
    t += `<path d="M ${Lf[0]} ${Lf[1]} A ${wd} ${wd} 0 0 ${sw} ${J[0]} ${J[1]}" fill="none" stroke="${col}" stroke-width="${1 / k}" stroke-dasharray="${3 / k} ${2 / k}"/>`;
    return t + L2(H[0], H[1], Lf[0], Lf[1], col, lw);
  };
  const seg = (a0, c0, a1, c1, w, dash) => {
    const A = Q(a0, c0);
    const Bq = Q(a1, c1);
    return L2(A[0], A[1], Bq[0], Bq[1], col, w, dash);
  };
  if (op === "swing") return swing(dr.hinge ? g.p1 : g.p0, dr.hinge ? -1 : 1, dr.w);
  if (op === "double") return swing(g.p0, 1, dr.w / 2) + swing(g.p1, -1, dr.w / 2);
  if (op === "slide" || op === "slide2") {
    const cf = face + dr.side * 0.05;
    const dir = dr.hinge ? 1 : -1;
    if (op === "slide") {
      const sh = dir * dr.w * 0.55;
      return seg(g.p0 + sh, cf, g.p1 + sh, cf, lw) + seg((g.p0 + g.p1) / 2, cf + dr.side * 0.12, (g.p0 + g.p1) / 2 + dir * dr.w * 0.45, cf + dr.side * 0.12, 1, [3, 2]);
    }
    const m = (g.p0 + g.p1) / 2;
    return seg(g.p0 - dr.w * 0.25, cf, m - dr.w * 0.25, cf, lw) + seg(m + dr.w * 0.25, cf, g.p1 + dr.w * 0.25, cf, lw);
  }
  if (op === "pocket") {
    const mid = (g.sp[0] + g.sp[1]) / 2;
    const dir = dr.hinge ? 1 : -1;
    const a0 = dir > 0 ? g.p1 : g.p0 - dr.w;
    return seg(g.p0, mid, g.p1, mid, lw) + seg(a0, mid, a0 + dr.w, mid, 1.2, [4, 3]);
  }
  const fold = (ha, u, wd) => {
    const pw = wd / 2;
    const ang = 50 * Math.PI / 180;
    const A = Q(ha, face);
    const Bq = Q(ha + u * pw * Math.cos(ang), face + dr.side * pw * Math.sin(ang));
    const C = Q(ha + u * 2 * pw * Math.cos(ang), face);
    return `<polyline points="${A[0]},${A[1]} ${Bq[0]},${Bq[1]} ${C[0]},${C[1]}" fill="none" stroke="${col}" stroke-width="${lw / k}" stroke-linejoin="round"/>`;
  };
  if (dr.w >= 1.2) return fold(g.p0, 1, dr.w / 2) + fold(g.p1, -1, dr.w / 2);
  return fold(dr.hinge ? g.p1 : g.p0, dr.hinge ? -1 : 1, dr.w);
}

function opsSym(o) {
  let t = "";
  for (const op of opsOf(o)) {
    const lim = Math.max(0, (op.side === "f" || op.side === "b" ? o.w : o.d) / 2 - op.w / 2 - 0.2);
    const c = clamp(op.c, -lim, lim);
    const a0 = c - op.w / 2;
    const a1 = c + op.w / 2;
    let p;
    if (op.side === "f") p = [a0, o.d / 2, a1, o.d / 2, 0, 1];
    else if (op.side === "b") p = [-a0, -o.d / 2, -a1, -o.d / 2, 0, -1];
    else if (op.side === "l") p = [-o.w / 2, a0, -o.w / 2, a1, -1, 0];
    else p = [o.w / 2, -a0, o.w / 2, -a1, 1, 0];
    const wd = op.kind === "gate" ? 4 : op.kind === "door" ? 3 : 1.5;
    t += L2(p[0], p[1], p[2], p[3], "var(--paper)", wd + 1.5) + L2(p[0], p[1], p[2], p[3], op.kind === "win" ? "var(--water)" : "var(--ink)", wd);
    if (op.kind !== "win") {
      const mx = (p[0] + p[2]) / 2;
      const my = (p[1] + p[3]) / 2;
      t += L2(mx, my, mx + p[4] * 0.45, my + p[5] * 0.45, "var(--ink)", 1, [2, 2]);
    }
  }
  return t;
}

function drawWin(wn, L, isSel, ghost) {
  const sp = span(L, across(wn));
  const p0 = along(wn) - wn.w / 2;
  const th = sp[1] - sp[0];
  const rc = wn.o === "h" ? {x: p0, y: sp[0], w: wn.w, d: th} : {x: sp[0], y: p0, w: th, d: wn.w};
  const col = ghost || isSel ? "var(--sel)" : L ? "var(--wall)" : "var(--red)";
  let h = ghost || EXP ? `<g pointer-events="none">` : `<g data-t="win" data-id="${esc(wn.id)}" style="cursor:move">`;
  const pad = 0.25;
  if (!ghost && !EXP) {
    h += wn.o === "h"
      ? `<rect x="${rc.x}" y="${rc.y - pad}" width="${rc.w}" height="${rc.d + 2 * pad}" fill="transparent"/>`
      : `<rect x="${rc.x - pad}" y="${rc.y}" width="${rc.w + 2 * pad}" height="${rc.d}" fill="transparent"/>`;
  }
  h += R2(rc.x, rc.y, rc.w, rc.d, ghost ? "var(--sel)" : "var(--panel)", col, isSel ? 2.2 : 1, null, ghost ? 0.35 : 0);
  for (const f of [0.38, 0.62]) {
    const c = sp[0] + th * f;
    h += wn.o === "h" ? L2(p0, c, p0 + wn.w, c, col, 1) : L2(c, p0, c, p0 + wn.w, col, 1);
  }
  return h + "</g>";
}

function drawHouse() {
  const b = bounds();
  let h = "";
  if (!EXP) {
    for (let x = Math.ceil(b.x0); x <= b.x1; x++) h += L2(x, b.y0, x, b.y1, "var(--line)", 0.5);
    for (let y = Math.ceil(b.y0); y <= b.y1; y++) h += L2(b.x0, y, b.x1, y, "var(--line)", 0.5);
  }
  const e = ext();
  if (!e) return h + T2((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, "Нарисуй первую комнату инструментом «Комната»", {fill: "var(--ink-2)", size: 13}) + ghostSVG();
  const wl = S.house.wall;
  const t = S.house.inner;
  const W = e.maxX - e.minX;
  const D = e.maxY - e.minY;
  h += R2(e.minX, e.minY, W, D, "url(#hu)");
  for (const r of S.rooms) {
    const g = grp(r);
    h += EXP ? "<g>" : `<g data-t="room" data-id="${esc(r.id)}" style="cursor:move">`;
    h += R2(r.x, r.y, r.w, r.d, FILL[g]);
    h += "</g>";
  }
  const ws = wallSegs();
  const sides = extSides(e);
  h += `<g pointer-events="none">`;
  for (const s of ws.soft) h += s.o === "h" ? L2(s.a, s.c, s.b, s.c, "var(--ink-2)", 1, [5, 4]) : L2(s.c, s.a, s.c, s.b, "var(--ink-2)", 1, [5, 4]);
  if (!EXP) {
    for (let i = 0; i < S.rooms.length; i++) {
      for (let j = i + 1; j < S.rooms.length; j++) {
        const a = S.rooms[i];
        const c = S.rooms[j];
        if (overlapArea(a, c) > 0.001) {
          const x = Math.max(a.x, c.x);
          const y = Math.max(a.y, c.y);
          h += R2(x, y, Math.min(a.x + a.w, c.x + c.w) - x, Math.min(a.y + a.d, c.y + c.d) - y, "var(--red)", null, 0, null, 0.45);
        }
      }
    }
  }
  h += "</g>";
  for (const it of S.items) h += drawThing(it, "item", !EXP);
  h += `<g pointer-events="none">`;
  for (const s of ws.walls) {
    const holes = S.doors.filter(d => onLine(d, s)).map(d => [along(d) - d.w / 2, along(d) + d.w / 2]);
    for (const piece of cut(s.a, s.b, holes)) {
      let a = piece[0];
      let bb = piece[1];
      if (near(a, s.a)) a -= t / 2;
      if (near(bb, s.b)) bb += t / 2;
      h += s.o === "h" ? R2(a, s.c - t / 2, bb - a, t, "var(--wall)") : R2(s.c - t / 2, a, t, bb - a, "var(--wall)");
    }
  }
  for (const s of sides) {
    const holes = S.doors.concat(S.windows).filter(d => onLine(d, s)).map(d => [along(d) - d.w / 2, along(d) + d.w / 2]);
    for (const [a, bb] of cut(s.a, s.b, holes)) {
      if (s.o === "h") h += R2(a, s.out > 0 ? s.c : s.c - wl, bb - a, wl, "var(--wall)");
      else h += R2(s.out > 0 ? s.c : s.c - wl, a, wl, bb - a, "var(--wall)");
    }
  }
  h += R2(e.minX - wl, e.minY - wl, wl, wl, "var(--wall)") + R2(e.maxX, e.minY - wl, wl, wl, "var(--wall)");
  h += R2(e.minX - wl, e.maxY, wl, wl, "var(--wall)") + R2(e.maxX, e.maxY, wl, wl, "var(--wall)");
  h += outerDims(e);
  if (!EXP) h += streetLabel(e);
  for (const r of S.rooms) h += fitLabel(r.x, r.y, r.w, r.d, r.name, fa(r.w * r.d) + " м²", INK[grp(r)], EXP ? fm(r.w) + " × " + fm(r.d) + " м" : "");
  h += "</g>";
  for (const wn of S.windows) h += drawWin(wn, lineOf(wn, ws, sides, true), !!(sel && sel.t === "win" && sel.id === wn.id));
  for (const dr of S.doors) h += drawDoor(dr, lineOf(dr, ws, sides, false), !!(sel && sel.t === "door" && sel.id === dr.id));
  if (EXP) return h;
  const s = sel && sel.t === "room" ? selItem() : null;
  if (s) {
    h += `<g pointer-events="none">`;
    h += R2(s.x, s.y, s.w, s.d, "none", "var(--sel)", 2.5);
    h += T2(s.x + s.w / 2, s.y - 9 / k, fm(s.w) + " м", {fill: "var(--sel)", size: 11, weight: 500, halo: "var(--paper)"});
    h += T2(s.x - 9 / k, s.y + s.d / 2, fm(s.d) + " м", {fill: "var(--sel)", size: 11, weight: 500, halo: "var(--paper)", rot: -90});
    h += "</g>";
    h += handles(s);
  }
  const it = sel && sel.t === "item" ? selItem() : null;
  if (it) {
    const bx = thingBox(it);
    h += `<g pointer-events="none">${T2(bx.x + bx.w / 2, bx.y - 12 / k, it.name + ", " + fm(it.w) + " × " + fm(it.d) + " м", {fill: "var(--sel)", size: 11, weight: 500, halo: "var(--paper)"})}</g>`;
    h += thingHandles(it);
  }
  h += ghostSVG();
  return h;
}

function ghostSVG() {
  if (!ghost2) return "";
  const g = ghost2;
  if (g.t === "rect") return `<g pointer-events="none">${R2(g.x, g.y, g.w, g.d, "var(--sel)", "var(--sel)", 1.5, [5, 3], 0.18)}${T2(g.x + g.w / 2, g.y + g.d / 2, fm(g.w) + " × " + fm(g.d) + " м", {fill: "var(--sel)", weight: 600, halo: "var(--paper)"})}</g>`;
  if (g.t === "open" && tab === "house") {
    const e = ext();
    if (!e || !g.it) return "";
    const ws = wallSegs();
    const sides = extSides(e);
    return "kind" in g.it ? drawDoor(g.it, lineOf(g.it, ws, sides, false), false, true) : drawWin(g.it, lineOf(g.it, ws, sides, true), false, true);
  }
  if (g.t === "thing") {
    const K = MODELS[g.kind] || MODELS.other;
    const o = {id: "ghost", kind: g.kind, w: K.w, d: K.d, h: K.h, x: g.x - K.w / 2, y: g.y - K.d / 2, rot: g.rot || 0};
    return `<g pointer-events="none" opacity="0.65">${drawThing(o, "ghost", false)}</g>`;
  }
  return "";
}

function render2D() {
  if (view === "3d") return;
  const b = bounds();
  const vw = b.x1 - b.x0;
  const vh = b.y1 - b.y0;
  svg.setAttribute("viewBox", `${b.x0} ${b.y0} ${vw} ${vh}`);
  const rect = svg.getBoundingClientRect();
  k = Math.min(rect.width / vw, rect.height / vh) || 20;
  svg.innerHTML = defs2() + (tab === "plot" ? drawPlot() : drawHouse());
  const z = $("#zlvl");
  if (z) z.textContent = Math.round(V2[tab].z * 100) + "%";
}

function pt(e) {
  const m = svg.getScreenCTM();
  if (!m) return {x: 0, y: 0};
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
}

function resizeRoom(dg, p, fine) {
  const MIN = 0.3;
  let {x, y, w, d} = dg.start;
  const sn = v => (fine ? r2(v) : snapv(v));
  const px = sn(p.x);
  const py = sn(p.y);
  const dir = dg.dir;
  if (dir.includes("e")) w = Math.max(MIN, r2(px - x));
  if (dir.includes("s")) d = Math.max(MIN, r2(py - y));
  if (dir.includes("w")) {
    const nx = Math.min(px, r2(x + w - MIN));
    w = r2(x + w - nx);
    x = nx;
  }
  if (dir.includes("n")) {
    const ny = Math.min(py, r2(y + d - MIN));
    d = r2(y + d - ny);
    y = ny;
  }
  const m2 = fine ? {x, y, w, d} : magnetRoom({x, y, w, d, id: dg.it.id}, dir);
  Object.assign(dg.it, {x: m2.x, y: m2.y, w: m2.w, d: m2.d});
}

function resizeThing(dg, p, fine) {
  const s = dg.start;
  const th = (s.rot || 0) * Math.PI / 180;
  const c = {x: s.x + s.w / 2, y: s.y + s.d / 2};
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const lx = dx * Math.cos(th) + dy * Math.sin(th);
  const ly = -dx * Math.sin(th) + dy * Math.cos(th);
  const sn = v => Math.max(0.05, fine ? r2(v) : snapv(v));
  let l0 = -s.w / 2;
  let l1 = s.w / 2;
  let t0 = -s.d / 2;
  let t1 = s.d / 2;
  const dir = dg.dir;
  if (dir.includes("e")) l1 = l0 + sn(lx - l0);
  if (dir.includes("w")) l0 = l1 - sn(l1 - lx);
  if (dir.includes("s")) t1 = t0 + sn(ly - t0);
  if (dir.includes("n")) t0 = t1 - sn(t1 - ly);
  const w = l1 - l0;
  const d = t1 - t0;
  const lc = (l0 + l1) / 2;
  const tc = (t0 + t1) / 2;
  const cx = c.x + lc * Math.cos(th) - tc * Math.sin(th);
  const cy = c.y + lc * Math.sin(th) + tc * Math.cos(th);
  dg.it.w = r2(w);
  dg.it.d = r2(d);
  dg.it.x = r2(cx - w / 2);
  dg.it.y = r2(cy - d / 2);
}

function toolPoint2(p) {
  if (tab === "house") {
    const e = ext();
    const inside = e && p.x > e.minX && p.x < e.maxX && p.y > e.minY && p.y < e.maxY;
    const w = houseToWorld(p.x, p.y);
    return {inHouse: inside || !e, wx: w.x, wz: w.z, hp: p};
  }
  const f = footprint();
  let inside = false;
  let hp = null;
  if (f) {
    hp = worldToHouse(p.x, p.y);
    const e = f.e;
    inside = hp.x > e.minX && hp.x < e.maxX && hp.y > e.minY && hp.y < e.maxY;
  }
  return {inHouse: inside, wx: p.x, wz: p.y, hp};
}

function toolHover2(p) {
  if (!tool) return;
  if (tool.t === "open") {
    if (tab !== "house") {
      ghost2 = null;
      return;
    }
    ghost2 = {t: "open", it: openingAt(tool.kind, p, 1.5)};
  } else if (tool.t === "thing") {
    const tp = toolPoint2(p);
    if (tab === "house" && tp.inHouse) ghost2 = {t: "thing", kind: tool.kind, x: p.x, y: p.y, rot: 0};
    else if (tab === "house") ghost2 = {t: "thing", kind: tool.kind, x: p.x, y: p.y, rot: -S.house.rot};
    else ghost2 = {t: "thing", kind: tool.kind, x: p.x, y: p.y, rot: tp.inHouse ? S.house.rot : 0};
  } else if (tool.t === "room" && !drag) {
    ghost2 = null;
  }
  render2D();
}

svg.addEventListener("pointerdown", e => {
  P2.ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (P2.ptrs.size === 2) {
    const [a, b] = [...P2.ptrs.values()];
    P2.pinch = {d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
    if (drag && drag.moved) endDrag();
    drag = {type: "pinch", moved: true};
    return;
  }
  const panBtn = e.button === 1 || e.button === 2 || (e.button === 0 && spaceDown);
  if (panBtn) {
    drag = {type: "pan", lx: e.clientX, ly: e.clientY, moved: false};
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  const p = pt(e);
  if (tool) {
    if (tool.t === "room") {
      if (tab !== "house") {
        tab = "house";
        renderAll();
        return;
      }
      drag = {type: "newroom", p0: {x: snapv(p.x), y: snapv(p.y)}, moved: false};
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else {
      drag = {type: "place", sx: e.clientX, sy: e.clientY, moved: false};
      svg.setPointerCapture(e.pointerId);
    }
    return;
  }
  const t = e.target.closest("[data-t]");
  if (!t) {
    drag = {type: "pan", lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, click: true};
    svg.setPointerCapture(e.pointerId);
    return;
  }
  bounds();
  const kind = t.dataset.t;
  if (kind === "h") {
    const it = selItem();
    if (!it) return;
    drag = {type: "resize", dir: t.dataset.h, it, start: {x: it.x, y: it.y, w: it.w, d: it.d}, p0: p, moved: false};
  } else if (kind === "th") {
    const it = selItem();
    if (!it) return;
    drag = {type: "tresize", dir: t.dataset.h, it, start: Object.assign({}, it), p0: p, moved: false};
  } else if (kind === "rh") {
    const it = selItem();
    if (!it) return;
    drag = {type: "trot", it, start: Object.assign({}, it), p0: p, moved: false};
  } else if (kind === "room" || kind === "obj" || kind === "item") {
    sel = {t: kind, id: t.dataset.id};
    const it = selItem();
    if (!it) return;
    const att = kind === "room" ? attachedTo(it).concat(itemsIn(it)).map(a => ({a, x: a.x, y: a.y})) : [];
    drag = {type: "move", it, start: {x: it.x, y: it.y, w: it.w, d: it.d}, att, p0: p, moved: false};
  } else if (kind === "door" || kind === "win") {
    sel = {t: kind, id: t.dataset.id};
    const it = selItem();
    if (!it) return;
    drag = {type: "slide", it, win: kind === "win", p0: p, moved: false};
  } else if (kind === "house") {
    sel = {t: "house"};
    drag = {type: "house", start: {x: S.house.cx, y: S.house.cy}, p0: p, moved: false};
  }
  svg.setPointerCapture(e.pointerId);
  e.preventDefault();
  renderAll();
});

svg.addEventListener("pointermove", e => {
  if (P2.ptrs.has(e.pointerId)) P2.ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (!drag) {
    if (tool) toolHover2(pt(e));
    return;
  }
  if (drag.type === "pinch") {
    if (P2.ptrs.size < 2) return;
    const [a, b] = [...P2.ptrs.values()];
    const ps = {d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
    pan2D(ps.mx - P2.pinch.mx, ps.my - P2.pinch.my);
    zoom2D(ps.d / P2.pinch.d, ps.mx, ps.my);
    P2.pinch = ps;
    return;
  }
  if (drag.type === "pan") {
    const dx = e.clientX - drag.lx;
    const dy = e.clientY - drag.ly;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    if (!drag.moved && drag.click && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
    drag.moved = true;
    pan2D(dx, dy);
    return;
  }
  const p = pt(e);
  if (drag.type === "place") {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    toolHover2(p);
    return;
  }
  if (drag.type === "newroom") {
    const x1 = snapv(p.x);
    const y1 = snapv(p.y);
    ghost2 = {t: "rect", x: Math.min(drag.p0.x, x1), y: Math.min(drag.p0.y, y1), w: r2(Math.abs(x1 - drag.p0.x)), d: r2(Math.abs(y1 - drag.p0.y))};
    drag.moved = true;
    render2D();
    return;
  }
  const dx = p.x - drag.p0.x;
  const dy = p.y - drag.p0.y;
  if (!drag.moved && Math.hypot(dx, dy) * k < 3) return;
  drag.moved = true;
  const fine = e.altKey;
  const sn = v => (fine ? r2(v) : snapv(v));
  if (drag.type === "move") {
    let nx = sn(drag.start.x + dx);
    let ny = sn(drag.start.y + dy);
    if (sel && sel.t === "room" && !fine) {
      const m2 = magnetRoom({x: nx, y: ny, w: drag.start.w, d: drag.start.d, id: drag.it.id}, "move");
      nx = m2.x;
      ny = m2.y;
    }
    drag.it.x = nx;
    drag.it.y = ny;
    const mx = drag.it.x - drag.start.x;
    const my = drag.it.y - drag.start.y;
    for (const a of drag.att) {
      a.a.x = r2(a.x + mx);
      a.a.y = r2(a.y + my);
    }
  } else if (drag.type === "house") {
    S.house.cx = sn(drag.start.x + dx);
    S.house.cy = sn(drag.start.y + dy);
  } else if (drag.type === "slide") {
    snapToWall(drag.it, p, drag.win);
  } else if (drag.type === "resize") {
    resizeRoom(drag, p, fine);
  } else if (drag.type === "tresize") {
    resizeThing(drag, p, fine);
  } else if (drag.type === "trot") {
    const cx = drag.start.x + drag.start.w / 2;
    const cy = drag.start.y + drag.start.d / 2;
    const a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
    const st = fine ? 1 : 15;
    drag.it.rot = normDeg(Math.round(a / st) * st);
  }
  render2D();
  updateLive();
  if (!syncThing3D()) schedule3D();
});

function endDrag(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.type === "pinch") {
    frozen = null;
    return;
  }
  if (d.type === "pan") {
    if (d.click && !d.moved && sel) {
      sel = null;
      renderAll();
    }
    return;
  }
  if (d.type === "newroom") {
    const g = ghost2;
    ghost2 = null;
    if (g && g.t === "rect" && g.w >= 0.5 && g.d >= 0.5) placeRoom(g, e && e.shiftKey, e && e.altKey);
    else render2D();
    return;
  }
  if (d.type === "place") {
    if (d.moved || !e) return;
    const p = pt(e);
    if (tool && tool.t === "open") {
      if (tab !== "house") {
        tab = "house";
        renderAll();
        return;
      }
      const it = openingAt(tool.kind, p, 1.5);
      ghost2 = null;
      if (it) placeOpening(it, e.shiftKey);
      else setStatus("Здесь нет стены, кликни ближе к стене");
    } else if (tool && tool.t === "thing") {
      const tp = toolPoint2(p);
      ghost2 = null;
      dropThing(tool.kind, tp.wx, tp.wz, tp.inHouse, e.shiftKey);
    }
    return;
  }
  frozen = null;
  if (d.moved) changed();
  else renderAll();
}

svg.addEventListener("pointerup", e => {
  P2.ptrs.delete(e.pointerId);
  if (drag && drag.type === "pinch") {
    if (P2.ptrs.size === 0) endDrag(e);
    return;
  }
  endDrag(e);
});

svg.addEventListener("pointercancel", e => {
  P2.ptrs.delete(e.pointerId);
  endDrag(null);
});

svg.addEventListener("pointerleave", () => {
  if (!drag && ghost2) {
    ghost2 = null;
    render2D();
  }
});

svg.addEventListener("contextmenu", e => e.preventDefault());

svg.addEventListener("wheel", e => {
  e.preventDefault();
  const kind = wheelKind(e);
  if (kind === "pinch") zoom2D(Math.exp(-e.deltaY * 0.012), e.clientX, e.clientY);
  else if (kind === "mouse") zoom2D(Math.exp(-clamp(e.deltaY, -300, 300) * 0.0018), e.clientX, e.clientY);
  else pan2D(-e.deltaX, -e.deltaY);
}, {passive: false});

svg.addEventListener("gesturestart", e => {
  e.preventDefault();
  P2.gs = e.scale || 1;
});

svg.addEventListener("gesturechange", e => {
  e.preventDefault();
  const f = (e.scale || 1) / (P2.gs || 1);
  P2.gs = e.scale || 1;
  zoom2D(f, e.clientX, e.clientY);
});

if (window.ResizeObserver) {
  new ResizeObserver(() => {
    if (!drag) frozen = null;
    render2D();
  }).observe(svg);
}
