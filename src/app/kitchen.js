"use strict";
const KMODS = {
  base: {n: "Тумба с дверцей", w: 0.6, min: 0.3, max: 1},
  drawers: {n: "Тумба с ящиками", w: 0.6, min: 0.3, max: 1},
  sink: {n: "Мойка", w: 0.6, min: 0.45, max: 1},
  hob: {n: "Плита и духовка", w: 0.6, min: 0.45, max: 0.9},
  dw: {n: "Посудомойка", w: 0.6, min: 0.45, max: 0.6},
  fridge: {n: "Холодильник в пенале", w: 0.6, min: 0.55, max: 0.9, tall: true},
  oven: {n: "Пенал с духовкой", w: 0.6, min: 0.55, max: 0.8, tall: true},
  tall: {n: "Шкаф-пенал", w: 0.5, min: 0.3, max: 1, tall: true}
};

function kitAuto(w) {
  const n = Math.max(1, Math.round(w / 0.6));
  const mw = r2(w / n);
  const sinkI = Math.min(n - 1, Math.floor(n * 0.3));
  let hobI = n > 1 ? Math.min(n - 1, Math.floor(n * 0.7)) : -1;
  if (hobI === sinkI) hobI = -1;
  const out = [];
  for (let i = 0; i < n; i++) out.push({t: i === sinkI ? "sink" : i === hobI ? "hob" : i % 2 ? "drawers" : "base", w: mw});
  return out;
}

function kitMods(o, W) {
  const src = o && Array.isArray(o.mods) && o.mods.length ? o.mods : kitAuto(W);
  const sum = src.reduce((s, m) => s + m.w, 0) || 1;
  const k = W / sum;
  return src.map(m => ({t: has(KMODS, m.t) ? m.t : "base", w: m.w * k}));
}

function kitUp(o, h) {
  return !(o && o.up === false) && h > 1.9;
}

