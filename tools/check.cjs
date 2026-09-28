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
}, 700);
