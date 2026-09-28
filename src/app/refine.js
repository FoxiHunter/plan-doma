"use strict";
const RF = {q: "nice", n: 0, max: 96, last: 0, frame: null, acc: [null, null], cur: 0, scene: null, cam: null, quad: null, accMat: null, outMat: null, skyL: null, w: 0, h: 0, saved: null};
const QUALITY = {fast: ["Быстро", 0, 2048], nice: ["Красиво", 96, 2048], max: ["Максимум", 256, 4096]};

const RFV = "varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = vec4(position.xy, 0.0, 1.0);\n}";
const RFA = `uniform sampler2D tPrev;
uniform sampler2D tNew;
uniform float uW;
varying vec2 vUv;
vec3 s2l(vec3 c) {
  return mix(pow(c * 0.9478672986 + 0.0521327014, vec3(2.4)), c * 0.0773993808, vec3(lessThanEqual(c, vec3(0.04045))));
}
void main() {
  vec3 a = texture2D(tPrev, vUv).rgb;
  vec3 b = s2l(texture2D(tNew, vUv).rgb);
  gl_FragColor = vec4(mix(a, b, uW), 1.0);
}`;
const RFO = `uniform sampler2D tAcc;
varying vec2 vUv;
vec3 l2s(vec3 c) {
  return mix(pow(max(c, vec3(0.0)), vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
}
void main() {
  gl_FragColor = vec4(l2s(texture2D(tAcc, vUv).rgb), 1.0);
}`;

function halton(i, b) {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
}

function refineReset() {
  RF.n = 0;
  RF.last = performance.now();
}

function refineInit() {
  if (RF.scene) return;
  RF.scene = new THREE.Scene();
  RF.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  RF.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  RF.quad.frustumCulled = false;
  RF.scene.add(RF.quad);
  RF.accMat = new THREE.ShaderMaterial({uniforms: {tPrev: {value: null}, tNew: {value: null}, uW: {value: 1}}, vertexShader: RFV, fragmentShader: RFA, depthTest: false, depthWrite: false, toneMapped: false});
  RF.outMat = new THREE.ShaderMaterial({uniforms: {tAcc: {value: null}}, vertexShader: RFV, fragmentShader: RFO, depthTest: false, depthWrite: false, toneMapped: false});
  const sl = new THREE.DirectionalLight(0xffffff, 0);
  sl.castShadow = true;
  sl.shadow.mapSize.set(2048, 2048);
  sl.shadow.bias = -0.0008;
  sl.shadow.normalBias = 0.06;
  sl.visible = false;
  V.scene.add(sl);
  V.scene.add(sl.target);
  RF.skyL = sl;
}

function refineTargets(W, H) {
  if (RF.frame && RF.w === W && RF.h === H) return true;
  for (const t of [RF.frame, RF.acc[0], RF.acc[1]]) if (t) t.dispose();
  const R = V.renderer;
  const half = R.capabilities.isWebGL2 || R.extensions.has("OES_texture_half_float");
  const o = {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType};
  RF.acc = [new THREE.WebGLRenderTarget(W, H, o), new THREE.WebGLRenderTarget(W, H, o)];
  RF.frame = new THREE.WebGLRenderTarget(W, H, {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType, encoding: THREE.sRGBEncoding});
  RF.w = W;
  RF.h = H;
  RF.n = 0;
  return true;
}

function sunCone() {
  const w = SKY.weather;
  return (w === "clear" ? 0.7 : w === "few" ? 0.9 : w === "cloudy" ? 2.5 : w === "fog" ? 4 : 8) * Math.PI / 180;
}

function rfBegin() {
  const envs = [];
  V.scene.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && m.isMeshStandardMaterial && !envs.includes(m)) envs.push(m);
    }
  });
  RF.saved = {sun: V.sun.position.clone(), envs};
  for (const m of envs) m.envMapIntensity = (m.userData.env || 1) * 0.35;
  RF.skyL.visible = true;
  const P = S.plot;
  const sz = Math.max(P.w, P.d) * 0.62 + 10;
  const sc = RF.skyL.shadow.camera;
  sc.left = -sz;
  sc.right = sz;
  sc.top = sz;
  sc.bottom = -sz;
  sc.near = 1;
  sc.far = 220;
  sc.updateProjectionMatrix();
  RF.skyL.target.position.set(P.w / 2, 0, P.d / 2);
  RF.skyL.target.updateMatrixWorld();
}

