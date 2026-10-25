"use strict";
const AG = {ws: null, on: false, port: AGENT_PORT, token: "", state: "off", note: "", timer: 0, tries: 0, busy: 0};
const AG_LS = "house-plan-claude";
const AG_WAIT = 40000;
const AG_LISTS = [["room", "rooms"], ["door", "doors"], ["win", "windows"], ["item", "items"], ["obj", "objects"]];
const AG_INDOOR = new Set(["living", "bed", "kitchen", "bath", "hall"]);
const AG_SAY = {
  new_plan: "новый план", load_plan: "открыл план", patch_plan: "правка плана", set_plot: "участок", set_house: "параметры дома",
  add_room: "добавил комнату", add_opening: "поставил проём", add_model: "поставил модель", update: "правка", remove: "удалил",
  transform: "двигает и крутит", set_wall: "стена", furnish_room: "обставил комнату", set_material: "материал", open_close: "открыл или закрыл",
  gaps: "расстояния до стен", set_view: "вид", camera: "камера", set_sky: "время и погода", sun_info: "солнце", measure: "рулетка",
  boq: "ведомость", screenshot: "снимок", export: "экспорт", history: "история"
};

function agFail(msg) {
  const e = new Error(msg);
  e.agent = true;
  throw e;
}

function agFind(id) {
  if (id === "house") return {t: "house", it: S.house};
  for (const [t, key] of AG_LISTS) {
    const it = S[key].find(x => x.id === id);
    if (it) return {t, it};
  }
  return agFail(`Нет элемента с id «${id}», id есть в get_plan`);
}

function agNum(v, name) {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (typeof n !== "number" || !isFinite(n)) agFail(`${name}: нужно число`);
  return n;
}

function agPick(v, list, name) {
  if (!list.includes(v)) agFail(`${name}: нет значения «${v}», можно ${list.join(", ")}`);
  return v;
}

function agBind(b, v) {
  return applyBind({dataset: {b}, value: String(v), checked: v === true, type: typeof v === "boolean" ? "checkbox" : "text"});
}

function agCommit() {
  const p = sanitize(S);
  if (p) S = p;
  changed();
}

function agImage(url, text) {
  const i = url.indexOf(",");
  const mime = url.slice(5, url.indexOf(";"));
  return {content: [{type: "image", data: url.slice(i + 1), mimeType: mime}, {type: "text", text}]};
}

function agBlobUrl(b) {
  return new Promise(res => {
    const rd = new FileReader();
    rd.onload = () => res(String(rd.result));
    rd.onerror = () => res("");
    rd.readAsDataURL(b);
  });
}

function agSel(t, id) {
  sel = t === "house" ? {t: "house"} : {t, id};
  tab = t === "obj" || t === "house" ? "plot" : "house";
}

function agTime(s) {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(s).trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) agFail("time: нужно время ЧЧ:ММ");
  return Number(m[1]) * 60 + Number(m[2]);
}

function agSummary() {
  const e = ext();
  const f = footprint();
  const nm = new Map(S.rooms.map(r => [r.id, r.name]));
  const roomOf = o => {
    const r = roomAt(o.x + o.w / 2, o.y + o.d / 2);
    return r ? r.id : null;
  };
  return {
    plot: Object.assign({}, S.plot, {fence: fenceOf(S.plot)}),
    site: S.site,
    snap: S.snap,
    house: Object.assign({}, S.house, {footprint: f ? {x: f.x, y: f.y, w: f.w, d: f.d} : null, inside: e ? {w: r2(e.maxX - e.minX), d: r2(e.maxY - e.minY)} : null}),
    rooms: S.rooms.map(r => Object.assign({}, r, {area: r2(r.w * r.d)})),
    nowall: (S.nowall || []).map(p => [p[0], p[1], (nm.get(p[0]) || "?") + " и " + (nm.get(p[1]) || "?")]),
    doors: S.doors.map(d => Object.assign({label: doorLabel(d)}, d)),
    windows: S.windows.map(w => Object.assign({label: winLabel(w)}, w)),
    items: S.items.map(o => Object.assign({}, o, {room: roomOf(o)})),
    objects: S.objects,
    warnings: {house: warnings("house"), plot: warnings("plot")},
    stats: {house: houseStats(), plot: plotStats()}
  };
}

function agCam() {
  if (!V.camera) return null;
  const f = camF();
  const d = CAM.dist || 10;
  return {from: [r2(CAM.pos.x), r2(CAM.pos.z), r2(CAM.pos.y)], to: [r2(CAM.pos.x + f.x * d), r2(CAM.pos.z + f.z * d), r2(CAM.pos.y + f.y * d)], yaw: r2(CAM.yaw), pitch: r2(CAM.pitch), fov: V.camera.fov, walk: !!V.walk};
}

function agTweenEnd() {
  const A = IN.anim;
  if (!A) return;
  setPose({pos: A.p1, yaw: A.y1, pitch: A.q1, pivot: A.pivot, dist: A.dist});
  IN.anim = null;
}

function agMerge(dst, src) {
  for (const [key, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && dst[key] && typeof dst[key] === "object" && !Array.isArray(dst[key])) agMerge(dst[key], v);
    else dst[key] = JSON.parse(JSON.stringify(v));
  }
}

function agSite(a, out) {
  if (a.city !== undefined) {
    const c = CITIES.find(x => x[0] === a.city);
    if (c) Object.assign(out, {city: c[0], lat: c[1], lon: c[2], tz: c[3]});
    else if (a.lat === undefined || a.lon === undefined) agFail(`Города «${a.city}» нет в списке. Есть ${CITIES.map(x => x[0]).join(", ")}. Для другого места дай lat, lon и tz`);
    else out.city = String(a.city).slice(0, 40);
  }
  for (const key of ["lat", "lon", "tz", "north"]) {
    if (a[key] === undefined) continue;
    out[key] = agNum(a[key], key);
    if ((key === "lat" || key === "lon") && a.city === undefined) out.city = "";
  }
  return out;
}

function agPlaceThing(o, a, inHouse) {
  const has2 = (p, q) => a[p] !== undefined || a[q] !== undefined;
  let cx;
  let cy;
  if (a.room) {
    const r = agFind(a.room);
    if (r.t !== "room") agFail("room: это не комната");
    cx = r.it.x + r.it.w / 2;
    cy = r.it.y + r.it.d / 2;
  } else if (inHouse) {
    const e = ext();
    cx = (e.minX + e.maxX) / 2;
    cy = (e.minY + e.maxY) / 2;
  } else {
    cx = S.plot.w / 2;
    cy = S.plot.d / 2;
  }
  o.x = r2(a.x !== undefined ? agNum(a.x, "x") : a.cx !== undefined ? agNum(a.cx, "cx") - o.w / 2 : cx - o.w / 2);
  o.y = r2(a.y !== undefined ? agNum(a.y, "y") : a.cy !== undefined ? agNum(a.cy, "cy") - o.d / 2 : cy - o.d / 2);
  return has2("x", "cx") || has2("y", "cy");
}

