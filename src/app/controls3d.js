"use strict";
const CAM = {pos: new THREE.Vector3(40, 30, 50), yaw: 0.6, pitch: -0.6, pivot: new THREE.Vector3(14, 0, 14), dist: 40};
const IN = {keys: new Set(), hover: false, rmb: false, anim: null, padAt: 0, padPivot: null, g: null, ptrs: new Map(), prevPose: null, gs: 0, gsAt: 0};
const GZ = {root: null, sroot: null, sig: "", parts: [], hover: null, drag: null, F: null};
const GH = {root: null, kind: "", obj: null};
const YUP = new THREE.Vector3(0, 1, 0);
const FLY = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"]);
const WALK = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);

function camF(o, yaw, pitch) {
  const y = yaw === undefined ? CAM.yaw : yaw;
  const p = pitch === undefined ? CAM.pitch : pitch;
  const cp = Math.cos(p);
  return (o || new THREE.Vector3()).set(-Math.sin(y) * cp, Math.sin(p), -Math.cos(y) * cp);
}

function camR(o) {
  return (o || new THREE.Vector3()).set(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
}

function camU(o) {
  return (o || new THREE.Vector3()).crossVectors(camR(), camF());
}

function camNear(y) {
  return V.walk ? 0.05 : clamp(y * 0.012, 0.05, 1.5);
}

function applyCam() {
  if (!V.camera) return;
  const nr = camNear(CAM.pos.y);
  if (Math.abs(nr - V.camera.near) > 0.005) {
    V.camera.near = nr;
    V.camera.updateProjectionMatrix();
  }
  V.camera.position.copy(CAM.pos);
  const f = camF();
  V.camera.up.set(0, 1, 0);
  V.camera.lookAt(CAM.pos.x + f.x, CAM.pos.y + f.y, CAM.pos.z + f.z);
  V.camera.updateMatrixWorld();
  V.need = true;
}

function setPose(p) {
  CAM.pos.copy(p.pos);
  CAM.yaw = p.yaw;
  CAM.pitch = p.pitch;
  if (p.pivot) CAM.pivot.copy(p.pivot);
  if (p.dist) CAM.dist = p.dist;
  applyCam();
}

function tweenTo(p) {
  padReset();
  let y1 = p.yaw;
  while (y1 - CAM.yaw > Math.PI) y1 -= 2 * Math.PI;
  while (y1 - CAM.yaw < -Math.PI) y1 += 2 * Math.PI;
  IN.anim = {t: 0, p0: CAM.pos.clone(), y0: CAM.yaw, q0: CAM.pitch, p1: p.pos.clone(), y1, q1: p.pitch, pivot: p.pivot ? p.pivot.clone() : null, dist: p.dist};
  V.need = true;
}

function viewPose(kind, aspect) {
  const P = S.plot;
  const f = footprint();
  const Hs = S.house;
  const vf = V.camera.fov * Math.PI / 180;
  const hf = 2 * Math.atan(Math.tan(vf / 2) * (aspect || V.camera.aspect));
  const ff = Math.min(vf, hf);
  const fit = r => r / Math.sin(ff / 2) * 1.02;
  const rc = f ? roofCalc() : null;
  const tall = Hs.base + Hs.h + (rc ? (rc.type === "flat" ? rc.top : rc.ridgeY) : 0.6);
  const c = f ? new THREE.Vector3(Hs.cx, tall * 0.42, Hs.cy) : new THREE.Vector3(P.w / 2, 0, P.d / 2);
  const hr = f ? 0.5 * Math.hypot(f.w + 2, f.d + 2, tall) : 10;
  let yaw = 0.62;
  let pitch = -0.6;
  let dist = fit(hr) * 1.08;
  const tgt = c.clone();
  if (kind === "street" || kind === "front") {
    yaw = 0;
    pitch = -0.08;
    dist = fit(hr) * 0.95;
  } else if (kind === "back") {
    yaw = Math.PI;
    pitch = -0.08;
    dist = fit(hr) * 0.95;
  } else if (kind === "left") {
    yaw = -Math.PI / 2;
    pitch = -0.08;
    dist = fit(hr) * 0.95;
  } else if (kind === "right" || kind === "side") {
    yaw = Math.PI / 2;
    pitch = -0.08;
    dist = fit(hr) * 0.95;
  } else if (kind === "top") {
    yaw = 0;
    pitch = -1.5533;
    tgt.set(P.w / 2, 0, P.d / 2);
    dist = fit(0.5 * Math.hypot(P.w, P.d)) * 0.92;
  } else if (kind === "iso2") {
    yaw = Math.PI + 0.62;
    pitch = -0.55;
    dist = fit(hr) * 1.2;
  } else if (kind === "plot") {
    yaw = 0.5;
    pitch = -0.72;
    tgt.set(P.w / 2, 0, P.d / 2);
    dist = fit(0.5 * Math.hypot(P.w, P.d)) * 1.0;
  }
  const pos = tgt.clone().addScaledVector(camF(null, yaw, pitch), -dist);
  if (pos.y < 0.4) pos.y = 0.4;
  return {pos, yaw, pitch, pivot: tgt, dist};
}

function camPreset(kind, instant) {
  if (!V.camera) return;
  if (kind === "walk") {
    startWalk();
    return;
  }
  exitWalk(true);
  const p = viewPose(kind);
  if (instant || !V.ok) setPose(p);
  else tweenTo(p);
  document.querySelectorAll("#cams [data-cam]").forEach(b => b.setAttribute("aria-pressed", "false"));
}

function orbit(dy, dp, pivot) {
  const np = clamp(CAM.pitch + dp, -1.555, 1.2);
  const v = CAM.pos.clone().sub(pivot);
  v.applyAxisAngle(YUP, dy);
  const yaw = CAM.yaw + dy;
  const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const v2 = v.clone().applyAxisAngle(r, np - CAM.pitch);
  CAM.yaw = yaw;
  if (pivot.y + v2.y > 0.12) {
    CAM.pitch = np;
    CAM.pos.copy(pivot).add(v2);
  } else {
    CAM.pos.copy(pivot).add(v);
  }
  CAM.pivot.copy(pivot);
  applyCam();
}

function look(dy, dp) {
  CAM.yaw += dy;
  CAM.pitch = clamp(CAM.pitch + dp, -1.55, 1.45);
  applyCam();
}

function viewH() {
  return V.renderer ? V.renderer.domElement.clientHeight || 600 : 600;
}

function pan(dx, dy, depth) {
  const upp = 2 * Math.max(0.5, depth) * Math.tan(V.camera.fov * Math.PI / 360) / viewH();
  const r = camR();
  const u = camU();
  const mv = r.multiplyScalar(-dx * upp).add(u.multiplyScalar(dy * upp));
  CAM.pos.add(mv);
  CAM.pivot.add(mv);
  if (CAM.pos.y < 0.15) CAM.pos.y = 0.15;
  applyCam();
}

function setRay(cx, cy) {
  const cv = V.renderer.domElement;
  const rect = cv.getBoundingClientRect();
  const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
  V.ray.setFromCamera(ndc, V.camera);
  return V.ray;
}

function clippedAway(h) {
  const mt = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
  return !!(mt && mt.clippingPlanes && CLIP[0].distanceToPoint(h.point) < -0.01);
}

function hitScene(cx, cy) {
  setRay(cx, cy);
  const hits = V.ray.intersectObjects(V.root.children, true);
  for (const h of hits) {
    if (!h.object.isMesh || h.object.userData.noPick || clippedAway(h)) continue;
    let o = h.object;
    while (o && !(o.userData && o.userData.pick)) o = o.parent;
    return {h, pick: o ? o.userData.pick : null, point: h.point.clone()};
  }
  return null;
}

function groundAt(cx, cy, y) {
  setRay(cx, cy);
  const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(y || 0));
  const p = new THREE.Vector3();
  return V.ray.ray.intersectPlane(pl, p) ? p : null;
}

