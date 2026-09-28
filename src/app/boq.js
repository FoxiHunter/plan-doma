"use strict";
const BOQ_PASS = new Set(["pass"]);

function boqMat(o, slot, def) {
  const s = o && o.mats && o.mats[slot];
  const k = s && s.m && MDEF[s.m] && MDEF[s.m].n ? s.m : def;
  return {k, n: MDEF[k] && MDEF[k].n ? MDEF[k].n : k};
}

function boqOnSide(it, o, c, a, b) {
  const v = o === "h" ? it.y : it.x;
  const u = o === "h" ? it.x : it.y;
  return it.o === o && near(v, c) && u > a - 0.01 && u < b + 0.01;
}

function boqOverlap(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function boqRoom(r, e, soft) {
  const Hs = S.house;
  const t = Hs.inner / 2;
  const sides = [
    {o: "h", c: r.y, a: r.x, b: r.x + r.w, ext: near(r.y, e.minY)},
    {o: "h", c: r.y + r.d, a: r.x, b: r.x + r.w, ext: near(r.y + r.d, e.maxY)},
    {o: "v", c: r.x, a: r.y, b: r.y + r.d, ext: near(r.x, e.minX)},
    {o: "v", c: r.x + r.w, a: r.y, b: r.y + r.d, ext: near(r.x + r.w, e.maxX)}
  ];
  const cw = r.w - (near(r.x, e.minX) ? 0 : t) - (near(r.x + r.w, e.maxX) ? 0 : t);
  const cd = r.d - (near(r.y, e.minY) ? 0 : t) - (near(r.y + r.d, e.maxY) ? 0 : t);
  let per = 2 * (cw + cd);
  let open = 0;
  let base = 0;
  for (const s of sides) {
    for (const q of soft) if (q.o === s.o && near(q.c, s.c)) per -= boqOverlap(q.a, q.b, s.a, s.b);
    for (const d of S.doors) {
      if (!boqOnSide(d, s.o, s.c, s.a, s.b)) continue;
      open += d.w * Hs.doorH;
      base += d.w;
    }
    for (const w of S.windows) {
      if (!boqOnSide(w, s.o, s.c, s.a, s.b)) continue;
      open += w.w * w.h;
      if (w.sill < 0.05) base += w.w;
    }
  }
  per = Math.max(0, per);
  return {area: cw * cd, per, wall: Math.max(0, per * Hs.h - open), base: Math.max(0, per - base)};
}

function boqRoof() {
  const R = roofCalc();
  if (!R) return null;
  const Hs = S.house;
  if (R.type === "flat") return {area: R.Wo * R.Do, plan: R.Wo * R.Do, ridge: 0, hips: 0, eaves: 2 * (R.Wo + R.Do), gables: 0, flat: true};
  const z = R.planes.map(() => 0);
  const shoe = poly => {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  };
  let area = 0;
  let plan = 0;
  R.bot.forEach((poly, i) => {
    if (!poly) return;
    const p = R.planes[i];
    const pa = shoe(poly);
    plan += pa;
    area += pa * Math.sqrt(1 + p.a * p.a + p.b * p.b);
  });
  let ridge = 0;
  let hips = 0;
  for (const [a, b] of roofEdges(R)) {
    const ya = roofY(R, a[0], a[1], R.off);
    const yb = roofY(R, b[0], b[1], R.off);
    const L = Math.hypot(a[0] - b[0], a[1] - b[1], ya - yb);
    if (Math.abs(ya - yb) < 0.02) ridge += L;
    else hips += L;
  }
  const [u0, v0] = R.dom[0];
  const [u1, v1] = R.dom[2];
  let low = Infinity;
  for (const [u, v] of R.dom) low = Math.min(low, roofY(R, u, v, z));
  let eaves = 0;
  const N = 200;
  for (const [a, b] of [[[u0, v0], [u1, v0]], [[u1, v0], [u1, v1]], [[u1, v1], [u0, v1]], [[u0, v1], [u0, v0]]]) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let n = 0;
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N;
      if (roofY(R, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z) < low + 0.003) n++;
    }
    eaves += L * n / N;
  }
  let gables = 0;
  const A = R.A;
  const B = R.Bh;
  for (const [a, b] of [[[-A, -B], [A, -B]], [[A, -B], [A, B]], [[A, B], [-A, B]], [[-A, B], [-A, -B]]]) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = 0;
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N;
      s += Math.max(0, roofY(R, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z));
    }
    gables += s / N * L;
  }
  return {area, plan, ridge, hips, eaves, gables, flat: false, gut: Hs.gutters};
}