function agThingProps(o, a, skip) {
  const K = modelOf(o);
  const out = [];
  for (const [key, v] of Object.entries(a)) {
    if (skip.has(key)) continue;
    if (key === "name") o.name = String(v).slice(0, 40) || K.name;
    else if (key === "w" || key === "d") {
      const c = key === "w" ? o.x + o.w / 2 : o.y + o.d / 2;
      o[key] = clamp(r2(agNum(v, key)), 0.05, 100);
      if (a.x === undefined && a.cx === undefined && key === "w") o.x = r2(c - o.w / 2);
      if (a.y === undefined && a.cy === undefined && key === "d") o.y = r2(c - o.d / 2);
    } else if (key === "h") o.h = clamp(r2(agNum(v, key)), 0.01, 20);
    else if (key === "z") o.z = clamp(r2(agNum(v, key)), 0, 20);
    else if (key === "rot") o.rot = normDeg(agNum(v, key));
    else if (key === "fs") {
      if (!K.fs) agFail("fs: у этой модели нет вида забора");
      o.fs = agPick(v, Object.keys(FENCES), "fs");
    } else if (key === "open") {
      if (!K.gate) agFail("open: это не ворота, двери и окна построек меняются через opens");
      o.open = clamp(agNum(v, key), 0, 1);
    } else if (key === "on" || key === "k" || key === "lm") {
      if (!K.lamp) agFail(key + ": это не лампа");
      if (key === "on") {
        if (v === false) o.on = false;
        else delete o.on;
      } else o[key] = agNum(v, key);
    } else if (key === "mods" || key === "up") {
      if (o.kind !== "kitchen") agFail(key + ": это не кухня");
      if (key === "up") {
        if (v === false) o.up = false;
        else delete o.up;
      } else {
        if (!Array.isArray(v) || !v.length) agFail("mods: нужен непустой список модулей");
        o.mods = v.map(m => ({t: agPick(m && m.t, Object.keys(KMODS), "mods.t"), w: agNum(m.w, "mods.w")}));
      }
    } else if (key === "opens") {
      if (!K.ops) agFail("opens: проёмы бывают только у гаража, бани и сарая");
      if (!Array.isArray(v)) agFail("opens: нужен список");
      o.opens = v.map(x => Object.assign(newOp(x && x.kind), x, {id: x && x.id ? String(x.id) : uid()}));
    } else out.push(key);
  }
  if (o.kind === "kitchen" && (a.mods || a.up !== undefined)) {
    if (!o.mods) o.mods = kitMods(o, o.w);
    kitFix(o);
  }
  return out;
}

function agOpenSet(o, a, isWin) {
  const out = [];
  for (const [key, v] of Object.entries(a)) {
    if (key === "x" || key === "y") o[key] = r2(agNum(v, key));
    else if (key === "o") o.o = agPick(v, ["h", "v"], "o");
    else if (key === "w") o.w = clamp(r2(agNum(v, key)), isWin ? 0.3 : 0.5, isWin ? 6 : 20);
    else if (key === "open") o.open = clamp(agNum(v, key), 0, 1);
    else if (key === "op") {
      o.op = agPick(v, Object.keys(isWin ? WIN_OPS : DOOR_OPS), "op");
      if (isWin && o.op === "lift" && !o.n) o.n = 2;
    } else if (isWin && key === "h") o.h = clamp(r2(agNum(v, key)), 0.3, 3);
    else if (isWin && key === "sill") o.sill = clamp(r2(agNum(v, key)), 0, 2.5);
    else if (isWin && key === "n") o.n = agPick(v, [0, 1, 2, 3, 4], "n");
    else if (isWin && key === "how") o.how = agPick(v, ["turn", "tilt"], "how");
    else if (!isWin && key === "kind") o.kind = agPick(v, Object.keys(DOOR_KINDS), "kind");
    else if (!isWin && key === "leaf") o.leaf = agPick(v, Object.keys(LEAFS), "leaf");
    else if (!isWin && key === "side") o.side = agPick(v, [1, -1], "side");
    else if (!isWin && key === "hinge") o.hinge = agPick(v, [0, 1], "hinge");
    else if (!isWin && key === "full_wall") {
      if (!v) continue;
      const sp = openingSpan(o);
      if (!sp) agFail("full_wall: у проёма нет общей стены двух комнат");
      o.w = r2(sp.b - sp.a);
      if (o.o === "h") o.x = r2((sp.a + sp.b) / 2);
      else o.y = r2((sp.a + sp.b) / 2);
    } else out.push(key);
  }
  if (!isWin && a.w !== undefined && !a.full_wall) {
    const sp = openingSpan(o);
    if (sp) o.w = clamp(o.w, 0.5, Math.max(0.5, r2(sp.b - sp.a)));
  }
  if (isWin) o.h = Math.min(o.h, r2(S.house.h - o.sill - 0.02));
  return out;
}

function agSnap(it) {
  if (SNAP_WALL.has(it.kind) && (it.rot || 0) % 90 === 0) {
    const g = gapsOf("item", it).sort((p, q) => p.v - q.v)[0];
    if (g && g.v > 0.1) gapApply("item", it, g.dir, 0.1);
  }
  snapThing(it, it.rot);
}

function agMoveRoom(r, nx, ny, carry) {
  const dx = r2(nx - r.x);
  const dy = r2(ny - r.y);
  if (carry) {
    for (const a of attachedTo(r).concat(itemsIn(r))) {
      a.x = r2(a.x + dx);
      a.y = r2(a.y + dy);
    }
  }
  r.x = r2(nx);
  r.y = r2(ny);
}

function agSameList(list) {
  const t = list[0].t;
  return list.length > 1 && (t === "item" || t === "obj") && list.every(q => q.t === t) ? t : "";
}

async function agWaitSmap(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (SMAP.stats && !SMAP.busy && SMAP.sig === smapSig()) return true;
    await new Promise(res => setTimeout(res, 200));
  }
  return false;
}

function agLimit(p, ms) {
  return Promise.race([p, new Promise(res => setTimeout(() => res(null), ms))]);
}

async function agRace(job) {
  let late = false;
  const tm = new Promise(res => setTimeout(() => {
    late = true;
    res();
  }, AG_WAIT));
  await Promise.race([Promise.resolve(job).catch(() => null), tm]);
  return !late;
}

