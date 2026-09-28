"use strict";
const PANO = {W: 4096, face: 1024, samples: 24, canvas: null, view: null};

function panoFaces() {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  return [[V3(1, 0, 0), V3(0, 1, 0)], [V3(-1, 0, 0), V3(0, 1, 0)], [V3(0, 0, 1), V3(0, 1, 0)], [V3(0, 0, -1), V3(0, 1, 0)], [V3(0, 1, 0), V3(0, 0, -1)], [V3(0, -1, 0), V3(0, 0, 1)]].map(([f, u]) => {
    const r = f.clone().cross(u);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, f.clone().negate()));
    return {f, u, r, q};
  });
}

function panoDir(yaw, lon, lat, o) {
  const cl = Math.cos(lat);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const c = Math.cos(lon);
  const s = Math.sin(lon);
  return o.set((fx * c + rx * s) * cl, Math.sin(lat), (fz * c + rz * s) * cl);
}

function panoStitch(faces, imgs, S, W, yaw, od) {
  const H = W / 2;
  const d = new THREE.Vector3();
  for (let j = 0; j < H; j++) {
    const lat = Math.PI / 2 - (j + 0.5) / H * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = (i + 0.5) / W * 2 * Math.PI - Math.PI;
      panoDir(yaw, lon, lat, d);
      let k = 0;
      let best = -2;
      for (let n = 0; n < 6; n++) {
        const v = d.dot(faces[n].f);
        if (v > best) {
          best = v;
          k = n;
        }
      }
      const F = faces[k];
      const x = d.dot(F.r) / best;
      const y = d.dot(F.u) / best;
      const px = clamp((x + 1) / 2 * S - 0.5, 0, S - 1);
      const py = clamp((1 - y) / 2 * S - 0.5, 0, S - 1);
      const x0 = Math.floor(px);
      const y0 = Math.floor(py);
      const x1 = Math.min(S - 1, x0 + 1);
      const y1 = Math.min(S - 1, y0 + 1);
      const tx = px - x0;
      const ty = py - y0;
      const src = imgs[k];
      const o = (j * W + i) * 4;
      for (let c = 0; c < 3; c++) {
        const a = src[(y0 * S + x0) * 4 + c] * (1 - tx) + src[(y0 * S + x1) * 4 + c] * tx;
        const b = src[(y1 * S + x0) * 4 + c] * (1 - tx) + src[(y1 * S + x1) * 4 + c] * tx;
        od[o + c] = a * (1 - ty) + b * ty;
      }
      od[o + 3] = 255;
    }
  }
  return od;
}

