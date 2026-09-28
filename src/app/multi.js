"use strict";

function selIds() {
  return sel && Array.isArray(sel.ids) && sel.ids.length > 1 ? sel.ids : null;
}

function selThings() {
  const ids = selIds();
  if (!ids) return [];
  const L = listOf(sel.t) || [];
  return ids.map(id => L.find(x => x.id === id)).filter(Boolean);
}

function selToggle(t, id) {
  if (t !== "item" && t !== "obj") return;
  if (!sel || sel.t !== t) {
    sel = {t, id};
    return;
  }
  const ids = sel.ids ? sel.ids.slice() : [sel.id];
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else ids.push(id);
  if (!ids.length) sel = null;
  else if (ids.length === 1) sel = {t, id: ids[0]};
  else sel = {t, id: ids.includes(sel.id) ? sel.id : ids[ids.length - 1], ids};
}

function selSet(t, list) {
  const ids = [...new Set(list)];
  if (!ids.length) sel = null;
  else if (ids.length === 1) sel = {t, id: ids[0]};
  else sel = {t, id: ids[0], ids};
}

function groupBox(list) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const a of list) {
    const b = thingBox(a);
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.d);
  }
  return {x: x0, y: y0, w: x1 - x0, d: y1 - y0};
}

function boxPick(t, R) {
  const L = t === "item" ? S.items : S.objects;
  return L.filter(o => {
    const b = thingBox(o);
    return b.x < R.x + R.w && b.x + b.w > R.x && b.y < R.y + R.d && b.y + b.d > R.y;
  }).map(o => o.id);
}

function multiSVG(t) {
  if (!sel || sel.t !== t || !selIds()) return "";
  const list = selThings();
  let h = "";
  for (const a of list) {
    const b = thingBox(a);
    h += R2(b.x - 0.03, b.y - 0.03, b.w + 0.06, b.d + 0.06, "none", "var(--sel)", 2, [5, 3]);
  }
  const G = groupBox(list);
  h += T2(G.x + G.w / 2, G.y - 14 / k, `Выбрано ${list.length}`, {fill: "var(--sel)", size: 11, weight: 600, halo: "var(--paper)"});
  return `<g pointer-events="none">${h}</g>`;
}

function groupMove(mx, my) {
  for (const a of selThings()) {
    a.x = r2(a.x + mx);
    a.y = r2(a.y + my);
  }
}

function groupRotate() {
  const list = selThings();
  const G = groupBox(list);
  const cx = G.x + G.w / 2;
  const cy = G.y + G.d / 2;
  for (const a of list) {
    const ax = a.x + a.w / 2 - cx;
    const ay = a.y + a.d / 2 - cy;
    a.x = r2(cx - ay - a.w / 2);
    a.y = r2(cy + ax - a.d / 2);
    a.rot = normDeg((a.rot || 0) + 90);
  }
}

function groupDup() {
  const list = selThings();
  const G = groupBox(list);
  const L = listOf(sel.t);
  const ids = [];
  for (const a of list) {
    const c = JSON.parse(JSON.stringify(a));
    c.id = uid();
    c.x = r2(a.x + G.w + 0.2);
    L.push(c);
    ids.push(c.id);
  }
  selSet(sel.t, ids);
}

function groupDel() {
  const s = new Set(selIds());
  if (sel.t === "item") S.items = S.items.filter(o => !s.has(o.id));
  else S.objects = S.objects.filter(o => !s.has(o.id));
  sel = null;
}

function groupAlign(mode) {
  const list = selThings();
  if (list.length < 2) return false;
  const G = groupBox(list);
  const shift = (a, dx, dy) => {
    a.x = r2(a.x + dx);
    a.y = r2(a.y + dy);
  };
  if (mode === "dx" || mode === "dy") {
    if (list.length < 3) return false;
    const hor = mode === "dx";
    const bs = list.map(a => ({a, b: thingBox(a)})).sort((p, q) => hor ? p.b.x - q.b.x : p.b.y - q.b.y);
    const span = hor ? G.w : G.d;
    const sum = bs.reduce((s, q) => s + (hor ? q.b.w : q.b.d), 0);
    const gap = (span - sum) / (bs.length - 1);
    let cur = hor ? G.x : G.y;
    for (const q of bs) {
      if (hor) shift(q.a, cur - q.b.x, 0);
      else shift(q.a, 0, cur - q.b.y);
      cur += (hor ? q.b.w : q.b.d) + gap;
    }
    return true;
  }
  for (const a of list) {
    const b = thingBox(a);
    if (mode === "l") shift(a, G.x - b.x, 0);
    else if (mode === "r") shift(a, G.x + G.w - b.x - b.w, 0);
    else if (mode === "t") shift(a, 0, G.y - b.y);
    else if (mode === "b") shift(a, 0, G.y + G.d - b.y - b.d);
    else if (mode === "cx") shift(a, G.x + G.w / 2 - b.x - b.w / 2, 0);
    else if (mode === "cy") shift(a, 0, G.y + G.d / 2 - b.y - b.d / 2);
  }
  return true;
}

function multiSec() {
  const list = selThings();
  const names = list.slice(0, 8).map(a => esc(a.name)).join(", ") + (list.length > 8 ? " и ещё " + (list.length - 8) : "");
  const al = [["al-l", "По левому краю"], ["al-cx", "По центру"], ["al-r", "По правому краю"], ["al-t", "По верху"], ["al-cy", "По середине"], ["al-b", "По низу"]];
  return sec(`Выбрано ${list.length}`, `<p class="hint">${names}</p>` +
    `<h3 class="sub">Выровнять</h3><div class="btns">${al.map(([a, l]) => btn(a, l)).join("")}</div>` +
    `<h3 class="sub">Распределить поровну</h3><div class="btns">${btn("al-dx", "По горизонтали")}${btn("al-dy", "По вертикали")}</div>` +
    `<div class="btns">${btn("rot", "Повернуть на 90° (R)")}${btn("dup", "Копия")}${btn("desel", "Снять выделение")}${btn("del", "Удалить все", "danger")}</div>` +
    `<p class="hint">Shift+клик добавляет или убирает предмет, Shift+протяжка по пустому месту выделяет рамкой. Выделенное двигается вместе мышью и стрелками.</p>`);
}