const AGENT_RUN = {
  get_plan(a) {
    return a.format === "json" ? {plan: S} : agSummary();
  },

  get_view() {
    return {
      tab, view, mode: V.mode, cut: V.cut, labels: V.labels, fence: V.fence, sunbar: V.sunbar, theme: UIP.theme, panel: UIP.side, quality: RF.q,
      sky: {month: SKY.m, day: SKY.d, time: hm(SKY.t), weather: SKY.weather, play: SKY.play, speed: SKY.speed, path: SKY.path, light: UIP.lt || null},
      wx: {snow: r2(WX.snow), wet: r2(WX.wet), puddles: r2(WX.pud), wind: WX.wind, wind_dir: WX.windDir}, lamps: LAMP.mode, lamps_lit: LAMP.lit,
      camera: agCam(), select: sel, tool, busy: !!(HQ.running || V.busy), hidden: !!document.hidden, has3d: !!V.ok,
      sun_map: SMAP.on ? SMAP.stats : null, measure: MEAS.a && MEAS.b ? measText(MEAS.a, MEAS.b) : null, undo: hist.length, redo: redoStack.length
    };
  },

  list_catalog(a) {
    const q = a.q ? String(a.q).toLowerCase() : "";
    const models = Object.entries(MODELS).filter(([key, M]) => (!a.cat || M.cat === a.cat) && (!q || (M.name + " " + key).toLowerCase().includes(q))).map(([kind, M]) => {
      const o = {kind, name: M.name, cat: M.cat, w: M.w, d: M.d, h: M.h};
      if (M.z) o.z = M.z === "ceil" ? "под потолком" : M.z;
      if (M.lamp) o.lamp = M.lamp;
      if (M.gate) o.gate = true;
      if (M.fs) o.fence = M.fs;
      if (M.ops) o.openings = true;
      if (kind === "kitchen") o.kitchen = Object.keys(KMODS);
      return o;
    });
    return {cats: CATS, models};
  },

  list_materials(a) {
    if (a.target) {
      const T = agFind(a.target);
      const id = T.t === "house" ? "" : T.it.id;
      return {target: a.target, slots: slotsOf(T.t, T.it).map(s => {
        const own = T.it.mats && T.it.mats[s.slot];
        const key = effKey({t: T.t, id, slot: s.slot, def: s.def, inh: s.inh});
        return {slot: s.slot, label: s.label, material: key.split("@")[0], name: matTitle(key), color: own && own.c ? own.c : null, own: !!own};
      })};
    }
    const list = Object.entries(MDEF).filter(([, M]) => M.n && (!a.group || M.g === a.group)).map(([key, M]) => ({key, name: M.n, group: M.g, color: matHex(key)}));
    return {groups: MGROUPS, materials: list};
  },

  new_plan(a) {
    const preset = a.preset || "blank";
    let p;
    if (preset === "blank") {
      const P = plotDefault();
      for (const key of ["w", "d", "street", "side", "back"]) if (a.plot && a.plot[key] !== undefined) P[key] = clamp(r2(agNum(a.plot[key], key)), key === "w" || key === "d" ? 5 : 0, 300);
      p = sanitize(presetBlank(P, agSite(a.site || {}, siteDefault())));
    } else {
      if (!PRESETS[preset]) agFail(`Шаблона «${preset}» в этой версии нет, есть blank и ${Object.keys(PRESETS).join(", ")}`);
      p = PRESETS[preset][1]();
      if (a.plot) agMerge(p.plot, a.plot);
      if (a.site) agSite(a.site, p.site);
      p = sanitize(p);
    }
    S = p;
    sel = null;
    tab = preset === "blank" ? "plot" : "house";
    setTool(null);
    V2.plot = {z: 1, ox: 0, oy: 0};
    V2.house = {z: 1, ox: 0, oy: 0};
    changed();
    camPreset(preset === "blank" ? "plot" : "iso", true);
    return {ok: "План заменён, Ctrl+Z вернёт прежний", plot: S.plot, site: S.site, rooms: S.rooms.length};
  },

  load_plan(a) {
    const src = a.plan && a.plan.plan ? a.plan.plan : a.plan;
    const p = sanitize(src);
    if (!p) agFail("Это не план: нужны rooms, plot и house");
    S = p;
    sel = null;
    changed();
    camPreset("iso", true);
    return {ok: "План открыт", rooms: S.rooms.length, items: S.items.length, objects: S.objects.length};
  },

  patch_plan(a) {
    if (!a.patch || typeof a.patch !== "object") agFail("patch: нужен объект");
    const P = JSON.parse(JSON.stringify(S));
    const added = [];
    const skipped = [];
    for (const [key, v] of Object.entries(a.patch)) {
      if (["rooms", "doors", "windows", "items", "objects"].includes(key)) {
        if (!Array.isArray(v)) agFail(key + ": нужен список");
        for (const el of v) {
          if (!el || typeof el !== "object") continue;
          const cur = el.id ? P[key].find(x => x.id === el.id) : null;
          if (cur) agMerge(cur, el);
          else {
            const n = JSON.parse(JSON.stringify(el));
            if (!n.id) n.id = uid();
            P[key].push(n);
            added.push(n.id);
          }
        }
      } else if (["plot", "site", "house"].includes(key) && v && typeof v === "object") agMerge(P[key], v);
      else if (key === "nowall" || key === "snap") P[key] = v;
      else skipped.push(key);
    }
    const p = sanitize(P);
    if (!p) agFail("После правки план не прошёл проверку");
    S = p;
    changed();
    return {ok: "План поправлен", added, skipped, warnings: {house: warnings("house"), plot: warnings("plot")}};
  },

  set_plot(a) {
    for (const key of ["w", "d", "street", "side", "back"]) if (a[key] !== undefined) agBind("plot." + key, agNum(a[key], key));
    if (["city", "lat", "lon", "tz", "north"].some(key => a[key] !== undefined)) agSite(a, S.site);
    if (a.snap !== undefined) S.snap = agPick(a.snap, [0.05, 0.1, 0.5], "snap");
    if (a.fence) {
      for (const key of ["front", "type", "gate", "h", "gw", "gx", "wicket", "wside"]) {
        const v = a.fence[key];
        if (v === undefined) continue;
        if (!fenceBind("pf." + key, {value: String(v), checked: v === true})) agFail(`fence.${key}: значение «${v}» не подходит`);
      }
    }
    agCommit();
    return {plot: Object.assign({}, S.plot, {fence: fenceOf(S.plot)}), site: S.site, warnings: warnings("plot")};
  },

  set_house(a) {
    const order = ["roof", "pitch", "pitch2", "ridge", "low", "over", "overG", "hipCut", "wall", "inner", "h", "base", "doorH", "gutters", "chim", "chx", "chy", "chh", "autoLights"];
    const bad = [];
    for (const key of order) {
      if (a[key] === undefined) continue;
      if (!agBind("house." + key, a[key])) bad.push(key);
    }
    if (a.rot !== undefined) S.house.rot = agPick(a.rot, [0, 90, 180, 270], "rot");
    if (a.cx !== undefined) S.house.cx = r2(agNum(a.cx, "cx"));
    if (a.cy !== undefined) S.house.cy = r2(agNum(a.cy, "cy"));
    if (a.left !== undefined && !agBind("house.left", agNum(a.left, "left"))) bad.push("left");
    if (a.from_street !== undefined && !agBind("house.fromRed", agNum(a.from_street, "from_street"))) bad.push("from_street");
    if (bad.length) agFail("Не подошли значения: " + bad.join(", "));
    agCommit();
    const H = Object.assign({}, S.house);
    delete H.mats;
    return {house: H, warnings: warnings("plot")};
  },

  add_room(a) {
    const type = agPick(a.type, Object.keys(TYPES), "type");
    const R = {id: "", x: agNum(a.x, "x"), y: agNum(a.y, "y"), w: Math.max(0.3, agNum(a.w, "w")), d: Math.max(0.3, agNum(a.d, "d"))};
    const m = a.magnet === false ? R : magnetRoom(R, "nsew");
    const rm = room(a.name ? String(a.name).slice(0, 40) : type === "Другое" ? "Комната" : type, type, r2(m.x), r2(m.y), r2(m.w), r2(m.d), !!a.open);
    S.rooms.push(rm);
    agSel("room", rm.id);
    let n = 0;
    if (a.furnish) {
      normalize();
      n = furnishRoom(rm);
    } else changed();
    const r = S.rooms.find(x => x.id === rm.id);
    return {id: r.id, name: r.name, x: r.x, y: r.y, w: r.w, d: r.d, area: r2(r.w * r.d), furnished: n, warnings: warnings("house")};
  },

  add_opening(a) {
    const kind = agPick(a.kind, ["door", "entry", "open", "arch", "window"], "kind");
    const isWin = kind === "window";
    if (!ext()) agFail("В доме нет комнат");
    let it = null;
    if (a.room) {
      const T = agFind(a.room);
      if (T.t !== "room") agFail("room: это не комната");
      sel = {t: "room", id: T.it.id};
      if (kind === "entry") {
        const w = addOpening("win");
        it = w ? openingAt("entry", {x: w.x, y: w.y}, 0.3) : null;
      } else it = addOpening(isWin ? "win" : kind);
    } else if (a.x !== undefined && a.y !== undefined) {
      it = openingAt(isWin ? "win" : kind, {x: agNum(a.x, "x"), y: agNum(a.y, "y")}, 1.5);
    } else agFail("Нужен room или x, y");
    if (!it) agFail(a.room ? "У этой комнаты нет свободной стены под такой проём" : "Рядом с точкой нет подходящей стены, окно ставится только на наружную");
    const opt = Object.assign({}, a);
    for (const key of ["kind", "room", "x", "y"]) delete opt[key];
    const skipped = agOpenSet(it, opt, isWin);
    (isWin ? S.windows : S.doors).push(it);
    agSel(isWin ? "win" : "door", it.id);
    agCommit();
    const o = (isWin ? S.windows : S.doors).find(x => x.id === it.id);
    return Object.assign({label: isWin ? winLabel(o) : doorLabel(o)}, o, {skipped, warnings: warnings("house")});
  },

  add_model(a) {
    const K = MODELS[a.kind];
    if (!K) agFail(`Модели «${a.kind}» нет, виды есть в list_catalog`);
    const inHouse = a.where ? agPick(a.where, ["house", "plot"], "where") === "house" : !!a.room || AG_INDOOR.has(K.cat);
    if (inHouse && !ext()) agFail("В доме нет комнат, ставь на участок (where: plot)");
    const o = thing(a.kind, 0, 0);
    agThingProps(o, a, new Set(["kind", "where", "room", "x", "y", "cx", "cy", "snap"]));
    agPlaceThing(o, a, inHouse);
    (inHouse ? S.items : S.objects).push(o);
    if (a.snap && inHouse) agSnap(o);
    agSel(inHouse ? "item" : "obj", o.id);
    agCommit();
    const T = agFind(o.id);
    const r = inHouse ? roomAt(T.it.x + T.it.w / 2, T.it.y + T.it.d / 2) : null;
    return Object.assign({}, T.it, {where: inHouse ? "house" : "plot", room: r ? r.id : null, gaps: Object.fromEntries(gapsOf(T.t, T.it).map(g => [g.dir, r2(g.v)])), warnings: warnings(inHouse ? "house" : "plot")});
  },

  update(a) {
    const T = agFind(a.id);
    const s = a.set;
    if (!s || typeof s !== "object") agFail("set: нужен объект с полями");
    if (T.t === "house") agFail("Дом меняет set_house");
    const it = T.it;
    let skipped = [];
    sel = {t: T.t, id: it.id};
    if (T.t === "room") {
      for (const [key, v] of Object.entries(s)) {
        if (key === "name") it.name = String(v).slice(0, 40) || "Комната";
        else if (key === "type") it.type = agPick(v, Object.keys(TYPES), "type");
        else if (key === "open") it.open = !!v;
        else if (key === "w" || key === "d") it[key] = Math.max(0.3, r2(agNum(v, key)));
        else if (key !== "x" && key !== "y" && key !== "carry") skipped.push(key);
      }
      if (s.x !== undefined || s.y !== undefined) agMoveRoom(it, s.x !== undefined ? agNum(s.x, "x") : it.x, s.y !== undefined ? agNum(s.y, "y") : it.y, s.carry !== false);
    } else if (T.t === "door" || T.t === "win") {
      skipped = agOpenSet(it, s, T.t === "win");
    } else {
      skipped = agThingProps(it, s, new Set(["x", "y", "cx", "cy", "from_street", "snap"]));
      if (s.x !== undefined) it.x = r2(agNum(s.x, "x"));
      if (s.y !== undefined) it.y = r2(agNum(s.y, "y"));
      if (s.cx !== undefined) it.x = r2(agNum(s.cx, "cx") - it.w / 2);
      if (s.cy !== undefined) it.y = r2(agNum(s.cy, "cy") - it.d / 2);
      if (s.from_street !== undefined) {
        if (T.t !== "obj") agFail("from_street есть только у объектов участка");
        agBind("sel.fromRed", agNum(s.from_street, "from_street"));
      }
      if (s.snap && T.t === "item") agSnap(it);
    }
    agSel(T.t, it.id);
    agCommit();
    const now = agFind(a.id).it;
    return Object.assign({}, now, {skipped, warnings: warnings(T.t === "obj" ? "plot" : "house")});
  },

  remove(a) {
    if (!Array.isArray(a.ids) || !a.ids.length) agFail("ids: нужен список id");
    const gone = [];
    for (const id of a.ids) {
      const T = S.rooms.concat(S.doors, S.windows, S.items, S.objects).some(x => x.id === id) ? agFind(id) : null;
      if (!T || T.t === "house") continue;
      sel = {t: T.t, id};
      delSel();
      gone.push(id);
    }
    sel = null;
    agCommit();
    return {removed: gone, missing: a.ids.filter(id => !gone.includes(id))};
  },

  transform(a) {
    if (!Array.isArray(a.ids) || !a.ids.length) agFail("ids: нужен список id");
    const op = agPick(a.op, ["move", "rotate", "duplicate", "align"], "op");
    const list = a.ids.map(id => Object.assign({id}, agFind(id)));
    const grp = agSameList(list);
    let ids = a.ids.slice();
    if (op === "align") {
      if (!grp) agFail("align работает с двумя и больше моделями из одного списка: только мебель или только объекты участка");
      selSet(grp, ids);
      if (!groupAlign(agPick(a.mode, ["l", "r", "t", "b", "cx", "cy", "dx", "dy"], "mode"))) agFail("Для распределения нужно три модели и больше");
    } else if (grp) {
      selSet(grp, ids);
      if (op === "move") moveSel(agNum(a.dx || 0, "dx"), agNum(a.dy || 0, "dy"), 1);
      else if (op === "rotate") rotateSel();
      else {
        dupSel();
        ids = selIds() || [sel.id];
      }
    } else {
      const made = [];
      for (const q of list) {
        sel = q.t === "house" ? {t: "house"} : {t: q.t, id: q.id};
        if (op === "move") {
          if (!moveSel(agNum(a.dx || 0, "dx"), agNum(a.dy || 0, "dy"), 1) && (q.t === "door" || q.t === "win")) agFail("Дверь и окно двигаются только вдоль своей стены");
        } else if (op === "rotate") rotateSel();
        else if (q.t !== "house" && dupSel()) made.push(sel.id);
      }
      if (op === "duplicate") ids = made;
    }
    agCommit();
    return {op, ids, items: ids.map(id => agFind(id).it), warnings: {house: warnings("house"), plot: warnings("plot")}};
  },

  set_wall(a) {
    const A = agFind(a.a);
    const B = agFind(a.b);
    if (A.t !== "room" || B.t !== "room") agFail("a и b должны быть комнатами");
    if (!sharedEdge(A.it, B.it)) agFail("У этих комнат нет общей стены");
    setNoWall(A.it, B.it, !a.wall);
    agCommit();
    return {wall: !wallGone(A.it, B.it), nowall: S.nowall || []};
  },

  furnish_room(a) {
    const T = agFind(a.id);
    if (T.t !== "room") agFail("id: это не комната");
    agSel("room", T.it.id);
    const n = furnishRoom(T.it);
    const r = S.rooms.find(x => x.id === a.id);
    return {placed: n, items: itemsIn(r).map(o => ({id: o.id, kind: o.kind, name: o.name, x: o.x, y: o.y, w: o.w, d: o.d, rot: o.rot})), note: n ? "" : $("#st").textContent};
  },

  set_material(a) {
    const T = agFind(a.target);
    const id = T.t === "house" ? "" : T.it.id;
    const slots = slotsOf(T.t, T.it);
    if (a.reset && !a.slot) {
      delete T.it.mats;
      changed();
      return {ok: "Все материалы по умолчанию"};
    }
    const S0 = slots.find(s => s.slot === a.slot);
    if (!S0) agFail(`slot: у этого элемента части ${slots.map(s => s.slot + " (" + s.label + ")").join(", ") || "не настраиваются"}`);
    const Tm = {t: T.t, id, slot: S0.slot, def: S0.def, inh: S0.inh};
    if (a.reset) setSpec(Tm, null);
    else {
      if (a.material !== undefined && !(has(MDEF, a.material) && MDEF[a.material].n)) agFail(`material: нет материала «${a.material}», ключи есть в list_materials`);
      if (a.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(a.color)) agFail("color: нужен цвет #rrggbb");
      if (a.material === undefined && a.color === undefined) agFail("Нужен material или color");
      const own = ownSpec(Tm) || {};
      setSpec(Tm, {m: a.material || own.m, c: a.color ? a.color.toLowerCase() : a.material ? undefined : own.c});
    }
    changed();
    const key = effKey(Tm);
    return {slot: S0.slot, label: S0.label, material: key.split("@")[0], name: matTitle(key), color: key.indexOf("@") > 0 ? "#" + key.split("@")[1] : null};
  },

  open_close(a) {
    const val = cur => (a.value === undefined ? (cur > 0.05 ? 0 : 1) : clamp(agNum(a.value, "value"), 0, 1));
    let now;
    if (a.id === "fence") {
      const part = agPick(a.part || "gate", ["gate", "wicket"], "part");
      const F = fenceOf(S.plot);
      const key = part === "wicket" ? "wo" : "go";
      F[key] = val(F[key]);
      S.plot.fence = F;
      animTo(animKey("fence", part), F[key]);
      now = F[key];
    } else {
      const T = agFind(a.id);
      const it = T.it;
      if ((T.t === "item" || T.t === "obj") && lampDef(it) && !a.part) {
        const on = a.value === undefined ? it.on === false : agNum(a.value, "value") > 0;
        if (on) delete it.on;
        else it.on = false;
        commit();
        save();
        updUndo();
        schedule3D();
        renderPanel();
        return {lamp: on ? "включена" : "выключена"};
      }
      if (T.t === "obj" && modelOf(it).gate && !a.part) {
        it.open = val(it.open || 0);
        animTo(animKey("obj", it.id, "gate"), it.open);
        now = it.open;
      } else if (T.t === "obj" && a.part) {
        const op = ensureOpens(it).find(x => x.id === a.part);
        if (!op) agFail(`part: у постройки проёмы ${opsOf(it).map(x => x.id + " (" + OP_KINDS[x.kind] + ")").join(", ") || "не заданы"}`);
        if (!openable("obj", op)) agFail("Этот проём глухой");
        op.open = val(op.open);
        animTo(animKey("obj", it.id, op.id), op.open);
        now = op.open;
      } else if (T.t === "door" || T.t === "win") {
        if (!openable(T.t, it)) agFail("Это не открывается: проём, арка или глухое окно");
        it.open = val(it.open);
        animTo(animKey(T.t, it.id), it.open);
        now = it.open;
      } else agFail("Это не открывается");
    }
    commit();
    save();
    updUndo();
    render2D();
    renderPanel();
    lampShadowsDirty();
    return {open: now};
  },

  gaps(a) {
    const T = agFind(a.id);
    if (T.t !== "item" && T.t !== "obj" && T.t !== "house") agFail("Расстояния есть у мебели, объектов участка и дома");
    const it = T.t === "house" ? null : T.it;
    if (a.dir !== undefined) {
      if (!gapApply(T.t, it, agPick(a.dir, ["l", "r", "u", "d", "f", "c"], "dir"), agNum(a.value, "value"))) agFail("В эту сторону стены нет или значение не подходит");
      agSel(T.t, T.t === "house" ? "" : it.id);
      agCommit();
    }
    const it2 = T.t === "house" ? null : agFind(a.id).it;
    const out = Object.fromEntries(gapsOf(T.t, it2).map(g => [g.dir, r2(g.v)]));
    if (T.t === "item") {
      out.f = it2.z;
      out.c = r2(S.house.h - it2.z - it2.h);
    }
    return {id: a.id, gaps: out, to: T.t === "item" ? "грани стен" : "границы участка"};
  },

  set_view(a) {
    if (a.tab !== undefined) {
      tab = agPick(a.tab, ["plot", "house"], "tab");
      sel = null;
      frozen = null;
    }
    if (a.view !== undefined) {
      view = agPick(a.view, ["2d", "split", "3d"], "view");
      applyView();
    }
    if (a.mode !== undefined) V.mode = agPick(a.mode, ["roof", "noroof", "cut"], "mode");
    if (a.cut_side !== undefined) V.cut.side = agPick(a.cut_side, ["top", "front", "back", "left", "right"], "cut_side");
    if (a.cut_pos !== undefined) V.cut.t = clamp(agNum(a.cut_pos, "cut_pos"), 0, 1);
    for (const key of ["labels", "fence", "sunbar"]) if (a[key] !== undefined) V[key] = !!a[key];
    if (a.theme !== undefined) {
      UIP.theme = agPick(a.theme, ["auto", "light", "dark"], "theme");
      applyTheme();
    }
    if (a.panel !== undefined) setSide(!!a.panel, true);
    if (a.quality !== undefined) setQuality(agPick(a.quality, Object.keys(QUALITY), "quality"));
    if (a.select !== undefined) {
      if (a.select === null) sel = null;
      else if (Array.isArray(a.select)) {
        const list = a.select.map(id => agFind(id));
        const t = list.length === 1 ? list[0].t : agSameList(list);
        if (!t) agFail("Несколько выбираются только мебель или только объекты участка");
        if (list.length === 1) agSel(t, a.select[0]);
        else {
          selSet(t, a.select);
          tab = t === "obj" ? "plot" : "house";
        }
      } else {
        const T = agFind(a.select);
        agSel(T.t, T.t === "house" ? "" : T.it.id);
      }
    }
    if (a.fit) fit2D();
    sync3DButtons();
    saveUI();
    schedule3D();
    renderAll();
    return AGENT_RUN.get_view();
  },

  camera(a) {
    if (!V.camera) agFail("3D не запустилось в этом браузере");
    if (a.walk === false) exitWalk(true);
    if (a.preset !== undefined) camPreset(agPick(a.preset, ["iso", "street", "back", "left", "right", "top", "iso2", "plot"], "preset"), true);
    if (a.walk === true) startWalk();
    if (a.window !== undefined) {
      const T = agFind(a.window);
      if (T.t !== "win") agFail("window: это не окно");
      if (view === "2d") {
        view = "split";
        applyView();
      }
      if (!windowView(T.it)) agFail("Вид из окна не получился");
    }
    if (a.focus !== undefined) {
      const T = agFind(a.focus);
      agSel(T.t, T.t === "house" ? "" : T.it.id);
      exitWalk(true);
      focusSel();
      agTweenEnd();
      renderAll();
    }
    if (a.from !== undefined || a.to !== undefined) {
      if (!Array.isArray(a.from) || !Array.isArray(a.to)) agFail("Нужны обе точки from и to");
      const house = a.coords === "house";
      const pt = p => {
        const x = agNum(p[0], "x");
        const y = agNum(p[1], "y");
        const h = p[2] === undefined ? 1.6 : agNum(p[2], "высота");
        if (!house) return new THREE.Vector3(x, h, y);
        const w = houseToWorld(x, y);
        return new THREE.Vector3(w.x, S.house.base + h, w.z);
      };
      const A = pt(a.from);
      const B = pt(a.to);
      const dir = B.clone().sub(A);
      const len = dir.length();
      if (len < 0.05) agFail("from и to совпадают");
      dir.divideScalar(len);
      if (!a.walk) exitWalk(true);
      IN.anim = null;
      setPose({pos: A, yaw: Math.atan2(-dir.x, -dir.z), pitch: Math.asin(clamp(dir.y, -1, 1)), pivot: B, dist: len});
    }
    if (a.fov !== undefined) {
      V.camera.fov = clamp(agNum(a.fov, "fov"), 20, 90);
      V.camera.updateProjectionMatrix();
    }
    V.need = true;
    return agCam();
  },

  set_sky(a) {
    if (a.light !== undefined && !(a.light === "bright" && ltplBright())) ltplApply(agPick(a.light, Object.keys(LTPL), "light"));
    const p = {};
    if (a.month !== undefined) p.m = clamp(Math.round(agNum(a.month, "month")), 1, 12);
    if (a.day !== undefined) p.d = clamp(Math.round(agNum(a.day, "day")), 1, 31);
    if (a.time !== undefined) {
      p.t = agTime(a.time);
      SKY.play = false;
    }
    if (a.weather !== undefined) p.weather = agPick(a.weather, Object.keys(WEATHER), "weather");
    if (a.path !== undefined) p.path = !!a.path;
    if (Object.keys(p).length) skySet(p);
    if (a.lamps !== undefined) setLampMode(agPick(a.lamps, Object.keys(LAMP_MODES), "lamps"));
    if (a.speed !== undefined) SKY.speed = Number(agPick(String(a.speed), Object.keys(WX_SPEEDS), "speed"));
    if (a.play !== undefined) SKY.play = !!a.play;
    const w = {};
    if (a.snow !== undefined) w.snow = agNum(a.snow, "snow");
    if (a.wet !== undefined) w.wet = agNum(a.wet, "wet");
    if (a.puddles !== undefined) w.pud = agNum(a.puddles, "puddles");
    if (a.wind !== undefined) w.wind = agNum(a.wind, "wind");
    if (a.wind_dir !== undefined) w.windDir = agNum(a.wind_dir, "wind_dir");
    if (Object.keys(w).length) wxSet(w);
    syncSkyUI();
    saveUI();
    V.need = true;
    const dy = daySun(SKY.m, SKY.d);
    const s = sunAt(SKY.m, SKY.d, SKY.t);
    return {month: SKY.m, day: SKY.d, time: hm(SKY.t), weather: SKY.weather, lamps: LAMP.mode, light: UIP.lt || null, play: SKY.play, rise: dy.rise === null ? null : hm(dy.rise), set: dy.set === null ? null : hm(dy.set), sun_alt: Math.round(s.alt * 180 / Math.PI), sun_az: Math.round(s.az * 180 / Math.PI)};
  },

  async sun_info(a) {
    const m = a.month !== undefined ? clamp(Math.round(agNum(a.month, "month")), 1, 12) : SKY.m;
    const d = a.day !== undefined ? clamp(Math.round(agNum(a.day, "day")), 1, 31) : SKY.d;
    const dy = daySun(m, d);
    const fs = facadeSun(m, d);
    const out = {
      date: `${d} ${MONTHS[m - 1]}`, rise: dy.rise === null ? null : hm(dy.rise), set: dy.set === null ? null : hm(dy.set), noon: hm(dy.noon), top: Math.round(dy.top),
      facades: fs.map(f => ({name: f.name, faces: compassName(f.az), sun: f.runs.map(([p, q]) => hm(p) + "-" + hm(q)), hours: r2(f.total / 60)})),
      rooms: fs.length ? roomSun(fs).map(x => ({id: x.r.id, name: x.r.name, hours: r2(x.total / 60), windows: x.faces.map(f => compassName(f.az))})) : []
    };
    if (!a.map) return out;
    if (!V.ok) agFail("Карту солнца считает видеокарта, а 3D в этом браузере не запустилось");
    if (HQ.running) agFail("Сейчас идёт рендер или запись видео, подожди");
    if (m !== SKY.m || d !== SKY.d) skySet({m, d});
    if (!SMAP.on) smapToggle(true);
    else smapSchedule(0);
    if (!(await agWaitSmap(30000)) || !SMAP.stats) agFail("Карта солнца не досчиталась за 30 секунд");
    out.map = {six_hours: r2(SMAP.stats.p6), four_hours: r2(SMAP.stats.p4), max_hours: r2(SMAP.stats.max)};
    if (Array.isArray(a.points)) out.points = a.points.map(p => ({at: p, hours: r2(smapAt(agNum(p[0], "x"), agNum(p[1], "y")) || 0)}));
    if (SMAP.url) return agImage(SMAP.url, JSON.stringify(out, null, 1) + "\nКартинка: вид сверху на участок, синий мало солнца, красный 12 часов и больше, дом прозрачный.");
    return out;
  },

  measure(a) {
    if (a.clear) {
      if (tool && tool.t === "meas") setTool(null);
      measClear();
      render2D();
      return {ok: "Замер убран"};
    }
    if (!Array.isArray(a.from) || !Array.isArray(a.to)) agFail("Нужны точки from и to");
    const house = a.coords !== "plot";
    if (house && !ext()) agFail("В доме нет комнат");
    const pt = p => {
      const x = agNum(p[0], "x");
      const y = agNum(p[1], "y");
      const h = p[2] === undefined ? 0 : agNum(p[2], "высота");
      if (!house) return {x: r2(x), y: r2(h + 0.03), z: r2(y), snap: ""};
      const w = houseToWorld(x, y);
      return {x: r2(w.x), y: r2(S.house.base + h + 0.03), z: r2(w.z), snap: ""};
    };
    tab = house ? "house" : "plot";
    setTool({t: "meas"});
    MEAS.a = pt(a.from);
    MEAS.b = pt(a.to);
    MEAS.cur = MEAS.b;
    measSync3();
    renderAll();
    const t = measText(MEAS.a, MEAS.b);
    return {length: r2(measLen(MEAS.a, MEAS.b)), text: t.main + (t.sub ? ", " + t.sub : "")};
  },

  boq() {
    return {columns: ["раздел", "название", "количество", "единица"], rows: boqRows().map(r => [r[0], r[1], r2(r[2]), r[3]])};
  },

  async screenshot(a) {
    const what = a.what ? agPick(a.what, ["3d", "plan_house", "plan_plot"], "what") : "3d";
    if (what !== "3d") {
      const which = what === "plan_house" ? "house" : "plot";
      if (which === "house" && !ext()) agFail("В доме нет комнат");
      const P = planSVG(which, 60);
      const lim = clamp(a.width ? agNum(a.width, "width") : 1600, 400, 2048);
      const b = await agLimit(svgToPNG(P, Math.min(which === "house" ? 110 : 60, lim / Math.max(P.vw, P.vh))), 15000);
      if (!b) agFail("Браузер не дал нарисовать PNG из плана");
      return agImage(await agBlobUrl(b), `План ${which === "house" ? "дома" : "участка"}, ${fm(P.vw)} × ${fm(P.vh)} м`);
    }
    if (!V.ok) agFail("3D не запустилось в этом браузере, есть только plan_house и plan_plot");
    if (HQ.running || V.busy) agFail("Сейчас идёт рендер, запись видео или карта солнца, подожди");
    const cv = V.renderer.domElement;
    const asp = clamp(cv.clientWidth && cv.clientHeight ? cv.clientWidth / cv.clientHeight : 1.6, 1.25, 1.9);
    const W = Math.round(clamp(a.width ? agNum(a.width, "width") : 1280, 256, 2048) / 2) * 2;
    const H = Math.round(clamp(a.height ? agNum(a.height, "height") : W / asp, 256, 2048) / 2) * 2;
    const q = a.quality ? agPick(a.quality, ["draft", "good", "best"], "quality") : "good";
    const A = a.dof ? (RDOF[String(a.dof)] || RDOF["0"])[1] : 0;
    const pose = a.view ? viewPose(agPick(a.view, ["iso", "street", "back", "left", "right", "top", "iso2", "plot"], "view"), W / H) : null;
    const mode = a.mode ? agPick(a.mode, ["roof", "noroof", "cut"], "mode") : undefined;
    HQ.running = true;
    let c = null;
    try {
      c = await renderHQ({w: W, h: H, samples: {draft: 6, good: 24, best: 80}[q], pose, mode, dof: A > 0 ? {A, F: focusDist()} : null});
    } finally {
      HQ.running = false;
    }
    if (!c) agFail("Рендер не получился, видеокарта не дала такой размер");
    return agImage(c.toDataURL("image/jpeg", 0.88), `3D ${W} × ${H}, ${a.view ? "вид " + a.view : "камера пользователя"}, ${SKY.d} ${MONTHS[SKY.m - 1]} ${hm(SKY.t)}, ${WEATHER[SKY.weather].n.toLowerCase()}`);
  },

  async export(a) {
    const kind = agPick(a.kind, ["json", "plan_png", "plan_svg", "boq_csv", "render", "zip", "video_orbit", "video_day", "pano", "print"], "kind");
    const gl = ["render", "zip", "video_orbit", "video_day", "pano"].includes(kind);
    if (gl && !V.ok) agFail("Для этого нужно 3D, а оно в этом браузере не запустилось");
    if ((gl || kind === "print") && (HQ.running || V.busy)) agFail("Сейчас идёт рендер, запись видео или карта солнца, подожди");
    const which = a.which ? agPick(a.which, ["house", "plot"], "which") : tab;
    const onTab = fn => {
      const t0 = tab;
      tab = which;
      const p = fn();
      tab = t0;
      return p;
    };
    const jobs = {
      json: () => menuAction("save-json", null),
      plan_png: () => onTab(exportPlanPNG),
      plan_svg: () => onTab(exportPlanSVG),
      boq_csv: () => boqCSV(),
      render: () => snapshotHQ(),
      zip: () => exportZip(),
      video_orbit: () => recordVideo("orbit"),
      video_day: () => recordVideo("day"),
      pano: async () => {
        await panoRender();
        if (PANO.canvas) await panoSave();
      },
      print: () => printSheet()
    };
    const done = await agRace(jobs[kind]());
    return {kind, done, note: done ? "Готово, файл в загрузках браузера" : "Ещё считается, файл скачается сам, когда закончится. Пока идёт, другие рендеры не запустятся"};
  },

  history(a) {
    const act = agPick(a.action, ["undo", "redo"], "action");
    const n = clamp(Math.round(a.steps === undefined ? 1 : agNum(a.steps, "steps")), 1, 50);
    let k2 = 0;
    for (let i = 0; i < n; i++) {
      if (act === "undo" ? !hist.length : !redoStack.length) break;
      if (act === "undo") undo();
      else redo();
      k2++;
    }
    return {done: k2, undo_left: hist.length, redo_left: redoStack.length};
  }
};

