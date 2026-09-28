"use strict";
const FENCES = {
  mesh: {n: "Сетка рабица", h: 1.6, span: 2.5},
  panel3d: {n: "3D-сетка", h: 1.8, span: 2.5},
  profile: {n: "Профлист", h: 2, span: 2.5},
  picket: {n: "Деревянный штакетник", h: 1.5, span: 2.4},
  euro: {n: "Евроштакетник", h: 1.8, span: 2.5},
  ranch: {n: "Ранчо, горизонтальная доска", h: 1.3, span: 2.4},
  boards: {n: "Глухой из доски", h: 1.9, span: 2.4},
  brick: {n: "Кирпичные столбы и профлист", h: 2, span: 3},
  forged: {n: "Ковка на кирпичном цоколе", h: 1.8, span: 3}
};
const FENCE_GATES = {swing: "Распашные", slide: "Откатные", none: "Без ворот"};

function fenceDefault(P) {
  return {type: "mesh", front: "mesh", h: 1.6, gate: "swing", gw: r2(Math.min(4, (P ? P.w : 20) * 0.4)), gx: 0, wicket: true, wside: 1, go: 0, wo: 0};
}

function fenceOf(P) {
  return Object.assign(fenceDefault(P), P.fence || {});
}

function fenceMats(m) {
  return {
    post: m("post", "posts"),
    dark: m("graphite", "posts"),
    chain: m("chain", "infill"),
    panel: m("fence", "infill"),
    prof: m("prof", "infill"),
    wood: m("picket", "infill"),
    woodPost: m("wood_dark", "posts"),
    euro: m("euro", "infill"),
    white: m("white", "infill"),
    planks: m("planks", "infill"),
    brick: m("brick", "pillars"),
    cap: m("sill_out", "caps"),
    iron: m("darkmetal", "infill")
  };
}

function isPillar(style) {
  return style === "brick" || style === "forged";
}

function fencePost(mg, M, style, x, H) {
  if (isPillar(style)) {
    mgBox(mg, M.brick, x - 0.19, x + 0.19, 0, H + 0.15, -0.19, 0.19);
    mgBox(mg, M.cap, x - 0.23, x + 0.23, H + 0.15, H + 0.21, -0.23, 0.23);
    return;
  }
  const wood = style === "picket" || style === "ranch" || style === "boards";
  const r = wood ? 0.05 : 0.03;
  mgBox(mg, style === "ranch" ? M.white : wood ? M.woodPost : style === "mesh" ? M.post : M.dark, x - r, x + r, 0, H + (style === "ranch" ? 0.05 : 0.06), -r, r);
}