function pointAt(cx, cy) {
  const h = hitScene(cx, cy);
  if (h) return h.point;
  return groundAt(cx, cy, 0);
}

function depthAt(cx, cy) {
  const p = pointAt(cx, cy);
  if (!p) return CAM.dist;
  return Math.max(0.5, p.clone().sub(CAM.pos).dot(camF()));
}

function dollyAt(cx, cy, f) {
  const p = pointAt(cx, cy);
  const dir = V.ray.ray.direction.clone();
  const d = p ? p.distanceTo(CAM.pos) : CAM.dist;
  const nd = clamp(d / f, 0.35, 1500);
  CAM.pos.addScaledVector(dir, d - nd);
  if (CAM.pos.y < 0.15) CAM.pos.y = 0.15;
  if (p) CAM.pivot.copy(p);
  CAM.dist = nd;
  applyCam();
}

function wheelKind(e) {
  if (e.ctrlKey) return "pinch";
  if (UIP.wheel === "mouse") return "mouse";
  if (UIP.wheel === "pad") return "pad";
  const now = performance.now();
  if (e.deltaMode !== 0) return "mouse";
  if (Math.abs(e.deltaX) > 0.01) {
    IN.padAt = now;
    return "pad";
  }
  if (typeof e.wheelDeltaY === "number" && e.wheelDeltaY !== 0) {
    if (e.wheelDeltaY === -3 * e.deltaY) {
      IN.padAt = now;
      return "pad";
    }
    if (Math.abs(e.wheelDeltaY) % 120 === 0) return "mouse";
  }
  if (now - IN.padAt < 400) return "pad";
  return Math.abs(e.deltaY) >= 40 ? "mouse" : "pad";
}

function floorAt(x, z) {
  const f = footprint();
  if (f) {
    const hp = worldToHouse(x, z);
    const e = f.e;
    const wl = S.house.wall;
    if (hp.x > e.minX - wl && hp.x < e.maxX + wl && hp.y > e.minY - wl && hp.y < e.maxY + wl) return S.house.base + 0.02;
  }
  for (const o of S.objects) {
    if (!["terrace", "parking", "path", "gazebo"].includes(o.kind)) continue;
    const b = thingBox(o);
    if (x > b.x && x < b.x + b.w && z > b.y && z < b.y + b.d) return o.kind === "gazebo" ? 0.15 : Math.max(0, o.h);
  }
  return 0;
}