function boqRows() {
  const rows = [];
  const add = (g, n, q, u) => {
    if (q > 0.004) rows.push([g, n, q, u]);
  };
  const e = ext();
  const Hs = S.house;
  if (e) {
    const W = e.maxX - e.minX;
    const D = e.maxY - e.minY;
    const wl = Hs.wall;
    const Wo = W + 2 * wl;
    const Do = D + 2 * wl;
    const ws = wallSegs();
    const sides = extSides(e);
    let extOpen = 0;
    let intOpen = 0;
    for (const d of S.doors) {
      const L = lineOf(d, ws, sides, false);
      if (L && L.ext) extOpen += d.w * Hs.doorH;
      else intOpen += d.w * Hs.doorH;
    }
    for (const w of S.windows) extOpen += w.w * w.h;
    const rf = boqRoof();
    const G = "Наружные стены";
    const Pmid = 2 * (W + wl + D + wl);
    const Pout = 2 * (Wo + Do);
    add(G, "Длина по оси стены", Pmid, "м");
    add(G, "Кладка без проёмов, до потолка", (Pmid * Hs.h - extOpen) * wl, "м³");
    if (rf && rf.gables > 0.01) add(G, "Кладка фронтонов", rf.gables * wl, "м³");
    add(G, "Проёмы в наружных стенах", extOpen, "м²");
    add(G, "Фасад без проёмов (" + boqMat(Hs, "facade", "facade").n + ")", Pout * Hs.h - extOpen + (rf ? rf.gables : 0), "м²");
    add(G, "Цоколь (" + boqMat(Hs, "plinth", "plinth").n + ")", Pout * Hs.base, "м²");
    const bw = 0.8;
    add(G, "Отмостка (" + boqMat(Hs, "blind", "paving").n + ")", (Wo + 2 * bw) * (Do + 2 * bw) - Wo * Do, "м²");
    const P = "Перегородки";
    const Lint = ws.walls.reduce((s, L) => s + L.b - L.a, 0);
    add(P, "Длина перегородок", Lint, "м");
    add(P, "Площадь без проёмов", Math.max(0, Lint * Hs.h - intOpen), "м²");
    add(P, "Объём", Math.max(0, Lint * Hs.h - intOpen) * Hs.inner, "м³");
    const floors = new Map();
    const walls = new Map();
    let ceil = 0;
    let base = 0;
    for (const r of S.rooms) {
      const q = boqRoom(r, e, ws.soft);
      const fm0 = boqMat(r, "floor", floorMat(r));
      const wm0 = boqMat(r, "wall", "plaster");
      floors.set(fm0.n, (floors.get(fm0.n) || 0) + q.area);
      walls.set(wm0.n, (walls.get(wm0.n) || 0) + q.wall);
      ceil += q.area;
      base += q.base;
    }
    for (const [n, q] of floors) add("Полы", n, q, "м²");
    add("Полы", "Плинтус без дверных проёмов", base, "м");
    for (const [n, q] of walls) add("Стены внутри", n, q, "м²");
    add("Потолки", boqMat(Hs, "ceiling", "plaster").n, ceil, "м²");
    const byW = new Map();
    let sills = 0;
    for (const w of S.windows) {
      const k = `${fm(w.w)} × ${fm(w.h)} м, ${WIN_OPS[w.op] || w.op}`.toLowerCase();
      byW.set(k, (byW.get(k) || 0) + 1);
      if (w.sill >= 0.05) sills += w.w;
    }
    for (const [k, n] of byW) add("Окна", "Окно " + k, n, "шт");
    add("Окна", "Площадь окон", S.windows.reduce((s, w) => s + w.w * w.h, 0), "м²");
    add("Окна", "Подоконники и отливы, длина", sills, "м");
    const KN = {entry: "Входная дверь", door: "Дверь", open: "Проём без двери", arch: "Арка"};
    const byD = new Map();
    for (const d of S.doors) {
      const k = `${KN[d.kind] || "Дверь"} ${fm(d.w)} × ${fm(Hs.doorH)} м`;
      byD.set(k, (byD.get(k) || 0) + 1);
    }
    for (const [k, n] of byD) add("Двери и проёмы", k, n, "шт");
    if (rf) {
      const R = "Крыша";
      add(R, rf.flat ? "Плоская кровля" : "Кровля по скатам со свесами (" + boqMat(Hs, "roof", "roof").n + ")", rf.area, "м²");
      if (!rf.flat) add(R, "Площадь крыши в плане", rf.plan, "м²");
      add(R, "Конёк", rf.ridge, "м");
      add(R, "Рёбра и ендовы", rf.hips, "м");
      add(R, "Карниз", rf.eaves, "м");
      if (!rf.flat) add(R, "Фронтоны", rf.gables, "м²");
      if (rf.gut) add(R, "Водосточный желоб", rf.eaves, "м");
    }
  }
  kitBoq(add);
  const Pl = S.plot;
  const F = fenceOf(Pl);
  const gw = F.gate === "none" ? 0 : clamp(F.gw, 1.5, Math.max(1.5, Pl.w - 2));
  const ww = F.wicket ? 1.1 : 0;
  const fr = Math.max(0, Pl.w - gw - ww - (F.wicket ? 0.25 : 0));
  const sd = 2 * Pl.d + Pl.w;
  const Z = "Участок";
  if (F.front === F.type) add(Z, "Забор, " + FENCES[F.type].n.toLowerCase(), fr + sd, "м");
  else {
    add(Z, "Забор вдоль улицы, " + FENCES[F.front].n.toLowerCase(), fr, "м");
    add(Z, "Забор по бокам и сзади, " + FENCES[F.type].n.toLowerCase(), sd, "м");
  }
  add(Z, "Столбы забора примерно", Math.ceil(fr / FENCES[F.front].span) + Math.ceil(sd / FENCES[F.type].span) + 4, "шт");
  if (gw) add(Z, (FENCE_GATES[F.gate] || "Ворота") + " ворота " + fm(gw) + " м", 1, "шт");
  if (F.wicket) add(Z, "Калитка", 1, "шт");
  const pave = new Map();
  for (const o of S.objects) {
    const K = modelOf(o);
    if (!BOQ_PASS.has(K.g)) continue;
    pave.set(o.name, (pave.get(o.name) || 0) + o.w * o.d);
  }
  for (const [n, q] of pave) add(Z, n, q, "м²");
  return rows;
}

