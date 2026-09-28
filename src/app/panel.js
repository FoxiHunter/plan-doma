"use strict";
const HINT = {
  plot: "Тяни дом и объекты. Колесо или щипок меняют масштаб, пустое место двигает план. R поворачивает, стрелки двигают, Delete удаляет.",
  house: "Тяни комнаты, двери, окна и мебель. Комнаты липнут к соседним стенам, Alt отключает привязку. R поворачивает, Delete удаляет.",
  room: "Зажми и протяни на плане дома или по полу в 3D, получится комната. Esc отменяет.",
  open: "Кликни по стене, проём встанет в эту точку. Shift ставит несколько подряд, Esc отменяет.",
  thing: "Кликни место на плане или в 3D. Внутри дома модель встанет в дом, снаружи на участок. Shift ставит несколько подряд, Esc отменяет.",
  wall: "Кликни по стене между двумя комнатами, и её не станет вместе с дверями на ней. Клик по пунктиру возвращает стену. Esc отменяет."
};
const TOOLNAMES = {door: "Дверь", open: "Проём", arch: "Арка", win: "Окно"};

const num = (label, b, v, id, step) => `<label class="f">${label}<input type="number" inputmode="decimal" step="${step || 0.05}" data-b="${b}" value="${r2(v)}"${id ? ` id="${id}"` : ""}></label>`;
const sec = (title, body, cls) => `<section class="sec${cls ? " " + cls : ""}"><h2>${title}</h2>${body}</section>`;
const btn = (a, label, cls, extra) => `<button type="button" class="btn${cls ? " " + cls : ""}" data-a="${a}"${extra || ""}>${label}</button>`;
const row = (a, b) => `<div class="row">${a}${b || "<span></span>"}</div>`;
const row3 = (a, b, c) => `<div class="row3">${a}${b}${c}</div>`;

function listHTML(items, kind, labelFn, subFn, colorFn) {
  if (!items.length) return `<p class="hint">Пока пусто.</p>`;
  return `<div class="list">` + items.map(it => {
    const cur = !!(sel && sel.t === kind && sel.id === it.id);
    const sw = colorFn ? `<span class="sw" style="background:${colorFn(it)}"></span>` : "";
    return `<button type="button" class="item" data-a="pick" data-k="${kind}" data-id="${esc(it.id)}" aria-current="${cur}">${sw}<span class="nm">${esc(labelFn(it))}</span><span class="a">${esc(subFn(it))}</span></button>`;
  }).join("") + `</div>`;
}

function sideOptions(it) {
  const e = ext();
  if (!e) return null;
  const L = lineOf(it, wallSegs(), extSides(e), false);
  if (!L) return null;
  const a = along(it);
  const c = across(it);
  const at = s => (it.o === "h" ? roomAt(a, c + s * 0.3) : roomAt(c + s * 0.3, a));
  if (L.ext) return [[-L.out, "Внутрь дома"], [L.out, "Наружу"]];
  const nm = r => (r ? "В «" + r.name + "»" : "Наружу");
  return [[1, nm(at(1))], [-1, nm(at(-1))]];
}

function wallsList(r) {
  const nb = neighbors(r);
  if (!nb.length) return "";
  const rows = nb.map(({r: q, e}) => {
    const gone = wallGone(r, q);
    const act = r.open && q.open ? `<span class="a">открытые зоны</span>` : btn("wall-toggle", gone ? "Вернуть стену" : "Убрать стену", "", ` data-id="${esc(q.id)}"`);
    return `<div class="wrow"><span class="sw" style="background:${FILL[grp(q)]}"></span><span class="nm">${esc(q.name)}<small>${gone ? "без стены" : "стена"}, ${fm(e.b - e.a)} м</small></span>${act}</div>`;
  }).join("");
  return `<h3 class="sub">Соседние комнаты</h3><div class="wlist">${rows}</div>`;
}