async function agentCall(name, args) {
  const fn = has(AGENT_RUN, name) ? AGENT_RUN[name] : null;
  if (!fn) return {isError: true, content: [{type: "text", text: "Нет такого инструмента: " + name}]};
  AG.busy++;
  agUI();
  try {
    const out = await fn(args && typeof args === "object" ? args : {});
    const res = out && Array.isArray(out.content) ? out : {content: [{type: "text", text: JSON.stringify(out === undefined ? {ok: true} : out, null, 1)}]};
    if (document.hidden) res.content.push({type: "text", text: "Вкладка плана сейчас скрыта, браузер её притормаживает. 3D, снимки и видео пойдут медленно или встанут, пока вкладку не откроют."});
    if (has(AG_SAY, name)) setStatus("Claude: " + AG_SAY[name]);
    return res;
  } catch (err) {
    return {isError: true, content: [{type: "text", text: err && err.agent ? err.message : "Ошибка в странице: " + (err && err.message ? err.message : String(err))}]};
  } finally {
    AG.busy--;
    agUI();
  }
}

function agLoad() {
  try {
    const d = JSON.parse(localStorage.getItem(AG_LS) || "null");
    if (d && typeof d === "object") {
      if (Number.isInteger(d.port) && d.port > 0 && d.port < 65536) AG.port = d.port;
      if (typeof d.token === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(d.token)) AG.token = d.token;
      AG.on = d.on === true && !!AG.token;
    }
  } catch (err) {
    return;
  }
}