function startWalk() {
  if (!V.ok) return;
  if (!V.walk) IN.prevPose = {pos: CAM.pos.clone(), yaw: CAM.yaw, pitch: CAM.pitch, pivot: CAM.pivot.clone(), dist: CAM.dist};
  IN.anim = null;
  let x = S.plot.w / 2;
  let z = S.plot.d + 2;
  let yaw = 0;
  const entry = S.doors.find(d => d.kind === "entry");
  const e = ext();
  if (entry && e) {
    const L = lineOf(entry, wallSegs(), extSides(e), false);
    if (L) {
      const gd = doorGeo(entry, L);
      const mid = houseToWorld(entry.x, entry.y);
      const n = dirToWorld(gd.n.x, gd.n.y);
      x = mid.x - n.x * 3.5;
      z = mid.z - n.z * 3.5;
      yaw = Math.atan2(n.x, n.z) + Math.PI;
    }
  }
  CAM.pos.set(x, floorAt(x, z) + EYE, z);
  CAM.yaw = yaw;
  CAM.pitch = -0.06;
  V.walk = {t: 0};
  document.body.classList.add("walking");
  $("#walkhint").hidden = false;
  document.querySelectorAll("#cams [data-cam]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cam === "walk")));
  applyCam();
  schedule3D();
}

function windowView(w) {
  const e = ext();
  const L = V.ok && w && e ? lineOf(w, wallSegs(), extSides(e), true) : null;
  if (!L) return false;
  const nx = L.o === "v" ? L.out : 0;
  const ny = L.o === "h" ? L.out : 0;
  const r = S.rooms.find(q => w.x - nx * 0.05 > q.x - 0.01 && w.x - nx * 0.05 < q.x + q.w + 0.01 && w.y - ny * 0.05 > q.y - 0.01 && w.y - ny * 0.05 < q.y + q.d + 0.01);
  const room = r ? (L.o === "h" ? r.d : r.w) : 2;
  const back = Math.min(1.3, room * 0.6);
  const ns = winSashes(w);
  const sh = ns % 2 ? 0 : w.w / (2 * ns);
  const p = houseToWorld(w.x - nx * back + ny * sh, w.y - ny * back + nx * sh);
  const n = dirToWorld(nx, ny);
  startWalk();
  CAM.pos.set(p.x, S.house.base + 0.02 + EYE, p.z);
  CAM.yaw = Math.atan2(n.x, n.z) + Math.PI;
  CAM.pitch = clamp(Math.atan2(S.house.base + w.sill + w.h / 2 - CAM.pos.y, 3), -0.35, 0.25);
  applyCam();
  return true;
}

function exitWalk(keepPose) {
  if (!V.walk) return;
  V.walk = null;
  IN.keys.clear();
  document.body.classList.remove("walking");
  $("#walkhint").hidden = true;
  document.querySelectorAll("#cams [data-cam]").forEach(b => b.setAttribute("aria-pressed", "false"));
  if (!keepPose && IN.prevPose) setPose(IN.prevPose);
  schedule3D();
}

function walkStep(dt) {
  const ks = IN.keys;
  let f = 0;
  let s = 0;
  if (ks.has("KeyW") || ks.has("ArrowUp")) f += 1;
  if (ks.has("KeyS") || ks.has("ArrowDown")) f -= 1;
  if (ks.has("KeyA") || ks.has("ArrowLeft")) s -= 1;
  if (ks.has("KeyD") || ks.has("ArrowRight")) s += 1;
  let moved = false;
  if (f || s) {
    const sp = (ks.has("ShiftLeft") || ks.has("ShiftRight") ? 4.2 : 1.6) * dt;
    const k2 = 1 / Math.hypot(f, s);
    CAM.pos.x += (-Math.sin(CAM.yaw) * f + Math.cos(CAM.yaw) * s) * sp * k2;
    CAM.pos.z += (-Math.cos(CAM.yaw) * f - Math.sin(CAM.yaw) * s) * sp * k2;
    moved = true;
  }
  const ty = floorAt(CAM.pos.x, CAM.pos.z) + EYE;
  if (Math.abs(ty - CAM.pos.y) > 0.002) {
    CAM.pos.y += (ty - CAM.pos.y) * Math.min(1, dt * 9);
    moved = true;
  }
  if (moved) applyCam();
  return moved;
}

function flyStep(dt) {
  const ks = IN.keys;
  let f = 0;
  let s = 0;
  let u = 0;
  if (ks.has("KeyW")) f += 1;
  if (ks.has("KeyS")) f -= 1;
  if (ks.has("KeyA")) s -= 1;
  if (ks.has("KeyD")) s += 1;
  if (ks.has("KeyE")) u += 1;
  if (ks.has("KeyQ")) u -= 1;
  if (!f && !s && !u) return false;
  const sp = (ks.has("ShiftLeft") || ks.has("ShiftRight") ? 18 : 6) * dt;
  const mv = camF().multiplyScalar(f).add(camR().multiplyScalar(s)).add(new THREE.Vector3(0, u, 0));
  if (mv.lengthSq() > 1) mv.normalize();
  mv.multiplyScalar(sp);
  CAM.pos.add(mv);
  CAM.pivot.add(mv);
  if (CAM.pos.y < 0.15) CAM.pos.y = 0.15;
  applyCam();
  return true;
}

function tick3D(dt) {
  let moved = false;
  if (IN.anim) {
    const A = IN.anim;
    A.t = Math.min(1, A.t + dt / 0.45);
    const k2 = A.t < 0.5 ? 2 * A.t * A.t : 1 - Math.pow(-2 * A.t + 2, 2) / 2;
    CAM.pos.lerpVectors(A.p0, A.p1, k2);
    CAM.yaw = A.y0 + (A.y1 - A.y0) * k2;
    CAM.pitch = A.q0 + (A.q1 - A.q0) * k2;
    if (A.t >= 1) {
      if (A.pivot) CAM.pivot.copy(A.pivot);
      if (A.dist) CAM.dist = A.dist;
      IN.anim = null;
    }
    applyCam();
    moved = true;
  }
  if (V.walk) moved = walkStep(dt) || moved;
  else if (IN.keys.size) moved = flyStep(dt) || moved;
  if (!V.walk && padTick(dt)) moved = true;
  return moved;
}

function sameSel(pk) {
  return !!(sel && pk && sel.t === pk.t && (pk.t === "house" || sel.id === pk.id));
}

function selectPick(pk, point) {
  if (pk.t === "fence") {
    sel = null;
    tab = "plot";
    frozen = null;
    renderAll();
    return;
  }
  if (pk.t === "house") {
    if (tab === "house" && point && V.camera) {
      const hp = worldToHouse(point.x, point.z);
      const tc = dirToHouse(V.camera.position.x - point.x, V.camera.position.z - point.z);
      const l = Math.hypot(tc.x, tc.y) || 1;
      const r = roomAt(hp.x + tc.x / l * 0.3, hp.y + tc.y / l * 0.3) || roomAt(hp.x, hp.y);
      if (r) {
        sel = {t: "room", id: r.id};
        frozen = null;
        renderAll();
        return;
      }
    }
    sel = {t: "house"};
    tab = "plot";
  } else if (pk.t === "obj") {
    sel = {t: "obj", id: pk.id};
    tab = "plot";
  } else {
    sel = {t: pk.t, id: pk.id};
    tab = "house";
  }
  frozen = null;
  renderAll();
}

function focusSel() {
  if (!V.camera) return;
  const F = tgtFrame();
  let c;
  let r;
  if (F) {
    const it = selItem();
    c = F.o.clone();
    if (sel.t === "house") {
      const f = footprint();
      r = f ? 0.5 * Math.hypot(f.w, f.d, 4) : 8;
      c.y = 1.5;
    } else if (sel.t === "room") {
      r = 0.5 * Math.hypot(it.w, it.d, S.house.h);
      c.y = S.house.base + S.house.h * 0.4;
    } else if (sel.t === "door" || sel.t === "win") {
      r = Math.max(1.2, it.w);
    } else {
      r = 0.5 * Math.hypot(it.w, it.d, it.h) + 0.3;
      c.y += it.h / 2;
    }
  } else {
    const p = viewPose("iso");
    tweenTo(p);
    return;
  }
  const dist = Math.max(1.2, r / Math.sin(V.camera.fov * Math.PI / 360) * 1.25);
  const pos = c.clone().addScaledVector(camF(), -dist);
  if (pos.y < 0.3) pos.y = 0.3;
  tweenTo({pos, yaw: CAM.yaw, pitch: CAM.pitch, pivot: c, dist});
}

function gzMat(color, op) {
  return new THREE.MeshBasicMaterial({color, depthTest: false, depthWrite: false, transparent: true, opacity: op === undefined ? 0.95 : op, toneMapped: false});
}

const GZM = {};

function initGizmo() {
  GZ.root = new THREE.Group();
  GZ.root.visible = false;
  GZ.sroot = new THREE.Group();
  GZ.sroot.visible = false;
  GH.root = new THREE.Group();
  V.scene.add(GZ.root);
  V.scene.add(GZ.sroot);
  V.scene.add(GH.root);
  GZM.x = gzMat(0xe5484d);
  GZM.y = gzMat(0x46a758);
  GZM.z = gzMat(0x3e7bfa);
  GZM.p = gzMat(0xf5b400, 0.55);
  GZM.r = gzMat(0xf5b400);
  GZM.h = gzMat(0xffe066);
  GZM.pick = new THREE.MeshBasicMaterial({visible: false});
}

function tgtFrame() {
  if (!sel || V.walk) return null;
  const Hs = S.house;
  const hx = dirToWorld(1, 0);
  const hy = dirToWorld(0, 1);
  const HX = new THREE.Vector3(hx.x, 0, hx.z);
  const HZ = new THREE.Vector3(hy.x, 0, hy.z);
  const WX = new THREE.Vector3(1, 0, 0);
  const WZ = new THREE.Vector3(0, 0, 1);
  if (sel.t === "house") {
    if (!footprint()) return null;
    return {t: "house", o: new THREE.Vector3(Hs.cx, 0.1, Hs.cy), mx: WX, mz: WZ, my: null, rot: 90, scale: []};
  }
  const it = selItem();
  if (!it) return null;
  if (sel.t === "room") {
    const c = houseToWorld(it.x + it.w / 2, it.y + it.d / 2);
    const o = new THREE.Vector3(c.x, Hs.base + 0.06, c.z);
    const sc = [["+x", HX, it.w / 2], ["-x", HX.clone().negate(), it.w / 2], ["+z", HZ, it.d / 2], ["-z", HZ.clone().negate(), it.d / 2]].map(([key, dir, ex]) => ({key, dir, pos: o.clone().addScaledVector(dir, ex)}));
    return {t: "room", o, mx: HX, mz: HZ, my: null, rot: 90, scale: sc};
  }
  if (sel.t === "item" || sel.t === "obj") {
    const inH = sel.t === "item";
    const cx = it.x + it.w / 2;
    const cy = it.y + it.d / 2;
    const c = inH ? houseToWorld(cx, cy) : {x: cx, z: cy};
    const o = new THREE.Vector3(c.x, (inH ? Hs.base + 0.02 : 0) + (it.z || 0), c.z);
    const th = (it.rot || 0) * Math.PI / 180;
    const lx = inH ? dirToWorld(Math.cos(th), Math.sin(th)) : {x: Math.cos(th), z: Math.sin(th)};
    const lz = inH ? dirToWorld(-Math.sin(th), Math.cos(th)) : {x: -Math.sin(th), z: Math.cos(th)};
    const LX = new THREE.Vector3(lx.x, 0, lx.z);
    const LZ = new THREE.Vector3(lz.x, 0, lz.z);
    const mid = o.clone().add(new THREE.Vector3(0, it.h / 2, 0));
    const sc = [["+x", LX, it.w / 2], ["-x", LX.clone().negate(), it.w / 2], ["+z", LZ, it.d / 2], ["-z", LZ.clone().negate(), it.d / 2]].map(([key, dir, ex]) => ({key, dir, pos: mid.clone().addScaledVector(dir, ex)}));
    sc.push({key: "+y", dir: YUP.clone(), pos: o.clone().add(new THREE.Vector3(0, it.h, 0))});
    return {t: sel.t, o, mx: inH ? HX : WX, mz: inH ? HZ : WZ, my: YUP.clone(), rot: 15, scale: sc, lx: LX, lz: LZ};
  }
  if (sel.t === "door" || sel.t === "win") {
    const c = houseToWorld(it.x, it.y);
    const isWin = sel.t === "win";
    const ym = isWin ? Hs.base + it.sill + it.h / 2 : Hs.base + Math.min(Hs.doorH, Hs.h) / 2;
    const o = new THREE.Vector3(c.x, ym, c.z);
    const A = it.o === "h" ? HX : HZ;
    const sc = [{key: "+a", dir: A.clone(), pos: o.clone().addScaledVector(A, it.w / 2)}, {key: "-a", dir: A.clone().negate(), pos: o.clone().addScaledVector(A, -it.w / 2)}];
    if (isWin) {
      sc.push({key: "+y", dir: YUP.clone(), pos: o.clone().add(new THREE.Vector3(0, it.h / 2, 0))});
      sc.push({key: "-y", dir: YUP.clone().negate(), pos: o.clone().add(new THREE.Vector3(0, -it.h / 2, 0))});
    }
    return {t: sel.t, o, mx: A.clone(), mz: null, my: isWin ? YUP.clone() : null, rot: sel.t === "door" ? "flip" : null, scale: sc};
  }
  return null;
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
  while (g.children.length) g.remove(g.children[0]);
}

function arrowPart(dir, mt, key) {
  const a = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 8), mt);
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = 0.46;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 16), mt);
  head.rotation.z = -Math.PI / 2;
  head.position.x = 0.92;
  const pk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1, 6), GZM.pick);
  pk.rotation.z = -Math.PI / 2;
  pk.position.x = 0.55;
  a.add(shaft, head, pk);
  a.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
  const part = {kind: "ax", key, axis: dir.clone().normalize(), meshes: [shaft, head], pick: pk, mat: mt};
  pk.userData.gz = part;
  for (const m of a.children) m.renderOrder = 40;
  return {obj: a, part};
}

