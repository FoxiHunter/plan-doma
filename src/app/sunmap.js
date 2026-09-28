"use strict";
const SMAP = {on: false, tex: null, grid: null, W: 0, H: 0, sig: "", timer: 0, busy: false, url: "", stats: null, mesh: null, run: 0};
const SMAP_MAXH = 24;
const SMAP_PAL = [[0, 0x313695], [2, 0x4575b4], [4, 0x74add1], [6, 0xfee090], [8, 0xfdae61], [10, 0xf46d43], [12, 0xd73027]];

function smapColor(h) {
  const P = SMAP_PAL;
  if (h <= P[0][0]) return new THREE.Color(P[0][1]);
  for (let i = 1; i < P.length; i++) {
    if (h <= P[i][0]) {
      const t = (h - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
      return new THREE.Color(P[i - 1][1]).lerp(new THREE.Color(P[i][1]), t);
    }
  }
  return new THREE.Color(P[P.length - 1][1]);
}

function smapGradient() {
  return "linear-gradient(90deg, " + SMAP_PAL.map(([h, c]) => `${hex6(c)} ${Math.round(h / 12 * 100)}%`).join(", ") + ")";
}

function smapSig() {
  return JSON.stringify([S.plot, S.house, S.rooms.map(r => [r.x, r.y, r.w, r.d]), S.objects.map(o => [o.kind, o.x, o.y, o.w, o.d, o.h, o.rot, o.z]), S.site, SKY.m, SKY.d, V.fence]);
}

function smapLow(o) {
  const K = modelOf(o);
  return o.h < 0.65 && !K.lamp && K.cat !== "people" && K.cat !== "light";
}

function smapTag(g, o) {
  if (smapLow(o)) g.traverse(x => {
    if (x.isMesh) x.layers.enable(1);
  });
}

function smapPlaced() {
  if (!SMAP.on || !V.root) return;
  if (SMAP.tex && SMAP.sig === smapSig()) smapOverlay();
  else smapSchedule(450);
}

function smapSchedule(ms) {
  clearTimeout(SMAP.timer);
  SMAP.timer = setTimeout(() => smapCompute(), ms);
}

function smapOverlay() {
  if (!SMAP.tex || !V.root) return;
  if (SMAP.mesh && SMAP.mesh.parent) SMAP.mesh.parent.remove(SMAP.mesh);
  const P = S.plot;
  const g = new THREE.PlaneGeometry(P.w, P.d);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({map: SMAP.tex, transparent: true, depthWrite: false, toneMapped: false, fog: false}));
  m.rotation.x = -Math.PI / 2;
  m.position.set(P.w / 2, 0.05, P.d / 2);
  m.renderOrder = 3;
  m.userData.noPick = true;
  m.castShadow = false;
  V.root.add(m);
  SMAP.mesh = m;
  V.need = true;
}