function fenceInfill(mg, M, style, a, b, H, frame) {
  const L = b - a;
  if (L < 0.05) return;
  const y0 = style === "forged" ? 0.45 : 0.05;
  if (style === "forged") {
    if (!frame) {
      mgBox(mg, M.brick, a, b, 0, 0.45, -0.15, 0.15);
      mgBox(mg, M.cap, a, b, 0.45, 0.5, -0.17, 0.17);
    }
    for (const y of [0.62, H - 0.16]) mgBox(mg, M.iron, a, b, y, y + 0.04, -0.012, 0.012);
    const n = Math.max(1, Math.round(L / 0.12));
    for (let i = 0; i < n; i++) {
      const x = a + (i + 0.5) * L / n;
      mgBox(mg, M.iron, x - 0.009, x + 0.009, frame ? 0.1 : 0.5, H - 0.06, -0.009, 0.009);
      const g = new THREE.ConeGeometry(0.022, 0.1, 4);
      g.translate(x, H - 0.01, 0);
      mgAdd(mg, M.iron, g);
    }
    return;
  }
  if (style === "mesh") {
    mgBox(mg, M.chain, a, b, y0, H - 0.01, -0.004, 0.004);
    mgBox(mg, M.post, a, b, H - 0.02, H, -0.006, 0.006);
    return;
  }
  if (style === "panel3d") {
    mgBox(mg, M.panel, a + 0.01, b - 0.01, y0 + 0.05, H - 0.02, -0.006, 0.006);
    for (const f of [0.22, 0.55, 0.88]) {
      const y = y0 + (H - y0) * f;
      mgBox(mg, M.panel, a + 0.01, b - 0.01, y - 0.05, y + 0.05, -0.03, -0.018);
    }
    return;
  }
  if (style === "profile" || style === "brick") {
    for (const y of [0.35, H - 0.35]) mgBox(mg, M.dark, a, b, y - 0.02, y + 0.02, -0.05, -0.02);
    mgBox(mg, M.prof, a, b, style === "brick" ? 0.1 : y0, H - 0.02, -0.004, 0.004);
    mgBox(mg, M.dark, a, b, H - 0.02, H + 0.01, -0.012, 0.012);
    return;
  }
  if (style === "picket" || style === "euro") {
    const wood = style === "picket";
    for (const y of [0.3, H - 0.3]) mgBox(mg, wood ? M.woodPost : M.dark, a, b, y - 0.025, y + 0.025, -0.06, -0.02);
    const pw = wood ? 0.09 : 0.118;
    const step = wood ? 0.14 : 0.16;
    const n = Math.max(1, Math.floor(L / step));
    const off = (L - n * step) / 2;
    for (let i = 0; i < n; i++) {
      const x = a + off + i * step + (step - pw) / 2;
      mgBox(mg, wood ? M.wood : M.euro, x, x + pw, 0.08, H, -0.012, 0.004);
    }
    return;
  }
  if (style === "ranch") {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const y = 0.2 + i * (H - 0.35) / (n - 1);
      mgBox(mg, M.white, a, b, y, y + 0.14, -0.012, 0.012);
    }
    return;
  }
  if (style === "boards") {
    mgBox(mg, M.woodPost, a, b, 0.3, 0.35, -0.07, -0.02);
    mgBox(mg, M.woodPost, a, b, H - 0.35, H - 0.3, -0.07, -0.02);
    mgBox(mg, M.planks, a, b, 0.05, H, -0.012, 0.012);
    mgBox(mg, M.woodPost, a, b, H, H + 0.03, -0.03, 0.03);
  }
}

function fenceRun(parent, x0, z0, x1, z1, style, H, m, opt) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  if (L < 0.05 || !has(FENCES, style)) return null;
  const o = opt || {};
  const g = new THREE.Group();
  g.position.set(x0, 0, z0);
  g.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
  parent.add(g);
  const M = fenceMats(m);
  const mg = MG();
  const n = Math.max(1, Math.ceil(L / FENCES[style].span));
  const pr = isPillar(style) ? 0.19 : 0;
  for (let i = 0; i <= n; i++) {
    if ((i === 0 && o.skip0) || (i === n && o.skip1)) continue;
    fencePost(mg, M, style, L * i / n, H);
  }
  for (let i = 0; i < n; i++) fenceInfill(mg, M, style, L * i / n + pr, L * (i + 1) / n - pr, H);
  mgEnd(mg, g);
  return g;
}

function gateLeaf(parent, style, w, H, m, flip) {
  const leaf = new THREE.Group();
  parent.add(leaf);
  const M = fenceMats(m);
  const mg = MG();
  const fr = isPillar(style) ? M.iron : style === "picket" || style === "boards" || style === "ranch" ? M.woodPost : M.dark;
  const t = 0.02;
  mgBox(mg, fr, 0, w, 0.06, 0.1, -t, t);
  mgBox(mg, fr, 0, w, H - 0.04, H, -t, t);
  mgBox(mg, fr, 0, 0.04, 0.06, H, -t, t);
  mgBox(mg, fr, w - 0.04, w, 0.06, H, -t, t);
  const inner = style === "brick" ? "profile" : style === "mesh" ? "mesh" : style;
  if (inner === "mesh") mgBox(mg, M.chain, 0.04, w - 0.04, 0.1, H - 0.04, -0.004, 0.004);
  else if (inner === "forged") fenceInfill(mg, M, "forged", 0.04, w - 0.04, H - 0.04, true);
  else fenceInfill(mg, M, inner, 0.04, w - 0.04, H - 0.04, true);
  const hx = flip ? 0.12 : w - 0.12;
  mgBox(mg, M.iron, hx - 0.012, hx + 0.012, H * 0.5 - 0.1, H * 0.5 + 0.1, 0.02, 0.045);
  mgBox(mg, M.iron, hx - 0.012, hx + 0.012, H * 0.5 - 0.1, H * 0.5 + 0.1, -0.045, -0.02);
  mgEnd(mg, leaf);
  return leaf;
}