function rfEnd() {
  if (!RF.saved) return;
  V.sun.position.copy(RF.saved.sun);
  for (const m of RF.saved.envs) m.envMapIntensity = m.userData.env || 1;
  RF.skyL.visible = false;
  RF.skyL.intensity = 0;
  RF.saved = null;
}

function rfLights(i) {
  const st = SKY.st || skyCompute();
  const P = S.plot;
  const cx = P.w / 2;
  const cz = P.d / 2;
  const s0 = st.dir.clone().normalize();
  const t1 = new THREE.Vector3().crossVectors(s0, new THREE.Vector3(0, 1, 0));
  if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(s0, t1).normalize();
  const ru = Math.sqrt(halton(i + 1, 5)) * Math.tan(sunCone());
  const ra = halton(i + 1, 7) * Math.PI * 2;
  const sd = s0.clone().addScaledVector(t1, ru * Math.cos(ra)).addScaledVector(t2, ru * Math.sin(ra)).normalize();
  V.sun.position.set(cx + sd.x * 80, sd.y * 80, cz + sd.z * 80);
  const u = halton(i + 1, 11) * 2 - 1;
  const ph = halton(i + 1, 13) * Math.PI * 2;
  const sr = Math.sqrt(Math.max(0, 1 - u * u));
  const d = new THREE.Vector3(sr * Math.cos(ph), u, sr * Math.sin(ph));
  let L;
  if (d.y >= 0) L = skyRad(d, st);
  else L = SKY.envGround ? SKY.envGround.material.color.clone() : st.hor.clone().multiplyScalar(0.3);
  RF.skyL.color.copy(L).multiplyScalar(4 * 0.65);
  RF.skyL.intensity = 1;
  RF.skyL.position.set(cx + d.x * 90, d.y * 90, cz + d.z * 90);
}

function refineStep(k) {
  const R = V.renderer;
  const sz = R.getDrawingBufferSize(new THREE.Vector2());
  const W = Math.max(1, Math.floor(sz.x));
  const H = Math.max(1, Math.floor(sz.y));
  refineInit();
  refineTargets(W, H);
  rfBegin();
  const cam = V.camera;
  try {
    for (let j = 0; j < k && RF.n < RF.max; j++) {
      const i = RF.n;
      if (i > 0) cam.setViewOffset(W, H, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, W, H);
      rfLights(i);
      R.setRenderTarget(RF.frame);
      R.render(V.scene, cam);
      cam.clearViewOffset();
      RF.accMat.uniforms.tPrev.value = RF.acc[RF.cur].texture;
      RF.accMat.uniforms.tNew.value = RF.frame.texture;
      RF.accMat.uniforms.uW.value = 1 / (i + 1);
      RF.quad.material = RF.accMat;
      R.setRenderTarget(RF.acc[1 - RF.cur]);
      R.render(RF.scene, RF.cam);
      RF.cur = 1 - RF.cur;
      RF.n++;
    }
  } catch (err) {
    RF.max = 0;
    throw err;
  } finally {
    cam.clearViewOffset();
    rfEnd();
  }
  RF.outMat.uniforms.tAcc.value = RF.acc[RF.cur].texture;
  RF.quad.material = RF.outMat;
  R.setRenderTarget(null);
  R.render(RF.scene, RF.cam);
}

function refineTick(now) {
  if (!RF.max || !V.ok || V.busy || RF.n >= RF.max || now - RF.last < 160) return false;
  refineStep(RF.n === 0 ? 4 : 1);
  return true;
}

function setQuality(q) {
  const Q = QUALITY[q] || QUALITY.nice;
  RF.q = QUALITY[q] ? q : "nice";
  RF.max = Q[1];
  if (V.sun && V.sun.shadow.mapSize.x !== Q[2]) {
    V.sun.shadow.mapSize.set(Q[2], Q[2]);
    if (V.sun.shadow.map) {
      V.sun.shadow.map.dispose();
      V.sun.shadow.map = null;
    }
  }
  refineReset();
  V.need = true;
}