MB.kitchen = (g, P, m) => {
  const {w, d, h} = P;
  const mods = kitMods(P.o, w);
  const up = kitUp(P.o, h);
  const body = m("white", "body");
  const front = m("white_gloss", "fronts");
  const top = m("graphite", "top");
  const hdl = m("steel", "handles");
  const pl = m("graphite", "plinth");
  const ct = Math.min(0.86, h - 0.04);
  const tallH = Math.max(ct + 0.04, Math.min(h, 2.2));
  const uy0 = 1.45;
  const zf = d / 2 - 0.02;
  let x = -w / 2;
  for (const md of mods) {
    const x0 = x;
    const x1 = x + md.w;
    x = x1;
    const T = KMODS[md.t];
    B(g, x0, x1, 0, 0.1, -d / 2, d / 2 - 0.07, pl);
    if (T.tall) {
      B(g, x0, x1, 0.1, tallH, -d / 2, zf, body);
      if (md.t === "fridge") {
        const sp = 0.1 + (tallH - 0.1) * 0.56;
        fronts(g, x0, x1, 0.1, sp, zf, 1, 1, 1, front, hdl, true);
        fronts(g, x0, x1, sp, tallH, zf, 1, 1, 1, front, hdl, true);
      } else if (md.t === "oven") {
        fronts(g, x0, x1, 0.1, 0.78, zf, 1, 1, 2, front, hdl, false);
        B(g, x0 + 0.003, x1 - 0.003, 0.8, 1.38, zf, d / 2 - 0.002, m("screen", "oven"));
        B(g, x0 + 0.07, x1 - 0.07, 1.33, 1.345, d / 2 - 0.002, d / 2 + 0.02, hdl);
        fronts(g, x0, x1, 1.4, tallH, zf, 1, 1, 1, front, hdl, true);
      } else fronts(g, x0, x1, 0.1, tallH, zf, 1, md.w > 0.7 ? 2 : 1, 1, front, hdl, true);
      continue;
    }
    const cx = (x0 + x1) / 2;
    if (md.t === "sink") {
      const sw = Math.max(0.12, Math.min(0.24, md.w / 2 - 0.05));
      const s0 = -d / 2 + 0.14;
      const s1 = d / 2 - 0.07;
      const sb = ct - 0.17;
      B(g, x0, cx - sw, 0.1, ct, -d / 2, zf, body);
      B(g, cx + sw, x1, 0.1, ct, -d / 2, zf, body);
      B(g, cx - sw, cx + sw, 0.1, sb, -d / 2, zf, body);
      B(g, cx - sw, cx + sw, sb, ct, -d / 2, s0, body);
      B(g, cx - sw, cx + sw, sb, ct, s1, zf, body);
      B(g, x0, cx - sw, ct, ct + 0.04, -d / 2, d / 2 + 0.01, top);
      B(g, cx + sw, x1, ct, ct + 0.04, -d / 2, d / 2 + 0.01, top);
      B(g, cx - sw, cx + sw, ct, ct + 0.04, -d / 2, s0, top);
      B(g, cx - sw, cx + sw, ct, ct + 0.04, s1, d / 2 + 0.01, top);
      const sk = m("steel", "sink");
      B(g, cx - sw, cx + sw, sb, sb + 0.01, s0, s1, sk);
      B(g, cx - sw, cx - sw + 0.008, sb, ct + 0.04, s0, s1, sk);
      B(g, cx + sw - 0.008, cx + sw, sb, ct + 0.04, s0, s1, sk);
      B(g, cx - sw, cx + sw, sb, ct + 0.04, s0, s0 + 0.008, sk);
      B(g, cx - sw, cx + sw, sb, ct + 0.04, s1 - 0.008, s1, sk);
      Cy(g, 0.03, sb + 0.01, sb + 0.013, cx, (s0 + s1) / 2, m("darkmetal", "sink"), 16);
      const fc = m("chrome", "faucet");
      const fz = -d / 2 + 0.07;
      Cy(g, 0.024, ct + 0.04, ct + 0.07, cx, fz, fc, 14);
      Cy(g, 0.013, ct + 0.07, ct + 0.3, cx, fz, fc, 10);
      let prev = [cx, ct + 0.3, fz];
      for (let i = 1; i <= 6; i++) {
        const a = i / 6 * Math.PI;
        const pt = [cx, ct + 0.3 + Math.sin(a) * 0.09, fz + 0.09 - Math.cos(a) * 0.09];
        Lb(g, prev, pt, 0.012, 0.012, fc, 8);
        prev = pt;
      }
      Lb(g, prev, [cx, prev[1] - 0.05, prev[2]], 0.012, 0.011, fc, 8);
      fronts(g, x0, x1, 0.1, ct, zf, 1, md.w > 0.75 ? 2 : 1, 1, front, hdl, true);
    } else {
      B(g, x0, x1, 0.1, ct, -d / 2, zf, body);
      B(g, x0, x1, ct, ct + 0.04, -d / 2, d / 2 + 0.01, top);
      if (md.t === "hob") {
        B(g, x0 + 0.003, x1 - 0.003, 0.12, ct - 0.16, zf, d / 2 - 0.002, m("screen", "oven"));
        B(g, x0 + 0.08, x1 - 0.08, ct - 0.2, ct - 0.185, d / 2 - 0.002, d / 2 + 0.02, hdl);
        fronts(g, x0, x1, ct - 0.15, ct, zf, 1, 1, 1, front, hdl, false);
        const hw = Math.min(0.29, md.w / 2 - 0.02);
        B(g, cx - hw, cx + hw, ct + 0.04, ct + 0.046, -d / 2 + 0.06, d / 2 - 0.04, m("screen", "hob"));
        const rr = Math.min(0.085, hw * 0.3);
        for (const ox of [-hw * 0.45, hw * 0.45]) for (const oz of [-0.11, 0.11]) Cy(g, rr, ct + 0.046, ct + 0.048, cx + ox, (d / 2 - 0.04 - d / 2 + 0.06) / 2 + oz, m("darkmetal", "hob"), 24);
      } else if (md.t === "dw") {
        B(g, x0 + 0.002, x1 - 0.002, 0.1, ct - 0.002, zf, zf + 0.018, front);
        RB(g, x0 + 0.08, x1 - 0.08, ct - 0.07, ct - 0.055, zf + 0.03, zf + 0.044, 0.006, hdl);
        for (const q of [-1, 1]) B(g, cx + q * (md.w / 2 - 0.1) - 0.004, cx + q * (md.w / 2 - 0.1) + 0.004, ct - 0.066, ct - 0.058, zf + 0.018, zf + 0.03, hdl);
      } else if (md.t === "drawers") fronts(g, x0, x1, 0.1, ct, zf, 1, 1, 3, front, hdl, false);
      else fronts(g, x0, x1, 0.1, ct, zf, 1, md.w > 0.75 ? 2 : 1, 1, front, hdl, true);
    }
    if (up) {
      B(g, x0, x1, ct + 0.04, uy0, -d / 2, -d / 2 + 0.012, m("tile", "splash"));
      const u0 = md.t === "hob" ? uy0 + 0.25 : uy0;
      if (md.t === "hob") B(g, cx - Math.min(0.3, md.w / 2), cx + Math.min(0.3, md.w / 2), uy0 - 0.09, uy0 + 0.25, -d / 2 + 0.012, -d / 2 + 0.52, m("steel", "hood"));
      if (h - u0 > 0.2) {
        B(g, x0, x1, u0, h, -d / 2, -d / 2 + 0.33, body);
        fronts(g, x0, x1, u0, h, -d / 2 + 0.33, 1, md.w > 0.75 ? 2 : 1, 1, front, hdl, true);
      }
    } else if (h > 1.3) B(g, x0, x1, ct + 0.04, Math.min(h, 1.45), -d / 2, -d / 2 + 0.012, m("tile", "splash"));
  }
};

