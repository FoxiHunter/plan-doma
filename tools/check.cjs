const {JSDOM} = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "dist", "plan-doma.html"), "utf8");
const errors = [];
const fake2d = {
  canvas: null,
  font: "",
  fillStyle: "",
  textAlign: "",
  textBaseline: "",
  measureText: s => ({width: s.length * 20}),
  beginPath() {},
  moveTo() {},
  lineTo() {},
  quadraticCurveTo() {},
  fill() {},
  fillText() {}
};
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/",
  beforeParse(w) {
    w.ResizeObserver = class {
      observe() {}
    };
    w.TextEncoder = require("util").TextEncoder;
    w.HTMLCanvasElement.prototype.getContext = t => (t === "2d" ? fake2d : null);
    w.addEventListener("error", e => errors.push(e.message));
  }
});
const w = dom.window;
const run = code => w.eval(code);
const results = [];
const test = (name, fn) => {
  try {
    const ok = fn();
    results.push([ok ? "ok" : "FAIL", name]);
  } catch (e) {
    results.push(["FAIL", name + " (" + e.message + ")"]);
  }
};
const meshes = () => run("(() => { let n = 0; V.root.traverse(o => { if (o.isMesh) n++; }); return n; })()");
const ZF = `window.zfScan = function (root) {
  const tolD = 0.0004;
  const minArea = 2e-5;
  root.updateMatrixWorld(true);
  const tris = [];
  let id = 0;
  root.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const g = o.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    const groups = g.groups.length ? g.groups : [{start: 0, count: n, materialIndex: 0}];
    const mid = id++;
    for (const gr of groups) {
      const mt = mats[gr.materialIndex] || mats[0];
      if (!mt || mt.visible === false || (mt.transparent && !mt.depthWrite)) continue;
      for (let i = gr.start; i + 2 < Math.min(n, gr.start + gr.count); i += 3) {
        const v = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(o.matrixWorld));
        const nn = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0]));
        const len = nn.length();
        if (len < 2e-7) continue;
        nn.divideScalar(len);
        if (nn.y < -0.99 && v.every(q => q.y < 0.003)) continue;
        tris.push({v, n: nn, d: nn.dot(v[0]), id: mid, o, mt});
      }
    }
  });
  const nk = n => Math.round(n.x * 50) + "," + Math.round(n.y * 50) + "," + Math.round(n.z * 50);
  const buckets = new Map();
  for (const t of tris) {
    const k = nk(t.n) + "|" + Math.round(t.d / (tolD * 2));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(t);
  }
  const area2 = P => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      const b = P[(i + 1) % P.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  const clip = (subj, cl) => {
    let out = subj;
    const ccw = area2(cl) > 0;
    for (let i = 0; i < cl.length && out.length; i++) {
      const A = cl[i];
      const B2 = cl[(i + 1) % cl.length];
      const side = p => {
        const c = (B2[0] - A[0]) * (p[1] - A[1]) - (B2[1] - A[1]) * (p[0] - A[0]);
        return ccw ? c >= -1e-12 : c <= 1e-12;
      };
      const cross = (p, q) => {
        const dx = q[0] - p[0];
        const dy = q[1] - p[1];
        const ex = B2[0] - A[0];
        const ey = B2[1] - A[1];
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-15) return p;
        const t = ((A[0] - p[0]) * ey - (A[1] - p[1]) * ex) / den;
        return [p[0] + t * dx, p[1] + t * dy];
      };
      const inp = out;
      out = [];
      for (let j = 0; j < inp.length; j++) {
        const P = inp[j];
        const Q = inp[(j + 1) % inp.length];
        const pi = side(P);
        const qi = side(Q);
        if (pi) {
          out.push(P);
          if (!qi) out.push(cross(P, Q));
        } else if (qi) out.push(cross(P, Q));
      }
    }
    return out;
  };
  const tag = o => {
    for (let p = o; p && p !== root; p = p.parent) if (p.userData && p.userData.pick) return p.userData.pick.t + ":" + (p.userData.pick.id || "");
    return "";
  };
  const mname = t => t.mt.name || (t.mt.userData && t.mt.userData.key) || t.mt.type;
  const found = new Map();
  for (const [k, own] of buckets) {
    const [nkey, dq] = k.split("|");
    const list = own.concat(buckets.get(nkey + "|" + (Number(dq) + 1)) || []);
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const s = list[i];
        const t = list[j];
        if (s.id === t.id) continue;
        if (s.n.dot(t.n) < 0.999 || t.v.some(q => Math.abs(s.n.dot(q) - s.d) > tolD)) continue;
        const ax = Math.abs(s.n.x) >= Math.abs(s.n.y) && Math.abs(s.n.x) >= Math.abs(s.n.z) ? 0 : Math.abs(s.n.y) >= Math.abs(s.n.z) ? 1 : 2;
        const to2 = tr => tr.v.map(q => ax === 0 ? [q.y, q.z] : ax === 1 ? [q.x, q.z] : [q.x, q.y]);
        const P = clip(to2(s), to2(t));
        if (P.length < 3) continue;
        const ar = Math.abs(area2(P)) / Math.abs(s.n.getComponent(ax));
        if (ar < minArea) continue;
        const ok2 = nk(s.n.clone().negate());
        const od = Math.round(-s.d / (tolD * 2));
        let cov = 0;
        for (const dq2 of [od - 1, od, od + 1]) {
          for (const u of buckets.get(ok2 + "|" + dq2) || []) {
            if (u.id === s.id || u.id === t.id || u.n.dot(s.n) > -0.999 || u.v.some(q => Math.abs(s.n.dot(q) - s.d) > tolD)) continue;
            const Q = clip(P, to2(u));
            if (Q.length >= 3) cov += Math.abs(area2(Q)) / Math.abs(s.n.getComponent(ax));
          }
        }
        if (cov >= ar - minArea) continue;
        const key = tag(s.o) + " " + mname(s) + " vs " + tag(t.o) + " " + mname(t) + " n=" + [s.n.x, s.n.y, s.n.z].map(x => x.toFixed(2)).join(",");
        const f = found.get(key) || {key, area: 0, at: s.v[0].toArray().map(x => Math.round(x * 1000) / 1000)};
        f.area += ar;
        found.set(key, f);
      }
    }
  }
  return {tris: tris.length, hits: [...found.values()].sort((a, b) => b.area - a.area)};
};`;

