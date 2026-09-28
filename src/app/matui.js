"use strict";
const HSLOTS = [
  ["facade", "facade", "Фасад"],
  ["plinth", "plinth", "Цоколь"],
  ["blind", "paving", "Отмостка"],
  ["roof", "roof", "Кровля"],
  ["trim", "roofedge", "Карнизы и края кровли"],
  ["soffit", "soffit", "Подшив свесов"],
  ["gutter", "gutter", "Водостоки"],
  ["winframe", "frame", "Рамы всех окон"],
  ["ceiling", "plaster", "Потолки"],
  ["chimney", "brick", "Дымоход"]
];
const MP = {el: null, T: null, grp: "", hsv: [0, 0, 1], live: 0, pend: null, drag: false};

function specMix(a, b) {
  if (!b) return a || null;
  if (!a || b.m) return b;
  return {m: a.m, c: b.c || a.c};
}

function hk(slot, def) {
  return specKey(S.house.mats && S.house.mats[slot], def);
}

function objKey(o, slot, def) {
  return specKey(o && o.mats && o.mats[slot], def);
}

function matObj(t, id) {
  if (t === "house") return S.house;
  const list = listOf(t);
  return list ? list.find(x => x.id === id) || null : null;
}

function doorDef(d) {
  if (d.kind === "entry") return "door_entry";
  const e = ext();
  const L = e ? lineOf(d, wallSegs(), extSides(e), false) : null;
  return L && L.ext ? "door_entry" : "door_int";
}

function slotsOf(t, o) {
  if (!o) return [];
  if (t === "house") return HSLOTS.map(([slot, def, label]) => ({slot, def, label}));
  if (t === "room") return [{slot: "floor", def: floorMat(o), label: "Пол"}, {slot: "wall", def: "plaster", label: "Стены"}];
  if (t === "door") {
    if (o.kind === "open" || o.kind === "arch") return [];
    const d = doorDef(o);
    return [{slot: "leaf", def: d, label: "Полотно"}, {slot: "dframe", def: d, label: "Коробка и наличники"}, {slot: "handle", def: "chrome", label: "Ручки"}];
  }
  if (t === "win") {
    const inh = S.house.mats && S.house.mats.winframe;
    return [{slot: "wframe", def: "frame", label: "Рама", inh}, {slot: "glass", def: "glass", label: "Стекло"}, {slot: "sill_in", def: "sill_in", label: "Подоконник"}, {slot: "sill_out", def: "sill_out", label: "Отлив"}];
  }
  if (t === "item" || t === "obj") return modelSlots(o);
  return [];
}

function ownSpec(T) {
  const o = matObj(T.t, T.id);
  return o && o.mats && o.mats[T.slot] || null;
}

function effKey(T) {
  return specKey(specMix(T.inh, ownSpec(T)), T.def);
}

function setSpec(T, sp) {
  const o = matObj(T.t, T.id);
  if (!o) return;
  if (!sp || (!sp.m && !sp.c)) {
    if (o.mats) {
      delete o.mats[T.slot];
      if (!Object.keys(o.mats).length) delete o.mats;
    }
    return;
  }
  const e = {};
  if (sp.m) e.m = sp.m;
  if (sp.c) e.c = sp.c;
  o.mats = o.mats || {};
  o.mats[T.slot] = e;
}

function matRow(T) {
  const key = effKey(T);
  const own = ownSpec(T);
  const sub = matTitle(key) + (own && own.c ? ", " + own.c : "");
  return `<button type="button" class="mrow" data-a="mat" data-t="${T.t}" data-id="${esc(T.id || "")}" data-slot="${esc(T.slot)}" aria-current="${!!(MP.T && MP.T.t === T.t && MP.T.id === T.id && MP.T.slot === T.slot)}">` +
    `<span class="msw" data-mk="${esc(key)}" style="background-color:${matHex(key)}"></span><span class="nm">${esc(T.label)}</span><span class="a">${esc(sub)}</span></button>`;
}