function gateAssembly(parent, kind, style, w, H, m, key, open, pick) {
  const M = fenceMats(m);
  const mg = MG();
  const heavy = isPillar(style);
  const pr = heavy ? 0.19 : 0.05;
  for (const x of kind === "slide" ? [0] : [0, w]) {
    if (heavy) fencePost(mg, M, style, x, H);
    else mgBox(mg, M.dark, x - pr, x + pr, 0, H + 0.1, -pr, pr);
  }
  if (kind === "slide") {
    if (heavy) fencePost(mg, M, style, w, H);
    else mgBox(mg, M.dark, w - pr, w + pr, 0, H + 0.1, -pr, pr);
  }
  mgEnd(mg, parent);
  const a = pr + 0.02;
  const b = w - pr - 0.02;
  if (kind === "swing") {
    const lw = (b - a) / 2 - 0.01;
    const hl = new THREE.Group();
    hl.position.set(a, 0, 0);
    parent.add(hl);
    gateLeaf(hl, style, lw, H - 0.05, m, false);
    const hr = new THREE.Group();
    hr.position.set(b, 0, 0);
    parent.add(hr);
    const rl = gateLeaf(hr, style, lw, H - 0.05, m, true);
    rl.position.x = -lw;
    for (const x of [hl, hr]) x.userData.pick = pick;
    animBind(key, open, v => {
      hl.rotation.y = v * 1.65;
      hr.rotation.y = -v * 1.65;
    });
  } else if (kind === "wicket") {
    const hg = new THREE.Group();
    hg.position.set(a, 0, 0);
    parent.add(hg);
    gateLeaf(hg, style, b - a, H - 0.05, m, false);
    hg.userData.pick = pick;
    animBind(key, open, v => {
      hg.rotation.y = v * 1.5;
    });
  } else {
    const lw = b - a + 0.1;
    const sg = new THREE.Group();
    parent.add(sg);
    gateLeaf(sg, style, lw, H - 0.05, m, false);
    const rail = B(sg, 0, lw, 0.02, 0.06, -0.03, 0.03, M.dark);
    if (rail) rail.castShadow = false;
    sg.userData.pick = pick;
    animBind(key, open, v => {
      sg.position.set(a - 0.05 - v * (lw - 0.2), 0, -0.09);
    });
  }
}