function kitSym(o, x0, y0, st, sw, R, Ln) {
  const w = o.w;
  const d = o.d;
  let s = R(x0, y0, w, d, "var(--item)");
  let x = x0;
  const up = kitUp(o, o.h);
  for (const md of kitMods(o, w)) {
    const a = x;
    x += md.w;
    if (a > x0 + 0.001) s += Ln(a, y0, a, y0 + d);
    const cx = (a + x) / 2;
    const T = KMODS[md.t];
    if (T.tall) s += Ln(a, y0, x, y0 + d) + Ln(a, y0 + d, x, y0);
    else if (md.t === "sink") {
      const sw2 = Math.max(0.12, Math.min(0.24, md.w / 2 - 0.05));
      s += R(cx - sw2, y0 + 0.14, sw2 * 2, d - 0.21, "none", 0.04);
    } else if (md.t === "hob") {
      const hw = Math.min(0.29, md.w / 2 - 0.02);
      for (const ox of [-hw * 0.45, hw * 0.45]) for (const oy of [-0.11, 0.11]) s += `<circle cx="${cx + ox}" cy="${oy + 0.01}" r="${Math.min(0.085, hw * 0.3)}" fill="none" stroke="${st}" stroke-width="${sw}"/>`;
    }
    if (up && !T.tall) s += Ln(a, y0 + 0.33, x, y0 + 0.33, true);
  }
  return s;
}

function kitFix(it) {
  if (!Array.isArray(it.mods) || !it.mods.length) {
    delete it.mods;
    return;
  }
  it.w = r2(it.mods.reduce((s, m) => s + m.w, 0));
  const tall = it.mods.some(m => KMODS[m.t].tall);
  it.h = it.up === false && !tall ? 0.92 : 2.2;
}

function kitKeepLeft(it, w0) {
  const a = (it.rot || 0) * Math.PI / 180;
  const cx = it.x + w0 / 2;
  const cy = it.y + it.d / 2;
  const lx = cx - Math.cos(a) * w0 / 2;
  const ly = cy - Math.sin(a) * w0 / 2;
  const nx = lx + Math.cos(a) * it.w / 2;
  const ny = ly + Math.sin(a) * it.w / 2;
  it.x = r2(nx - it.w / 2);
  it.y = r2(ny - it.d / 2);
}

function kitEnsure(it) {
  if (!Array.isArray(it.mods) || !it.mods.length) it.mods = kitAuto(it.w).map(m => ({t: m.t, w: m.w}));
  return it.mods;
}