function matsSec(t, o, title) {
  const list = slotsOf(t, o);
  if (!list.length) return "";
  const id = t === "house" ? "" : o.id;
  const rows = list.map(s => matRow({t, id, slot: s.slot, def: s.def, label: s.label, inh: s.inh})).join("");
  const reset = o.mats ? `<div class="btns">${btn("mat-reset", "Вернуть все материалы", "", ` data-t="${t}" data-id="${esc(id)}"`)}</div>` : "";
  return sec(title || "Материалы и цвет", `<div class="mlist">${rows}</div>${reset}<p class="hint">Клик по части открывает материалы и палитру.</p>`);
}

function fillSwatches(root) {
  if (typeof matSwatch !== "function" || !V.ok) return;
  const els = [...(root || document).querySelectorAll(".msw[data-mk]")].filter(el => el.dataset.done !== el.dataset.mk);
  let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < els.length && performance.now() - t0 < 20) {
      const el = els[i++];
      if (!el.isConnected) continue;
      const url = matSwatch(el.dataset.mk);
      el.dataset.done = el.dataset.mk;
      if (url) el.style.backgroundImage = `url("${url}")`;
    }
    if (i < els.length) setTimeout(step, 16);
    else V.need = true;
  };
  setTimeout(step, 20);
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbHex(r, g, b) {
  return "#" + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}

function rgbHsv(r, g, b) {
  const R = r / 255;
  const G = g / 255;
  const Bv = b / 255;
  const mx = Math.max(R, G, Bv);
  const mn = Math.min(R, G, Bv);
  const d = mx - mn;
  let h = 0;
  if (d > 1e-9) {
    if (mx === R) h = ((G - Bv) / d) % 6;
    else if (mx === G) h = (Bv - R) / d + 2;
    else h = (R - G) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, mx ? d / mx : 0, mx];
}

function hsvRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const k = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
  return [k[0] * 255, k[1] * 255, k[2] * 255];
}