function buildFence(R, P) {
  const F = fenceOf(P);
  const H = F.h;
  const m = matPlot;
  const side = F.type;
  const front = F.front;
  fenceRun(R, 0, 0, P.w, 0, side, H, m);
  fenceRun(R, 0, 0, 0, P.d, side, H, m, {skip0: true});
  fenceRun(R, P.w, 0, P.w, P.d, side, H, m, {skip0: true});
  const gw = F.gate === "none" ? 0 : clamp(F.gw, 1.5, Math.max(1.5, P.w - 2));
  const gc = clamp(P.w / 2 + F.gx, gw / 2 + 0.3, P.w - gw / 2 - 0.3);
  const gx0 = gc - gw / 2;
  const gx1 = gc + gw / 2;
  const ww = 1.1;
  let wk = null;
  if (F.wicket) {
    if (F.wside > 0 && gx1 + ww + 0.4 < P.w) wk = [gx1 + 0.25, gx1 + 0.25 + ww];
    else if (gx0 - ww - 0.4 > 0) wk = [gx0 - 0.25 - ww, gx0 - 0.25];
    else if (gx1 + ww + 0.4 < P.w) wk = [gx1 + 0.25, gx1 + 0.25 + ww];
  }
  const cuts = [];
  if (gw) cuts.push([gx0, gx1]);
  if (wk) cuts.push(wk);
  cuts.sort((p, q) => p[0] - q[0]);
  let x = 0;
  for (const [a, b] of cuts) {
    fenceRun(R, x, P.d, a, P.d, front, H, m, {skip0: true, skip1: true});
    x = b;
  }
  fenceRun(R, x, P.d, P.w, P.d, front, H, m, {skip0: true, skip1: true});
  if (gw) {
    const g = new THREE.Group();
    g.position.set(gx0, 0, P.d);
    R.add(g);
    gateAssembly(g, F.gate, front, gw, H, m, animKey("fence", "gate"), F.go, {t: "fence", part: "gate"});
  }
  if (wk) {
    const g = new THREE.Group();
    const left = wk[0] < gx0;
    g.position.set(left ? wk[1] : wk[0], 0, P.d);
    if (left) g.scale.x = -1;
    R.add(g);
    gateAssembly(g, "wicket", front, ww, H, m, animKey("fence", "wicket"), F.wo, {t: "fence", part: "wicket"});
  }
}

function toggleFence(pk) {
  if (!pk || pk.t !== "fence") return false;
  const F = fenceOf(S.plot);
  const k = pk.part === "wicket" ? "wo" : "go";
  F[k] = F[k] > 0.05 ? 0 : 1;
  S.plot.fence = F;
  animTo(animKey("fence", pk.part), F[k]);
  commit();
  save();
  updUndo();
  return true;
}

function fenceSecSec(it) {
  const md = modelOf(it);
  const st = it.fs || md.fs || "euro";
  let h = `<label class="f">Вид забора<select data-b="fence.fs">${Object.entries(FENCES).map(([key, v]) => `<option value="${key}"${key === st ? " selected" : ""}>${v.n}</option>`).join("")}</select></label>`;
  if (md.gate) h += openRow(it.open || 0, "gate-toggle");
  return sec(md.gate ? "Ворота" : "Забор", h + `<p class="hint">${md.gate ? "Двойной клик по воротам в 3D открывает и закрывает их." : "Длину секции меняет ширина, столбы встают сами."}</p>`);
}

function plotFenceSec() {
  const F = fenceOf(S.plot);
  const opt = (map, cur) => Object.entries(map).map(([key, v]) => `<option value="${key}"${key === cur ? " selected" : ""}>${v.n || v}</option>`).join("");
  let body = row(`<label class="f">Вдоль улицы<select data-b="pf.front">${opt(FENCES, F.front)}</select></label>`, `<label class="f">По бокам и сзади<select data-b="pf.type">${opt(FENCES, F.type)}</select></label>`);
  body += row(num("Высота, м", "pf.h", F.h, null, 0.1), `<label class="f">Ворота<select data-b="pf.gate">${opt(FENCE_GATES, F.gate)}</select></label>`);
  if (F.gate !== "none") body += row(num("Ширина ворот, м", "pf.gw", F.gw, null, 0.1), num("Сдвиг от середины, м", "pf.gx", F.gx, null, 0.1));
  body += `<label class="check"><input type="checkbox" data-b="pf.wicket"${F.wicket ? " checked" : ""}>Калитка</label>`;
  if (F.wicket) body += row(`<label class="f">Калитка<select data-b="pf.wside"><option value="1"${F.wside > 0 ? " selected" : ""}>Справа от ворот</option><option value="-1"${F.wside < 0 ? " selected" : ""}>Слева от ворот</option></select></label>`);
  body += `<div class="btns">${btn("pf-gate", F.go > 0.05 ? "Закрыть ворота" : "Открыть ворота")}${F.wicket ? btn("pf-wicket", F.wo > 0.05 ? "Закрыть калитку" : "Открыть калитку") : ""}</div>`;
  body += `<p class="hint">Забор виден в 3D, если включена кнопка «Забор». Ворота и калитка открываются двойным кликом.</p>`;
  return sec("Забор участка", body);
}