async function smapCompute() {
  if (!SMAP.on || !V.ok || SMAP.busy) return;
  if (V.rebuild) {
    if (visible3D()) {
      smapSchedule(200);
      return;
    }
    V.rebuild = false;
    build3D();
    clearTimeout(SMAP.timer);
  }
  const sig = smapSig();
  if (SMAP.tex && SMAP.sig === sig) {
    smapOverlay();
    return;
  }
  SMAP.busy = true;
  const run = ++SMAP.run;
  setStatus("Считаю карту солнца…");
  const P = S.plot;
  const R = V.renderer;
  const N = 256;
  const W = P.w >= P.d ? N : Math.max(16, Math.round(N * P.w / P.d));
  const H = P.w >= P.d ? Math.max(16, Math.round(N * P.d / P.w)) : N;
  const cam = new THREE.OrthographicCamera(-P.w / 2, P.w / 2, P.d / 2, -P.d / 2, 1, 300);
  cam.position.set(P.w / 2, 150, P.d / 2);
  cam.up.set(0, 0, -1);
  cam.lookAt(P.w / 2, 0, P.d / 2);
  cam.updateMatrixWorld();
  cam.layers.set(1);
  const dcam = new THREE.OrthographicCamera(-0.01, 0.01, 0.01, -0.01, 0.1, 0.2);
  dcam.position.set(0, -5000, 0);
  dcam.lookAt(0, -6000, 0);
  dcam.updateMatrixWorld();
  const half = R.capabilities.isWebGL2 || R.extensions.has("OES_texture_half_float");
  const o = {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false};
  const step = new THREE.WebGLRenderTarget(W, H, Object.assign({type: THREE.UnsignedByteType}, o));
  const acc = new THREE.WebGLRenderTarget(W, H, Object.assign({}, o, {type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false}));
  const out = new THREE.WebGLRenderTarget(W, H, Object.assign({type: THREE.UnsignedByteType}, o, {depthBuffer: false}));
  const qs = new THREE.Scene();
  const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const addM = new THREE.ShaderMaterial({uniforms: {t: {value: step.texture}, k: {value: 0}}, vertexShader: RFV, fragmentShader: "uniform sampler2D t;\nuniform float k;\nvarying vec2 vUv;\nvoid main() {\n  gl_FragColor = vec4(texture2D(t, vUv).r * k, 0.0, 0.0, 1.0);\n}", blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false});
  const outM = new THREE.ShaderMaterial({uniforms: {t: {value: acc.texture}}, vertexShader: RFV, fragmentShader: "uniform sampler2D t;\nvarying vec2 vUv;\nvoid main() {\n  gl_FragColor = vec4(clamp(texture2D(t, vUv).r, 0.0, 1.0), 0.0, 0.0, 1.0);\n}", depthTest: false, depthWrite: false, toneMapped: false});
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), addM);
  quad.frustumCulled = false;
  qs.add(quad);
  const lam = new THREE.MeshLambertMaterial({color: 0xffffff, toneMapped: false});
  const saved = {sun: V.sun.position.clone(), si: V.sun.intensity, sc: V.sun.color.clone(), cs: V.sun.castShadow, hemi: V.hemi.visible, fog: V.scene.fog, env: V.scene.environment, bg: V.sky.visible, lights: [], sb: V.sun.shadow.bias, snb: V.sun.shadow.normalBias, sl: V.sun.layers.mask, sau: V.sun.shadow.autoUpdate, au: R.shadowMap.autoUpdate, tm: R.toneMapping, ac: R.autoClear, prev: R.getRenderTarget(), cc: R.getClearColor(new THREE.Color()), ca: R.getClearAlpha()};
  V.scene.traverse(x => {
    if (x.isLight && x !== V.sun && x.visible) {
      saved.lights.push(x);
      x.visible = false;
    }
  });
  V.busy = true;
  V.hemi.visible = false;
  V.scene.fog = null;
  V.scene.environment = null;
  V.sky.visible = false;
  V.sun.color.setRGB(1, 1, 1);
  V.sun.castShadow = true;
  V.sun.shadow.autoUpdate = true;
  V.sun.layers.enable(1);
  V.sun.shadow.bias = -0.0006;
  V.sun.shadow.normalBias = 0.06;
  R.shadowMap.autoUpdate = false;
  R.toneMapping = THREE.NoToneMapping;
  R.autoClear = false;
  let ok = true;
  try {
    R.setRenderTarget(acc);
    R.setClearColor(0x000000, 1);
    R.clear(true, false, false);
    const cx = P.w / 2;
    const cz = P.d / 2;
    const dstep = 15;
    const ts = [];
    for (let t = 0; t < 1440; t += dstep) {
      const s = sunAt(SKY.m, SKY.d, t + dstep / 2);
      if (s.alt > 0.6 * Math.PI / 180) ts.push(s);
    }
    for (let i = 0; i < ts.length; i++) {
      const s = ts[i];
      const dir = sunDirOf(s.alt, s.az);
      V.sun.position.set(cx + dir.x * 80, dir.y * 80, cz + dir.z * 80);
      V.sun.target.position.set(cx, 0, cz);
      V.sun.target.updateMatrixWorld();
      V.sun.intensity = 1 / Math.max(0.04, dir.y);
      V.scene.overrideMaterial = lam;
      R.setRenderTarget(step);
      R.shadowMap.needsUpdate = true;
      R.render(V.scene, dcam);
      R.setClearColor(0x000000, 1);
      R.clear(true, true, false);
      R.render(V.scene, cam);
      V.scene.overrideMaterial = null;
      addM.uniforms.k.value = dstep / 60 / SMAP_MAXH;
      quad.material = addM;
      R.setRenderTarget(acc);
      R.render(qs, qc);
      if (i % 8 === 7) {
        R.setRenderTarget(saved.prev);
        await nextFrame();
        if (run !== SMAP.run || !SMAP.on) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      quad.material = outM;
      R.setRenderTarget(out);
      R.clear(true, false, false);
      R.render(qs, qc);
      const buf = new Uint8Array(W * H * 4);
      R.readRenderTargetPixels(out, 0, 0, W, H, buf);
      smapFinish(buf, W, H, sig);
    }
  } catch (err) {
    ok = false;
    setStatus("Карта солнца не посчиталась, видеокарта не справилась");
  } finally {
    V.scene.overrideMaterial = null;
    R.setRenderTarget(saved.prev);
    R.toneMapping = saved.tm;
    R.autoClear = saved.ac;
    R.setClearColor(saved.cc, saved.ca);
    for (const x of saved.lights) x.visible = true;
    V.hemi.visible = saved.hemi;
    V.scene.fog = saved.fog;
    V.scene.environment = saved.env;
    V.sky.visible = saved.bg;
    V.sun.position.copy(saved.sun);
    V.sun.intensity = saved.si;
    V.sun.color.copy(saved.sc);
    V.sun.castShadow = saved.cs;
    V.sun.shadow.autoUpdate = saved.sau;
    V.sun.layers.mask = saved.sl;
    V.sun.shadow.bias = saved.sb;
    V.sun.shadow.normalBias = saved.snb;
    R.shadowMap.autoUpdate = saved.au;
    R.shadowMap.needsUpdate = true;
    fitSun();
    for (const x of [step, acc, out]) x.dispose();
    for (const x of [addM, outM, lam]) x.dispose();
    quad.geometry.dispose();
    V.busy = false;
    SMAP.busy = false;
    V.need = true;
    smapUI();
  }
}