function boqFmt(q, u) {
  if (u === "шт") return String(Math.round(q));
  return String(Math.round(q * 10) / 10).replace(".", ",");
}

function boqHTML() {
  const rows = boqRows();
  let h = "";
  let g = "";
  for (const [grp, n, q, u] of rows) {
    if (grp !== g) {
      g = grp;
      h += `<tr class="g"><th colspan="2">${esc(grp)}</th></tr>`;
    }
    h += `<tr><td>${esc(n)}</td><td>${boqFmt(q, u)} ${u}</td></tr>`;
  }
  return sec("Объёмы для сметы", `<table class="boq">${h}</table>` +
    `<div class="btns">${btn("boq-csv", "Скачать CSV для Excel")}</div>` +
    `<p class="hint">Считаю по плану без запаса на подрезку. Стены до потолка, без перекрытия, фронтоны отдельной строкой. Отмостка 0,8 м.</p>`, "boqsec");
}

function boqCSV() {
  const rows = boqRows();
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [["Раздел", "Работа или материал", "Количество", "Ед."].map(q).join(";")];
  for (const [g, n, v, u] of rows) lines.push([q(g), q(n), boqFmt(v, u), q(u)].join(";"));
  download(new Blob(["﻿" + lines.join("\r\n")], {type: "text/csv;charset=utf-8"}), `obemy-${stamp()}.csv`);
}