function buildGizmoParts(F) {
  disposeGroup(GZ.root);
  disposeGroup(GZ.sroot);
  GZ.parts = [];
  if (gmode === "move") {
    for (const [ax, mt, key] of [[F.mx, GZM.x, "x"], [F.mz, GZM.z, "z"], [F.my, GZM.y, "y"]]) {
      if (!ax) continue;
      const {obj, part} = arrowPart(ax, mt, key);
      GZ.root.add(obj);
      GZ.parts.push(part);
    }
    if (F.mz || sel.t === "door" || sel.t === "win") {
      const ax = F.mx.clone();
      const az = F.mz ? F.mz.clone() : new THREE.Vector3(-ax.z, 0, ax.x);
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), GZM.p);
      sq.material.side = THREE.DoubleSide;
      sq.rotation.x = -Math.PI / 2;
      sq.position.copy(ax.clone().add(az).multiplyScalar(0.3));
      sq.renderOrder = 40;
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), GZM.pick);
      pk.position.copy(sq.position);
      const part = {kind: "plane", meshes: [sq], pick: pk, mat: GZM.p};
      pk.userData.gz = part;
      GZ.root.add(sq, pk);
      GZ.parts.push(part);
    }
  } else if (gmode === "rotate") {
    if (F.rot) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.014, 6, 72), GZM.r);
      ring.rotation.x = Math.PI / 2;
      ring.renderOrder = 40;
      const pk = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 36), GZM.pick);
      pk.rotation.x = Math.PI / 2;
      const part = {kind: "ring", meshes: [ring], pick: pk, mat: GZM.r};
      pk.userData.gz = part;
      GZ.root.add(ring, pk);
      GZ.parts.push(part);
    }
  } else {
    for (const h of F.scale) {
      const mt = h.key.indexOf("y") >= 0 ? GZM.y : h.key.indexOf("z") >= 0 ? GZM.z : GZM.x;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), mt);
      cube.renderOrder = 40;
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), GZM.pick);
      const g = new THREE.Group();
      g.position.copy(h.pos);
      g.add(cube, pk);
      const part = {kind: "sc", key: h.key, axis: h.dir.clone().normalize(), meshes: [cube], pick: pk, mat: mt, grp: g};
      pk.userData.gz = part;
      GZ.sroot.add(g);
      GZ.parts.push(part);
    }
  }
}

function updateGizmo() {
  if (!GZ.root) return;
  const F = V.hq || !V.ok || tool ? null : tgtFrame();
  GZ.F = F;
  if (!F) {
    GZ.root.visible = false;
    GZ.sroot.visible = false;
    return;
  }
  const r3 = v => (v ? v.x.toFixed(3) + "," + v.y.toFixed(3) + "," + v.z.toFixed(3) : "-");
  const sig = gmode + "|" + sel.t + "|" + (sel.id || "") + "|" + r3(F.mx) + r3(F.mz) + r3(F.my) + "|" + F.scale.map(h => r3(h.pos)).join(";");
  if (sig !== GZ.sig) {
    GZ.sig = sig;
    buildGizmoParts(F);
  }
  const s = Math.max(0.12, V.camera.position.distanceTo(F.o) * 0.13);
  GZ.root.position.copy(F.o);
  GZ.root.scale.setScalar(s);
  GZ.root.visible = gmode !== "scale";
  GZ.sroot.visible = gmode === "scale";
  for (const p of GZ.parts) {
    if (p.grp) p.grp.scale.setScalar(Math.max(0.12, V.camera.position.distanceTo(p.grp.position) * 0.13));
    const hot = GZ.hover === p || (GZ.drag && GZ.drag.part === p);
    for (const m of p.meshes) m.material = hot ? GZM.h : p.mat;
  }
}

function gizmoHit(cx, cy) {
  if (!GZ.F || !GZ.parts.length) return null;
  setRay(cx, cy);
  if (gmode === "rotate" && GZ.root.visible) {
    const ring = GZ.parts.find(p => p.kind === "ring");
    const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GZ.F.o.y);
    const p = new THREE.Vector3();
    if (ring && V.ray.ray.intersectPlane(pl, p)) {
      const s = GZ.root.scale.x;
      if (Math.abs(p.distanceTo(GZ.F.o) - 0.9 * s) < 0.3 * s) return ring;
    }
  }
  const picks = GZ.parts.map(p => p.pick);
  const hits = V.ray.intersectObjects(picks, false);
  return hits.length ? hits[0].object.userData.gz : null;
}

function showTip(cx, cy, text) {
  const tip = $("#tip3");
  if (!tip) return;
  const rect = $("#p3").getBoundingClientRect();
  tip.textContent = text;
  tip.hidden = false;
  tip.style.left = Math.round(cx - rect.left + 16) + "px";
  tip.style.top = Math.round(cy - rect.top + 16) + "px";
}

function hideTip() {
  const tip = $("#tip3");
  if (tip) tip.hidden = true;
}

function tipText() {
  if (!sel) return "";
  if (sel.t === "house") return `Дом, поворот ${S.house.rot}°`;
  const it = selItem();
  if (!it) return "";
  if (sel.t === "room") return `${it.name} ${fm(it.w)} × ${fm(it.d)} м, ${fa(it.w * it.d)} м²`;
  if (sel.t === "door") return `Проём ${fm(it.w)} м`;
  if (sel.t === "win") return `Окно ${fm(it.w)} × ${fm(it.h)} м, подоконник ${fm(it.sill)} м`;
  const z = it.z ? `, над полом ${fm(it.z)} м` : "";
  return `${it.name} ${fm(it.w)} × ${fm(it.d)} × ${fm(it.h)} м, ${Math.round(it.rot || 0)}°${z}`;
}