function mpBuild() {
  if (MP.el) return MP.el;
  const el = document.createElement("div");
  el.className = "mpop";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.innerHTML = `<div class="mph"><b id="mpt"></b><button type="button" class="ib" data-mp="close" aria-label="Закрыть"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>` +
    `<div class="mpcur"><span class="msw big" id="mpsw"></span><div><div id="mpn"></div><div class="hint" id="mpd"></div></div></div>` +
    `<div class="chips" id="mpg"></div><div class="mpgrid" id="mpgrid"></div>` +
    `<div class="mpc"><div class="wheel" id="mpwh"><canvas id="mpw" width="320" height="320"></canvas><i id="mpk"></i></div>` +
    `<div class="mpv"><label class="f">Яркость<input type="range" id="mpv" min="0" max="100" step="1"></label>` +
    `<label class="f">HEX<input type="text" id="mphex" maxlength="7" spellcheck="false" autocomplete="off"></label>` +
    `<div class="row3"><label class="f">R<input type="number" id="mpr" min="0" max="255" step="1"></label><label class="f">G<input type="number" id="mpgg" min="0" max="255" step="1"></label><label class="f">B<input type="number" id="mpb" min="0" max="255" step="1"></label></div>` +
    `<div class="mprec" id="mprec"></div></div></div>` +
    `<div class="btns"><button type="button" class="btn" data-mp="nocolor">Цвет как у материала</button><button type="button" class="btn danger" data-mp="reset">Сбросить</button><button type="button" class="btn primary" data-mp="close">Готово</button></div>`;
  document.body.appendChild(el);
  MP.el = el;
  el.addEventListener("click", mpClick);
  const wh = el.querySelector("#mpwh");
  wh.addEventListener("pointerdown", e => {
    MP.drag = true;
    try {
      wh.setPointerCapture(e.pointerId);
    } catch (err) {
      MP.drag = true;
    }
    mpWheelAt(e);
  });
  wh.addEventListener("pointermove", e => {
    if (MP.drag) mpWheelAt(e);
  });
  const up = () => {
    if (!MP.drag) return;
    MP.drag = false;
    mpCommit();
  };
  wh.addEventListener("pointerup", up);
  wh.addEventListener("pointercancel", up);
  const vs = el.querySelector("#mpv");
  vs.addEventListener("input", () => {
    MP.hsv[2] = clamp(Number(vs.value) / 100, 0, 1);
    mpDrawWheel();
    mpLive(rgbHex(...hsvRgb(...MP.hsv)));
  });
  vs.addEventListener("change", () => mpCommit());
  el.querySelector("#mphex").addEventListener("change", e => {
    let v = String(e.target.value).trim().toLowerCase();
    if (v[0] !== "#") v = "#" + v;
    if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    if (!/^#[0-9a-f]{6}$/.test(v)) {
      mpFill();
      return;
    }
    MP.hsv = rgbHsv(...hexRgb(v));
    mpLive(v);
    mpCommit();
  });
  for (const id of ["mpr", "mpgg", "mpb"]) {
    el.querySelector("#" + id).addEventListener("change", () => {
      const q = s => clamp(parseInt(el.querySelector("#" + s).value, 10) || 0, 0, 255);
      const v = rgbHex(q("mpr"), q("mpgg"), q("mpb"));
      MP.hsv = rgbHsv(...hexRgb(v));
      mpLive(v);
      mpCommit();
    });
  }
  document.addEventListener("pointerdown", e => {
    if (!MP.el || MP.el.hidden) return;
    if (MP.el.contains(e.target) || e.target.closest(".mrow")) return;
    matPopClose();
  }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && MP.el && !MP.el.hidden) {
      matPopClose();
      e.stopPropagation();
    }
  }, true);
  return el;
}

function mpTarget(t, id, slot) {
  const o = matObj(t, id);
  const s = slotsOf(t, o).find(x => x.slot === slot);
  return s ? {t, id, slot, def: s.def, label: s.label, inh: s.inh} : null;
}

function openMatPop(t, id, slot, anchor) {
  const T = mpTarget(t, id, slot);
  if (!T) return;
  const el = mpBuild();
  MP.T = T;
  const key = effKey(T);
  const base = key.split("@")[0];
  MP.grp = (MDEF[base] && MDEF[base].g) || (MDEF[T.def] && MDEF[T.def].g) || "wood";
  MP.hsv = rgbHsv(...hexRgb(matHex(key)));
  el.hidden = false;
  mpRenderGroups();
  mpFill();
  mpPlace(anchor);
  document.querySelectorAll(".mrow").forEach(r => r.setAttribute("aria-current", String(r.dataset.slot === slot && r.dataset.t === t && (r.dataset.id || "") === (id || ""))));
}

function matPopClose() {
  if (!MP.el || MP.el.hidden) return;
  MP.el.hidden = true;
  if (MP.live) {
    cancelAnimationFrame(MP.live);
    MP.live = 0;
  }
  MP.T = null;
  document.querySelectorAll(".mrow[aria-current=\"true\"]").forEach(r => r.setAttribute("aria-current", "false"));
}

function mpPlace(anchor) {
  const el = MP.el;
  const W = Math.min(360, window.innerWidth - 16);
  el.style.width = W + "px";
  const H = Math.min(el.scrollHeight || 640, window.innerHeight - 16);
  if (!anchor || window.innerWidth < 720) {
    el.style.left = Math.round((window.innerWidth - W) / 2) + "px";
    el.style.top = Math.max(8, window.innerHeight - H - 8) + "px";
    return;
  }
  const r = anchor.getBoundingClientRect();
  let x = r.left - W - 12;
  if (x < 8) x = Math.min(window.innerWidth - W - 8, r.right + 12);
  const y = clamp(r.top - 60, 8, Math.max(8, window.innerHeight - H - 8));
  el.style.left = Math.round(x) + "px";
  el.style.top = Math.round(y) + "px";
}