function agStore() {
  try {
    localStorage.setItem(AG_LS, JSON.stringify({port: AG.port, token: AG.token, on: AG.on}));
  } catch (err) {
    return;
  }
}

function agUI() {
  const b = $("#agbtn");
  if (!b) return;
  const st = AG.busy ? "busy" : AG.state;
  b.dataset.st = st;
  const txt = {
    off: "Не подключено. Попроси Claude «открой план», код и порт подставятся сами, или вставь код вручную.",
    wait: `Жду сервер plan-doma на порту ${AG.port}. Он запускается вместе с Claude Desktop.`,
    on: "Claude подключён и может править план.",
    busy: "Claude работает с планом.",
    bad: "Код не подошёл. Возьми свежий у Claude: «дай код подключения к плану».",
    moved: "Claude подключился к другой вкладке плана. Здесь связь выключена.",
    ver: "Версия страницы и сервера разные. Обнови репозиторий и перезапусти Claude Desktop или обнови страницу."
  }[st] || "";
  const el = $("#agst");
  if (el) el.textContent = AG.note || txt;
  const tk = $("#agtoken");
  if (tk && document.activeElement !== tk) tk.value = AG.token;
  const pt = $("#agport");
  if (pt && document.activeElement !== pt) pt.value = String(AG.port);
  const off = $("#agoff");
  if (off) off.hidden = !AG.on;
}