function dragPlane(part, F, e, point) {
  if (part.kind === "ax" || part.kind === "sc") {
    const A = part.axis;
    const cd = V.camera.getWorldDirection(new THREE.Vector3());
    let n = A.clone().cross(cd.clone().cross(A));
    if (n.lengthSq() < 1e-6) n = YUP.clone();
    n.normalize();
    const o = part.kind === "sc" && part.grp ? part.grp.position : F.o;
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n, o);
  }
  const y = point ? point.y : F.o.y;
  return new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
}

function rayPlane(cx, cy, pl) {
  setRay(cx, cy);
  const p = new THREE.Vector3();
  return V.ray.ray.intersectPlane(pl, p) ? p : null;
}

function startDrag3(part, e, point) {
  const F = GZ.F || tgtFrame();
  if (!F) return false;
  const pl = dragPlane(part, F, e, point);
  const p0 = rayPlane(e.clientX, e.clientY, pl);
  if (!p0) return false;
  const it = selItem();
  const D = {part, F, pl, p0, moved: false, snapS: JSON.stringify(S), it0: it ? JSON.parse(JSON.stringify(it)) : null, house0: JSON.parse(JSON.stringify(S.house)), att: [], rot0: 0};
  if (sel.t === "room" && it) {
    D.att = attachedTo(it).map(a => ({a, x: a.x, y: a.y})).concat(itemsIn(it).map(a => ({a, x: a.x, y: a.y})));
  }
  if (sel.t === "door" || sel.t === "win") {
    const e2 = ext();
    D.L = e2 ? lineOf(it, wallSegs(), extSides(e2), sel.t === "win") : null;
  }
  const v = p0.clone().sub(F.o);
  D.a0 = Math.atan2(-v.z, v.x);
  GZ.drag = D;
  bounds();
  return true;
}

function moveDelta(D, dv, e) {
  const it = selItem();
  const s0 = D.it0;
  const fine = e.altKey;
  const sn = v => (fine ? r2(v) : snapv(v));
  const up = (v0, dl) => (Math.abs(dl) > 1e-6 ? sn(v0 + dl) : v0);
  if (sel.t === "house") {
    S.house.cx = up(D.house0.cx, dv.x);
    S.house.cy = up(D.house0.cy, dv.z);
    return;
  }
  if (!it) return;
  if (sel.t === "obj") {
    it.x = up(s0.x, dv.x);
    it.y = up(s0.y, dv.z);
    if (Math.abs(dv.y) > 1e-6) it.z = Math.max(0, sn((s0.z || 0) + dv.y));
    return;
  }
  const dh = dirToHouse(dv.x, dv.z);
  if (sel.t === "item") {
    it.x = up(s0.x, dh.x);
    it.y = up(s0.y, dh.y);
    if (Math.abs(dv.y) > 1e-6) it.z = Math.max(0, sn((s0.z || 0) + dv.y));
    return;
  }
  if (sel.t === "room") {
    let nx = up(s0.x, dh.x);
    let ny = up(s0.y, dh.y);
    if (!fine) {
      const m2 = magnetRoom({x: nx, y: ny, w: s0.w, d: s0.d, id: it.id}, "move");
      nx = m2.x;
      ny = m2.y;
    }
    it.x = nx;
    it.y = ny;
    const mx = it.x - s0.x;
    const my = it.y - s0.y;
    for (const a of D.att) {
      a.a.x = r2(a.x + mx);
      a.a.y = r2(a.y + my);
    }
    return;
  }
  if (sel.t === "door" || sel.t === "win") {
    if (D.part.kind === "ax" && D.part.key === "y") {
      if (sel.t === "win") it.sill = clamp(sn(s0.sill + dv.y), 0, Math.max(0, S.house.h - it.h));
      return;
    }
    if (D.part.kind === "ax") {
      const L = D.L;
      const a0 = along(s0) + (it.o === "h" ? dh.x : dh.y);
      let a = sn(a0);
      if (L) a = clamp(a, L.a + it.w / 2, L.b - it.w / 2);
      if (it.o === "h") it.x = r2(a);
      else it.y = r2(a);
      return;
    }
    const target = worldToHouse(D.p0.x + dv.x, D.p0.z + dv.z);
    snapToWall(it, target, sel.t === "win");
  }
}

function rotateDelta(D, p, e) {
  const v = p.clone().sub(D.F.o);
  const a = Math.atan2(-v.z, v.x);
  let da = a - D.a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const deg = -da * 180 / Math.PI;
  if (sel.t === "item" || sel.t === "obj") {
    const it = selItem();
    if (!it) return;
    const st = e.altKey ? 1 : 15;
    it.rot = normDeg(Math.round((D.it0.rot + deg) / st) * st);
    return;
  }
  if (sel.t === "house" || sel.t === "room") {
    const n = ((Math.round(deg / 90) % 4) + 4) % 4;
    if (n === D.rot0) return;
    D.rot0 = n;
    const id = sel.id;
    S = JSON.parse(D.snapS);
    sel = sel.t === "house" ? {t: "house"} : {t: "room", id};
    for (let i = 0; i < n; i++) rotateSel();
  }
}

function scaleDelta(D, t, e) {
  const it = selItem();
  const s0 = D.it0;
  const key = D.part.key;
  const fine = e.altKey;
  const sn = v => (fine ? r2(v) : snapv(v));
  if (!it) return;
  if (sel.t === "room") {
    const r = {x: s0.x, y: s0.y, w: s0.w, d: s0.d};
    if (key === "+x") r.w = Math.max(0.3, sn(s0.x + s0.w + t) - s0.x);
    if (key === "-x") {
      const nx = Math.min(sn(s0.x - t), r2(s0.x + s0.w - 0.3));
      r.w = r2(s0.x + s0.w - nx);
      r.x = nx;
    }
    if (key === "+z") r.d = Math.max(0.3, sn(s0.y + s0.d + t) - s0.y);
    if (key === "-z") {
      const ny = Math.min(sn(s0.y - t), r2(s0.y + s0.d - 0.3));
      r.d = r2(s0.y + s0.d - ny);
      r.y = ny;
    }
    const m2 = fine ? r : magnetRoom(Object.assign({id: it.id}, r), key);
    it.x = r2(m2.x);
    it.y = r2(m2.y);
    it.w = r2(m2.w);
    it.d = r2(m2.d);
    return;
  }
  if (sel.t === "item" || sel.t === "obj") {
    if (key === "+y") {
      it.h = Math.max(0.01, sn(s0.h + t));
      return;
    }
    const th = (s0.rot || 0) * Math.PI / 180;
    const isX = key.indexOf("x") >= 0;
    const sg = key[0] === "+" ? 1 : -1;
    const dim0 = isX ? s0.w : s0.d;
    const dim = Math.max(0.05, sn(dim0 + t));
    const dd = dim - dim0;
    const ux = isX ? Math.cos(th) : -Math.sin(th);
    const uy = isX ? Math.sin(th) : Math.cos(th);
    const cx = s0.x + s0.w / 2 + sg * ux * dd / 2;
    const cy = s0.y + s0.d / 2 + sg * uy * dd / 2;
    if (isX) it.w = r2(dim);
    else it.d = r2(dim);
    it.x = r2(cx - it.w / 2);
    it.y = r2(cy - it.d / 2);
    return;
  }
  if (sel.t === "door" || sel.t === "win") {
    if (key === "+a" || key === "-a") {
      const w = clamp(sn(s0.w + t), sel.t === "door" ? 0.5 : 0.3, sel.t === "door" ? 4 : 6);
      const sg = key[0] === "+" ? 1 : -1;
      const a = along(s0) + sg * (w - s0.w) / 2;
      it.w = r2(w);
      if (it.o === "h") it.x = r2(a);
      else it.y = r2(a);
      return;
    }
    if (key === "+y") it.h = clamp(sn(s0.h + t), 0.3, Math.max(0.3, S.house.h - it.sill));
    if (key === "-y") {
      const sill = clamp(sn(s0.sill - t), 0, s0.sill + s0.h - 0.3);
      it.h = r2(s0.h + (s0.sill - sill));
      it.sill = r2(sill);
    }
  }
}