async function agentChecks() {
  const call = async (name, args) => {
    const r = await w.agentCall(name, args || {});
    let data = null;
    try {
      data = JSON.parse(r.content[0].text);
    } catch (e) {
      data = null;
    }
    return {err: !!r.isError, text: r.content.map(c => c.text || "").join("\n"), data, r};
  };
  const atest = async (name, fn) => {
    try {
      const ok = await fn();
      results.push([ok ? "ok" : "FAIL", name]);
    } catch (e) {
      results.push(["FAIL", name + " (" + e.message + ")"]);
    }
  };
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const r2 = v => Math.round(v * 100) / 100;
  await atest("инструменты Claude совпадают с обработчиками и со списками приложения", () => {
    const names = run("AGENT_TOOLS.map(t => t.name)");
    const E = run("AG_ENUMS");
    const keys = c => run(`Object.keys(${c})`);
    const ops = run("[...new Set(Object.values(OP_OPS).flatMap(o => Object.keys(o)))]");
    const schemas = run("AGENT_TOOLS.every(t => t.description && t.inputSchema && t.inputSchema.type === 'object')");
    return same(names, keys("AGENT_RUN")) && schemas && same(run("AG_ROOM_TYPES"), keys("TYPES")) && same(E.doorKind, keys("DOOR_KINDS")) && same(E.doorOp, keys("DOOR_OPS")) && same(E.leaf, keys("LEAFS")) &&
      same(E.winOp, keys("WIN_OPS")) && same(E.roof, keys("ROOFS")) && same(E.fence, keys("FENCES")) && same(E.gate, keys("FENCE_GATES")) && same(E.weather, keys("WEATHER")) && same(E.light, keys("LTPL")) &&
      same(E.lamps, keys("LAMP_MODES")) && same(E.quality, keys("QUALITY")) && same(E.kitMod, keys("KMODS")) && same(E.opKind, keys("OP_KINDS")) && same(E.opOp, ops) && !run("AGENT_TOOLS.some(t => JSON.stringify(t).includes('</script'))");
  });
  await atest("Claude строит дом: комнаты, двери, окна и мебель встают на стены, каждый вызов один шаг истории", async () => {
    await call("new_plan", {plot: {w: 22, d: 34}, site: {city: "Казань"}});
    const h0 = run("hist.length");
    const a = (await call("add_room", {type: "Гостиная", x: 0, y: 0, w: 6, d: 5})).data;
    const b = (await call("add_room", {type: "Спальня", x: 6.15, y: 0, w: 4, d: 5})).data;
    const c = (await call("add_room", {type: "Прихожая", x: 0, y: 5, w: 10.15, d: 2.4})).data;
    const steps = run("hist.length") - h0;
    const en = (await call("add_opening", {kind: "entry", room: c.id})).data;
    const d1 = (await call("add_opening", {kind: "door", x: 6, y: 2.5, op: "slide", leaf: "glass"})).data;
    const d2 = (await call("add_opening", {kind: "door", room: c.id})).data;
    const wn = (await call("add_opening", {kind: "window", room: a.id, w: 2, op: "lift"})).data;
    const wb = (await call("add_opening", {kind: "window", room: b.id})).data;
    const sofa = (await call("add_model", {kind: "sofa", room: a.id, snap: true})).data;
    const bed = (await call("add_model", {kind: "bed2", room: b.id, cx: 8, cy: 1.5})).data;
    const tree = (await call("add_model", {kind: "tree", cx: 4, cy: 4})).data;
    const ws = run("(() => { const e = ext(); const ws = wallSegs(); const sd = extSides(e); return S.doors.every(d => !!lineOf(d, ws, sd, false)) && S.windows.every(x => !!lineOf(x, ws, sd, true)); })()");
    const entry = run(`(() => { const d = S.doors.find(x => x.id === '${en.id}'); const L = lineOf(d, wallSegs(), extSides(ext()), false); return L.ext && d.kind === 'entry'; })()`);
    const plan = (await call("get_plan")).data;
    return steps === 3 && b.x === 6 && b.w === 4.15 && ws && entry && d1.op === "slide" && d1.leaf === "glass" && d2.kind === "door" && wn.op === "lift" && wn.n === 2 && wn.w === 2 && wb.label.indexOf("Спальня") > 0 &&
      sofa.where === "house" && sofa.room === a.id && Math.min(...Object.values(sofa.gaps)) < 0.01 && bed.room === b.id && Math.abs(bed.x + bed.w / 2 - 8) < 0.01 && tree.where === "plot" &&
      plan.warnings.house.length === 0 && plan.items.find(i => i.id === sofa.id).room === a.id && plan.rooms.length === 3 && plan.doors.every(x => x.label);
  });
  await atest("update везёт с комнатой её двери и мебель, держит центр при новой ширине, отдаёт ошибку на чужое поле", async () => {
    const p = (await call("get_plan")).data;
    const b = p.rooms.find(r => r.type === "Спальня");
    const bed = p.items.find(i => i.kind === "bed2");
    const win = p.windows.find(x => x.label.indexOf("Спальня") > 0);
    await call("update", {id: b.id, set: {y: 0.5, carry: true}});
    const q = (await call("get_plan")).data;
    const moved = q.items.find(i => i.id === bed.id).y === r2(bed.y + 0.5) && q.windows.find(x => x.id === win.id).y === r2(win.y + 0.5);
    await call("history", {action: "undo"});
    const cx0 = bed.x + bed.w / 2;
    const u = (await call("update", {id: bed.id, set: {w: 1.8, rot: 90, color: "red"}})).data;
    const centred = Math.abs(u.x + u.w / 2 - cx0) < 0.01 && u.rot === 90 && u.skipped.includes("color");
    const bad = await call("update", {id: "nope", set: {x: 1}});
    const badType = await call("update", {id: b.id, set: {type: "Бассейн"}});
    return moved && centred && bad.err && badType.err && badType.text.indexOf("Спальня") > 0;
  });
  await atest("стены, материалы, проёмы, расстояния, перенос и выравнивание работают как в редакторе", async () => {
    const p = (await call("get_plan")).data;
    const a = p.rooms.find(r => r.type === "Гостиная");
    const c = p.rooms.find(r => r.type === "Прихожая");
    const wl = (await call("set_wall", {a: a.id, b: c.id, wall: false})).data;
    const back = (await call("set_wall", {a: a.id, b: c.id, wall: true})).data;
    const noEdge = await call("set_wall", {a: a.id, b: a.id, wall: false});
    const fl = (await call("set_material", {target: a.id, slot: "floor", material: "parquet", color: "#aa7744"})).data;
    const fac = (await call("set_material", {target: "house", slot: "facade", color: "#334455"})).data;
    const slots = (await call("list_materials", {target: a.id})).data;
    const badSlot = await call("set_material", {target: a.id, slot: "roof", color: "#000000"});
    const door = p.doors.find(d => d.kind === "door");
    const op = (await call("open_close", {id: door.id, value: 0.3})).data;
    const tog = (await call("open_close", {id: door.id})).data;
    const gate = (await call("open_close", {id: "fence", part: "wicket"})).data;
    const sofa = p.items.find(i => i.kind === "sofa");
    const g = (await call("gaps", {id: sofa.id, dir: "d", value: 1})).data;
    const ch = (await call("add_model", {kind: "chair", room: a.id, x: 1, y: 3})).data;
    const ch2 = (await call("transform", {ids: [ch.id], op: "duplicate"})).data.ids[0];
    const ch3 = (await call("transform", {ids: [ch.id, ch2], op: "duplicate"})).data.ids;
    const al = await call("transform", {ids: [ch.id, ch2].concat(ch3), op: "align", mode: "t"});
    const tops = run(`[${JSON.stringify([ch.id, ch2].concat(ch3))}].flat().map(id => thingBox(S.items.find(i => i.id === id)).y)`);
    const mv = (await call("transform", {ids: [ch.id], op: "move", dx: 0.5, dy: 0})).data.items[0];
    const rm = (await call("remove", {ids: ch3.concat(["zzz"])})).data;
    const mats = run(`S.rooms.find(r => r.id === '${a.id}').mats.floor`);
    return wl.wall === false && back.wall === true && noEdge.err && fl.material === "parquet" && fl.color === "#aa7744" && mats.m === "parquet" && fac.color === "#334455" && slots.slots.some(s => s.slot === "floor" && s.own) &&
      badSlot.err && op.open === 0.3 && tog.open === 0 && gate.open === 1 && Math.abs(g.gaps.d - 1) < 0.01 && ch3.length === 2 && !al.err && tops.every(y => Math.abs(y - tops[0]) < 0.001) &&
      Math.abs(mv.x - r2(ch.x + 0.5)) < 0.001 && rm.removed.length === 2 && rm.missing[0] === "zzz";
  });
  await atest("участок, дом, план целиком, вид, камера, небо, рулетка, солнце, ведомость и история", async () => {
    const pl = (await call("set_plot", {w: 24, north: 20, fence: {front: "forged", gate: "slide", h: 1.9}})).data;
    const badCity = await call("set_plot", {city: "Атлантида"});
    const hs = (await call("set_house", {roof: "shed", pitch: 15, from_street: 6, chim: true})).data;
    const badRot = await call("set_house", {rot: 45});
    const fp = run("(() => { const f = footprint(); return r2(S.plot.d - f.y - f.d); })()");
    const pt = (await call("patch_plan", {patch: {house: {h: 3}, items: [{kind: "tv", x: 1, y: 1}], bogus: 1}})).data;
    const tv = run(`S.items.find(i => i.id === '${pt.added[0]}').kind`);
    const json = (await call("get_plan", {format: "json"})).data.plan;
    const ld = (await call("load_plan", {plan: {plan: json}})).data;
    const badLoad = await call("load_plan", {plan: {foo: 1}});
    const vw = (await call("set_view", {tab: "house", view: "2d", mode: "noroof", labels: false, select: json.rooms[0].id})).data;
    const cam = (await call("camera", {from: [2, 2, 1.6], to: [5, 2, 1.6], coords: "house"})).data;
    const look = run("(() => { const f = camF(); const d = dirToHouse(f.x, f.z); return d.x > 0.99 && Math.abs(CAM.pos.y - S.house.base - 1.6) < 0.01; })()");
    const sky = (await call("set_sky", {month: 6, day: 21, time: "21:40", weather: "cloudy", lamps: "on", wind: 3})).data;
    const badTime = await call("set_sky", {time: "25:99"});
    const ms = (await call("measure", {from: [0, 0], to: [3, 4]})).data;
    const msPlot = (await call("measure", {from: [1, 1, 0], to: [1, 3, 2], coords: "plot"})).data;
    const clear = await call("measure", {clear: true});
    const sun = (await call("sun_info", {month: 6, day: 21})).data;
    const noMap = await call("sun_info", {map: true});
    const bq = (await call("boq")).data;
    const cat = (await call("list_catalog", {q: "диван"})).data;
    const mat = (await call("list_materials", {group: "floor"})).data;
    const view = (await call("get_view")).data;
    const n = run("hist.length");
    const un = (await call("history", {action: "undo", steps: 3})).data;
    const re = (await call("history", {action: "redo", steps: 3})).data;
    return pl.plot.w === 24 && pl.site.north === 20 && pl.plot.fence.front === "forged" && pl.plot.fence.h === 1.9 && badCity.err && badCity.text.indexOf("Москва") > 0 && hs.house.roof === "shed" && hs.house.pitch === 15 && hs.house.chim &&
      badRot.err && Math.abs(fp - 6) < 0.01 && tv === "tv" && pt.skipped[0] === "bogus" && ld.rooms === json.rooms.length && badLoad.err && vw.view === "2d" && vw.labels === false && vw.select.id === json.rooms[0].id && !cam.walk && look &&
      sky.time === "21:40" && sky.weather === "cloudy" && sky.lamps === "on" && badTime.err && ms.length === 5 && Math.abs(msPlot.length - Math.hypot(2, 2)) < 0.01 && !clear.err && !run("MEAS.a") &&
      sun.facades.length === 4 && sun.rise && noMap.err && bq.rows.length > 10 && cat.models.every(m => m.name.toLowerCase().includes("диван")) && mat.materials.every(m => m.group === "floor") &&
      view.sky.month === 6 && un.done === 3 && re.done === 3 && run("hist.length") === n;
  });
  await atest("снимки и экспорт без 3D отвечают понятной ошибкой, файл плана скачивается, неизвестный инструмент не ломает план", async () => {
    const before = run("JSON.stringify(S)");
    const shot = await call("screenshot", {what: "3d"});
    const vid = await call("export", {kind: "video_orbit"});
    run("window.__dl = download; window.__name = ''; download = (b, n) => { window.__name = n; };");
    const js = (await call("export", {kind: "json"})).data;
    const svgName = (await call("export", {kind: "plan_svg", which: "house"}), run("window.__name"));
    run("download = window.__dl;");
    const unk = await call("rm_rf");
    const bad = await call("add_room", {type: "Спальня", x: "a", y: 0, w: 3, d: 3});
    return shot.err && shot.text.indexOf("3D") >= 0 && vid.err && js.done && svgName.startsWith("plan-doma-") && svgName.endsWith(".svg") && unk.err && bad.err && run("JSON.stringify(S)") === before;
  });
  await atest("ссылка с кодом подключает вкладку сама, код остаётся в браузере, кнопка показывает состояние", () => {
    run("history.replaceState(null, '', '/#claude=47611.abcdefgh12345678'); agentInit();");
    const st = run("({port: AG.port, token: AG.token, on: AG.on, hash: location.hash, saved: JSON.parse(localStorage.getItem(AG_LS))})");
    const dot = w.document.getElementById("agbtn").dataset.st;
    run("agOff();");
    const off = run("AG.on === false && JSON.parse(localStorage.getItem(AG_LS)).on === false && !AG.ws");
    return st.port === 47611 && st.token === "abcdefgh12345678" && st.on && st.hash === "" && st.saved.token === "abcdefgh12345678" && dot === "wait" && off;
  });
  await atest("сервер MCP отдаёт инструменты, передаёт вызов во вкладку и обратно, чужой код и чужой сайт не пускает", async () => {
    const {spawn} = require("child_process");
    const port = 47700 + Math.floor(Math.random() * 200);
    const token = "checktoken_" + Math.random().toString(36).slice(2, 12);
    const srv = spawn(process.execPath, [path.join(__dirname, "..", "mcp", "server.mjs")], {env: Object.assign({}, process.env, {PLAN_DOMA_PORT: String(port), PLAN_DOMA_TOKEN: token}), stdio: ["pipe", "pipe", "pipe"]});
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const waits = new Map();
    let buf = "";
    let log = "";
    srv.stderr.on("data", d => {
      log += d;
    });
    srv.stdout.on("data", d => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const m = JSON.parse(buf.slice(0, i));
        buf = buf.slice(i + 1);
        if (waits.has(m.id)) waits.get(m.id)(m);
      }
    });
    let id = 0;
    const rpc = (method, params) => new Promise(res => {
      const n = ++id;
      waits.set(n, res);
      srv.stdin.write(JSON.stringify({jsonrpc: "2.0", id: n, method, params}) + "\n");
    });
    try {
      for (let i = 0; i < 50 && log.indexOf(String(port)) < 0; i++) await sleep(100);
      const init = await rpc("initialize", {protocolVersion: "2025-06-18", capabilities: {}, clientInfo: {name: "check", version: "1"}});
      srv.stdin.write(JSON.stringify({jsonrpc: "2.0", method: "notifications/initialized"}) + "\n");
      const list = (await rpc("tools/list", {})).result.tools.map(t => t.name);
      const cold = (await rpc("tools/call", {name: "get_plan", arguments: {}})).result;
      run(`AG.port = ${port}; AG.token = 'wrong_token_123'; AG.on = true; agConnect();`);
      for (let i = 0; i < 30 && run("AG.state") !== "bad"; i++) await sleep(100);
      const rejected = run("AG.state") === "bad" && run("AG.on") === false;
      run(`AG.token = '${token}'; AG.on = true; agConnect();`);
      for (let i = 0; i < 30 && run("AG.state") !== "on"; i++) await sleep(100);
      const on = run("AG.state") === "on";
      const n0 = run("S.rooms.length");
      const add = (await rpc("tools/call", {name: "add_room", arguments: {type: "Кладовая", x: 30, y: 0, w: 2, d: 2}})).result;
      const added = run("S.rooms.length") === n0 + 1 && JSON.parse(add.content[0].text).name === "Кладовая";
      const status = JSON.parse((await rpc("tools/call", {name: "planner_status", arguments: {}})).result.content[0].text);
      const WS = require("ws");
      const evil = await new Promise(res => {
        const s = new WS(`ws://127.0.0.1:${port}/claude`, {origin: "https://evil.example"});
        s.on("error", e => res(e.message));
        s.on("open", () => res("open"));
      });
      const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
      const trav = (await fetch(`http://127.0.0.1:${port}/%2e%2e/package.json`)).status;
      run("agOff();");
      await sleep(200);
      const gone = (await rpc("tools/call", {name: "boq", arguments: {}})).result;
      return init.result.serverInfo.name === "plan-doma" && init.result.instructions.indexOf("координат") > 0 && list.length === run("AGENT_TOOLS.length") + 2 && list.includes("open_planner") &&
        cold.isError && cold.content[0].text.indexOf(token) > 0 && rejected && on && added && status.connected && status.code === token && evil.indexOf("403") >= 0 && page.indexOf("app/agent.js") > 0 && trav === 404 && gone.isError;
    } finally {
      srv.stdin.end();
      await sleep(100);
      srv.kill();
    }
  });
  run("S = presetExample(); sel = null; tab = 'house'; view = 'split'; V.mode = 'roof'; V.labels = true; LAMP.mode = 'auto'; changed();");
}