function mpRenderGroups() {
  const g = MP.el.querySelector("#mpg");
  g.innerHTML = MGROUPS.map(([k, n]) => `<button type="button" class="chip" data-mpg="${k}" aria-pressed="${MP.grp === k}">${n}</button>`).join("");
  const grid = MP.el.querySelector("#mpgrid");
  const cur = effKey(MP.T).split("@")[0];
  const keys = Object.keys(MDEF).filter(k => MDEF[k].n && MDEF[k].g === MP.grp);
  grid.innerHTML = keys.map(k => `<button type="button" class="mt" data-mk="${k}" aria-pressed="${k === cur}"><span class="msw" data-mk="${k}" style="background-color:${matHex(k)}"></span><span>${esc(MDEF[k].n)}</span></button>`).join("");
  fillSwatches(grid);
}

function mpFill() {
  const el = MP.el;
  const T = MP.T;
  if (!T) return;
  const key = effKey(T);
  const own = ownSpec(T);
  el.querySelector("#mpt").textContent = T.label;
  const sw = el.querySelector("#mpsw");
  sw.dataset.mk = key;
  sw.style.backgroundColor = matHex(key);
  sw.style.backgroundImage = "";
  sw.dataset.done = "";
  fillSwatches(el.querySelector(".mpcur"));
  el.querySelector("#mpn").textContent = matTitle(key);
  el.querySelector("#mpd").textContent = own && own.c ? "Свой цвет " + own.c : "Цвет материала";
  const hex = rgbHex(...hsvRgb(...MP.hsv));
  el.querySelector("#mphex").value = hex;
  const [r, g, b] = hexRgb(hex);
  el.querySelector("#mpr").value = r;
  el.querySelector("#mpgg").value = g;
  el.querySelector("#mpb").value = b;
  const vs = el.querySelector("#mpv");
  vs.value = String(Math.round(MP.hsv[2] * 100));
  const full = rgbHex(...hsvRgb(MP.hsv[0], MP.hsv[1], 1));
  vs.style.background = `linear-gradient(90deg, #000, ${full})`;
  const rec = UIP.recent || [];
  el.querySelector("#mprec").innerHTML = rec.map(c => `<button type="button" class="rc" data-rc="${c}" style="background:${c}" aria-label="${c}"></button>`).join("");
  el.querySelectorAll("#mpgrid .mt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mk === key.split("@")[0])));
  mpDrawWheel();
}

function mpDrawWheel() {
  const cv = MP.el.querySelector("#mpw");
  const ctx = cv.getContext && cv.getContext("2d");
  if (ctx && ctx.createImageData) {
    const W = cv.width;
    const R = W / 2;
    const img = ctx.createImageData(W, W);
    const d = img.data;
    const v = MP.hsv[2];
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - R;
        const dy = y + 0.5 - R;
        const r = Math.hypot(dx, dy) / R;
        const i = (y * W + x) * 4;
        if (r > 1) continue;
        const h = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1;
        const c = hsvRgb(h, r, v);
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = r > 0.992 ? Math.round((1 - r) / 0.008 * 255) : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const k = MP.el.querySelector("#mpk");
  const a = MP.hsv[0] * 2 * Math.PI;
  k.style.left = (50 + Math.cos(a) * MP.hsv[1] * 50) + "%";
  k.style.top = (50 + Math.sin(a) * MP.hsv[1] * 50) + "%";
  k.style.background = rgbHex(...hsvRgb(...MP.hsv));
}

function mpWheelAt(e) {
  const r = MP.el.querySelector("#mpw").getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
  MP.hsv[0] = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1;
  MP.hsv[1] = s;
  if (MP.hsv[2] < 0.05) MP.hsv[2] = 1;
  mpDrawWheel();
  mpLive(rgbHex(...hsvRgb(...MP.hsv)));
}

function mpLive(hex) {
  const T = MP.T;
  if (!T) return;
  const own = ownSpec(T);
  MP.pend = {m: own && own.m, c: hex};
  if (MP.live) return;
  MP.live = requestAnimationFrame(() => {
    MP.live = 0;
    if (!MP.T || !MP.pend) return;
    setSpec(MP.T, MP.pend);
    refreshMat3D(MP.T);
    const hx = MP.pend.c;
    const el = MP.el;
    el.querySelector("#mphex").value = hx;
    const [r, g, b] = hexRgb(hx);
    el.querySelector("#mpr").value = r;
    el.querySelector("#mpgg").value = g;
    el.querySelector("#mpb").value = b;
    el.querySelector("#mpsw").style.backgroundColor = hx;
    el.querySelector("#mpsw").style.backgroundImage = "";
  });
}

function mpCommit() {
  const T = MP.T;
  if (!T) return;
  if (MP.live) {
    cancelAnimationFrame(MP.live);
    MP.live = 0;
  }
  if (MP.pend) setSpec(T, MP.pend);
  const own = ownSpec(T);
  if (own && own.c) {
    UIP.recent = [own.c].concat((UIP.recent || []).filter(c => c !== own.c)).slice(0, 12);
    saveUI();
  }
  MP.pend = null;
  changed();
  mpFill();
}

function mpClick(e) {
  const b = e.target.closest("[data-mp], [data-mpg], .mt, .rc");
  if (!b || !MP.T) return;
  const T = MP.T;
  if (b.dataset.mpg) {
    MP.grp = b.dataset.mpg;
    mpRenderGroups();
    return;
  }
  if (b.classList.contains("mt")) {
    setSpec(T, {m: b.dataset.mk});
    MP.hsv = rgbHsv(...hexRgb(matHex(b.dataset.mk)));
    MP.pend = null;
    changed();
    mpFill();
    return;
  }
  if (b.classList.contains("rc")) {
    MP.hsv = rgbHsv(...hexRgb(b.dataset.rc));
    mpLive(b.dataset.rc);
    mpCommit();
    return;
  }
  const a = b.dataset.mp;
  if (a === "close") {
    matPopClose();
    return;
  }
  if (a === "nocolor") {
    const own = ownSpec(T);
    setSpec(T, own && own.m ? {m: own.m} : null);
  } else if (a === "reset") {
    setSpec(T, null);
  }
  MP.pend = null;
  MP.hsv = rgbHsv(...hexRgb(matHex(effKey(T))));
  changed();
  mpFill();
  mpRenderGroups();
}

function matPopSync() {
  if (!MP.el || MP.el.hidden || !MP.T) return;
  const T = MP.T;
  const alive = T.t === "house" || (sel && sel.t === T.t && sel.id === T.id && matObj(T.t, T.id));
  if (!alive) matPopClose();
}

function refreshMat3D(T) {
  if ((T.t === "item" || T.t === "obj") && !V.rebuild && V.root) {
    const o = matObj(T.t, T.id);
    const parent = T.t === "item" ? V.hgi : V.root;
    const g = o && parent ? parent.children.find(c => c.userData.pick && c.userData.pick.t === T.t && c.userData.pick.id === T.id) : null;
    if (g) {
      parent.remove(g);
      g.traverse(x => {
        if (x.geometry) x.geometry.dispose();
        if (x.isSprite || x.isLine || x.isLineSegments) x.material.dispose();
      });
      thingGroup(o, parent, T.t === "item" ? matHouse : matPlot, T.t === "item" ? S.house.base + 0.02 : 0, {t: T.t, id: T.id});
      V.need = true;
      return;
    }
  }
  schedule3D();
}