function dragMove3(e) {
  const D = GZ.drag;
  if (!D) return;
  const p = rayPlane(e.clientX, e.clientY, D.pl);
  if (!p) return;
  const dv = p.clone().sub(D.p0);
  const part = D.part;
  if (part.kind === "ax") {
    const t = dv.dot(part.axis);
    moveDelta(D, part.axis.clone().multiplyScalar(t), e);
  } else if (part.kind === "plane" || part.kind === "body") {
    dv.y = 0;
    moveDelta(D, dv, e);
  } else if (part.kind === "ring") {
    if (D.F.rot === "flip") return;
    rotateDelta(D, p, e);
  } else if (part.kind === "sc") {
    scaleDelta(D, dv.dot(part.axis), e);
  }
  D.moved = true;
  render2D();
  updateLive();
  if (!syncThing3D()) schedule3D();
  showTip(e.clientX, e.clientY, tipText());
}

function endDrag3() {
  const D = GZ.drag;
  GZ.drag = null;
  hideTip();
  frozen = null;
  if (!D) return;
  if (D.moved) changed();
  else if (D.part.kind === "ring" && D.F.rot === "flip") {
    rotateSel();
    changed();
  } else renderAll();
}

function clearGhost() {
  disposeGroup(GH.root);
  GH.kind = "";
  GH.obj = null;
  V.need = true;
}

function ghostBoxHouse(cx, cy, w, d, y0, y1) {
  disposeGroup(GH.root);
  GH.kind = "";
  const c = houseToWorld(cx, cy);
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  g.rotation.y = -S.house.rot * Math.PI / 180;
  B(g, -w / 2, w / 2, y0, y1, -d / 2, d / 2, ghostMat());
  const bg = new THREE.BoxGeometry(w, y1 - y0, d);
  const ln = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({color: 0x2f6fdf, toneMapped: false}));
  bg.dispose();
  ln.position.y = (y0 + y1) / 2;
  g.add(ln);
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = false;
      o.renderOrder = 25;
    }
  });
  GH.root.add(g);
  V.need = true;
}

function ghostOpening(it) {
  if (!it) {
    clearGhost();
    return;
  }
  const Hs = S.house;
  const isWin = !("kind" in it);
  const th = Hs.wall + 0.08;
  const y0 = Hs.base + (isWin ? it.sill : 0);
  const y1 = Hs.base + (isWin ? it.sill + it.h : Math.min(Hs.doorH, Hs.h));
  if (it.o === "h") ghostBoxHouse(it.x, it.y, it.w, th, y0, y1);
  else ghostBoxHouse(it.x, it.y, th, it.w, y0, y1);
}

function ghostThing(kind, wx, wz, inHouse) {
  if (GH.kind !== kind) {
    disposeGroup(GH.root);
    const K = MODELS[kind] || MODELS.other;
    const g = new THREE.Group();
    buildModel(g, {id: "ghost", kind, w: K.w, d: K.d, h: K.h}, null, true);
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = false;
        o.renderOrder = 25;
      }
    });
    GH.root.add(g);
    GH.kind = kind;
    GH.obj = g;
  }
  const K = MODELS[kind] || MODELS.other;
  GH.obj.position.set(wx, (inHouse ? S.house.base + 0.02 : 0) + modelZ(K), wz);
  GH.obj.rotation.y = inHouse ? -S.house.rot * Math.PI / 180 : 0;
  V.need = true;
}

function insideHouse(wx, wz) {
  const f = footprint();
  if (!f) return false;
  const hp = worldToHouse(wx, wz);
  const e = f.e;
  return hp.x > e.minX && hp.x < e.maxX && hp.y > e.minY && hp.y < e.maxY;
}

function toolHover3(e) {
  if (!tool) return;
  if (tool.t === "meas") {
    measHover3(e);
  } else if (tool.t === "open") {
    const p = pointAt(e.clientX, e.clientY);
    if (!p || !ext()) {
      clearGhost();
      return;
    }
    const hp = worldToHouse(p.x, p.z);
    ghostOpening(openingAt(tool.kind, hp, 1.8));
  } else if (tool.t === "thing") {
    const g0 = groundAt(e.clientX, e.clientY, 0);
    if (!g0) return;
    const inH = insideHouse(g0.x, g0.z);
    const p = inH ? groundAt(e.clientX, e.clientY, S.house.base + 0.02) : g0;
    ghostThing(tool.kind, p.x, p.z, inH);
  } else if (tool.t === "room") {
    if (!IN.g) clearGhost();
  } else if (tool.t === "wall") {
    const p = pointAt(e.clientX, e.clientY);
    const h = p && ext() ? wallPairAt(worldToHouse(p.x, p.z), 0.7) : null;
    if (!h || h.ext) {
      clearGhost();
      return;
    }
    const E = h.e || h.L;
    const Hs = S.house;
    const th = Hs.inner + 0.06;
    if (E.o === "h") ghostBoxHouse((E.a + E.b) / 2, E.c, E.b - E.a, th, Hs.base, Hs.base + Hs.h);
    else ghostBoxHouse(E.c, (E.a + E.b) / 2, th, E.b - E.a, Hs.base, Hs.base + Hs.h);
  }
}

function toolDown3(e, g) {
  if (tool.t === "room") {
    const p = groundAt(e.clientX, e.clientY, S.house.base + 0.02);
    if (!p) return;
    const hp = worldToHouse(p.x, p.z);
    g.room0 = {x: snapv(hp.x), y: snapv(hp.y)};
  }
}

function roomRectFrom(g, e) {
  const p = groundAt(e.clientX, e.clientY, S.house.base + 0.02);
  if (!p || !g.room0) return null;
  const hp = worldToHouse(p.x, p.z);
  const x1 = snapv(hp.x);
  const y1 = snapv(hp.y);
  return {x: Math.min(g.room0.x, x1), y: Math.min(g.room0.y, y1), w: r2(Math.abs(x1 - g.room0.x)), d: r2(Math.abs(y1 - g.room0.y))};
}

function toolMove3(e, g) {
  if (tool.t === "room") {
    const r = roomRectFrom(g, e);
    if (!r || r.w < 0.05 || r.d < 0.05) return;
    ghostBoxHouse(r.x + r.w / 2, r.y + r.d / 2, r.w, r.d, S.house.base, S.house.base + 0.12);
    showTip(e.clientX, e.clientY, `${fm(r.w)} × ${fm(r.d)} м`);
  } else {
    toolHover3(e);
  }
}