function smapFinish(buf, W, H, sig) {
  const P = S.plot;
  const grid = new Float32Array(W * H);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(W, H);
  const f = footprint();
  const wl = S.house.wall;
  let n = 0;
  let n6 = 0;
  let n4 = 0;
  let mx = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const src = ((H - 1 - y) * W + x) * 4;
      const h = buf[src] / 255 * SMAP_MAXH;
      grid[y * W + x] = h;
      const px = (x + 0.5) / W * P.w;
      const pz = (y + 0.5) / H * P.d;
      const inHouse = f && px > f.x - 0.05 && px < f.x + f.w + 0.05 && pz > f.y - 0.05 && pz < f.y + f.d + 0.05;
      const col = smapColor(h);
      const d = (y * W + x) * 4;
      img.data[d] = Math.round(col.r * 255);
      img.data[d + 1] = Math.round(col.g * 255);
      img.data[d + 2] = Math.round(col.b * 255);
      img.data[d + 3] = inHouse ? 0 : 190;
      if (!inHouse) {
        n++;
        if (h >= 6) n6++;
        if (h >= 4) n4++;
        if (h > mx) mx = h;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  if (SMAP.tex) SMAP.tex.dispose();
  SMAP.tex = new THREE.CanvasTexture(c);
  SMAP.tex.encoding = THREE.sRGBEncoding;
  SMAP.url = c.toDataURL("image/png");
  SMAP.grid = grid;
  SMAP.W = W;
  SMAP.H = H;
  SMAP.sig = sig;
  SMAP.stats = {p6: n ? n6 / n : 0, p4: n ? n4 / n : 0, max: mx, wl};
  smapOverlay();
  render2D();
  setStatus("Карта солнца готова");
}

function smapAt(x, z) {
  if (!SMAP.grid) return null;
  const P = S.plot;
  const i = Math.floor(x / P.w * SMAP.W);
  const j = Math.floor(z / P.d * SMAP.H);
  if (i < 0 || j < 0 || i >= SMAP.W || j >= SMAP.H) return null;
  return SMAP.grid[j * SMAP.W + i];
}

function smapToggle(on) {
  SMAP.on = on === undefined ? !SMAP.on : !!on;
  if (!SMAP.on) {
    SMAP.run++;
    clearTimeout(SMAP.timer);
    if (SMAP.mesh && SMAP.mesh.parent) SMAP.mesh.parent.remove(SMAP.mesh);
    SMAP.mesh = null;
  } else smapSchedule(0);
  smapUI();
  render2D();
  V.need = true;
}

function smapUI() {
  const b = $("#skmap");
  if (b) b.setAttribute("aria-pressed", String(SMAP.on));
  const lg = $("#smleg");
  if (!lg) return;
  lg.hidden = !SMAP.on;
  if (!SMAP.on) return;
  const st = SMAP.stats;
  lg.innerHTML = `<b>Часы прямого солнца, ${SKY.d} ${MONTHS[SKY.m - 1]}</b><div class="smbar" style="background:${smapGradient()}"></div><div class="smticks"><span>0</span><span>3</span><span>6</span><span>9</span><span>12+ ч</span></div>` +
    (st && !SMAP.busy ? `<small>6 часов и больше на ${Math.round(st.p6 * 100)}% участка, 4 и больше на ${Math.round(st.p4 * 100)}%, до ${fa(st.max)} ч в самом солнечном месте</small>` : `<small>Считаю…</small>`) + `<small class="cur" id="smcur"></small>`;
}

function smapCur(h) {
  const el = $("#smcur");
  if (el) el.textContent = h === null || h === undefined ? "" : `Под курсором ${fa(h)} ч солнца`;
}

function smap2D() {
  if (!SMAP.on || EXP) return "";
  if (!SMAP.busy && V.ok && SMAP.sig !== smapSig()) smapSchedule(450);
  if (!SMAP.url) return "";
  const P = S.plot;
  return `<image href="${SMAP.url}" x="0" y="0" width="${P.w}" height="${P.d}" preserveAspectRatio="none" opacity="0.85" pointer-events="none" style="image-rendering: auto"/>`;
}