function agRetry() {
  clearTimeout(AG.timer);
  if (!AG.on) return;
  AG.tries++;
  AG.timer = setTimeout(agConnect, Math.min(30000, 1500 * AG.tries));
}

function agConnect() {
  clearTimeout(AG.timer);
  if (!AG.on || !AG.token || typeof WebSocket === "undefined") return;
  if (AG.ws) {
    const old = AG.ws;
    AG.ws = null;
    try {
      old.close();
    } catch (err) {
      AG.ws = null;
    }
  }
  let ws;
  try {
    ws = new WebSocket(`ws://127.0.0.1:${AG.port}/claude`);
  } catch (err) {
    AG.state = "wait";
    agUI();
    agRetry();
    return;
  }
  AG.ws = ws;
  AG.state = "wait";
  AG.note = "";
  agUI();
  ws.onopen = () => ws.send(JSON.stringify({type: "hello", token: AG.token, ver: AGENT_VER, web: WEB}));
  ws.onmessage = e => agMsg(ws, e.data);
  ws.onerror = () => {};
  ws.onclose = e => {
    if (AG.ws !== ws) return;
    AG.ws = null;
    if (e.code === 4001 || e.code === 4000 || e.code === 4002) {
      AG.state = e.code === 4001 ? "bad" : e.code === 4000 ? "moved" : "ver";
      AG.on = false;
      agStore();
      if (e.code === 4000) setStatus("Claude перешёл в другую вкладку плана");
    } else {
      if (AG.state === "on") setStatus("Связь с Claude прервалась, переподключаюсь");
      AG.state = "wait";
      agRetry();
    }
    agUI();
  };
}