function kitSec(it) {
  const mods = Array.isArray(it.mods) && it.mods.length ? it.mods : kitAuto(it.w);
  const opt = cur => Object.entries(KMODS).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${v.n}</option>`).join("");
  const rows = mods.map((md, i) => `<div class="kmrow"><span class="kmi">${i + 1}</span><select data-b="km.t.${i}">${opt(md.t)}</select><input type="number" inputmode="decimal" step="0.05" data-b="km.w.${i}" value="${r2(md.w)}" aria-label="Ширина модуля, м"><button type="button" class="ib" data-a="km-left" data-i="${i}" aria-label="Левее"${i ? "" : " disabled"}>←</button><button type="button" class="ib" data-a="km-right" data-i="${i}" aria-label="Правее"${i < mods.length - 1 ? "" : " disabled"}>→</button><button type="button" class="ib" data-a="km-del" data-i="${i}" aria-label="Убрать модуль"${mods.length > 1 ? "" : " disabled"}>✕</button></div>`).join("");
  return sec("Модули кухни", `<div class="kmods">${rows}</div>` +
    `<div class="row"><label class="f">Добавить справа<select id="km-new">${opt("base")}</select></label><div class="f"><span>&nbsp;</span>${btn("km-add", "Добавить")}</div></div>` +
    `<label class="check"><input type="checkbox" data-b="km.up"${it.up === false ? "" : " checked"}>Верхние шкафы и вытяжка</label>` +
    `<p class="hint">Модули идут слева направо, если смотреть на кухню спереди. Ширина кухни ${fm(mods.reduce((s, m) => s + m.w, 0))} м считается по модулям. Столешница, цоколь и фартук строятся сами, смета кухни есть в ведомости объёмов.</p>`);
}

function kitBind(b, el, it) {
  if (!it || it.kind !== "kitchen") return false;
  if (b === "km.up") {
    it.up = el.checked ? undefined : false;
    if (it.up === undefined) delete it.up;
    kitEnsure(it);
    kitFix(it);
    return true;
  }
  const [, f, si] = b.split(".");
  const i = Number(si);
  const w0 = it.w;
  const mods = kitEnsure(it);
  const md = mods[i];
  if (!md) return false;
  if (f === "t") {
    if (!has(KMODS, el.value)) return false;
    md.t = el.value;
    const T = KMODS[md.t];
    md.w = r2(clamp(md.w, T.min, T.max));
  } else if (f === "w") {
    const v = parseFloat(String(el.value).replace(",", "."));
    if (!isFinite(v)) return false;
    const T = KMODS[md.t];
    md.w = r2(clamp(v, T.min, T.max));
  } else return false;
  kitFix(it);
  kitKeepLeft(it, w0);
  return true;
}

function kitAction(a, i, it) {
  if (!it || it.kind !== "kitchen") return false;
  const mods = kitEnsure(it);
  const w0 = it.w;
  if (a === "km-add") {
    const sel2 = $("#km-new");
    const t = sel2 && has(KMODS, sel2.value) ? sel2.value : "base";
    if (mods.length >= 16) return false;
    mods.push({t, w: KMODS[t].w});
  } else if (a === "km-del") {
    if (mods.length < 2 || !mods[i]) return false;
    mods.splice(i, 1);
  } else if (a === "km-left" || a === "km-right") {
    const j = a === "km-left" ? i - 1 : i + 1;
    if (!mods[i] || !mods[j]) return false;
    [mods[i], mods[j]] = [mods[j], mods[i]];
  } else return false;
  kitFix(it);
  kitKeepLeft(it, w0);
  return true;
}

function kitSanitize(o) {
  if (!Array.isArray(o.mods)) return null;
  const mods = o.mods.slice(0, 16).filter(m => m && has(KMODS, m.t)).map(m => {
    const T = KMODS[m.t];
    const w = typeof m.w === "number" && isFinite(m.w) ? m.w : T.w;
    return {t: m.t, w: r2(clamp(w, T.min, T.max))};
  });
  return mods.length ? mods : null;
}

function kitBoq(add) {
  const K = S.items.filter(i => i.kind === "kitchen");
  if (!K.length) return;
  let top = 0;
  let upper = 0;
  let plinth = 0;
  const cnt = new Map();
  for (const it of K) {
    const up = kitUp(it, it.h);
    for (const md of kitMods(it, it.w)) {
      const T = KMODS[md.t];
      const key = `${T.n} ${fm(md.w)} м`;
      cnt.set(key, (cnt.get(key) || 0) + 1);
      plinth += md.w;
      if (!T.tall) {
        top += md.w;
        if (up) upper += md.w;
      }
    }
  }
  for (const [k, n] of cnt) add("Кухня", k, n, "шт");
  add("Кухня", "Столешница", top, "м");
  add("Кухня", "Верхние шкафы", upper, "м");
  add("Кухня", "Фартук", upper * 0.55, "м²");
  add("Кухня", "Цоколь", plinth, "м");
}
