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
  test("все материалы получают общий патч шейдера", () => run(`(() => { const sh = {uniforms: {}, fragmentShader: THREE.ShaderLib.physical.fragmentShader}; mat("glass", true).onBeforeCompile(sh); return sh.fragmentShader.includes("uSkyIdx") && sh.fragmentShader.includes("shAmb") && !!sh.uniforms.uEnvDiff && !sh.fragmentShader.includes("#include <lights_fragment_begin>"); })()`));
  test("лак, ткань и стекло стали физическими материалами", () => run(`mat("lacquer").isMeshPhysicalMaterial && !!mat("fabric_grey").sheen && mat("glass").transmission > 0.5 && !mat("plaster").isMeshPhysicalMaterial`));
  test("внутри дома рассеянный свет приглушается", () => run(`(() => { S = presetExample(); V.mode = "roof"; build3D(); const b = SHU.uInBox.value; const ok = b.z > b.x && b.w > b.y && SHU.uInK.value < 0.5; V.mode = "noroof"; build3D(); return ok && SHU.uInK.value > 0.5; })()`));
  const lights = () => run("(() => { let n = 0; V.root.traverse(o => { if (o.isPointLight) n++; }); return n; })()");
  test("лампы из каталога светят ночью, свет не проходит сквозь стены", () => {
    run("S = presetExample(); S.items.push(thing('floorlamp', 1, 1)); S.objects.push(thing('streetlamp', 3, 26)); LAMP.mode = 'on'; build3D(); lampSync();");
    const n = lights();
    const masked = run("(() => { let ok = true; V.root.traverse(o => { if (o.isPointLight && !(o.userData.lb && o.userData.lb.z > 0)) ok = false; }); return ok; })()");
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
}, 700);