async function agMsg(ws, raw) {
  let m;
  try {
    m = JSON.parse(String(raw));
  } catch (err) {
    return;
  }
  if (!m || typeof m !== "object") return;
  if (m.type === "welcome") {
    AG.state = "on";
    AG.tries = 0;
    agUI();
    setStatus("Claude подключён");
    return;
  }
  if (m.type !== "call" || typeof m.name !== "string") return;
  const result = await agentCall(m.name, m.args);
  if (ws.readyState === 1) ws.send(JSON.stringify({type: "result", id: m.id, result}));
}

function agOff() {
  AG.on = false;
  AG.state = "off";
  AG.note = "";
  clearTimeout(AG.timer);
  agStore();
  if (AG.ws) {
    const ws = AG.ws;
    AG.ws = null;
    try {
      ws.close();
    } catch (err) {
      AG.ws = null;
    }
  }
  agUI();
}

function agOn() {
  const tk = $("#agtoken");
  const pt = $("#agport");
  const token = tk ? tk.value.trim() : AG.token;
  const port = pt ? parseInt(pt.value, 10) : AG.port;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    AG.note = "В коде только латиница, цифры, - и _, от 8 знаков.";
    agUI();
    return;
  }
  AG.token = token;
  AG.port = Number.isInteger(port) && port > 0 && port < 65536 ? port : AGENT_PORT;
  AG.on = true;
  AG.tries = 0;
  agStore();
  agConnect();
}

function agentInit() {
  agLoad();
  const m = /(?:^#|&)claude=(\d{2,5})\.([A-Za-z0-9_-]{8,64})/.exec(location.hash || "");
  if (m) {
    AG.port = Number(m[1]);
    AG.token = m[2];
    AG.on = true;
    agStore();
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (err) {
      location.hash = "";
    }
  }
  const on = $("#agon");
  if (on) on.addEventListener("click", agOn);
  const off = $("#agoff");
  if (off) off.addEventListener("click", agOff);
  const tk = $("#agtoken");
  if (tk) tk.addEventListener("keydown", e => {
    if (e.key === "Enter") agOn();
  });
  agUI();
  if (AG.on) agConnect();
}
