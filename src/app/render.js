"use strict";
const HQ = {cancel: false, running: false};
const THUMBS = new Map();
let THS = null;
const LIGHT = {
  paper: "#f7f8f5", panel: "#ffffff", ink: "#1d2126", "ink-2": "#5d646c", line: "#e3e6e0", "line-2": "#bfc5bb",
  land: "#e3ebd8", zone: "#cddcc0", red: "#c62e22", sel: "#2f6fdf", wall: "#2a2e33", warn: "#9a3a08",
  "f-sleep": "#d7def1", "f-day": "#d4e6c9", "f-wet": "#f1e1bd", "f-pass": "#e4e5e0", "f-other": "#ead9e5",
  "t-sleep": "#273d72", "t-day": "#2c4f1d", "t-wet": "#654509", "t-pass": "#43474c", "t-other": "#5c2d50",
  item: "#ffffff", "item-line": "#6b727a", tree: "#9cc28a", "tree-line": "#4f7a44", water: "#9fd0e6"
};
const S2L = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function l2s(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

function busy(show, text, p) {
  const m = $("#busy");
  if (!m) return;
  m.hidden = !show;
  if (text !== undefined) $("#busyt").textContent = text;
  if (p !== undefined) $("#busyp").style.width = Math.round(p * 100) + "%";
}

const nextFrame = () => new Promise(res => setTimeout(res, 0));

function makeRT(W, H) {
  const o = {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType, encoding: THREE.sRGBEncoding};
  if (V.renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) {
    const rt = new THREE.WebGLMultisampleRenderTarget(W, H, o);
    rt.samples = 4;
    return rt;
  }
  return new THREE.WebGLRenderTarget(W, H, o);
}

function setShadowSize(light, n) {
  light.shadow.mapSize.set(n, n);
  if (light.shadow.map) {
    light.shadow.map.dispose();
    light.shadow.map = null;
  }
}

async function renderHQ(opt, onp) {
  if (!V.ok) return null;
  const R = V.renderer;
  const W = opt.w;
  const H = opt.h;
  const N = Math.max(1, opt.samples || 48);
  const maxRB = R.capabilities.maxTextureSize || 4096;
  if (W > maxRB || H > maxRB) return null;
  const prev = {hq: V.hq, mode: V.mode, path: SKY.pathG ? SKY.pathG.visible : false};
  V.busy = true;
  V.hq = true;
  if (opt.mode) V.mode = opt.mode;
  build3D();
  GZ.root.visible = false;
  GZ.sroot.visible = false;
  GH.root.visible = false;
  if (SKY.pathG) SKY.pathG.visible = false;
  const cam = new THREE.PerspectiveCamera(V.camera.fov, W / H, camNear(opt.pose ? opt.pose.pos.y : V.camera.position.y), 3000);
  if (opt.pose) {
    cam.position.copy(opt.pose.pos);
    const f = camF(null, opt.pose.yaw, opt.pose.pitch);
    cam.lookAt(opt.pose.pos.x + f.x, opt.pose.pos.y + f.y, opt.pose.pos.z + f.z);
  } else {
    cam.position.copy(V.camera.position);
    cam.quaternion.copy(V.camera.quaternion);
  }
  cam.updateMatrixWorld();
  V.sky.position.copy(cam.position);
  setShadowSize(V.sun, 4096);
  refineInit();
  rfBegin();
  const rt = makeRT(W, H);
  const acc = new Float32Array(W * H * 3);
  const buf = new Uint8Array(W * H * 4);
  let n = 0;
  HQ.cancel = false;
  for (let i = 0; i < N; i++) {
    if (HQ.cancel) break;
    const jx = N > 1 ? halton(i + 1, 2) - 0.5 : 0;
    const jy = N > 1 ? halton(i + 1, 3) - 0.5 : 0;
    cam.setViewOffset(W, H, jx, jy, W, H);
    rfLights(i);
    R.setRenderTarget(rt);
    R.render(V.scene, cam);
    R.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    for (let p = 0, q = 0; p < buf.length; p += 4, q += 3) {
      acc[q] += S2L[buf[p]];
      acc[q + 1] += S2L[buf[p + 1]];
      acc[q + 2] += S2L[buf[p + 2]];
    }
    n++;
    if (onp) onp((i + 1) / N);
    if (i % 2 === 1) await nextFrame();
  }
  R.setRenderTarget(null);
  rt.dispose();
  rfEnd();
  setShadowSize(V.sun, (QUALITY[RF.q] || QUALITY.nice)[2]);
  V.hq = prev.hq;
  V.mode = prev.mode;
  GH.root.visible = true;
  if (SKY.pathG) SKY.pathG.visible = prev.path;
  V.busy = false;
  schedule3D();
  if (!n) return null;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W * 3;
    const dst = y * W * 4;
    for (let x = 0; x < W; x++) {
      const s = src + x * 3;
      const t = dst + x * 4;
      d[t] = l2s(acc[s] / n);
      d[t + 1] = l2s(acc[s + 1] / n);
      d[t + 2] = l2s(acc[s + 2] / n);
      d[t + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function canvasBlob(c, type, q) {
  return new Promise(res => c.toBlob(b => res(b), type || "image/png", q));
}

async function snapshotHQ() {
  if (!V.ok || HQ.running) return;
  HQ.running = true;
  const cv = V.renderer.domElement;
  const aspect = (cv.clientWidth || 16) / (cv.clientHeight || 9);
  const W = Math.min(3200, Math.max(1600, Math.round((cv.clientWidth || 1600) * 2 / 2) * 2));
  const H = Math.round(W / aspect / 2) * 2;
  busy(true, "Считаю рендер текущего вида…", 0);
  await nextFrame();
  const c = await renderHQ({w: W, h: H, samples: 96}, p => busy(true, undefined, p));
  busy(false);
  HQ.running = false;
  if (!c) {
    setStatus("Рендер не получился, видеокарта не дала такой размер");
    return;
  }
  download(await canvasBlob(c), `render-${stamp()}.png`);
  setStatus("Рендер сохранён");
}

const VIEWS = [
  ["01-s-ulitsy", "street", "roof", "С улицы"],
  ["02-sverhu-pod-uglom", "iso", "roof", "Сверху под углом"],
  ["03-szadi", "back", "roof", "Сзади"],
  ["04-sleva", "left", "roof", "Слева"],
  ["05-sprava", "right", "roof", "Справа"],
  ["06-szadi-pod-uglom", "iso2", "roof", "Сзади под углом"],
  ["07-planirovka-sverhu", "top", "noroof", "Планировка сверху"],
  ["08-planirovka-pod-uglom", "iso", "noroof", "Планировка под углом"]
];

async function renderViews(list, W, H, samples, label) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    if (HQ.cancel) break;
    const [name, kind, mode, title] = list[i];
    const pose = viewPose(kind, W / H);
    const c = await renderHQ({w: W, h: H, samples, pose, mode}, p => busy(true, `${label}: ${title}, ${i + 1} из ${list.length}`, (i + p) / list.length));
    if (c) out.push({name, title, canvas: c});
  }
  return out;
}

async function exportZip() {
  if (!V.ok || HQ.running) {
    if (!V.ok) setStatus("Без 3D рендеры не посчитать");
    return;
  }
  HQ.running = true;
  HQ.cancel = false;
  busy(true, "Готовлю рендеры…", 0);
  await nextFrame();
  const shots = await renderViews(VIEWS, 2560, 1440, 64, "Рендер");
  if (HQ.cancel) {
    busy(false);
    HQ.running = false;
    setStatus("Экспорт отменён");
    return;
  }
  busy(true, "Собираю архив…", 1);
  await nextFrame();
  const files = [];
  for (const s of shots) files.push({name: `renders/${s.name}.jpg`, data: new Uint8Array(await (await canvasBlob(s.canvas, "image/jpeg", 0.95)).arrayBuffer())});
  for (const which of ["house", "plot"]) {
    const P = planSVG(which, 60);
    files.push({name: `plan/${which === "house" ? "plan-doma" : "plan-uchastka"}.svg`, data: new TextEncoder().encode(P.svg)});
    const png = await svgToPNG(P, which === "house" ? 110 : 60);
    if (png) files.push({name: `plan/${which === "house" ? "plan-doma" : "plan-uchastka"}.png`, data: new Uint8Array(await png.arrayBuffer())});
  }
  files.push({name: "plan-doma.json", data: new TextEncoder().encode(JSON.stringify({plan: S}, null, 1))});
  download(zipBlob(files), `proekt-doma-${stamp()}.zip`);
  busy(false);
  HQ.running = false;
  setStatus("Архив с рендерами и планом скачан");
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipBlob(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [];
  const central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true);
    lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, f.data.length, true);
    lh.setUint32(22, f.data.length, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, f.data.length, true);
    ch.setUint32(24, f.data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, off, true);
    central.push(ch.buffer, name);
    off += 30 + name.length + f.data.length;
  }
  const csize = central.reduce((s, p) => s + (p.byteLength || p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, csize, true);
  end.setUint32(16, off, true);
  end.setUint16(20, 0, true);
  return new Blob(parts.concat(central, [end.buffer]), {type: "application/zip"});
}

function planSVG(which, ppm, mm) {
  const keep = {k, sel, tab, tool, ghost2, frozen, drag};
  k = ppm;
  sel = null;
  tool = null;
  ghost2 = null;
  drag = null;
  tab = which;
  EXP = true;
  frozen = null;
  let body = "";
  let b;
  try {
    b = baseBounds();
    body = defs2() + (which === "plot" ? drawPlot() : drawHouse());
  } finally {
    EXP = false;
    k = keep.k;
    sel = keep.sel;
    tab = keep.tab;
    tool = keep.tool;
    ghost2 = keep.ghost2;
    drag = keep.drag;
    frozen = null;
  }
  const head = 1.6;
  const x0 = b.x0;
  const y0 = b.y0 - head;
  const vw = b.x1 - b.x0;
  const vh = b.y1 - b.y0 + head;
  const W = Math.round(vw * ppm);
  const H = Math.round(vh * ppm);
  const area = S.rooms.reduce((s, r) => s + r.w * r.d, 0);
  const title = which === "house" ? `План дома, комнаты ${fa(area)} м²` : `План участка ${fm(S.plot.w)} × ${fm(S.plot.d)} м`;
  const fs = 16 / ppm;
  let bar = "";
  const bl = which === "house" ? 1 : 5;
  const bx = b.x1 - bl - 0.6;
  const by = y0 + head * 0.55;
  bar += `<rect x="${bx}" y="${by - 0.06}" width="${bl}" height="0.12" fill="#1d2126"/>`;
  bar += `<text x="${bx + bl / 2}" y="${by - 0.35}" font-size="${12 / ppm}" text-anchor="middle" fill="#5d646c">${bl} м</text>`;
  const size = mm ? `width="${(vw * 1000 / mm).toFixed(1)}mm" height="${(vh * 1000 / mm).toFixed(1)}mm"` : `width="${W}" height="${H}"`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="${x0} ${y0} ${vw} ${vh}" font-family="Golos Text, Segoe UI, Roboto, Arial, sans-serif">`;
  s += `<rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="#ffffff"/>`;
  s += `<text x="${b.x0 + 0.4}" y="${y0 + head * 0.55}" font-size="${fs}" font-weight="600" fill="#1d2126" dominant-baseline="middle">${esc(title)}</text>`;
  s += bar + body + "</svg>";
  s = s.replace(/var\(--([a-z0-9-]+)\)/g, (m0, nm) => LIGHT[nm] || "#000000");
  return {svg: s, w: W, h: H, vw, vh};
}

function svgToPNG(P, ppm) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      try {
        const sc = ppm / (P.w / P.vw);
        const c = document.createElement("canvas");
        c.width = Math.round(P.w * sc);
        c.height = Math.round(P.h * sc);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => res(b), "image/png");
      } catch (err) {
        res(null);
      }
    };
    img.onerror = () => res(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(P.svg);
  });
}

function exportPlanSVG() {
  const which = tab;
  const P = planSVG(which, 60);
  download(new Blob([P.svg], {type: "image/svg+xml"}), `${which === "house" ? "plan-doma" : "plan-uchastka"}-${stamp()}.svg`);
  setStatus("План в SVG скачан");
}

async function exportPlanPNG() {
  const which = tab;
  const P = planSVG(which, 60);
  const b = await svgToPNG(P, which === "house" ? 110 : 60);
  if (!b) {
    setStatus("Браузер не дал сделать PNG, скачай план в SVG");
    return;
  }
  download(b, `${which === "house" ? "plan-doma" : "plan-uchastka"}-${stamp()}.png`);
  setStatus("План в PNG скачан");
}

async function printSheet() {
  if (HQ.running) return;
  HQ.running = true;
  HQ.cancel = false;
  const pr = $("#print");
  let shots = [];
  if (V.ok) {
    busy(true, "Готовлю лист…", 0);
    await nextFrame();
    shots = await renderViews([VIEWS[0], VIEWS[1], VIEWS[2], VIEWS[7]], 1500, 950, 32, "Лист");
  }
  busy(false);
  HQ.running = false;
  if (HQ.cancel) return;
  const house = planSVG("house", 40, 100);
  const plot = planSVG("plot", 20, 250);
  const area = S.rooms.reduce((s, r) => s + r.w * r.d, 0);
  const f = footprint();
  const rows = S.rooms.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${fm(r.w)} × ${fm(r.d)}</td><td>${fa(r.w * r.d)}</td></tr>`).join("");
  let h = `<div class="sheet"><header><h1>Проект одноэтажного дома</h1><p>${new Date().toLocaleDateString("ru-RU")}. Комнаты ${fa(area)} м²${f ? `, дом снаружи ${fm(f.W + 2 * S.house.wall)} × ${fm(f.D + 2 * S.house.wall)} м` : ""}, участок ${fm(S.plot.w)} × ${fm(S.plot.d)} м, ${fa(S.plot.w * S.plot.d / 100)} сот.</p></header>`;
  h += `<div class="plans"><figure>${house.svg}<figcaption>План дома, масштаб 1:100</figcaption></figure><figure>${plot.svg}<figcaption>План участка, масштаб 1:250</figcaption></figure>`;
  h += `<table><thead><tr><th>№</th><th>Помещение</th><th>Размер, м</th><th>Площадь, м²</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td></td><td>Итого</td><td></td><td>${fa(area)}</td></tr></tfoot></table></div>`;
  if (shots.length) h += `<div class="shots">${shots.map(s => `<figure><img src="${s.canvas.toDataURL("image/jpeg", 0.9)}" alt=""><figcaption>${esc(s.title)}</figcaption></figure>`).join("")}</div>`;
  h += `</div>`;
  pr.innerHTML = h;
  await Promise.all([...pr.querySelectorAll("img")].map(im => (im.decode ? im.decode().catch(() => null) : null)));
  setTimeout(() => window.print(), 60);
}