setTimeout(() => {
  const d = w.document;
  test("скрипты грузятся без ошибок", () => errors.length === 0);
  test("пример дома без предупреждений", () => {
    run("S = presetExample(); tab = 'house'; sel = null; changed();");
    return run("warnings().length") === 0;
  });
  test("стены считаются", () => run("wallSegs().walls.length") === 9 && run("wallSegs().soft.length") === 2);
  test("все двери стоят на стенах", () => run("(() => { const e = ext(); const ws = wallSegs(); const sd = extSides(e); return S.doors.every(x => lineOf(x, ws, sd, false)); })()"));
  test("3D-сцена строится во всех режимах", () => {
    for (const m of ["noroof", "roof", "cut"]) run(`V.mode = "${m}"; build3D();`);
    return meshes() > 50;
  });
  test("разрез с каждой стороны строится", () => {
    for (const s of ["top", "front", "back", "left", "right"]) run(`V.mode = "cut"; V.cut = {side: "${s}", t: 0.4}; build3D();`);
    run("V.mode = 'noroof'; build3D();");
    return meshes() > 50;
  });
  test("стены дома собраны в одно тело", () => run("(() => { let n = 0; V.root.traverse(o => { if (o.userData && o.userData.walls) n++; }); return n; })()") === 1);
  test("перекрытые стены сливаются без лишних граней", () => run("(() => { const g = wallSolid([[0, 2, 0, 1, 0, 1], [1, 3, 0, 1, 0, 1]], [], {inner: {x0: -9, x1: -8, z0: -9, z1: -8}, y0: 0}); return g.index.count; })()") === 30);
  test("поворот комнаты тянет её двери и окна", () => {
    run("sel = {t: 'room', id: S.rooms[0].id}; window.__att = attachedTo(S.rooms[0]).length; rotateSel(); changed();");
    return run("attachedTo(S.rooms[0]).length === window.__att && window.__att > 0");
  });
  test("отмена возвращает размер комнаты", () => {
    run("undo();");
    return run("S.rooms[0].w === 3.6 && S.rooms[0].d === 4");
  });
  test("новое окно находит место", () => run("sel = null; !!addOpening('win')"));
  test("проём ставится кликом у стены", () => run("(() => { S = presetExample(); const d = openingAt('door', {x: 1.0, y: 5.3}, 1.5); return !!d && d.o === 'h' && Math.abs(d.y - 5.2) < 0.01 && d.side === 1; })()"));
  test("далеко от стены проём не ставится", () => run("openingAt('door', {x: 1.6, y: 7.3}, 0.5) === null"));
  test("арка строится в 3D", () => {
    run("S.doors[1].kind = 'arch'; build3D();");
    const ok = meshes() > 50;
    run("S.doors[1].kind = 'door'; build3D();");
    return ok;
  });
  test("комната прилипает к соседней стене", () => run("(() => { const r = S.rooms[1]; const m = magnetRoom({x: r.x + 0.08, y: r.y, w: r.w, d: r.d, id: r.id}, 'move'); return Math.abs(m.x - r.x) < 0.001; })()"));
  test("sanitize не теряет данные", () => run("JSON.stringify(sanitize(JSON.parse(JSON.stringify(S)))) === JSON.stringify(S)"));
  test("старый план версии 2 переводится в версию 3", () => run("(() => { const p = presetExample(); p.v = 2; delete p.items; p.objects = [{id: 'g', kind: 'garage', name: 'Гараж', x: 0, y: 0, w: 6, d: 4, h: 3, rot: 90}]; const s = sanitize(p); const o = s.objects[0]; return s.v === 3 && s.items.length === 0 && o.w === 4 && o.d === 6 && o.x === 1 && o.y === -1 && o.rot === 90; })()"));
  test("габарит повёрнутой модели считается", () => run("(() => { const b = thingBox({x: 0, y: 0, w: 2, d: 1, rot: 90}); return Math.abs(b.w - 1) < 1e-9 && Math.abs(b.d - 2) < 1e-9 && Math.abs(b.x - 0.5) < 1e-9; })()"));
  test("план с мебелью без предупреждений", () => {
    run("S = presetExampleFurnished(); tab = 'house'; sel = null; renderAll();");
    return run("warnings().length") === 0 && run("S.items.length") > 20;
  });
  test("все модели каталога строятся", () => run("(() => { for (const k of Object.keys(MODELS)) { const g = new THREE.Group(); buildModel(g, {id: k, kind: k, w: MODELS[k].w, d: MODELS[k].d, h: MODELS[k].h}, matPlot, false); if (!g.children.length) return false; } return true; })()"));
  test("человек ростом 175 см", () => run("(() => { const g = new THREE.Group(); buildModel(g, {id: 'p', kind: 'person', w: 0.5, d: 0.3, h: 1.75}, matPlot, false); g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g); return Math.abs(b.max.y - 1.75) < 0.01 && b.min.y >= -0.001; })()"));
  test("сцена с мебелью строится", () => {
    run("V.mode = 'roof'; build3D(); V.mode = 'noroof'; build3D();");
    return meshes() > 300;
  });
  test("разрез отсекает мебель в отрезанной части и оставляет остальную", () => run("(() => { V.mode = 'cut'; V.cut = {side: 'front', t: 0.45}; build3D(); const P = k2 => { const it = S.items.find(i => i.kind === k2); const w = houseToWorld(it.x + it.w / 2, it.y + it.d / 2); return new THREE.Vector3(w.x, 1, w.z); }; const cutAway = CLIP[0].distanceToPoint(P('desk')) < 0; const kept = CLIP[0].distanceToPoint(P('bed2')) > 0; V.cut = {side: 'top', t: 0.43}; build3D(); const top = CLIP[0].distanceToPoint(new THREE.Vector3(S.house.cx, S.house.base + 2.5, S.house.cy)) < 0; V.mode = 'noroof'; build3D(); return cutAway && kept && top && CLIP[0].constant > 1e5; })()"));
  test("манипулятор находит выбранную мебель", () => run("sel = {t: 'item', id: S.items[0].id}; !!tgtFrame()"));
  test("перетаскивание мебели двигает её в 3D без пересборки", () => run("(() => { V.rebuild = false; build3D(); const it = S.items[0]; sel = {t: 'item', id: it.id}; it.x += 1; const ok = syncThing3D(); const g = V.hgi.children.find(c => c.userData.pick && c.userData.pick.id === it.id); const moved = Math.abs(g.position.x - (it.x + it.w / 2)) < 1e-9; it.x -= 1; return ok && moved; })()"));
  test("поворот мебели в 3D меняет угол", () => run("(() => { const it = S.items[0]; const r0 = it.rot; rotateSel(); const ok = it.rot === (r0 + 90) % 360; rotateSel(); rotateSel(); rotateSel(); return ok; })()"));
  test("2D рисуется", () => d.getElementById("cv").innerHTML.length > 1000);
  test("мебель рисуется на плане", () => d.querySelectorAll("#cv [data-t='item']").length === run("S.items.length"));
  test("зум плана меняет рамку", () => {
    const vb0 = d.getElementById("cv").getAttribute("viewBox");
    run("zoom2D(2);");
    const vb1 = d.getElementById("cv").getAttribute("viewBox");
    run("fit2D();");
    return vb0 !== vb1;
  });
  test("план выгружается в SVG без переменных CSS", () => run("(() => { const p = planSVG('house', 40); return p.svg.indexOf('var(--') < 0 && p.svg.indexOf('<svg') === 0 && p.svg.length > 5000; })()"));
  test("ZIP собирается", () => run("(() => { const b = zipBlob([{name: 'a.txt', data: new TextEncoder().encode('hello')}]); return b.size === 22 + 30 + 46 + 5 * 2 + 5; })()"));
  test("CRC32 считается верно", () => run("crc32(new TextEncoder().encode('123456789')) === 0xCBF43926"));
  test("у стола отдельные части и свой материал ножек переживает sanitize", () => run(`(() => {
    S = presetExampleFurnished();
    const it = S.items.find(i => i.kind === "dining");
    const slots = modelSlots(it).map(x => x.slot);
    it.mats = {legs: {m: "wenge", c: "#2a4f9a"}, bad: {m: "nope"}};
    const s2 = sanitize(JSON.parse(JSON.stringify(S)));
    const it2 = s2.items.find(i => i.id === it.id);
    return ["top", "legs", "rails", "chair", "seat"].every(x => slots.includes(x)) && it2.mats.legs.m === "wenge" && it2.mats.legs.c === "#2a4f9a" && !it2.mats.bad;
  })()`));
  test("свой цвет доходит до материала в 3D", () => run(`(() => {
    V.mode = "noroof";
    build3D();
    let found = false;
    V.root.traverse(o => {
      if (o.isMesh) for (const m of [].concat(o.material)) if (m.userData.key && m.userData.key.indexOf("wenge@2a4f9a") === 0) found = true;
    });
    return found;
  })()`));
  test("стены комнаты получают свою отделку", () => run(`(() => {
    S.rooms[0].mats = {wall: {m: "brick_white"}, floor: {m: "tile"}};
    build3D();
    let wm = null;
    V.root.traverse(o => {
      if (o.userData && o.userData.walls) wm = o;
    });
    return !!wm && wm.material.length > 4 && wm.geometry.groups.some(gr => gr.materialIndex >= 4) && wm.material[4].userData.key.indexOf("brick_white") === 0;
  })()`));
  test("все типы дверей и окон строятся", () => {
    run(`(() => {
      S = presetExample();
      const ops = Object.keys(DOOR_OPS);
      const lf = Object.keys(LEAFS);
      S.doors.forEach((d, i) => { d.op = ops[i % ops.length]; d.leaf = lf[i % lf.length]; d.open = 0.5; });
      const wo = Object.keys(WIN_OPS);
      S.windows.forEach((x, i) => { x.op = wo[i % wo.length]; x.open = 0.6; x.how = i % 2 ? "tilt" : "turn"; });
      changed();
      build3D();
    })()`);
    return meshes() > 300;
  });
  test("дверь открывается кликом и попадает в историю", () => run(`(() => {
    const d = S.doors.find(x => x.kind === "door");
    const h0 = hist.length;
    const was = d.open;
    const ok = toggleOpen({t: "door", id: d.id});
    return ok && d.open !== was && hist.length === h0 + 1;
  })()`));
  test("гараж строится с двумя воротами, дверью и окном", () => run(`(() => {
    const g = thing("garage", 1, 20, {w: 7});
    g.opens = [newOp("gate"), Object.assign(newOp("gate"), {c: 2}), Object.assign(newOp("door"), {side: "r"}), Object.assign(newOp("win"), {side: "l"})];
    g.opens[0].c = -2;
    g.opens[1].op = "swing2";
    S.objects.push(g);
    const s2 = sanitize(JSON.parse(JSON.stringify(S)));
    build3D();
    let n = 0;
    V.root.traverse(o => { if (o.userData && o.userData.pick && o.userData.pick.open) n++; });
    return n === 4 && s2.objects.find(o => o.id === g.id).opens.length === 4 && modelSlots(g).some(x => x.slot === "door");
  })()`));
  test("все типы крыши строятся", () => run(`(() => {
    V.mode = "roof";
    for (const t of Object.keys(ROOFS)) {
      S.house.roof = t;
      S.house.chim = true;
      build3D();
      let ok = false;
      V.root.traverse(o => { if (o.userData && (o.userData.roof || (o.userData.pick && o.userData.pick.t === "house"))) ok = true; });
      if (!ok) return false;
    }
    V.mode = "noroof";
    S.house.roof = "gable";
    build3D();
    return true;
  })()`));
  test("конёк двускатной крыши на своей высоте", () => run(`(() => {
    S.house.roof = "gable";
    S.house.pitch = 30;
    const R = roofCalc();
    const want = R.Bh * Math.tan(Math.PI / 6);
    return Math.abs(R.ridgeY - want) < 1e-6 && R.topR.filter(Boolean).length === 2;
  })()`));
  test("вальмовая крыша из четырёх скатов, шатровая сходится в точку", () => run(`(() => {
    S.house.roof = "hip";
    const a = roofCalc().topR.filter(Boolean).length;
    S.house.roof = "pyramid";
    const R = roofCalc();
    S.house.roof = "gable";
    return a === 4 && roofEdges(R).length === 4;
  })()`));
  test("солнце в Москве 21 июня как в справочнике", () => run(`(() => {
    S.site = siteDefault();
    const d = daySun(6, 21);
    return d.top > 57.2 && d.top < 58.2 && d.rise >= 222 && d.rise <= 232 && d.set >= 1272 && d.set <= 1282;
  })()`));
  test("часы солнца по фасадам и комнатам считаются", () => run(`(() => {
    S = presetExample();
    const fs = facadeSun(6, 21);
    const south = fs.find(f => f.name === "Фасад к улице");
    return fs.length === 4 && south && south.total > 400 && roomSun(fs).some(x => x.total > 0);
  })()`));
  test("север поворачивает солнце", () => run(`(() => {
    S.site.north = 0;
    const a = sunDirOf(Math.PI / 4, Math.PI);
    S.site.north = 90;
    const b = sunDirOf(Math.PI / 4, Math.PI);
    S.site.north = 0;
    return a.z > 0.6 && Math.abs(a.x) < 1e-9 && b.x < -0.6;
  })()`));
  test("пасмурная погода гасит солнце", () => run(`(() => {
    SKY.weather = "overcast";
    const a = skyCompute();
    SKY.weather = "clear";
    const b = skyCompute();
    return a.sunI < b.sunI * 0.2 && a.cov === 1;
  })()`));
  test("sanitize держит координаты и крышу", () => run(`(() => {
    const p = presetExample();
    p.site = {lat: 99, lon: 37, tz: 30, north: 370, city: 5};
    p.house.roof = "hip";
    p.house.pitch2 = 100;
    const s2 = sanitize(p);
    return s2.site.lat === 89 && s2.site.tz === 14 && s2.site.north === 10 && s2.site.city === "" && s2.house.roof === "hip" && s2.house.pitch2 === 45;
  })()`));
  test("все материалы получают общий патч шейдера", () => run(`(() => { const sh = {uniforms: {}, fragmentShader: THREE.ShaderLib.physical.fragmentShader}; mat("glass", true).onBeforeCompile(sh); const f = sh.fragmentShader; return f.includes("uSkyIdx") && f.includes("shAmb") && !!sh.uniforms.uEnvDiff && !f.includes("#include <lights_fragment_begin>") && f.includes("if ( shLM( uPLA[ i ], uPLB[ i ], shWP, shIn ) > 0.5 )") && f.includes("uSkyOn > 0.5") && f.includes("min( uEnvDiff, uInEnv )") && sh.uniforms.uInEnv.value < 0.5; })()`));
  test("лак, ткань и стекло стали физическими материалами", () => run(`mat("lacquer").isMeshPhysicalMaterial && !!mat("fabric_grey").sheen && mat("glass").transmission > 0.5 && !mat("plaster").isMeshPhysicalMaterial`));
  test("внутри дома рассеянный свет приглушается", () => run(`(() => { S = presetExample(); V.mode = "roof"; build3D(); const b = SHU.uInBox.value; const ok = b.z > b.x && b.w > b.y && SHU.uInK.value < 0.5; V.mode = "noroof"; build3D(); return ok && SHU.uInK.value > 0.5; })()`));
  const lights = () => run("(() => { let n = 0; V.root.traverse(o => { if (o.isPointLight && o.intensity > 0) n++; }); return n; })()");
  test("лампы из каталога светят ночью, свет не проходит сквозь стены", () => {
    run("S = presetExample(); S.items.push(thing('floorlamp', 1, 1)); S.objects.push(thing('streetlamp', 3, 26)); LAMP.mode = 'on'; build3D(); lampSync();");
    const n = lights();
    const masked = run("(() => { let ok = true; V.root.traverse(o => { if (o.isPointLight && o.intensity > 0 && !(o.userData.lb && o.userData.lb.z > 0)) ok = false; }); return ok; })()");
    return n === run("S.rooms.length") + 2 + run("S.rooms.filter(r => Math.max(r.w, r.d) > 6.5).length") && masked && run("SHU.uPLB.value[0].z") > 0;
  });
  test("днём свет сам выключается", () => {
    run("LAMP.mode = 'auto'; SKY.m = 6; SKY.d = 21; SKY.t = 720; SKY.weather = 'clear'; applySky(true); build3D();");
    const day = lights();
    run("SKY.t = 23 * 60; applySky(true); build3D();");
    return day === 0 && lights() > 5;
  });
  test("своя люстра заменяет потолочный свет комнаты", () => {
    run("S = presetExample(); LAMP.mode = 'on'; build3D();");
    const before = lights();
    run("(() => { const r = S.rooms.find(q => q.name === 'Спальня 1'); S.items.push(thing('chandelier', r.x + 1, r.y + 1)); build3D(); })()");
    return lights() === before && run("thing('ceil', 0, 0).z") === run("r2(S.house.h - 0.12)");
  });
  test("выключатель лампы попадает в историю и переживает sanitize", () => {
    run("S = presetExample(); S.items.push(thing('floorlamp', 1, 1, {id: 'fl'})); changed();");
    const h0 = run("hist.length");
    run("toggleOpen({t: 'item', id: 'fl'})");
    const s2 = run("(() => { const p = JSON.parse(JSON.stringify(S)); p.items[p.items.length - 1].k = 99999; p.items[p.items.length - 1].lm = -5; return sanitize(p).items.find(x => x.id === 'fl'); })()");
    return run("hist.length") === h0 + 1 && s2.on === false && s2.k === 7000 && s2.lm === 20;
  });
  test("набор источников света один днём, ночью и после выключателя, шейдеры не пересобираются", () => run(`(() => {
    S = presetExample(); S.items.push(thing('floorlamp', 1, 1, {id: 'fl2'})); LAMP.mode = 'auto'; V.mode = 'noroof';
    const sig = () => { let n = 0; let ns = 0; let on = 0; let dir = 0; let dirs = 0; V.scene.traverseVisible(o => { if (o.isPointLight) { n++; if (o.castShadow) ns++; if (o.intensity > 0) on++; } if (o.isDirectionalLight) { dir++; if (o.castShadow) dirs++; } }); return {k: n + '/' + ns + '/' + dir + '/' + dirs, on}; };
    SKY.m = 6; SKY.d = 21; SKY.t = 720; applySky(true); build3D(); const day = sig();
    SKY.t = 23 * 60; applySky(true); build3D(); const night = sig();
    toggleOpen({t: 'item', id: 'fl2'}); build3D(); const off = sig();
    SKY.t = 720; applySky(true);
    return day.on === 0 && night.on > 5 && off.on === night.on - 1 && day.k === night.k && night.k === off.k && V.sun.castShadow && SHU.uSkyOn.value === 0 && SHU.uSkyIdx.value >= 0;
  })()`));
  test("у дома, окон, дверей и моделей каталога нет совпадающих граней", () => {
    run(ZF);
    return run(`(() => {
      S = presetExample(); V.mode = 'noroof'; build3D();
      const bad = zfScan(V.hgi).hits.map(h => 'дом ' + h.key);
      for (const kind of Object.keys(MODELS)) {
        if (kind === 'flowers') continue;
        const md = MODELS[kind];
        const root = new THREE.Group();
        thingGroup({id: 'zf_' + kind, kind, name: md.name, x: 0, y: 0, w: md.w, d: md.d, h: md.h, z: 0, rot: 0}, root, matPlot, 0, {t: 'obj', id: 'zf_' + kind});
        for (const h of zfScan(root).hits) bad.push(kind + ' ' + h.key);
      }
      if (bad.length) console.log(bad.slice(0, 8).join(' | '));
      return bad.length === 0;
    })()`);
  });
  test("подсказка прогулки видна при входе, гаснет через 5 секунд и прячется на выходе", () => run(`(() => {
    const ok0 = V.ok; V.ok = true; const h = document.getElementById('walkhint');
    const st = window.setTimeout; let fade = null; window.setTimeout = (f, ms) => { if (ms === 5000) fade = f; return 0; };
    startWalk(); window.setTimeout = st;
    const shown = h.classList.contains('show') && !h.hidden;
    if (fade) fade();
    const faded = !h.classList.contains('show');
    startWalk(); const again = h.classList.contains('show'); exitWalk(); V.ok = ok0;
    return shown && faded && again && !h.classList.contains('show') && document.getElementById('help3').textContent.includes('Прогулка');
  })()`));
  test("снег копится в снегопад и тает в тепле", () => {
    run("S = presetExample(); Object.assign(WX, {snow: 0, wet: 0, pud: 0}); SKY.weather = 'snow'; SKY.m = 1; SKY.d = 15; SKY.t = 720; wxStep(150);");
    const fell = run("WX.snow");
    run("SKY.weather = 'clear'; SKY.m = 7; applySky(true); for (let i = 0; i < 2; i++) wxStep(10);");
    const melting = run("WX.snow") < fell && run("WX.wet") > 0.5;
    run("for (let i = 0; i < 60; i++) wxStep(10);");
    return fell > 0.6 && melting && run("WX.snow") < 0.05;
  });
  test("после дождя лужи и мокрое высыхают на солнце", () => {
    run("Object.assign(WX, {snow: 0, wet: 0, pud: 0}); SKY.weather = 'rain'; SKY.m = 7; SKY.t = 600; applySky(true); wxStep(90);");
    const wet = run("WX.wet");
    const pud = run("WX.pud");
    run("SKY.weather = 'clear'; applySky(true); for (let i = 0; i < 60; i++) wxStep(10);");
    return wet > 0.95 && pud > 0.4 && run("WX.wet") < 0.3 && run("WX.pud") < pud;
  });
  test("зимой деревья голые, осенью жёлтые, газон меняет цвет", () => {
    const leaves = () => run("(() => { const g = new THREE.Group(); buildModel(g, {id: 't1', kind: 'tree', w: 4, d: 4, h: 6}, matPlot, false); let n = 0; g.traverse(o => { if (o.isMesh && /^leaf/.test(o.material.userData.key)) n++; }); return n; })()");
    run("SKY.m = 1; SKY.d = 15; wxSeasonCheck();");
    const winter = leaves();
    const gw = run("grassKey('grass')");
    run("SKY.m = 10; SKY.d = 15; wxSeasonCheck();");
    const autumn = run("(() => { const g = new THREE.Group(); buildModel(g, {id: 't1', kind: 'tree', w: 4, d: 4, h: 6}, matPlot, false); let y = false; g.traverse(o => { if (o.isMesh && /^leaf_(y|o|r)/.test(o.material.userData.key)) y = true; }); return y; })()");
    run("SKY.m = 7; SKY.d = 15; wxSeasonCheck();");
    return winter === 0 && gw === "grass_w" && autumn && leaves() > 4 && run("grassKey('grass')") === "grass";
  });
  test("зимний месяц кладёт снег, гроза и град есть в погоде", () => {
    run("skySet({m: 1}); ");
    const sn = run("WX.snow");
    run("skySet({m: 7, weather: 'clear'});");
    return sn > 0.8 && run("WX.snow") === 0 && run("!!(WEATHER.storm.bolt && WEATHER.hail.hail)");
  });
  test("ветер качает только растения, снег и лужи есть в шейдере", () => run(`(() => { const a = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader}; mat("leaf").onBeforeCompile(a); const b = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader}; mat("plaster").onBeforeCompile(b); return a.vertexShader.includes("uWind") && !b.vertexShader.includes("uWind") && b.fragmentShader.includes("uSnow") && b.fragmentShader.includes("uPud") && a.uniforms.uPudK.value > 0; })()`));
  test("все виды забора строятся с воротами и калиткой", () => run(`(() => { const meshes = () => { let k = 0; V.root.traverse(o => { if (o.isMesh) k++; }); return k; }; S = presetExample(); let ok = true; for (const t of Object.keys(FENCES)) for (const gt of Object.keys(FENCE_GATES)) { S.plot.fence = Object.assign(fenceDefault(S.plot), {type: t, front: t, gate: gt, wicket: gt !== 'none'}); V.fence = true; build3D(); let n = 0; V.root.traverse(o => { if (o.userData.pick && o.userData.pick.t === 'fence') n++; }); if (n !== (gt === 'none' ? 0 : gt === 'swing' ? 3 : 2) || meshes() < 60) ok = false; } return ok; })()`));
  test("ворота и калитка открываются и попадают в историю", () => {
    run("S = presetExample(); changed();");
    const h0 = run("hist.length");
    run("toggleOpen({t: 'fence', part: 'gate'}); toggleOpen({t: 'fence', part: 'wicket'});");
    run("S.objects.push(thing('wicket', 3, 3, {id: 'wk'})); changed(); toggleOpen({t: 'obj', id: 'wk', gate: true});");
    return run("S.plot.fence.go") === 1 && run("S.plot.fence.wo") === 1 && run("S.objects.find(o => o.id === 'wk').open") === 1 && run("hist.length") >= h0 + 3;
  });
  test("sanitize держит забор, вид секции и открытие ворот", () => {
    const r = run(`(() => { const p = presetExample(); p.plot.fence = {type: 'zzz', front: 'brick', h: 9, gw: 99, gate: 'slide', go: 5}; p.objects.push({id: 'fs', kind: 'fencesec', w: 4, d: 0.1, h: 1.8, fs: 'picket'}, {id: 'gt', kind: 'gateswing', w: 4, d: 0.2, h: 1.9, open: 7}); const s2 = sanitize(p); return [s2.plot.fence, s2.objects.find(o => o.id === 'fs').fs, s2.objects.find(o => o.id === 'gt').open]; })()`);
    return r[0].type === "mesh" && r[0].front === "brick" && r[0].h === 3 && r[0].gw === 12 && r[0].go === 1 && r[1] === "picket" && r[2] === 1;
  });
  test("ползунок двери открывает её, галочка комнаты открывает зону", () => run(`(() => { S = presetExample(); const d = S.doors.find(x => x.kind === 'door'); sel = {t: 'door', id: d.id}; const el = document.createElement('input'); el.type = 'range'; el.dataset.b = 'sel.open'; el.value = '50'; applyBind(el); const r = S.rooms[0]; sel = {t: 'room', id: r.id}; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.b = 'sel.open'; cb.checked = true; applyBind(cb); sel = null; return d.open === 0.5 && r.open === true; })()`));
  test("в каталоге больше сотни моделей, у каждой есть категория", () => run("Object.keys(MODELS).length > 100 && Object.values(MODELS).every(m => CATS.some(c => c[0] === m.cat))"));
  test("тема переключается, панель сворачивается, всё сохраняется", () => {
    run("UIP.theme = 'dark'; applyTheme(); setSide(false); saveUI();");
    const ui = JSON.parse(w.localStorage.getItem("house-plan-ui") || "{}");
    const ok = d.documentElement.dataset.theme === "dark" && d.getElementById("app").classList.contains("side-off") && ui.theme === "dark" && ui.side === false;
    run("UIP.theme = 'auto'; applyTheme(); setSide(true); saveUI();");
    return ok && !d.documentElement.dataset.theme && !d.getElementById("app").classList.contains("side-off");
  });
  test("стена между двумя комнатами убирается целиком вместе с дверью и возвращается", () => {
    run("S = presetExample(); for (const r of S.rooms) r.open = false; S.doors.push(door(7.5, 5.2, 'h', 0.9, 1, 0, 'open')); changed();");
    const before = run("wallSegs().soft.length");
    const on = run("toggleWallAt({x: 9, y: 5.25}, 0.6)");
    const gone = run("(() => { const ws = wallSegs(); return ws.soft.some(q => q.o === 'h' && Math.abs(q.c - 5.2) < 0.01 && q.a <= 6.21 && q.b >= 12.99) && !S.doors.some(d => d.o === 'h' && Math.abs(d.y - 5.2) < 0.01 && d.x > 6.2); })()");
    const pairs = run("S.nowall.length");
    run("toggleWallAt({x: 9, y: 5.25}, 0.6)");
    return before === 0 && on && gone && pairs === 1 && !run("S.nowall") && run("wallSegs().soft.length") === 0;
  });
  test("наружную стену убрать нельзя, sanitize чистит чужие пары", () => {
    run("S = presetExample(); changed();");
    const ext = run("toggleWallAt({x: 5, y: 9.4}, 0.6)");
    const s2 = run("(() => { const p = presetExample(); p.nowall = [[p.rooms[0].id, p.rooms[1].id], ['zzz', p.rooms[0].id], [p.rooms[2].id, p.rooms[2].id]]; return sanitize(p).nowall; })()");
    return ext === false && s2.length === 1;
  });
  test("проём растягивается на всю стену между комнатами", () => run(`(() => { S = presetExample(); for (const r of S.rooms) r.open = false; const d = door(8, 5.2, 'h', 1, 1, 0, 'open'); S.doors.push(d); changed(); sel = {t: 'door', id: d.id}; const sp = openingSpan(d); d.w = r2(sp.b - sp.a); d.x = r2((sp.a + sp.b) / 2); sel = null; return Math.abs(d.w - 6.8) < 0.01 && Math.abs(d.x - 9.6) < 0.01 && !!lineOf(d, wallSegs(), extSides(ext()), false); })()`));
  test("у свободного конца стены нет огрызка", () => run(`(() => { S = presetBlank(); S.rooms = [room('A', 'Другое', 0, 0, 3, 3), room('B', 'Другое', 3, 0, 3, 3), room('C', 'Другое', 0, 3, 6, 2)]; setNoWall(S.rooms[0], S.rooms[1], true); setNoWall(S.rooms[0], S.rooms[2], true); const ws = wallSegs(); const bx = wallBoxes(ws, extSides(ext()), 0.12, 0, 3); const w = bx.find(b => Math.abs(b[4] - 2.94) < 0.001); return !!w && Math.abs(w[0] - 3) < 0.001 && Math.abs(w[1] - 6.06) < 0.001; })()`));
  test("жесты тачпада плавно вращают и приближают вокруг своей точки", () => run(`(() => { setPose({pos: new THREE.Vector3(20, 15, 30), yaw: 0.3, pitch: -0.4}); const pv = new THREE.Vector3(14, 0, 14); const d0 = CAM.pos.distanceTo(pv); padReset(); PADQ.pivot = pv; PADQ.ox = 0.5; padTick(0.016); const part = CAM.yaw - 0.3; for (let i = 0; i < 200; i++) padTick(0.016); const turned = CAM.yaw - 0.3; const d1 = CAM.pos.distanceTo(pv); PADQ.zp = pv.clone(); PADQ.z = Math.log(2); for (let i = 0; i < 200; i++) padTick(0.016); const d2 = CAM.pos.distanceTo(pv); return part > 0.05 && part < 0.3 && Math.abs(turned - 0.5) < 0.01 && Math.abs(d1 - d0) < 0.05 && Math.abs(d2 - d1 / 2) < 0.05; })()`));
  test("карта солнца красит часы, знает низкие объекты и читает сетку", () => run(`(() => { const c0 = smapColor(0).getHex(); const c12 = smapColor(12).getHex(); const c20 = smapColor(20).getHex(); const bench = {kind: 'bench', h: 0.45}; const tree = {kind: 'tree', h: 6}; const low = smapLow(bench) && !smapLow(tree); SMAP.grid = new Float32Array(4); SMAP.grid.set([1, 2, 3, 4]); SMAP.W = 2; SMAP.H = 2; const a = smapAt(0.1, 0.1) === 1 && smapAt(S.plot.w - 0.1, S.plot.d - 0.1) === 4 && smapAt(-1, 1) === null; SMAP.grid = null; return c0 === 0x313695 && c12 === 0xd73027 && c20 === c12 && low && a; })()`));
  test("карта солнца включается без 3D и прячет штриховку зоны", () => run(`(() => { S = presetExample(); tab = 'plot'; changed(); smapToggle(true); SMAP.url = 'data:image/png;base64,AA=='; render2D(); const svg = document.getElementById('cv').innerHTML; const img = svg.indexOf('data:image/png;base64,AA==') >= 0 && svg.indexOf('url(#hz)') < 0; const leg = !document.getElementById('smleg').hidden; smapToggle(false); SMAP.url = ''; render2D(); const back = document.getElementById('cv').innerHTML.indexOf('url(#hz)') >= 0 && document.getElementById('smleg').hidden; return img && leg && back; })()`));
  test("вид из окна ставит камеру в комнату лицом к окну", () => run(`(() => { S = presetExample(); changed(); const ok0 = V.ok; V.ok = true; const res = S.windows.map(w => { const L = lineOf(w, wallSegs(), extSides(ext()), true); const done = windowView(w); const hp = worldToHouse(CAM.pos.x, CAM.pos.z); const f = camF(); const d = dirToHouse(f.x, f.z); const inside = S.rooms.some(r => hp.x > r.x && hp.x < r.x + r.w && hp.y > r.y && hp.y < r.y + r.d); const out = L.o === 'h' ? d.y * L.out : d.x * L.out; return done && inside && out > 0.9 && !!V.walk && Math.abs(CAM.pos.y - S.house.base - 0.02 - EYE) < 0.01; }); exitWalk(); V.ok = ok0; return res.length > 3 && res.every(Boolean); })()`));
  test("рулетка липнет к чистому углу комнаты и мерит расстояние", () => run(`(() => { S = presetExample(); tab = 'house'; changed(); setTool({t: 'meas'}); const e = ext(); const t = S.house.inner / 2; const r = S.rooms.find(q => !near(q.x, e.minX) && !near(q.y, e.minY)); const a = measAt2({x: r.x + t + 0.03, y: r.y + t - 0.02}, {}); const ha = measToTab(a); const ok1 = a.snap === 'corner' && Math.abs(ha.x - r.x - t) < 0.001 && Math.abs(ha.y - r.y - t) < 0.001; const free = measAt2({x: r.x + r.w / 2 + 0.013, y: r.y + r.d / 2 + 0.011}, {altKey: true}); measClick(a); const b = measAt2({x: r.x + t + 2.004, y: r.y + t + 0.3}, {shiftKey: true}); measClick(b); const len = measLen(MEAS.a, MEAS.b); const svg = measSVG(); const txt = measText(MEAS.a, MEAS.b).main; setTool(null); const cleared = !MEAS.a && !MEAS.b && measSVG() === ''; return ok1 && free.snap === '' && Math.abs(len - 2) < 0.011 && svg.indexOf(txt) > 0 && cleared; })()`));
  test("ведомость объёмов сходится с планом, крышей и забором", () => run(`(() => { S = presetExample(); S.house.roof = 'gable'; S.house.pitch = 30; changed(); const rows = boqRows(); const get = n => { const r = rows.find(x => x[1].startsWith(n)); return r ? r[2] : 0; }; const sum = g => rows.filter(x => x[0] === g && x[3] === 'шт').reduce((s, x) => s + x[2], 0); const e = ext(); const Hs = S.house; const W = e.maxX - e.minX; const D = e.maxY - e.minY; const R = roofCalc(); const ta = Math.tan(Math.PI / 6); const plan = get('Площадь крыши в плане'); const floors = rows.filter(x => x[0] === 'Полы' && x[3] === 'м²').reduce((s, x) => s + x[2], 0); const F = fenceOf(S.plot); const fence = rows.filter(x => x[0] === 'Участок' && x[1].startsWith('Забор')).reduce((s, x) => s + x[2], 0); const P = S.plot; const gw = F.gate === 'none' ? 0 : clamp(F.gw, 1.5, Math.max(1.5, P.w - 2)); const expF = P.w - gw - (F.wicket ? 1.35 : 0) + 2 * P.d + P.w; let name = ''; const d0 = download; download = (b, n) => { name = n; }; boqCSV(); download = d0; const html = boqHTML(); return Math.abs(get('Длина по оси') - 2 * (W + D + 2 * Hs.wall)) < 0.01 && Math.abs(get('Кровля по скатам') - plan / Math.cos(Math.PI / 6)) < 0.05 && Math.abs(get('Фронтоны') - 2 * ta * R.Bh * R.Bh) < 0.1 && Math.abs(get('Конёк') - 2 * (R.A + R.ou)) < 0.05 && Math.abs(get('Карниз') - 4 * (R.A + R.ou)) < 0.1 && sum('Окна') === S.windows.length && sum('Двери и проёмы') === S.doors.length && Math.abs(floors - rows.find(x => x[0] === 'Потолки')[2]) < 0.01 && Math.abs(fence - expF) < 0.01 && name.endsWith('.csv') && html.indexOf('Объёмы для сметы') > 0; })()`));
  test("видео облетает дом по кругу и проходит день от рассвета до заката", () => run(`(() => { S = presetExample(); changed(); const cam0 = V.camera; if (!V.camera) V.camera = new THREE.PerspectiveCamera(50, 1.6, 0.05, 3000); const o = videoPlan('orbit'); V.camera = cam0; const a = o.at(0).pose; const b = o.at(0.5).pose; const c = o.at(1).pose; const da = a.pos.distanceTo(a.pivot); const db = b.pos.distanceTo(b.pivot); const orbit = Math.abs(b.yaw - a.yaw - Math.PI) < 1e-9 && Math.abs(da - db) < 1e-6 && a.pos.distanceTo(c.pos) < 1e-6 && Math.abs(a.pos.y - b.pos.y) < 1e-6; SKY.m = 6; SKY.d = 21; const dy = daySun(6, 21); const d = videoPlan('day'); const day = Math.abs(d.at(0).t - (dy.rise - 40)) < 1e-6 && Math.abs(d.at(1).t - (dy.set + 40)) < 1e-6 && d.dur > 5; return orbit && day && videoMime() === '' && o.dur > 5; })()`));
  test("размеры до стен считаются до граней перегородок и правятся числом", () => run(`(() => { S = presetBlank(); S.rooms = [room('A', 'Другое', 0, 0, 4, 3), room('B', 'Другое', 4, 0, 3, 3)]; const it = thing('table', 1, 1); S.items = [it]; tab = 'house'; changed(); sel = {t: 'item', id: it.id}; const t = S.house.inner / 2; const g = Object.fromEntries(gapsOf('item', it).map(q => [q.dir, q.v])); const b = thingBox(it); const sum = Math.abs(g.l + b.w + g.r - (4 - t)) < 0.005 && Math.abs(g.u + b.d + g.d - 3) < 0.005; gapApply('item', it, 'l', 0.3); const l2 = gapsOf('item', it).find(q => q.dir === 'l').v; it.z = 0.5; gapApply('item', it, 'f', 0.9); const z = it.z; const svg = gapsSVG('item', it); S.objects = [thing('bench', 2, 2)]; const o = S.objects[0]; tab = 'plot'; gapApply('obj', o, 'd', 1); const bo = thingBox(o); const od = Math.abs(S.plot.d - bo.y - bo.d - 1) < 0.005; const cx0 = S.house.cx; gapApply('house', null, 'l', footprint().x + 1); const hx = Math.abs(S.house.cx - cx0 - 1) < 0.005; sel = null; tab = 'house'; return sum && Math.abs(l2 - 0.3) < 0.005 && z === 0.9 && svg.indexOf('data-t="gap"') > 0 && od && hx; })()`));
  test("шаблоны света ставят время, погоду и лампы, светлый интерьер включается и выключается", () => run(`(() => { SKY.m = 6; SKY.d = 21; const dy = daySun(6, 21); ltplApply('night'); const night = LAMP.mode === 'on' && SKY.t > dy.set && SKY.weather === 'clear'; ltplApply('gold'); const gold = LAMP.mode === 'auto' && SKY.t < dy.set && SKY.t > dy.set - 60; ltplApply('bright'); const on = UIP.lt === 'bright' && SKY.weather === 'cloudy' && LAMP.mode === 'on' && inAmbK() >= 0.62 && JSON.parse(localStorage.getItem(LS_UI)).lt === 'bright'; const pressed = document.querySelector('#tpls [data-tpl="bright"]').getAttribute('aria-pressed') === 'true'; ltplApply('bright'); const off = UIP.lt === '' && LAMP.mode === 'auto' && inAmbK() <= 0.8; ltplApply('day'); const day = SKY.t < dy.noon && SKY.t > dy.rise; return night && gold && on && pressed && off && day; })()`));
  test("окно рендера держит размер и размытие фона и сохраняет их", () => run(`(() => { const box = document.getElementById('rpop'); document.getElementById('shot').click(); const open = !box.hidden; const sel = document.getElementById('rp-dof'); sel.value = '2'; sel.dispatchEvent(new Event('change', {bubbles: true})); const sz = document.getElementById('rp-size'); sz.value = 'qhd'; sz.dispatchEvent(new Event('change', {bubbles: true})); const ok = RND.dof === '2' && RND.size === 'qhd' && !document.getElementById('rp-frow').hidden && JSON.parse(localStorage.getItem(LS_UI)).rsize === 'qhd'; const opts = sz.options.length === Object.keys(RSIZES).length && sel.options.length === 4; box.querySelector('[data-rp="close"]').click(); RND.dof = '0'; RND.size = 'screen'; saveUI(); return open && ok && opts && box.hidden; })()`));
  test("панорама смотрит гранями куба в свои стороны и склеивается без перепутанных сторон", () => run(`(() => { const F = panoFaces(); const fwd = F.every(f => new THREE.Vector3(0, 0, -1).applyQuaternion(f.q).distanceTo(f.f) < 1e-6 && new THREE.Vector3(0, 1, 0).applyQuaternion(f.q).distanceTo(f.u) < 1e-6); const yaw = 0.7; const d = panoDir(yaw, 0, 0, new THREE.Vector3()); const same = d.distanceTo(camF(null, yaw, 0)) < 1e-9; const r = panoDir(yaw, Math.PI / 2, 0, new THREE.Vector3()); const right = Math.abs(r.x - Math.cos(yaw)) < 1e-9 && Math.abs(r.z + Math.sin(yaw)) < 1e-9; const S0 = 8; const imgs = F.map((f, n) => { const a = new Uint8ClampedArray(S0 * S0 * 4); for (let i = 0; i < S0 * S0; i++) a[i * 4] = n * 40; return a; }); const W = 64; const od = panoStitch(F, imgs, S0, W, 0, new Uint8ClampedArray(W * W / 2 * 4)); const at = (i, j) => od[(j * W + i) * 4]; const face = v => F.findIndex(f => f.f.distanceTo(v) < 1e-6) * 40; const centre = at(W / 2, W / 4) === face(new THREE.Vector3(0, 0, -1)); const top = at(W / 2, 0) === face(new THREE.Vector3(0, 1, 0)); const bottom = at(W / 2, W / 2 - 1) === face(new THREE.Vector3(0, -1, 0)); const east = at(W * 3 / 4, W / 4) === face(new THREE.Vector3(1, 0, 0)); return fwd && same && right && centre && top && bottom && east; })()`));
  test("«Обставить комнату» ставит мебель в комнату, не на проходы и не друг на друга, Ctrl+Z убирает", () => run(`(() => { S = presetExample(); S.items = []; tab = 'house'; changed(); const bad = []; for (const r of S.rooms) { const before = S.items.length; const n = furnishRoom(r); const C = fnCtx(r); const mine = S.items.slice(before); for (const it of mine) { const b = thingBox(it); const R = {x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.d}; if (R.x0 < C.cb.x0 - 0.01 || R.x1 > C.cb.x1 + 0.01 || R.y0 < C.cb.y0 - 0.01 || R.y1 > C.cb.y1 + 0.01) bad.push('вне ' + r.name + ' ' + it.kind); if (it.kind !== 'rug' && C.keep.some(k => fnOvl(R, k))) bad.push('проход ' + r.name + ' ' + it.kind); } const solid = mine.filter(i => i.kind !== 'rug').map(i => { const b = thingBox(i); return {x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.d, k: i.kind}; }); for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) if (fnOvl(solid[i], solid[j])) bad.push('наложение ' + solid[i].k + ' ' + solid[j].k); } const kinds = S.items.map(i => i.kind); const need = ['bed2', 'nightstand', 'wardrobe', 'toilet', 'basin', 'kitchen', 'sofa', 'tv', 'desk'].every(k => kinds.includes(k)); const n0 = S.items.length; const kit = S.rooms.find(r => /Кухня/.test(r.name)); const n1 = furnishRoom(kit); const same = S.items.length === n0; undo(); const und = S.items.length === n0; return bad.length === 0 && need && n1 > 3 && same && und; })()`));
  test("конструктор кухни: модули, ширина по сумме, левый край на месте, sanitize и смета", () => run(`(() => { S = presetBlank(); S.rooms = [room('К', 'Кухня', 0, 0, 6, 4)]; const k = thing('kitchen', 1, 0); S.items = [k]; tab = 'house'; changed(); sel = {t: 'item', id: k.id}; renderPanel(); const auto = kitMods(k, k.w).map(m => m.t).join(','); const x0 = k.x; document.getElementById('km-new').value = 'fridge'; kitAction('km-add', 0, k); const added = k.mods.length === 6 && k.mods[5].t === 'fridge' && Math.abs(k.w - 3.6) < 0.001 && Math.abs(k.x - x0) < 0.001; const sel0 = document.querySelector('[data-b="km.t.0"]'); kitAction('km-right', 0, k); const swapped = k.mods[0].t === 'sink' && k.mods[1].t === 'base'; kitBind('km.w.1', {value: '5'}, k); const clampW = k.mods[1].w === 1; kitBind('km.up', {checked: false}, k); const upOff = k.up === false && k.h === 2.2; k.mods = k.mods.filter(m => !KMODS[m.t].tall); kitFix(k); const lowH = k.h === 0.92; const san = sanitize({v: 3, plan: {}, ...JSON.parse(JSON.stringify(S))}); const sk = san.items[0]; const sOk = Array.isArray(sk.mods) && sk.up === false && Math.abs(sk.w - k.w) < 0.001; const bad = kitSanitize({mods: [{t: 'xxx', w: 1}, {t: 'sink', w: 9}]}); const rows = boqRows().filter(r => r[0] === 'Кухня'); const top = rows.find(r => r[1] === 'Столешница'); const sym = kitSym(k, -k.w / 2, -k.d / 2, '#000', 0.01, (x, y, w, d) => '<rect/>', () => '<line/>'); return auto === 'base,sink,base,hob,base' && added && swapped && clampW && upOff && lowH && sOk && bad.length === 1 && bad[0].w === 1 && top && Math.abs(top[2] - k.w) < 0.001 && sym.indexOf('<rect/>') >= 0; })()`));
  test("мебель прилипает к стене спиной и к соседней мебели, вдали от стен поворот возвращается", () => run(`(() => { S = presetBlank(); S.rooms = [room('A', 'Спальня', 0, 0, 5, 4), room('B', 'Спальня', 5, 0, 3, 4)]; const wr = thing('wardrobe', 0, 0); S.items = [wr]; tab = 'house'; changed(); const t = S.house.inner / 2; wr.x = 1.2; wr.y = 1.5; snapThing(wr, 0); const mid = wr.rot === 0; wr.x = 5 - t - 0.6 - 0.15 - (wr.w - 0.6) / 2 - 0.3; wr.y = 1.5; const bx = thingBox(wr); wr.x += (5 - t - 0.15) - (bx.x + bx.w); snapThing(wr, 0); const b2 = thingBox(wr); const wall = wr.rot === 90 && Math.abs(b2.x + b2.w - (5 - t)) < 0.005; const bed = thing('bed2', 1, 0.3); const ns = thing('nightstand', 0, 0.2); S.items = [bed, ns]; const bb = thingBox(bed); ns.x = bb.x - ns.w - 0.05; ns.y = 0.5; snapThing(ns, 0); const nb = thingBox(ns); const touch = Math.abs(nb.x + nb.w - bb.x) < 0.005; const table = thing('table', 2, 1.5); S.items = [table]; table.x = 0.1; snapThing(table, 0); const sofa = thing('sofa', 0, 1); S.items = [sofa]; sofa.x = -0.6; sofa.rot = 270; snapThing(sofa, 0); const sb = thingBox(sofa); const pushed = sofa.rot === 270 && Math.abs(sb.x) < 0.01; return mid && wall && touch && pushed && table.rot === 0 && Math.abs(thingBox(table).x - 0) < 0.005; })()`));
  test("выбор нескольких: Shift, рамка, выравнивание, поворот группы, копия, удаление, стрелки", () => run(`(() => { S = presetBlank(); S.rooms = [room('A', 'Гостиная', 0, 0, 8, 6)]; S.items = [thing('chair', 1, 1), thing('chair', 2.3, 1.6), thing('chair', 4, 1.2), thing('plant', 6, 4)]; tab = 'house'; changed(); const [a, b, c, d] = S.items; sel = {t: 'item', id: a.id}; selToggle('item', b.id); const two = selIds().length === 2; selToggle('item', b.id); const back = !selIds() && sel.id === a.id; selSet('item', boxPick('item', {x: 0.5, y: 0.5, w: 4.2, d: 1.8})); const boxed = selIds().length === 3; renderPanel(); const panel = document.getElementById('panel').innerHTML.indexOf('Выбрано 3') >= 0 && gapTarget() === null; groupAlign('t'); const top = [a, b, c].every(q => Math.abs(thingBox(q).y - thingBox(a).y) < 1e-9); groupAlign('dx'); const bs = [a, b, c].map(q => thingBox(q)).sort((p, q) => p.x - q.x); const even = Math.abs((bs[1].x - bs[0].x - bs[0].w) - (bs[2].x - bs[1].x - bs[1].w)) < 0.011; const G0 = groupBox([a, b, c]); rotateSel(); const G1 = groupBox([a, b, c]); const rot = [a, b, c].every(q => q.rot === 90) && Math.abs(G0.x + G0.w / 2 - G1.x - G1.w / 2) < 0.02 && Math.abs(G0.y + G0.d / 2 - G1.y - G1.d / 2) < 0.02; const x0 = a.x; moveSel(1, 0, 0.5); const moved = Math.abs(a.x - x0 - 0.5) < 1e-9 && selIds().length === 3; dupSel(); const dup = S.items.length === 7 && selIds().length === 3 && !selIds().includes(a.id); delSel(); const del = S.items.length === 4 && sel === null && S.items.includes(d); return two && back && boxed && panel && top && even && rot && moved && dup && del; })()`));
  agentChecks().then(() => {
    run("Object.assign(WX, {snow: 0, wet: 0, pud: 0}); SKY.weather = 'clear'; applySky(true);");
    run("LAMP.mode = 'auto';");
    run("S = presetExample(); changed(); save();");
    setTimeout(() => {
      test("план сохраняется в localStorage", () => (w.localStorage.getItem("house-plan-v2") || "").length > 500);
      const web = new JSDOM(fs.readFileSync(path.join(__dirname, "..", "site", "index.html"), "utf8"), {
        runScripts: "dangerously",
        pretendToBeVisual: true,
        url: "http://localhost/",
        beforeParse(ww) {
          ww.ResizeObserver = class {
            observe() {}
          };
          ww.TextEncoder = require("util").TextEncoder;
          ww.HTMLCanvasElement.prototype.getContext = t => (t === "2d" ? fake2d : null);
          ww.addEventListener("error", e => errors.push("site: " + e.message));
        }
      });
      setTimeout(() => {
        const wr = c => web.window.eval(c);
        test("сайт открывается пустым с мастером участка", () => wr("WEB") === true && wr("S.rooms.length") === 0 && !web.window.document.getElementById("wiz").hidden && web.window.document.querySelectorAll("[data-m^='preset:']").length === 1);
        test("мастер создаёт участок по введённым размерам", () => {
          wr(`document.getElementById("wz-w").value = "20"; document.getElementById("wz-d").value = "40"; document.getElementById("wz-city").value = "Казань"; document.getElementById("wz-n").value = "90"; wizCreate();`);
          return wr("S.plot.w") === 20 && wr("S.plot.d") === 40 && wr("S.site.city") === "Казань" && wr("S.site.north") === 90 && web.window.document.getElementById("wiz").hidden;
        });
        for (const [st, n] of results) console.log(st.padEnd(5), n);
        if (errors.length) console.log(errors.join("\n"));
        process.exit(results.some(r => r[0] === "FAIL") || errors.length ? 1 : 0);
      }, 700);
    }, 500);
  });
}, 700);