function secSelected() {
  if (sel && sel.t === "house") {
    const f = footprint();
    if (!f) return "";
    return sec("Дом",
      row(num("От левой границы, м", "house.left", f.x, "in-hx"), num("От красной линии, м", "house.fromRed", S.plot.d - f.y - f.d, "in-hy")) +
      `<div class="btns">${btn("rot", "Повернуть на 90°")}${btn("focus", "Показать в 3D")}</div>` +
      `<p class="hint">Комнаты, двери и окна меняются на вкладке «Дом».</p>`) + matsSec("house", S.house, "Отделка дома");
  }
  const it = selItem();
  if (!it) return "";
  const nameIn = `<label class="f">Название<input type="text" data-b="sel.name" value="${esc(it.name || "")}" maxlength="40"></label>`;
  if (sel.t === "obj" || sel.t === "item") {
    const md = modelOf(it);
    const b = thingBox(it);
    const pos = sel.t === "obj"
      ? row(num("От левой границы, м", "sel.bx", b.x, "in-bx"), num("От красной линии, м", "sel.fromRed", S.plot.d - b.y - b.d, "in-fr"))
      : row(num("Центр от левого края, м", "sel.cx", it.x + it.w / 2, "in-cx"), num("Центр от верхнего края, м", "sel.cy", it.y + it.d / 2, "in-cy"));
    return sec(esc(it.name), `<p class="kind">${esc(md.name)}</p>` + nameIn +
      row3(num("Ширина, м", "sel.w", it.w, "in-w"), num("Глубина, м", "sel.d", it.d, "in-d"), num("Высота, м", "sel.h", it.h, "in-h")) +
      pos +
      row(num("Поворот, °", "sel.rot", it.rot || 0, "in-rot", 15), num("Над полом, м", "sel.z", it.z || 0, "in-z")) +
      `<div class="btns">${btn("rot-15", "↺ 15°")}${btn("rot", "↻ 90°")}${btn("focus", "Показать")}${btn("dup", "Копия")}${btn("del", "Удалить", "danger")}</div>` +
      `<p class="hint">Размер меняют квадратики на плане или клавиша 3 в 3D. Кружок над моделью крутит её, Alt даёт шаг 1°.</p>`) + (md.lamp ? lampSec(it) : "") + (md.fs ? fenceSecSec(it) : "") + (sel.t === "obj" && md.ops ? opsSec(it) : "") + matsSec(sel.t, it);
  }
  if (sel.t === "room") {
    const types = Object.keys(TYPES).map(t => `<option${t === it.type ? " selected" : ""}>${t}</option>`).join("");
    return sec(esc(it.name), nameIn +
      row(`<label class="f">Тип<select data-b="sel.type">${types}</select></label>`, `<div class="f area">Площадь<b>${fa(it.w * it.d)} м²</b></div>`) +
      row(num("Ширина, м", "sel.w", it.w, "in-w"), num("Глубина, м", "sel.d", it.d, "in-d")) +
      row(num("От левого края, м", "sel.x", it.x, "in-x"), num("От верхнего края, м", "sel.y", it.y, "in-y")) +
      `<label class="check"><input type="checkbox" data-b="sel.open"${it.open ? " checked" : ""}>Открытая зона, между открытыми нет стен</label>` +
      wallsList(it) +
      `<div class="btns">${btn("add-door", "Дверь в комнату")}${btn("add-win", "Окно")}</div>` +
      `<div class="btns">${btn("rot", "Повернуть на 90°")}${btn("focus", "Показать")}${btn("dup", "Копия")}${btn("del", "Удалить", "danger")}</div>` +
      `<p class="hint">Двери, окна и мебель в комнате ездят и крутятся вместе с ней.</p>`) + matsSec("room", it);
  }
  if (sel.t === "door") {
    const kinds = Object.entries(DOOR_KINDS).map(([key, v]) => `<option value="${key}"${key === it.kind ? " selected" : ""}>${v}</option>`).join("");
    const opts = sideOptions(it);
    const swing = (it.kind === "door" || it.kind === "entry") && opts
      ? row(`<label class="f">Открывается<select data-b="sel.side">${opts.map(([v, l]) => `<option value="${v}"${v === it.side ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`,
        `<label class="f">Петли<select data-b="sel.hinge"><option value="0"${it.hinge ? "" : " selected"}>С одной стороны</option><option value="1"${it.hinge ? " selected" : ""}>С другой стороны</option></select></label>`)
      : "";
    const real = it.kind === "door" || it.kind === "entry";
    const ops = Object.entries(DOOR_OPS).map(([key, v]) => `<option value="${key}"${key === it.op ? " selected" : ""}>${v}</option>`).join("");
    const lfs = Object.entries(LEAFS).map(([key, v]) => `<option value="${key}"${key === it.leaf ? " selected" : ""}>${v}</option>`).join("");
    const mech = real ? row(`<label class="f">Как открывается<select data-b="sel.op">${ops}</select></label>`, `<label class="f">Полотно<select data-b="sel.leaf">${lfs}</select></label>`) + openRow(it.open, "toggle-open") : "";
    const full = !real ? `<div class="btns">${btn("door-full", "На всю стену")}</div><p class="hint">Проём оставляет стену над собой. Чтобы убрать стену целиком, выбери комнату и нажми «Убрать стену» у соседа или возьми инструмент «Убрать стену» слева.</p>` : "";
    return sec(esc(doorLabel(it)),
      row(`<label class="f">Что это<select data-b="sel.kind">${kinds}</select></label>`, num("Ширина, м", "sel.w", it.w, "in-w")) +
      swing + mech + full +
      `<div class="btns">${btn("rot", "Следующий вариант (R)")}${btn("focus", "Показать")}${btn("dup", "Копия")}${btn("del", "Удалить", "danger")}</div>` +
      `<p class="hint">Высота всех проёмов задаётся в параметрах дома, сейчас ${fm(S.house.doorH)} м. Арка круглая, её верх на этой высоте.</p>`) + matsSec("door", it);
  }
  if (sel.t === "win") {
    const ops = Object.entries(WIN_OPS).map(([key, v]) => `<option value="${key}"${key === it.op ? " selected" : ""}>${v}</option>`).join("");
    const ns = [[0, "Сколько влезет"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]].map(([v, l]) => `<option value="${v}"${v === it.n ? " selected" : ""}>${l}</option>`).join("");
    const how = it.op === "tiltturn" ? row(`<label class="f">Как открыть сейчас<select data-b="sel.how"><option value="turn"${it.how === "turn" ? " selected" : ""}>Распахнуть</option><option value="tilt"${it.how === "tilt" ? " selected" : ""}>Откинуть</option></select></label>`) : "";
    return sec(esc(winLabel(it)),
      row(num("Ширина, м", "sel.w", it.w, "in-w"), num("Высота окна, м", "sel.h", it.h, "in-h")) +
      row(num("Подоконник от пола, м", "sel.sill", it.sill, "in-sill"), `<label class="f">Створок<select data-b="sel.n">${ns}</select></label>`) +
      row(`<label class="f">Как открывается<select data-b="sel.op">${ops}</select></label>`) + how +
      (it.op !== "fixed" ? openRow(it.open, "toggle-open") : "") +
      `<div class="btns">${btn("wp-std", "1,5 × 1,4")}${btn("wp-pan", "В пол 1,8 × 2,1")}${btn("wp-lift", "Панорама с дверью 3 × 2,4")}${btn("wp-nar", "Узкое 0,6 × 1,4")}${btn("wp-wet", "Санузел 0,8 × 0,6")}</div>` +
      `<div class="btns">${btn("focus", "Показать")}${btn("dup", "Копия")}${btn("del", "Удалить", "danger")}</div>` +
      `<p class="hint">Окна ставятся только на наружные стены.</p>`) + matsSec("win", it);
  }
  return "";
}

function propsHTML() {
  let h = secSelected();
  if (!h) {
    h = `<section class="sec empty"><p class="hint">${tab === "plot"
      ? "Выбери дом или объект на плане или в 3D. Новые объекты бери из каталога."
      : "Выбери комнату, проём, окно или мебель. Комнату рисуй инструментом «Комната», проёмы ставь кликом по стене."}</p></section>`;
  }
  if (tab === "plot") {
    h += sec("Объекты на участке", listHTML(S.objects, "obj", o => o.name, o => fm(o.w) + " × " + fm(o.d) + " м", o => FILL[modelOf(o).g || "other"]) +
      `<div class="btns">${btn("open-cat", "Добавить из каталога", "primary")}</div>`);
    if (!(sel && sel.t === "house")) h += sec("Дом", `<div class="btns">${btn("pick-house", "Выбрать дом")}${btn("rot-house", "Повернуть на 90°")}</div>`);
  } else {
    h += sec("Комнаты", listHTML(S.rooms, "room", r => r.name, r => fa(r.w * r.d) + " м²", r => FILL[grp(r)]));
    h += sec("Двери, проёмы и арки", listHTML(S.doors, "door", doorLabel, d => fm(d.w) + " м"));
    h += sec("Окна", listHTML(S.windows, "win", winLabel, w => fm(w.w) + " × " + fm(w.h) + " м"));
    h += sec("Мебель и техника", listHTML(S.items, "item", o => o.name, o => fm(o.w) + " × " + fm(o.d) + " м") +
      `<div class="btns">${btn("open-cat", "Добавить из каталога", "primary")}</div>`);
  }
  return h;
}

function catalogHTML() {
  const cats = [["all", "Все"]].concat(CATS);
  let h = `<div class="catbar"><input type="search" id="catq" placeholder="Поиск: диван, ель, унитаз" autocomplete="off"></div>`;
  h += `<div class="chips">${cats.map(([key, name]) => `<button type="button" class="chip" data-a="cat" data-cat="${key}" aria-pressed="${UIP.cat === key}">${name}</button>`).join("")}</div>`;
  h += `<div class="cards">`;
  for (const [key, M] of Object.entries(MODELS)) {
    if (UIP.cat !== "all" && M.cat !== UIP.cat) continue;
    const on = !!(tool && tool.t === "thing" && tool.kind === key);
    h += `<button type="button" class="card" data-a="cat-pick" data-kind="${key}" data-q="${esc((M.name + " " + key).toLowerCase())}" aria-pressed="${on}">` +
      `<span class="thumb" data-thumb="${key}"></span><span class="cn">${esc(M.name)}</span><span class="cs">${fm(M.w)} × ${fm(M.d)} × ${fm(M.h)} м</span></button>`;
  }
  h += `</div><p class="hint">Кликни модель, потом место на плане или в 3D. Внутри дома модель встанет в дом, снаружи на участок. Размер и поворот потом меняются как угодно.</p>`;
  return h;
}

function projectHTML() {
  let h = sec("Итоги", `<dl class="stats" id="stats"></dl><div id="warns"></div>`);
  if (tab === "plot") {
    h += sec("Участок", row(num("Ширина вдоль улицы, м", "plot.w", S.plot.w), num("Глубина, м", "plot.d", S.plot.d)));
    h += sec("Отступы от границ", row3(num("От улицы, м", "plot.street", S.plot.street), num("Сбоку, м", "plot.side", S.plot.side), num("Сзади, м", "plot.back", S.plot.back)) + `<p class="hint">Дом должен стоять внутри штриховки.</p>`);
    h += plotFenceSec();
    h += sunSec();
  } else {
    const Hs = S.house;
    h += sec("Параметры дома",
      row(num("Наружные стены, м", "house.wall", Hs.wall), num("Перегородки, м", "house.inner", Hs.inner)) +
      row(num("Высота потолка, м", "house.h", Hs.h), num("Цоколь, м", "house.base", Hs.base)) +
      row(num("Высота проёмов, м", "house.doorH", Hs.doorH)));
    h += roofSec();
    h += sec("Свет в доме", `<label class="check"><input type="checkbox" data-b="house.autoLights"${Hs.autoLights ? " checked" : ""}>Потолочный свет в каждой комнате сам</label>` +
      `<p class="hint">В сумерках и ночью в комнатах загорается потолочный свет по площади и типу комнаты. Если поставить в комнату свою люстру или подвес из каталога, её свет заменит автоматический. Общий выключатель внизу 3D-вида.</p>`);
    h += matsSec("house", S.house, "Отделка дома");
  }
  return h;
}

function roofSec() {
  const Hs = S.house;
  const opt = (map, cur) => Object.entries(map).map(([key, v]) => `<option value="${key}"${key === cur ? " selected" : ""}>${v}</option>`).join("");
  const t = Hs.roof;
  const flat = t === "flat";
  const gableEnds = t === "gable" || t === "gambrel" || t === "shed" || t === "halfhip";
  let second = "<span></span>";
  if (t === "shed") second = `<label class="f">Низкая сторона<select data-b="house.low">${opt({f: "Сторона улицы", b: "Задняя", l: "Левая", r: "Правая"}, Hs.low)}</select></label>`;
  else if (!flat && t !== "pyramid") second = `<label class="f">Конёк<select data-b="house.ridge">${opt({long: "Вдоль длинной стороны", short: "Вдоль короткой стороны"}, Hs.ridge)}</select></label>`;
  let body = row(`<label class="f">Тип крыши<select data-b="house.roof">${opt(ROOFS, t)}</select></label>`, second);
  if (!flat) {
    const extra = t === "gambrel" ? num("Уклон верха, °", "house.pitch2", Hs.pitch2, null, 1) : t === "halfhip" ? num("Вальма, доля высоты", "house.hipCut", Hs.hipCut, null, 0.05) : "<span></span>";
    body += row(num(t === "gambrel" ? "Уклон низа, °" : "Уклон, °", "house.pitch", Hs.pitch, null, 1), extra);
    body += row(num("Свес по карнизу, м", "house.over", Hs.over), gableEnds ? num("Свес по фронтону, м", "house.overG", Hs.overG) : "<span></span>");
    body += `<label class="check"><input type="checkbox" data-b="house.gutters"${Hs.gutters ? " checked" : ""}>Водостоки и трубы</label>`;
  }
  body += `<label class="check"><input type="checkbox" data-b="house.chim"${Hs.chim ? " checked" : ""}>Дымоход</label>`;
  if (Hs.chim) body += row3(num("От левого края, м", "house.chx", Hs.chx), num("От верхнего края, м", "house.chy", Hs.chy), num("Над коньком, м", "house.chh", Hs.chh));
  body += `<p class="hint">Крыша видна в 3D в режиме «С крышей», на плане участка пунктиром показан свес и линии конька. Материал кровли меняется в «Отделке дома».</p>`;
  return sec("Крыша", body);
}

function renderPanel() {
  document.querySelectorAll("#ptabs [data-p]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === UIP.ptab)));
  if (UIP.ptab === "cat" && panel.dataset.p === "cat" && panel.dataset.cat === UIP.cat) {
    panel.querySelectorAll(".card").forEach(c => c.setAttribute("aria-pressed", String(!!(tool && tool.t === "thing" && tool.kind === c.dataset.kind))));
    updateLive();
    return;
  }
  const keep = panel.scrollTop;
  const same = panel.dataset.p === UIP.ptab;
  let h;
  if (UIP.ptab === "cat") h = catalogHTML();
  else if (UIP.ptab === "proj") h = projectHTML();
  else h = propsHTML();
  panel.innerHTML = h;
  panel.dataset.p = UIP.ptab;
  panel.dataset.cat = UIP.cat;
  if (same) panel.scrollTop = keep;
  if (UIP.ptab === "cat") {
    const q = $("#catq");
    if (q && panel.dataset.q) {
      q.value = panel.dataset.q;
      filterCat(q.value);
    }
    fillThumbs();
  }
  updateLive();
  fillSwatches(panel);
  matPopSync();
}

function filterCat(q) {
  const s = q.trim().toLowerCase();
  panel.dataset.q = q;
  panel.querySelectorAll(".card").forEach(c => {
    c.hidden = !!s && c.dataset.q.indexOf(s) < 0;
  });
}

function fillThumbs() {
  const els = [...panel.querySelectorAll("[data-thumb]")].filter(el => !el.dataset.done);
  let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < els.length && performance.now() - t0 < 24) {
      const el = els[i++];
      const url = typeof thumbFor === "function" ? thumbFor(el.dataset.thumb) : null;
      el.dataset.done = "1";
      if (url) el.style.backgroundImage = `url("${url}")`;
      else el.classList.add("nothumb");
    }
    if (i < els.length) setTimeout(step, 16);
  };
  setTimeout(step, 30);
}

function updateLive() {
  const st = document.getElementById("stats");
  const wr = document.getElementById("warns");
  const w = warnings();
  if (st) st.innerHTML = (tab === "plot" ? plotStats() : houseStats()).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("");
  if (wr) wr.innerHTML = w.length ? w.map(x => `<p class="warn">${esc(x)}</p>`).join("") : `<p class="ok">Ошибок не нашёл.</p>`;
  const bd = $("#wbadge");
  if (bd) {
    bd.textContent = w.length ? String(w.length) : "";
    bd.hidden = !w.length;
  }
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = r2(v);
  };
  const it = selItem();
  if (it) {
    set("in-x", it.x);
    set("in-y", it.y);
    set("in-w", it.w);
    set("in-d", it.d);
    if (it.h !== undefined) set("in-h", it.h);
    if (sel.t === "win") set("in-sill", it.sill);
    if (sel.t === "obj" || sel.t === "item") {
      const b = thingBox(it);
      set("in-bx", b.x);
      set("in-fr", S.plot.d - b.y - b.d);
      set("in-cx", it.x + it.w / 2);
      set("in-cy", it.y + it.d / 2);
      set("in-rot", it.rot || 0);
      set("in-z", it.z || 0);
    }
  }
  if (sel && sel.t === "house") {
    const f = footprint();
    if (f) {
      set("in-hx", f.x);
      set("in-hy", S.plot.d - f.y - f.d);
    }
  }
}

function hintText() {
  if (tool) return HINT[tool.t] || "";
  return HINT[tab];
}

function syncTools() {
  const cur = tool ? (tool.t === "open" ? tool.kind : tool.t === "thing" ? (tool.kind === "person" ? "person" : "catalog") : tool.t) : "select";
  document.querySelectorAll("#rail [data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === cur)));
  document.querySelectorAll("#rail [data-g], #gmodes [data-g]").forEach(b => b.setAttribute("aria-pressed", String(!tool && b.dataset.g === gmode)));
  document.body.classList.toggle("placing", !!tool);
  const ht = $("#hint");
  const txt = hintText();
  if (ht && ht.textContent !== txt) {
    ht.textContent = txt;
    ht.classList.add("show");
    clearTimeout(ht.hideT);
    ht.hideT = setTimeout(() => ht.classList.remove("show"), 8000);
  }
  const t3 = $("#toolchip");
  if (t3) {
    const nm = tool ? (tool.t === "room" ? "Комната" : tool.t === "wall" ? "Убрать или вернуть стену" : tool.t === "open" ? TOOLNAMES[tool.kind] : (MODELS[tool.kind] || MODELS.other).name) : "";
    t3.hidden = !tool;
    t3.querySelector("span").textContent = nm;
  }
}

function setTool(t) {
  tool = t;
  ghost2 = null;
  if (typeof clearGhost === "function" && GH.root) clearGhost();
  if (t && (t.t === "room" || t.t === "open" || t.t === "wall") && tab !== "house") {
    tab = "house";
    sel = null;
    frozen = null;
    renderAll();
    return;
  }
  syncTools();
  render2D();
  if (UIP.ptab === "cat") renderPanel();
  V.need = true;
}

function setGmode(m) {
  gmode = m;
  if (tool) setTool(null);
  syncTools();
  saveUI();
  V.need = true;
}

function renderAll() {
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
  document.querySelectorAll("#viewsw button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  $("#snap").value = String(S.snap);
  render2D();
  renderPanel();
  updUndo();
  syncTools();
  schedule3D();
  if (V.scene && V.ok) applySky();
}

function updUndo() {
  $("#undo").disabled = !hist.length;
  $("#redo").disabled = !redoStack.length;
}

function applyBind(el) {
  const b = el.dataset.b;
  const it = selItem();
  if (b === "sel.open" && el.type === "checkbox") {
    if (!it) return false;
    it.open = el.checked;
    return true;
  }
  if (b === "sel.name") {
    if (!it) return false;
    it.name = el.value.slice(0, 40) || "Без названия";
    return true;
  }
  if (b === "sel.type") {
    if (!it || !has(TYPES, el.value)) return false;
    it.type = el.value;
    return true;
  }
  if (b === "sel.kind") {
    if (!it || !has(DOOR_KINDS, el.value)) return false;
    it.kind = el.value;
    return true;
  }
  if (b === "sel.op") {
    if (!it) return false;
    const list = sel.t === "win" ? WIN_OPS : DOOR_OPS;
    if (!has(list, el.value)) return false;
    it.op = el.value;
    if (sel.t === "win" && it.op === "lift" && !it.n) it.n = 2;
    return true;
  }
  if (b === "sel.leaf") {
    if (!it || !has(LEAFS, el.value)) return false;
    it.leaf = el.value;
    return true;
  }
  if (b === "sel.n") {
    if (!it) return false;
    const v = parseInt(el.value, 10);
    it.n = [0, 1, 2, 3, 4].includes(v) ? v : 0;
    return true;
  }
  if (b === "sel.how") {
    if (!it) return false;
    it.how = el.value === "tilt" ? "tilt" : "turn";
    return true;
  }
  if (b === "sel.open") {
    if (!it) return false;
    it.open = clamp((parseFloat(el.value) || 0) / 100, 0, 1);
    animTo(sel.t === "obj" ? animKey("obj", it.id, "gate") : animKey(sel.t, it.id), it.open);
    return true;
  }
  if (b === "fence.fs") {
    if (!it || !has(FENCES, el.value)) return false;
    it.fs = el.value;
    return true;
  }
  if (b.indexOf("pf.") === 0) return fenceBind(b, el);
  if (b.indexOf("op.") === 0) {
    if (!it || sel.t !== "obj") return false;
    const [, oid, f] = b.split(".");
    const op = ensureOpens(it).find(x => x.id === oid);
    if (!op) return false;
    if (f === "kind") {
      if (!has(OP_KINDS, el.value)) return false;
      Object.assign(op, newOp(el.value), {id: op.id, side: op.side, c: op.c});
      return true;
    }
    if (f === "side") {
      if (!has(OP_SIDES, el.value)) return false;
      op.side = el.value;
      return true;
    }
    if (f === "op") {
      if (!has(OP_OPS[op.kind], el.value)) return false;
      op.op = el.value;
      return true;
    }
    if (f === "hinge") {
      op.hinge = el.value === "1" ? 1 : 0;
      return true;
    }
    const v = parseFloat(String(el.value).replace(",", "."));
    if (!isFinite(v)) return false;
    if (f === "open") {
      op.open = clamp(v / 100, 0, 1);
      animTo(animKey("obj", it.id, op.id), op.open);
      return true;
    }
    const lim = {c: [-50, 50], w: [0.3, 20], h: [0.3, 10], sill: [0, 5]};
    if (!has(lim, f)) return false;
    op[f] = clamp(r2(v), lim[f][0], lim[f][1]);
    return true;
  }
  if (b === "lamp.on") {
    if (!it) return false;
    if (el.checked) delete it.on;
    else it.on = false;
    return true;
  }
  if (b === "lamp.k") {
    if (!it) return false;
    it.k = clamp(Math.round((Number(el.value) || 3000) / 100) * 100, 1800, 7000);
    return true;
  }
  if (b === "lamp.lm") {
    if (!it) return false;
    it.lm = clamp(Math.round(Number(el.value) || 800), 20, 20000);
    return true;
  }
  if (b === "house.autoLights") {
    S.house.autoLights = el.checked;
    return true;
  }
  if (b === "sel.side") {
    if (!it) return false;
    it.side = el.value === "-1" ? -1 : 1;
    return true;
  }
  if (b === "sel.hinge") {
    if (!it) return false;
    it.hinge = el.value === "1" ? 1 : 0;
    return true;
  }
  if (b === "house.roof") {
    if (!has(ROOFS, el.value)) return false;
    if (el.value === "gambrel" && S.house.pitch < 45) S.house.pitch = 60;
    if (el.value !== "gambrel" && S.house.roof === "gambrel" && S.house.pitch > 45) S.house.pitch = 30;
    if (el.value === "shed" && S.house.pitch > 20) S.house.pitch = 12;
    if (el.value !== "shed" && S.house.roof === "shed" && S.house.pitch < 20) S.house.pitch = 30;
    S.house.roof = el.value;
    return true;
  }
  if (b === "house.ridge") {
    S.house.ridge = el.value === "short" ? "short" : "long";
    return true;
  }
  if (b === "house.low") {
    if (!["f", "b", "l", "r"].includes(el.value)) return false;
    S.house.low = el.value;
    return true;
  }
  if (b === "house.gutters") {
    S.house.gutters = el.checked;
    return true;
  }
  if (b === "house.chim") {
    S.house.chim = el.checked;
    if (el.checked && !S.house.chx && !S.house.chy) {
      const r = S.rooms.find(x => x.type === "Котельная") || S.rooms[0];
      if (r) {
        S.house.chx = r2(r.x + r.w / 2);
        S.house.chy = r2(r.y + r.d / 2);
      }
    }
    return true;
  }
  if (b === "site.city") {
    const c = CITIES.find(x => x[0] === el.value);
    if (c) Object.assign(S.site, {city: c[0], lat: c[1], lon: c[2], tz: c[3]});
    else S.site.city = "";
    return true;
  }
  if (b.indexOf("site.") === 0) {
    const v = parseFloat(String(el.value).replace(",", "."));
    if (!isFinite(v)) return false;
    const f = b.slice(5);
    if (f === "lat") S.site.lat = clamp(Math.round(v * 1e4) / 1e4, -89, 89);
    else if (f === "lon") S.site.lon = clamp(Math.round(v * 1e4) / 1e4, -180, 180);
    else if (f === "tz") S.site.tz = clamp(Math.round(v), -12, 14);
    else if (f === "north") S.site.north = normDeg(v);
    else return false;
    if (f === "lat" || f === "lon") S.site.city = "";
    return true;
  }
  const v = parseFloat(String(el.value).replace(",", "."));
  if (!isFinite(v)) return false;
  const [a, f] = b.split(".");
  if (a === "plot") {
    S.plot[f] = f === "w" || f === "d" ? clamp(r2(v), 5, 300) : clamp(r2(v), 0, 300);
    return true;
  }
  if (a === "house") {
    const lim = {wall: [0.1, 1], inner: [0.05, 0.4], h: [2.2, 5], base: [0, 1.5], doorH: [1.8, 3], pitch: [5, 70], over: [0, 1.5], pitch2: [5, 45], overG: [0, 1.5], hipCut: [0.15, 0.7], chx: [-100, 100], chy: [-100, 100], chh: [0.2, 3]};
    if (has(lim, f)) {
      S.house[f] = clamp(r2(v), lim[f][0], lim[f][1]);
      return true;
    }
    const fp = footprint();
    if (!fp) return false;
    if (f === "left") S.house.cx = r2(v + fp.w / 2);
    if (f === "fromRed") S.house.cy = r2(S.plot.d - v - fp.d / 2);
    return true;
  }
  if (a !== "sel" || !it) return false;
  const isThing = sel.t === "obj" || sel.t === "item";
  if (f === "fromRed") {
    const bx = thingBox(it);
    it.y = r2(it.y + (S.plot.d - v - bx.d) - bx.y);
    return true;
  }
  if (f === "bx") {
    const bx = thingBox(it);
    it.x = r2(it.x + v - bx.x);
    return true;
  }
  if (f === "cx") {
    it.x = r2(v - it.w / 2);
    return true;
  }
  if (f === "cy") {
    it.y = r2(v - it.d / 2);
    return true;
  }
  if (f === "rot") {
    it.rot = normDeg(v);
    return true;
  }
  if (f === "z") {
    it.z = clamp(r2(v), 0, 20);
    return true;
  }
  if (f === "w" || f === "d") {
    const min = sel.t === "door" ? 0.5 : isThing ? 0.05 : 0.3;
    const sp = sel.t === "door" ? openingSpan(it) : null;
    const nv = clamp(r2(v), min, sel.t === "door" ? (sp ? Math.max(0.5, r2(sp.b - sp.a)) : 4) : sel.t === "win" ? 6 : 100);
    if (isThing) {
      const c = f === "w" ? it.x + it.w / 2 : it.y + it.d / 2;
      it[f] = nv;
      if (f === "w") it.x = r2(c - nv / 2);
      else it.y = r2(c - nv / 2);
    } else it[f] = nv;
    return true;
  }
  if (f === "h") {
    it.h = sel.t === "win" ? clamp(r2(v), 0.3, 3) : clamp(r2(v), 0.01, 20);
    return true;
  }
  if (f === "sill") {
    it.sill = clamp(r2(v), 0, 2.5);
    return true;
  }
  it[f] = r2(v);
  return true;
}

panel.addEventListener("input", e => {
  const el = e.target;
  if (el.id === "catq") {
    filterCat(el.value);
    return;
  }
  if (!el.dataset || !el.dataset.b || el.tagName === "SELECT") return;
  if (el.type === "range" && el.dataset.b === "lamp.lm") {
    if (applyBind(el)) {
      const sp = el.closest(".f") && el.closest(".f").querySelector("b");
      if (sp) sp.textContent = el.value + " лм";
      schedule3D();
      save();
    }
    return;
  }
  if (el.type === "range" && /\.open$/.test(el.dataset.b)) {
    if (applyBind(el)) {
      const lb = el.closest(".f");
      const sp = lb && lb.querySelector("b");
      if (sp) sp.textContent = el.value + "%";
      save();
    }
    return;
  }
  if (applyBind(el)) {
    render2D();
    updateLive();
    schedule3D();
    save();
  }
});

panel.addEventListener("change", e => {
  const el = e.target;
  if (!el.dataset || !el.dataset.b) return;
  applyBind(el);
  changed();
});

function lampSec(it) {
  const L = lampDef(it);
  const K = lampTemp(it);
  const lm = lampLm(it);
  const tl = Object.assign({}, LAMP_TEMPS);
  if (!has(tl, String(K))) tl[K] = K + " K";
  const temps = Object.entries(tl).map(([key, v]) => `<option value="${key}"${Number(key) === K ? " selected" : ""}>${v}</option>`).join("");
  const top = Math.max(L.lm * 4, lm);
  const why = LAMP.lit ? "" : LAMP.mode === "off" ? "Сейчас весь свет выключен внизу 3D-вида. " : "Сейчас светло, лампы включатся в сумерках или кнопкой «Свет вкл.» внизу 3D-вида. ";
  return sec("Свет", `<label class="check"><input type="checkbox" data-b="lamp.on"${it.on !== false ? " checked" : ""}>Лампа включена</label>` +
    row(`<label class="f">Цвет света<select data-b="lamp.k">${temps}</select></label>`, `<label class="f">Яркость <b>${lm} лм</b><input type="range" min="50" max="${top}" step="50" data-b="lamp.lm" value="${lm}"></label>`) +
    `<p class="hint">${why}Двойной клик по лампе в 3D или клик в прогулке щёлкает выключателем.</p>`);
}

function openRow(v, act) {
  const pc = Math.round((v || 0) * 100);
  return row(`<label class="f">Открыто <b>${pc}%</b><input type="range" min="0" max="100" step="5" data-b="sel.open" value="${pc}"></label>`,
    `<div class="f"><span>&nbsp;</span>${btn(act, v > 0.05 ? "Закрыть" : "Открыть")}</div>`);
}

function newOp(kind) {
  const k = has(OP_KINDS, kind) ? kind : "door";
  const D = {gate: [2.5, 2.2, 0], door: [0.9, 1.9, 0], win: [0.8, 0.8, 1]}[k];
  return {id: uid(), kind: k, side: "f", c: 0, w: D[0], h: D[1], sill: D[2], op: Object.keys(OP_OPS[k])[0], open: 0, hinge: 0};
}

function opsSec(o) {
  const list = opsOf(o);
  const opt = (map, cur) => Object.entries(map).map(([key, v]) => `<option value="${key}"${key === cur ? " selected" : ""}>${v}</option>`).join("");
  const rows = list.map((op, i) => {
    const b = f => `op.${op.id}.${f}`;
    const extra = op.kind === "win"
      ? num("Над полом, м", b("sill"), op.sill)
      : op.kind === "door" ? `<label class="f">Петли<select data-b="${b("hinge")}"><option value="0"${op.hinge ? "" : " selected"}>Слева</option><option value="1"${op.hinge ? " selected" : ""}>Справа</option></select></label>` : "<span></span>";
    const pc = Math.round(op.open * 100);
    return `<div class="opbox"><div class="optitle">${i + 1}. ${OP_KINDS[op.kind]}</div>` +
      row(`<label class="f">Что<select data-b="${b("kind")}">${opt(OP_KINDS, op.kind)}</select></label>`, `<label class="f">Стена<select data-b="${b("side")}">${opt(OP_SIDES, op.side)}</select></label>`) +
      row3(num("От центра стены, м", b("c"), op.c), num("Ширина, м", b("w"), op.w), num("Высота, м", b("h"), op.h)) +
      row(`<label class="f">Как открывается<select data-b="${b("op")}">${opt(OP_OPS[op.kind], op.op)}</select></label>`, extra) +
      (op.op !== "fixed" ? row(`<label class="f">Открыто <b>${pc}%</b><input type="range" min="0" max="100" step="5" data-b="${b("open")}" value="${pc}"></label>`, `<div class="f"><span>&nbsp;</span><div class="btns tight">${btn("op-toggle", op.open > 0.05 ? "Закрыть" : "Открыть", "", ` data-id="${esc(op.id)}"`)}${btn("op-del", "Удалить", "danger", ` data-id="${esc(op.id)}"`)}</div></div>`) : `<div class="btns">${btn("op-del", "Удалить", "danger", ` data-id="${esc(op.id)}"`)}</div>`) +
      `</div>`;
  }).join("");
  return sec("Ворота, двери и окна", (rows || `<p class="hint">Проёмов нет, постройка глухая.</p>`) +
    `<div class="btns">${btn("op-add", "Ворота", "", ` data-k="gate"`)}${btn("op-add", "Дверь", "", ` data-k="door"`)}${btn("op-add", "Окно", "", ` data-k="win"`)}</div>` +
    `<p class="hint">«От центра стены» считается вправо, если смотреть на стену снаружи. Двойной клик по воротам в 3D открывает их.</p>`);
}

function winPreset(it, w, h, sill) {
  it.w = w;
  it.h = h;
  it.sill = sill;
}

panel.addEventListener("click", e => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a;
  let ch = false;
  const it = selItem();
  if (a === "mat") {
    openMatPop(b.dataset.t, b.dataset.id, b.dataset.slot, b);
    return;
  }
  if (a === "mat-reset") {
    const o = matObj(b.dataset.t, b.dataset.id);
    if (o && o.mats) {
      delete o.mats;
      changed();
    }
    return;
  }
  if (a === "pick") {
    sel = {t: b.dataset.k, id: b.dataset.id};
  } else if (a === "pick-house") {
    sel = {t: "house"};
  } else if (a === "rot-house") {
    S.house.rot = (S.house.rot + 90) % 360;
    ch = true;
  } else if (a === "rot") {
    ch = rotateSel();
  } else if (a === "rot-15") {
    if (it) {
      it.rot = normDeg((it.rot || 0) - 15);
      ch = true;
    }
  } else if (a === "focus") {
    if (view === "2d") {
      view = "split";
      applyView();
    }
    setTimeout(focusSel, 30);
  } else if (a === "open-cat") {
    UIP.ptab = "cat";
    saveUI();
    panel.scrollTop = 0;
  } else if (a === "cat") {
    UIP.cat = b.dataset.cat;
  } else if (a === "cat-pick") {
    const kind = b.dataset.kind;
    if (tool && tool.t === "thing" && tool.kind === kind) setTool(null);
    else setTool({t: "thing", kind});
    return;
  } else if (a === "add-door" || a === "add-win") {
    const kind = a === "add-win" ? "win" : "door";
    const o = addOpening(kind);
    if (o) {
      if (kind === "win") S.windows.push(o);
      else S.doors.push(o);
      sel = {t: kind === "win" ? "win" : "door", id: o.id};
      ch = true;
    } else {
      setStatus("Не нашёл свободной стены у этой комнаты");
    }
  } else if (a === "toggle-open") {
    if (sel) toggleOpen({t: sel.t, id: sel.id});
    return;
  } else if (a === "wall-toggle") {
    const q = S.rooms.find(x => x.id === b.dataset.id);
    if (it && q && sel.t === "room") {
      setNoWall(it, q, !wallGone(it, q));
      ch = true;
    }
  } else if (a === "door-full") {
    const sp = it && sel.t === "door" ? openingSpan(it) : null;
    if (sp) {
      it.w = r2(sp.b - sp.a);
      if (it.o === "h") it.x = r2((sp.a + sp.b) / 2);
      else it.y = r2((sp.a + sp.b) / 2);
      ch = true;
    }
  } else if (a === "gate-toggle") {
    if (sel && sel.t === "obj") toggleOpen({t: "obj", id: sel.id, gate: true});
    return;
  } else if (a === "pf-gate" || a === "pf-wicket") {
    toggleFence({t: "fence", part: a === "pf-gate" ? "gate" : "wicket"});
    renderPanel();
    return;
  } else if (a === "op-toggle") {
    if (sel && sel.t === "obj") toggleOpen({t: "obj", id: sel.id, open: b.dataset.id});
    return;
  } else if (a === "op-add" && it && sel.t === "obj") {
    const list = ensureOpens(it);
    const used = new Set(list.map(x => x.side));
    const side = ["f", "r", "l", "b"].find(x => !used.has(x)) || "f";
    list.push(Object.assign(newOp(b.dataset.k), {side}));
    ch = true;
  } else if (a === "op-del" && it && sel.t === "obj") {
    it.opens = ensureOpens(it).filter(x => x.id !== b.dataset.id);
    ch = true;
  } else if (a.indexOf("wp-") === 0 && it) {
    const P = {"wp-std": [1.5, 1.4, 0.8], "wp-pan": [1.8, 2.1, 0], "wp-lift": [3, 2.4, 0], "wp-nar": [0.6, 1.4, 0.8], "wp-wet": [0.8, 0.6, 1.4]}[a];
    if (P) {
      winPreset(it, P[0], Math.min(P[1], S.house.h - P[2] - 0.02), P[2]);
      if (a === "wp-lift") {
        it.op = "lift";
        it.n = 2;
      }
      ch = true;
    }
  } else if (a === "north-l" || a === "north-r") {
    S.site.north = normDeg(S.site.north + (a === "north-r" ? 15 : -15));
    ch = true;
  } else if (a === "sky-path") {
    skySet({path: !SKY.path});
  } else if (a === "dup") {
    ch = dupSel();
  } else if (a === "del") {
    delSel();
    ch = true;
  }
  if (ch) changed();
  else renderAll();
});

function closeMenus(except) {
  document.querySelectorAll(".menu .pop").forEach(p => {
    if (p !== except) p.hidden = true;
  });
  document.querySelectorAll(".menu > button").forEach(bt => bt.setAttribute("aria-expanded", String(!!except && bt.nextElementSibling === except)));
}

document.addEventListener("click", e => {
  const mb = e.target.closest(".menu > button");
  if (mb) {
    const pop = mb.nextElementSibling;
    const open = pop.hidden;
    closeMenus(open ? pop : null);
    pop.hidden = !open;
    return;
  }
  if (!e.target.closest(".menu .pop")) closeMenus();
});

function menuAction(a, el) {
  if (a === "new") {
    wizOpen();
  } else if (a === "save-json") {
    download(new Blob([JSON.stringify({plan: S}, null, 1)], {type: "application/json"}), `plan-doma-${stamp()}.json`);
    setStatus("Файл плана скачан");
  } else if (a === "open-json") {
    $("#file").click();
  } else if (a.indexOf("preset:") === 0) {
    const key = a.slice(7);
    if (!PRESETS[key]) return;
    if (el.dataset.arm && Date.now() - Number(el.dataset.arm) < 3000) {
      el.dataset.arm = "";
      el.querySelector("small").textContent = "";
      S = PRESETS[key][1]();
      sel = null;
      setTool(null);
      V2.plot = {z: 1, ox: 0, oy: 0};
      V2.house = {z: 1, ox: 0, oy: 0};
      closeMenus();
      changed();
      camPreset("iso");
      setStatus("Загружен шаблон «" + PRESETS[key][0] + "»");
      return;
    }
    el.dataset.arm = String(Date.now());
    el.querySelector("small").textContent = "нажми ещё раз, текущий план заменится";
    setTimeout(() => {
      if (el.dataset.arm && Date.now() - Number(el.dataset.arm) >= 2900) {
        el.dataset.arm = "";
        el.querySelector("small").textContent = "";
      }
    }, 3000);
    return;
  } else if (a === "plan-png") {
    exportPlanPNG();
  } else if (a === "plan-svg") {
    exportPlanSVG();
  } else if (a === "shot") {
    snapshotHQ();
  } else if (a === "zip") {
    exportZip();
  } else if (a === "print") {
    printSheet();
  }
  closeMenus();
}

document.querySelectorAll(".menu .pop").forEach(pop => pop.addEventListener("click", e => {
  const el = e.target.closest("[data-m]");
  if (el) menuAction(el.dataset.m, el);
}));

document.addEventListener("keydown", e => {
  if (V.walk) return;
  const tag = (e.target.tagName || "").toLowerCase();
  const isTyping = tag === "input" || tag === "select" || tag === "textarea";
  const mod = e.ctrlKey || e.metaKey;
  if (e.code === "Space" && !isTyping) {
    spaceDown = true;
    if (!IN.hover) e.preventDefault();
  }
  if (mod && !isTyping && (e.key === "z" || e.key === "Z" || e.key === "я" || e.key === "Я")) {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && !isTyping && (e.key === "y" || e.key === "Y" || e.key === "н" || e.key === "Н")) {
    e.preventDefault();
    redo();
    return;
  }
  if (mod && !isTyping && e.code === "KeyD") {
    e.preventDefault();
    if (sel && dupSel()) changed();
    return;
  }
  if (isTyping || mod) return;
  if (e.key === "Escape") {
    closeMenus();
    if (tool) setTool(null);
    else if (sel) {
      sel = null;
      renderAll();
    }
    return;
  }
  if (e.code === "Digit1" || e.code === "Numpad1") {
    setGmode("move");
    return;
  }
  if (e.code === "Digit2" || e.code === "Numpad2") {
    setGmode("rotate");
    return;
  }
  if (e.code === "Digit3" || e.code === "Numpad3") {
    setGmode("scale");
    return;
  }
  if (e.code === "KeyV") {
    setTool(null);
    return;
  }
  if (e.code === "KeyF") {
    e.preventDefault();
    focusSel();
    return;
  }
  if (!sel) return;
  const moves = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
  if (moves[e.key]) {
    e.preventDefault();
    if (moveSel(moves[e.key][0], moves[e.key][1], S.snap * (e.shiftKey ? 10 : 1))) changed();
  } else if (e.code === "KeyR") {
    e.preventDefault();
    if (rotateSel()) changed();
  } else if ((e.key === "Delete" || e.key === "Backspace") && sel.t !== "house") {
    e.preventDefault();
    delSel();
    changed();
  }
});

document.addEventListener("keyup", e => {
  if (e.code === "Space") spaceDown = false;
});

document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => {
  tab = b.dataset.tab;
  sel = null;
  frozen = null;
  if (tool && (tool.t === "room" || tool.t === "open" || tool.t === "wall") && tab !== "house") tool = null;
  renderAll();
}));

function applyView() {
  $("#views").className = "views v-" + view;
  frozen = null;
  saveUI();
  renderAll();
  size3D();
}

document.querySelectorAll("#viewsw button").forEach(b => b.addEventListener("click", () => {
  view = b.dataset.view;
  applyView();
}));

document.querySelectorAll("#ptabs [data-p]").forEach(b => b.addEventListener("click", () => {
  UIP.ptab = b.dataset.p;
  saveUI();
  renderPanel();
}));

document.querySelectorAll("#rail [data-tool]").forEach(b => b.addEventListener("click", () => {
  const t = b.dataset.tool;
  if (t === "select") setTool(null);
  else if (t === "room") setTool(tool && tool.t === "room" ? null : {t: "room"});
  else if (t === "catalog") {
    UIP.ptab = "cat";
    if (!UIP.side) setSide(true);
    saveUI();
    renderPanel();
  } else if (t === "person") setTool(tool && tool.t === "thing" && tool.kind === "person" ? null : {t: "thing", kind: "person"});
  else if (t === "wall") setTool(tool && tool.t === "wall" ? null : {t: "wall"});
  else setTool(tool && tool.t === "open" && tool.kind === t ? null : {t: "open", kind: t});
}));

document.querySelectorAll("#rail [data-g], #gmodes [data-g]").forEach(b => b.addEventListener("click", () => setGmode(b.dataset.g)));

const tc = $("#toolchip button");
if (tc) tc.addEventListener("click", () => setTool(null));

$("#snap").addEventListener("change", e => {
  const v = parseFloat(e.target.value);
  if ([0.05, 0.1, 0.5].includes(v)) {
    S.snap = v;
    changed();
  }
});

$("#qual").addEventListener("change", e => {
  setQuality(e.target.value);
  saveUI();
});

$("#wheel").addEventListener("change", e => {
  UIP.wheel = ["auto", "mouse", "pad"].includes(e.target.value) ? e.target.value : "auto";
  saveUI();
});

$("#pad2").addEventListener("change", e => {
  UIP.pad2 = e.target.value === "pan" ? "pan" : "orbit";
  saveUI();
});

$("#padk").addEventListener("change", e => {
  const v = Number(e.target.value);
  UIP.padk = [0.5, 0.75, 1, 1.5, 2].includes(v) ? v : 1;
  saveUI();
});

document.querySelectorAll("[data-z]").forEach(b => b.addEventListener("click", () => {
  const z = b.dataset.z;
  if (z === "in") zoom2D(1.25);
  else if (z === "out") zoom2D(0.8);
  else fit2D();
}));

$("#undo").addEventListener("click", undo);
$("#redo").addEventListener("click", redo);

$("#file").addEventListener("change", e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(String(rd.result));
      const p = sanitize(d && d.plan ? d.plan : d);
      if (!p) throw new Error("bad");
      S = p;
      sel = null;
      changed();
      camPreset("iso");
      setStatus("План загружен из файла");
    } catch (err) {
      setStatus("Это не файл плана, открыть не получилось");
    }
  };
  rd.readAsText(f);
  e.target.value = "";
});

function sync3DButtons() {
  document.querySelectorAll("#modes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === V.mode)));
  document.querySelectorAll("#toggles button[data-tg]").forEach(b => b.setAttribute("aria-pressed", String(!!V[b.dataset.tg])));
  const cb = $("#cutbar");
  if (cb) cb.hidden = V.mode !== "cut";
  const cs = $("#cutside");
  if (cs) cs.value = V.cut.side;
  const cp = $("#cutpos");
  if (cp) cp.value = String(V.cut.t);
  const wh = $("#wheel");
  if (wh) wh.value = UIP.wheel;
  const p2 = $("#pad2");
  if (p2) p2.value = UIP.pad2;
  const pk = $("#padk");
  if (pk) pk.value = String(UIP.padk);
  const sb = $("#sunbar");
  if (sb) sb.hidden = !V.sunbar;
  const q = $("#qual");
  if (q) q.value = RF.q;
}

document.querySelectorAll("#modes button").forEach(b => b.addEventListener("click", () => {
  V.mode = b.dataset.mode;
  sync3DButtons();
  saveUI();
  schedule3D();
}));

document.querySelectorAll("#toggles button[data-tg]").forEach(b => b.addEventListener("click", () => {
  const t = b.dataset.tg;
  V[t] = !V[t];
  sync3DButtons();
  saveUI();
  schedule3D();
}));

$("#cutside").addEventListener("change", e => {
  V.cut.side = e.target.value;
  if (V.cut.side === "top" && V.cut.t > 0.95) V.cut.t = 0.43;
  sync3DButtons();
  saveUI();
  schedule3D();
});

$("#cutpos").addEventListener("input", e => {
  V.cut.t = clamp(parseFloat(e.target.value) || 0, 0, 1);
  saveUI();
  schedule3D();
});

$("#camsel").addEventListener("change", e => {
  const v = e.target.value;
  e.target.value = "";
  if (v) camPreset(v);
});

document.querySelectorAll("#cams [data-cam]").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.cam === "walk" && V.walk) exitWalk();
  else camPreset(b.dataset.cam);
}));

$("#shot").addEventListener("click", () => snapshotHQ());

$("#help").addEventListener("click", () => {
  const h = $("#help3");
  h.hidden = !h.hidden;
});

const TIPX = {el: null, timer: 0, cur: null};

function tipHide() {
  clearTimeout(TIPX.timer);
  TIPX.cur = null;
  if (TIPX.el) TIPX.el.hidden = true;
}

function tipShow(t) {
  if (!t.isConnected || !TIPX.el) return;
  const el = TIPX.el;
  const k = t.dataset.tipk;
  const d = t.dataset.tipd;
  el.innerHTML = `<b>${esc(t.dataset.tip)}</b>${k ? `<kbd>${esc(k)}</kbd>` : ""}${d ? `<span>${esc(d)}</span>` : ""}`;
  el.hidden = false;
  const r = t.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const side = t.closest("#rail") && window.innerWidth > 700;
  let x;
  let y;
  if (side) {
    x = r.right + 10;
    y = r.top + r.height / 2 - h / 2;
  } else {
    x = r.left + r.width / 2 - w / 2;
    y = r.bottom + 8;
    if (y + h > window.innerHeight - 6) y = r.top - h - 8;
  }
  el.style.left = Math.round(clamp(x, 6, window.innerWidth - w - 6)) + "px";
  el.style.top = Math.round(clamp(y, 6, window.innerHeight - h - 6)) + "px";
}

function tipsInit() {
  document.querySelectorAll("[title]").forEach(b => {
    if (!b.dataset.tip) b.dataset.tip = b.getAttribute("title");
    b.removeAttribute("title");
  });
  const el = document.createElement("div");
  el.className = "tipx";
  el.hidden = true;
  el.setAttribute("role", "tooltip");
  document.body.appendChild(el);
  TIPX.el = el;
  document.addEventListener("pointerover", e => {
    if (e.pointerType === "touch") return;
    const t = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
    if (t === TIPX.cur) return;
    tipHide();
    if (!t) return;
    TIPX.cur = t;
    TIPX.timer = setTimeout(() => tipShow(t), 450);
  });
  document.addEventListener("pointerout", e => {
    if (!e.relatedTarget) tipHide();
  });
  document.addEventListener("pointerdown", tipHide, true);
  document.addEventListener("keydown", tipHide, true);
  document.addEventListener("wheel", tipHide, {passive: true, capture: true});
  window.addEventListener("blur", tipHide);
}

const ICON_MOON = `<svg class="i" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`;
const ICON_SUN = `<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>`;

function themeNow() {
  if (UIP.theme === "light" || UIP.theme === "dark") return UIP.theme;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme() {
  const root = document.documentElement;
  if (UIP.theme === "light" || UIP.theme === "dark") root.dataset.theme = UIP.theme;
  else delete root.dataset.theme;
  const ts = $("#themesel");
  if (ts) ts.value = UIP.theme;
  const tb = $("#theme");
  if (tb) {
    const dark = themeNow() === "dark";
    tb.innerHTML = dark ? ICON_SUN : ICON_MOON;
    tb.dataset.tip = dark ? "Светлая тема" : "Тёмная тема";
  }
}

function setSide(on, quiet) {
  UIP.side = !!on;
  const app = $("#app");
  if (app) app.classList.toggle("side-off", !UIP.side);
  const b = $("#sidebtn");
  if (b) b.setAttribute("aria-pressed", String(UIP.side));
  if (!quiet) saveUI();
  setTimeout(() => {
    frozen = null;
    render2D();
    size3D();
  }, 280);
}

$("#theme").addEventListener("click", () => {
  UIP.theme = themeNow() === "dark" ? "light" : "dark";
  applyTheme();
  saveUI();
});

$("#themesel").addEventListener("change", e => {
  UIP.theme = ["light", "dark"].includes(e.target.value) ? e.target.value : "auto";
  applyTheme();
  saveUI();
});

$("#sidebtn").addEventListener("click", () => setSide(!UIP.side));

if (window.matchMedia) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", applyTheme);
}

tipsInit();