function fenceBind(b, el) {
  const F = fenceOf(S.plot);
  const f = b.slice(3);
  if (f === "type" || f === "front") {
    if (!has(FENCES, el.value)) return false;
    F[f] = el.value;
    if (f === "front" || !S.plot.fence) F.h = FENCES[el.value].h;
  } else if (f === "gate") {
    if (!has(FENCE_GATES, el.value)) return false;
    F.gate = el.value;
    if (el.value === "slide" && F.gw < 4) F.gw = 4;
  } else if (f === "wicket") {
    F.wicket = el.checked;
  } else if (f === "wside") {
    F.wside = el.value === "-1" ? -1 : 1;
  } else {
    const v = parseFloat(String(el.value).replace(",", "."));
    if (!isFinite(v)) return false;
    const lim = {h: [0.5, 3], gw: [1.5, 12], gx: [-100, 100]};
    if (!has(lim, f)) return false;
    F[f] = clamp(r2(v), lim[f][0], lim[f][1]);
  }
  S.plot.fence = F;
  return true;
}

function fenceSanitize(v, P) {
  const D = fenceDefault(P);
  if (!v || typeof v !== "object") return undefined;
  const n = (x, d, a, b) => (typeof x === "number" && isFinite(x) ? clamp(x, a, b) : d);
  return {
    type: has(FENCES, v.type) ? v.type : D.type,
    front: has(FENCES, v.front) ? v.front : D.front,
    h: n(v.h, D.h, 0.5, 3),
    gate: has(FENCE_GATES, v.gate) ? v.gate : D.gate,
    gw: n(v.gw, D.gw, 1.5, 12),
    gx: n(v.gx, 0, -100, 100),
    wicket: v.wicket !== false,
    wside: v.wside === -1 ? -1 : 1,
    go: n(v.go, 0, 0, 1),
    wo: n(v.wo, 0, 0, 1)
  };
}

function fence2D() {
  const P = S.plot;
  const F = fenceOf(P);
  let h = "";
  const sw = (1.4 / k).toFixed(4);
  const col = "var(--ink-2)";
  if (F.gate !== "none") {
    const gw = clamp(F.gw, 1.5, Math.max(1.5, P.w - 2));
    const gc = clamp(P.w / 2 + F.gx, gw / 2 + 0.3, P.w - gw / 2 - 0.3);
    const a = gc - gw / 2;
    const b = gc + gw / 2;
    h += `<line x1="${a}" y1="${P.d}" x2="${b}" y2="${P.d}" stroke="var(--land)" stroke-width="${(4 / k).toFixed(4)}"/>`;
    if (F.gate === "swing") {
      const r = gw / 2;
      h += `<path d="M ${a} ${P.d} L ${a} ${P.d - r} A ${r} ${r} 0 0 1 ${a + r} ${P.d}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
      h += `<path d="M ${b} ${P.d} L ${b} ${P.d - r} A ${r} ${r} 0 0 0 ${b - r} ${P.d}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
    } else {
      h += `<line x1="${a}" y1="${P.d - 0.25}" x2="${b}" y2="${P.d - 0.25}" stroke="${col}" stroke-width="${sw}"/><path d="M ${a + 0.4} ${P.d - 0.45} L ${a + 0.1} ${P.d - 0.25} L ${a + 0.4} ${P.d - 0.05}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
    }
    h += T2(gc, P.d - Math.min(gw / 2, 2) - 0.5, "ворота", {fill: col, size: 10});
  }
  return h;
}