function toolUp3(e, g) {
  hideTip();
  if (!tool) return;
  if (tool.t === "room") {
    const r = roomRectFrom(g, e);
    clearGhost();
    if (r && r.w >= 0.5 && r.d >= 0.5) placeRoom(r, e.shiftKey, e.altKey);
    return;
  }
  if (g.moved) return;
  if (tool.t === "open") {
    const p = pointAt(e.clientX, e.clientY);
    if (!p) return;
    const it = openingAt(tool.kind, worldToHouse(p.x, p.z), 1.8);
    clearGhost();
    if (it) placeOpening(it, e.shiftKey);
  } else if (tool.t === "thing") {
    const g0 = groundAt(e.clientX, e.clientY, 0);
    if (!g0) return;
    const inH = insideHouse(g0.x, g0.z);
    const p = inH ? groundAt(e.clientX, e.clientY, S.house.base + 0.02) : g0;
    const kind = tool.kind;
    clearGhost();
    dropThing(kind, p.x, p.z, inH, e.shiftKey);
  } else if (tool.t === "wall") {
    const p = pointAt(e.clientX, e.clientY);
    clearGhost();
    if (p && ext()) toggleWallAt(worldToHouse(p.x, p.z), 0.7);
  } else if (tool.t === "meas") {
    measClick(measAt3(e));
  }
}