function panoXMP(blob, W, H) {
  const xmp = `http://ns.adobe.com/xap/1.0/\u0000<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"><GPano:ProjectionType>equirectangular</GPano:ProjectionType><GPano:UsePanoramaViewer>True</GPano:UsePanoramaViewer><GPano:FullPanoWidthPixels>${W}</GPano:FullPanoWidthPixels><GPano:FullPanoHeightPixels>${H}</GPano:FullPanoHeightPixels><GPano:CroppedAreaImageWidthPixels>${W}</GPano:CroppedAreaImageWidthPixels><GPano:CroppedAreaImageHeightPixels>${H}</GPano:CroppedAreaImageHeightPixels><GPano:CroppedAreaLeftPixels>0</GPano:CroppedAreaLeftPixels><GPano:CroppedAreaTopPixels>0</GPano:CroppedAreaTopPixels></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  return blob.arrayBuffer().then(buf => {
    const u8 = new Uint8Array(buf);
    const data = new TextEncoder().encode(xmp);
    let at = 2;
    if (u8[2] === 0xff && u8[3] === 0xe0) at = 4 + (u8[4] << 8 | u8[5]);
    const len = data.length + 2;
    const seg = new Uint8Array(4 + data.length);
    seg.set([0xff, 0xe1, len >> 8, len & 255]);
    seg.set(data, 4);
    return new Blob([u8.slice(0, at), seg, u8.slice(at)], {type: "image/jpeg"});
  });
}

async function panoRender() {
  if (!V.ok || HQ.running) return;
  HQ.running = true;
  const S0 = PANO.face;
  const faces = panoFaces();
  const pos = V.camera.position.clone();
  const yaw = CAM.yaw;
  const imgs = [];
  busy(true, "Считаю панораму 360°…", 0);
  await nextFrame();
  let ok = true;
  for (let n = 0; n < 6; n++) {
    if (HQ.cancel && n) {
      ok = false;
      break;
    }
    const c = await renderHQ({w: S0, h: S0, samples: PANO.samples, fov: 90, near: 0.05, pose: {pos, yaw: 0, pitch: 0}, quat: faces[n].q}, p => busy(true, `Считаю панораму 360°, сторона ${n + 1} из 6`, (n + p) / 6.2));
    if (!c || HQ.cancel) {
      ok = false;
      break;
    }
    imgs.push(c.getContext("2d").getImageData(0, 0, S0, S0).data);
  }
  if (ok) {
    busy(true, "Склеиваю панораму…", 0.98);
    await nextFrame();
    const W = PANO.W;
    const img = new ImageData(W, W / 2);
    panoStitch(faces, imgs, S0, W, yaw, img.data);
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = W / 2;
    cv.getContext("2d").putImageData(img, 0, 0);
    PANO.canvas = cv;
  }
  busy(false);
  HQ.running = false;
  if (!ok) {
    setStatus(HQ.cancel ? "Панорама отменена" : "Панорама не получилась, видеокарта не дала такой размер");
    return;
  }
  panoOpen();
  setStatus("Панорама готова");
}

async function panoSave() {
  const cv = PANO.canvas;
  if (!cv) return;
  const b = await canvasBlob(cv, "image/jpeg", 0.92);
  download(await panoXMP(b, cv.width, cv.height), `panorama-${stamp()}.jpg`);
}

function panoOpen() {
  const box = $("#panov");
  if (!box || !PANO.canvas) return;
  box.hidden = false;
  const cv = $("#panocv");
  const R = new THREE.WebGLRenderer({canvas: cv, antialias: true});
  R.outputEncoding = THREE.sRGBEncoding;
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  const tex = new THREE.CanvasTexture(PANO.canvas);
  tex.encoding = THREE.sRGBEncoding;
  const geo = new THREE.SphereGeometry(20, 96, 48);
  geo.scale(-1, 1, 1);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map: tex}));
  scene.add(mesh);
  const P = {R, scene, cam, tex, geo, mesh, yaw: Math.PI / 2, pitch: 0, drag: null, raf: 0};
  PANO.view = P;
  const draw = () => {
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (w && h && (cv.width !== Math.round(w * R.getPixelRatio()) || cv.height !== Math.round(h * R.getPixelRatio()))) {
      R.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    const f = camF(null, P.yaw, P.pitch);
    cam.lookAt(f.x, f.y, f.z);
    R.render(scene, cam);
    P.raf = requestAnimationFrame(draw);
  };
  draw();
}

function panoClose() {
  const P = PANO.view;
  if (P) {
    cancelAnimationFrame(P.raf);
    P.geo.dispose();
    P.mesh.material.dispose();
    P.tex.dispose();
    P.R.dispose();
    if (P.R.forceContextLoss) P.R.forceContextLoss();
    PANO.view = null;
  }
  const box = $("#panov");
  if (box) box.hidden = true;
}

function panoInit() {
  const box = $("#panov");
  const cv = $("#panocv");
  if (!box || !cv) return;
  box.addEventListener("click", e => {
    const a = e.target.closest("[data-pv]");
    if (!a) return;
    if (a.dataset.pv === "close") panoClose();
    else if (a.dataset.pv === "save") panoSave();
  });
  cv.addEventListener("pointerdown", e => {
    const P = PANO.view;
    if (!P) return;
    P.drag = {x: e.clientX, y: e.clientY};
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", e => {
    const P = PANO.view;
    if (!P || !P.drag) return;
    const k = P.cam.fov / 75 * 0.0045;
    P.yaw += (e.clientX - P.drag.x) * k;
    P.pitch = clamp(P.pitch + (e.clientY - P.drag.y) * k, -1.5, 1.5);
    P.drag = {x: e.clientX, y: e.clientY};
  });
  cv.addEventListener("pointerup", () => {
    if (PANO.view) PANO.view.drag = null;
  });
  cv.addEventListener("wheel", e => {
    const P = PANO.view;
    if (!P) return;
    e.preventDefault();
    P.cam.fov = clamp(P.cam.fov * Math.exp(e.deltaY * 0.001), 30, 100);
    P.cam.updateProjectionMatrix();
  }, {passive: false});
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && PANO.view) panoClose();
  });
}
