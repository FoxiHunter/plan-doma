"use strict";
const VID = {on: false, W: 1280, H: 720, fps: 30};

function videoMime() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  for (const t of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

function videoPlan(kind) {
  if (kind === "day") {
    const dy = daySun(SKY.m, SKY.d);
    const t0 = dy.rise === null ? 0 : Math.max(0, dy.rise - 40);
    const t1 = dy.set === null ? 1440 : Math.min(1440, dy.set + 40);
    return {dur: 16, at: f => ({t: t0 + (t1 - t0) * f})};
  }
  const vp = viewPose("iso", VID.W / VID.H);
  const pitch = -0.42;
  const dist = vp.dist * 0.98;
  const c = vp.pivot.clone();
  return {
    dur: 14,
    at: f => {
      const yaw = vp.yaw + f * 2 * Math.PI;
      const pos = c.clone().addScaledVector(camF(null, yaw, pitch), -dist);
      if (pos.y < 0.4) pos.y = 0.4;
      return {pose: {pos, yaw, pitch, pivot: c, dist}};
    }
  };
}

async function recordVideo(kind) {
  if (!V.ok || HQ.running || VID.on) return;
  const mime = videoMime();
  const cv = V.renderer.domElement;
  if (!mime || !cv.captureStream) {
    setStatus("Этот браузер не умеет записывать видео, попробуй Chrome, Edge или Firefox");
    return;
  }
  if (V.walk) exitWalk();
  if (view === "2d") {
    view = "3d";
    applyView();
  }
  VID.on = true;
  HQ.running = true;
  HQ.cancel = false;
  const R = V.renderer;
  const prev = {hq: V.hq, t: SKY.t, pr: R.getPixelRatio(), path: SKY.pathG ? SKY.pathG.visible : false, pose: {pos: CAM.pos.clone(), yaw: CAM.yaw, pitch: CAM.pitch, pivot: CAM.pivot.clone(), dist: CAM.dist}};
  const plan = videoPlan(kind);
  V.busy = true;
  V.hq = true;
  build3D();
  GZ.root.visible = false;
  GZ.sroot.visible = false;
  GH.root.visible = false;
  if (SKY.pathG) SKY.pathG.visible = false;
  R.setPixelRatio(1);
  R.setSize(VID.W, VID.H, false);
  V.camera.aspect = VID.W / VID.H;
  V.camera.updateProjectionMatrix();
  const chunks = [];
  let rec = null;
  let ok = true;
  try {
    rec = new MediaRecorder(cv.captureStream(VID.fps), {mimeType: mime, videoBitsPerSecond: 10000000});
  } catch (err) {
    ok = false;
  }
  if (ok) {
    const done = new Promise(res => {
      rec.onstop = res;
    });
    rec.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    busy(true, kind === "day" ? "Пишу видео дня от рассвета до заката…" : "Пишу видео облёта дома…", 0);
    const step = f => {
      const s = plan.at(f);
      if (s.pose) setPose(s.pose);
      if (s.t !== undefined) {
        SKY.t = s.t;
        applySky();
      }
    };
    step(0);
    R.render(V.scene, V.camera);
    rec.start(1000);
    const start = performance.now();
    let last = start;
    for (;;) {
      await new Promise(res => requestAnimationFrame(res));
      const now = performance.now();
      const f = Math.min(1, (now - start) / 1000 / plan.dur);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(f);
      skyTick(dt);
      animTick(dt);
      if (V.rebuild) {
        V.rebuild = false;
        build3D();
      }
      if (V.sky) V.sky.position.copy(V.camera.position);
      R.render(V.scene, V.camera);
      busy(true, undefined, f);
      if (f >= 1 || HQ.cancel) break;
    }
    rec.stop();
    await done;
  }
  R.setPixelRatio(prev.pr);
  V.hq = prev.hq;
  GH.root.visible = true;
  if (SKY.pathG) SKY.pathG.visible = prev.path;
  if (kind === "day") {
    SKY.t = prev.t;
    applySky();
  } else setPose(prev.pose);
  V.busy = false;
  VID.on = false;
  HQ.running = false;
  size3D();
  schedule3D();
  busy(false);
  if (!ok) setStatus("Видео не записалось, браузер не дал записать холст");
  else if (HQ.cancel) setStatus("Запись видео отменена");
  else if (chunks.length) {
    download(new Blob(chunks, {type: mime.split(";")[0]}), `${kind === "day" ? "den" : "oblet"}-${stamp()}.${mime.indexOf("mp4") >= 0 ? "mp4" : "webm"}`);
    setStatus("Видео сохранено");
  }
}