function pinchState() {
  const [a, b] = [...IN.ptrs.values()];
  return {d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
}

function onDown3(e) {
  const cv = V.renderer.domElement;
  IN.anim = null;
  padReset();
  try {
    cv.setPointerCapture(e.pointerId);
  } catch (err) {
    return;
  }
  IN.ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (IN.ptrs.size === 2) {
    if (GZ.drag) endDrag3();
    IN.g = {type: "pinch", st: pinchState(), moved: true};
    return;
  }
  if (IN.ptrs.size > 2) return;
  const g = {type: "pending", sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, btn: e.button, moved: false, touch: e.pointerType === "touch"};
  IN.g = g;
  if (V.walk) {
    g.type = "look";
    return;
  }
  if (e.button === 2) {
    g.type = "look";
    IN.rmb = true;
    return;
  }
  if (e.button === 1) {
    g.type = "pan";
    g.depth = depthAt(e.clientX, e.clientY);
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  if (tool) {
    g.type = "tool";
    toolDown3(e, g);
    return;
  }
  const gp = gizmoHit(e.clientX, e.clientY);
  if (gp && startDrag3(gp, e)) {
    g.type = "gizmo";
    return;
  }
  if (e.altKey) {
    g.type = "orbit";
    g.pivot = pointAt(e.clientX, e.clientY) || CAM.pivot.clone();
    return;
  }
  if (e.shiftKey) {
    g.type = "pan";
    g.depth = depthAt(e.clientX, e.clientY);
    return;
  }
  const h = hitScene(e.clientX, e.clientY);
  g.hit = h;
  g.pivot = h ? h.point.clone() : groundAt(e.clientX, e.clientY, 0) || CAM.pivot.clone();
  if (h && h.pick && sameSel(h.pick) && GZ.F) g.type = "bodyPending";
}

function onMove3(e) {
  if (!IN.g) {
    if (SMAP.on && SMAP.grid && !tool) {
      const gp = groundAt(e.clientX, e.clientY, 0);
      smapCur(gp ? smapAt(gp.x, gp.z) : null);
    }
    if (tool) toolHover3(e);
    else if (GZ.F && !V.walk) {
      const hp = gizmoHit(e.clientX, e.clientY);
      if (hp !== GZ.hover) {
        GZ.hover = hp;
        V.need = true;
      }
    }
    return;
  }
  if (!IN.ptrs.has(e.pointerId)) return;
  IN.ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
  const g = IN.g;
  if (g.type === "pinch") {
    if (IN.ptrs.size < 2) return;
    const ps = pinchState();
    if (V.walk) {
      look(-(ps.mx - g.st.mx) * 0.004, -(ps.my - g.st.my) * 0.004);
    } else {
      dollyAt(ps.mx, ps.my, ps.d / g.st.d);
      pan(ps.mx - g.st.mx, ps.my - g.st.my, depthAt(ps.mx, ps.my));
    }
    g.st = ps;
    return;
  }
  const dx = e.clientX - g.lx;
  const dy = e.clientY - g.ly;
  g.lx = e.clientX;
  g.ly = e.clientY;
  if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 4) {
    g.moved = true;
    if (g.type === "pending") g.type = "orbit";
    if (g.type === "bodyPending") {
      if (startDrag3({kind: "body"}, {clientX: g.sx, clientY: g.sy}, g.hit.point)) g.type = "gizmo";
      else g.type = "orbit";
    }
  }
  if (!g.moved) return;
  if (g.type === "look") look(-dx * 0.0035, -dy * 0.0035);
  else if (g.type === "orbit") orbit(-dx * 0.006, -dy * 0.006, g.pivot);
  else if (g.type === "pan") pan(dx, dy, g.depth);
  else if (g.type === "gizmo") dragMove3(e);
  else if (g.type === "tool") toolMove3(e, g);
}

function onUp3(e) {
  const g = IN.g;
  IN.ptrs.delete(e.pointerId);
  if (IN.ptrs.size > 0) {
    if (g && g.type === "pinch") IN.g = {type: "none", moved: true, sx: 0, sy: 0, lx: 0, ly: 0};
    return;
  }
  IN.g = null;
  IN.rmb = false;
  if (!g) return;
  if (RND.pick && !g.moved && e.type === "pointerup" && rpopPick(e)) return;
  if (g.type === "gizmo") {
    endDrag3();
    return;
  }
  if (g.type === "tool") {
    toolUp3(e, g);
    return;
  }
  if (g.moved || e.type !== "pointerup" || !(g.btn === 0 || g.touch)) return;
  if (V.walk) {
    const hw = hitScene(e.clientX, e.clientY);
    if (hw && hw.pick && hw.h.distance < 4.5) toggleOpen(hw.pick);
    return;
  }
  const h = g.hit !== undefined ? g.hit : hitScene(e.clientX, e.clientY);
  if (h && h.pick) selectPick(h.pick, h.point);
  else if (sel) {
    sel = null;
    renderAll();
  }
}

const PADQ = {ox: 0, oy: 0, px: 0, py: 0, z: 0, zp: null, zx: 0, zy: 0, pivot: null, depth: 10, at: 0};
const NAV = {act: "", pivot: null};

function padPivot() {
  const r = V.renderer.domElement.getBoundingClientRect();
  if (sel && sel.t !== "house") {
    const F = tgtFrame();
    if (F && F.o.clone().sub(CAM.pos).dot(camF()) > 0.5) return F.o.clone();
  }
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const h = hitScene(cx, cy);
  if (h && h.point.distanceTo(CAM.pos) < 400) return h.point.clone();
  const g = groundAt(cx, cy, 0);
  if (g && g.distanceTo(CAM.pos) < 400) return g;
  return CAM.pos.clone().addScaledVector(camF(), clamp(CAM.dist, 2, 120));
}

function dollyTo(p, f) {
  const dir = p.clone().sub(CAM.pos);
  const d = dir.length();
  if (d < 1e-4) return;
  dir.divideScalar(d);
  const nd = clamp(d / f, 0.35, 1500);
  CAM.pos.addScaledVector(dir, d - nd);
  if (CAM.pos.y < 0.15) CAM.pos.y = 0.15;
  CAM.pivot.copy(p);
  CAM.dist = nd;
  applyCam();
}

function zoomTarget(cx, cy) {
  const p = pointAt(cx, cy);
  if (p && p.distanceTo(CAM.pos) < 600) return p;
  return V.ray.ray.at(clamp(CAM.dist, 2, 200), new THREE.Vector3());
}

function padTick(dt) {
  const q = PADQ;
  const f = 1 - Math.exp(-dt / 0.055);
  let moved = false;
  if (Math.abs(q.ox) + Math.abs(q.oy) > 1e-5) {
    const a = q.ox * f;
    const b = q.oy * f;
    q.ox -= a;
    q.oy -= b;
    orbit(a, b, q.pivot || CAM.pivot);
    moved = true;
  } else {
    q.ox = 0;
    q.oy = 0;
  }
  if (Math.abs(q.px) + Math.abs(q.py) > 0.01) {
    const a = q.px * f;
    const b = q.py * f;
    q.px -= a;
    q.py -= b;
    pan(a, b, q.depth);
    moved = true;
  } else {
    q.px = 0;
    q.py = 0;
  }
  if (Math.abs(q.z) > 1e-4) {
    const a = q.z * f;
    q.z -= a;
    if (q.zp) dollyTo(q.zp, Math.exp(a));
    moved = true;
  } else {
    q.z = 0;
  }
  if (NAV.act) {
    const k = dt * (UIP.padk || 1);
    const pv = NAV.pivot || CAM.pivot;
    if (NAV.act === "left") orbit(-1.3 * k, 0, pv);
    else if (NAV.act === "right") orbit(1.3 * k, 0, pv);
    else if (NAV.act === "up") orbit(0, -0.9 * k, pv);
    else if (NAV.act === "down") orbit(0, 0.9 * k, pv);
    else if (NAV.act === "in") dollyTo(pv, Math.exp(1.6 * k));
    else if (NAV.act === "out") dollyTo(pv, Math.exp(-1.6 * k));
    moved = true;
  }
  return moved;
}

function padReset() {
  Object.assign(PADQ, {ox: 0, oy: 0, px: 0, py: 0, z: 0});
}

function onWheel3(e) {
  e.preventDefault();
  IN.anim = null;
  if (performance.now() - IN.gsAt < 120 && e.ctrlKey) return;
  const kind = wheelKind(e);
  if (V.walk) {
    if (kind === "pad") look(e.deltaX * 0.003, e.deltaY * 0.003);
    else {
      const st = clamp(-e.deltaY * 0.004, -0.6, 0.6);
      CAM.pos.x += -Math.sin(CAM.yaw) * st;
      CAM.pos.z += -Math.cos(CAM.yaw) * st;
      applyCam();
    }
    return;
  }
  const now = performance.now();
  const fresh = now - PADQ.at > 280;
  PADQ.at = now;
  const k = UIP.padk || 1;
  if (kind === "pinch" || kind === "mouse") {
    if (fresh || !PADQ.zp || Math.hypot(e.clientX - PADQ.zx, e.clientY - PADQ.zy) > 12) {
      PADQ.zp = zoomTarget(e.clientX, e.clientY);
      PADQ.zx = e.clientX;
      PADQ.zy = e.clientY;
    }
    PADQ.z += kind === "pinch" ? -e.deltaY * 0.012 * k : -clamp(e.deltaY, -300, 300) * 0.0016;
  } else {
    if (fresh || !PADQ.pivot) {
      PADQ.pivot = padPivot();
      PADQ.depth = Math.max(0.5, PADQ.pivot.clone().sub(CAM.pos).dot(camF()));
    }
    const panMode = (UIP.pad2 === "pan") !== e.shiftKey;
    if (panMode) {
      PADQ.px -= e.deltaX * k;
      PADQ.py -= e.deltaY * k;
    } else {
      PADQ.ox += e.deltaX * 0.0045 * k;
      PADQ.oy += e.deltaY * 0.0045 * k;
    }
  }
  V.need = true;
}

function navInit() {
  const box = $("#nav3");
  if (!box) return;
  const stop = () => {
    NAV.act = "";
    box.querySelectorAll("[data-nav]").forEach(b => b.classList.remove("on"));
  };
  box.addEventListener("pointerdown", e => {
    const b = e.target.closest("[data-nav]");
    if (!b) return;
    e.preventDefault();
    if (b.dataset.nav === "home") {
      camPreset("iso");
      return;
    }
    IN.anim = null;
    padReset();
    NAV.pivot = padPivot();
    NAV.act = b.dataset.nav;
    b.classList.add("on");
    try {
      b.setPointerCapture(e.pointerId);
    } catch (err) {
      return;
    }
    V.need = true;
  });
  box.addEventListener("pointerup", stop);
  box.addEventListener("pointercancel", stop);
  box.addEventListener("lostpointercapture", stop);
}

function typingTarget(e) {
  const tag = (e.target && e.target.tagName || "").toLowerCase();
  return tag === "input" || tag === "select" || tag === "textarea";
}

function attach3D() {
  const cv = V.renderer.domElement;
  cv.setAttribute("tabindex", "0");
  cv.addEventListener("pointerenter", () => {
    IN.hover = true;
  });
  cv.addEventListener("pointerleave", () => {
    IN.hover = false;
    if (!IN.g) {
      if (tool && tool.t !== "room") clearGhost();
      if (GZ.hover) {
        GZ.hover = null;
        V.need = true;
      }
    }
  });
  cv.addEventListener("pointerdown", onDown3);
  cv.addEventListener("pointermove", onMove3);
  cv.addEventListener("pointerup", onUp3);
  cv.addEventListener("pointercancel", onUp3);
  cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("wheel", onWheel3, {passive: false});
  cv.addEventListener("dblclick", e => {
    if (V.walk || tool) return;
    const h = hitScene(e.clientX, e.clientY);
    if (h && h.pick) {
      if (toggleOpen(h.pick)) return;
      if (!sameSel(h.pick)) selectPick(h.pick, h.point);
      focusSel();
    }
  });
  cv.addEventListener("gesturestart", e => {
    e.preventDefault();
    IN.gs = e.scale || 1;
    IN.gsAt = performance.now();
  });
  cv.addEventListener("gesturechange", e => {
    e.preventDefault();
    const f = (e.scale || 1) / (IN.gs || 1);
    IN.gs = e.scale || 1;
    IN.gsAt = performance.now();
    if (!V.walk) dollyAt(e.clientX, e.clientY, f);
  });
  cv.addEventListener("gestureend", e => e.preventDefault());
  window.addEventListener("keydown", e => {
    if (typingTarget(e) || e.metaKey || e.ctrlKey) return;
    if (V.walk) {
      if (e.key === "Escape") {
        e.preventDefault();
        exitWalk();
        return;
      }
      if (e.code === "KeyE") {
        e.preventDefault();
        const r = V.renderer.domElement.getBoundingClientRect();
        const hw = hitScene(r.left + r.width / 2, r.top + r.height / 2);
        if (hw && hw.pick && hw.h.distance < 4.5) toggleOpen(hw.pick);
        return;
      }
      if (WALK.has(e.code)) {
        IN.keys.add(e.code);
        e.preventDefault();
        V.need = true;
      }
      return;
    }
    if (IN.hover && !sel && visible3D() && !IN.rmb && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
      e.preventDefault();
      IN.anim = null;
      const pv = padPivot();
      const st = e.shiftKey ? 0.2 : 0.07;
      if (e.code === "ArrowLeft") orbit(-st, 0, pv);
      else if (e.code === "ArrowRight") orbit(st, 0, pv);
      else if (e.code === "ArrowUp") orbit(0, -st * 0.7, pv);
      else orbit(0, st * 0.7, pv);
      return;
    }
    if ((IN.hover || IN.rmb) && visible3D() && (FLY.has(e.code) || ((e.code === "ShiftLeft" || e.code === "ShiftRight") && IN.keys.size))) {
      IN.keys.add(e.code);
      e.preventDefault();
      V.need = true;
    }
  });
  window.addEventListener("keyup", e => {
    IN.keys.delete(e.code);
  });
  window.addEventListener("blur", () => {
    IN.keys.clear();
  });
}