function thumbFor(kind) {
  if (THUMBS.has(kind)) return THUMBS.get(kind);
  if (!V.ok || !MODELS[kind]) return null;
  const R = V.renderer;
  if (!THS) {
    const sc = new THREE.Scene();
    sc.environment = V.env;
    sc.add(new THREE.HemisphereLight(lin(0xffffff), lin(0x9aa08f), 0.45));
    const dl = new THREE.DirectionalLight(lin(0xfff3e0), 1.5);
    dl.position.set(3, 6, 5);
    sc.add(dl);
    THS = {sc, cam: new THREE.PerspectiveCamera(30, 4 / 3, 0.02, 200), rt: new THREE.WebGLRenderTarget(480, 360, {encoding: THREE.sRGBEncoding}), buf: new Uint8Array(480 * 360 * 4)};
  }
  const K = MODELS[kind];
  const g = new THREE.Group();
  buildModel(g, {id: "thumb-" + kind, kind, w: K.w, d: K.d, h: K.h}, matPlot, false);
  THS.sc.add(g);
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  const r = Math.max(0.2, box.getSize(new THREE.Vector3()).length() / 2);
  const f = camF(null, 0.55, -0.42);
  const dist = r / Math.sin(15 * Math.PI / 180) * 1.02;
  THS.cam.position.copy(c).addScaledVector(f, -dist);
  THS.cam.lookAt(c);
  THS.cam.near = Math.max(0.01, dist - r * 2);
  THS.cam.far = dist + r * 2;
  THS.cam.updateProjectionMatrix();
  const cc = R.getClearColor(new THREE.Color());
  const ca = R.getClearAlpha();
  R.setRenderTarget(THS.rt);
  R.setClearColor(0xffffff, 0);
  R.clear();
  R.render(THS.sc, THS.cam);
  R.readRenderTargetPixels(THS.rt, 0, 0, 480, 360, THS.buf);
  R.setRenderTarget(null);
  R.setClearColor(cc, ca);
  THS.sc.remove(g);
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
  const big = document.createElement("canvas");
  big.width = 480;
  big.height = 360;
  const bx = big.getContext("2d");
  const img = bx.createImageData(480, 360);
  for (let y = 0; y < 360; y++) img.data.set(THS.buf.subarray((359 - y) * 1920, (360 - y) * 1920), y * 1920);
  bx.putImageData(img, 0, 0);
  const cv = document.createElement("canvas");
  cv.width = 240;
  cv.height = 180;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, 0, 0, 240, 180);
  const url = cv.toDataURL("image/png");
  THUMBS.set(kind, url);
  V.need = true;
  return url;
}

$("#busyc").addEventListener("click", () => {
  HQ.cancel = true;
});
