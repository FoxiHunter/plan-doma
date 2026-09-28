"use strict";
(function start() {
  try {
    const ui = JSON.parse(localStorage.getItem(LS_UI) || "null");
    if (ui) {
      if (["2d", "split", "3d"].includes(ui.view)) view = ui.view;
      if (["roof", "noroof", "cut"].includes(ui.mode)) V.mode = ui.mode;
      if (typeof ui.labels === "boolean") V.labels = ui.labels;
      if (typeof ui.fence === "boolean") V.fence = ui.fence;
      if (ui.cut && ["top", "front", "back", "left", "right"].includes(ui.cut.side)) V.cut = {side: ui.cut.side, t: clamp(Number(ui.cut.t) || 0.43, 0, 1)};
      if (["auto", "mouse", "pad"].includes(ui.wheel)) UIP.wheel = ui.wheel;
      if (["props", "cat", "proj"].includes(ui.ptab)) UIP.ptab = ui.ptab;
      if (["move", "rotate", "scale"].includes(ui.gmode)) gmode = ui.gmode;
      if (Array.isArray(ui.recent)) UIP.recent = ui.recent.filter(c => typeof c === "string" && /^#[0-9a-f]{6}$/.test(c)).slice(0, 12);
      if (typeof ui.sunbar === "boolean") V.sunbar = ui.sunbar;
      if (has(QUALITY, ui.q)) {
        RF.q = ui.q;
        RF.max = QUALITY[ui.q][1];
      }
      if (has(LAMP_MODES, ui.lights)) LAMP.mode = ui.lights;
      if (["auto", "light", "dark"].includes(ui.theme)) UIP.theme = ui.theme;
      if (["orbit", "pan"].includes(ui.pad2)) UIP.pad2 = ui.pad2;
      if ([0.5, 0.75, 1, 1.5, 2].includes(ui.padk)) UIP.padk = ui.padk;
      if (typeof ui.side === "boolean" && window.innerWidth > 1000) UIP.side = ui.side;
      if (ui.sky && typeof ui.sky === "object") {
        const k = ui.sky;
        if (k.m >= 1 && k.m <= 12) SKY.m = Math.round(k.m);
        if (k.d >= 1 && k.d <= 31) SKY.d = Math.round(k.d);
        if (k.t >= 0 && k.t < 1440) SKY.t = k.t;
        if (has(WEATHER, k.weather)) SKY.weather = k.weather;
        SKY.path = !!k.path;
        if (has(WX_SPEEDS, String(k.speed))) SKY.speed = k.speed;
      }
      if (ui.wx && typeof ui.wx === "object") {
        const w = ui.wx;
        const f = (v, a, b) => (typeof v === "number" && isFinite(v) ? clamp(v, a, b) : a);
        Object.assign(WX, {snow: f(w.snow, 0, 1), wet: f(w.wet, 0, 1), pud: f(w.pud, 0, 1), wind: f(w.wind, 0, 30), windDir: f(w.dir, 0, 359)});
      }
    } else if (window.innerWidth < 1000) {
      view = "2d";
    }
  } catch (err) {
    view = window.innerWidth < 1000 ? "2d" : "split";
  }
  $("#views").className = "views v-" + view;
  applyTheme();
  setSide(UIP.side, true);
  const pl = $("#presets");
  if (pl) pl.innerHTML = Object.entries(PRESETS).map(([key, v]) => `<button type="button" data-m="preset:${key}">${esc(v[0])}<small></small></button>`).join("");
  const had = loadLocal();
  if (!had) S = WEB ? presetBlank() : PRESETS[PRESET_START][1]();
  lastJSON = JSON.stringify(S);
  setStatus(had ? "План загружен из браузера" : "Автосохранение включено");
  sync3DButtons();
  skyUIInit();
  init3D();
  renderAll();
  camPreset(had || !WEB ? "iso" : "plot", true);
  if (WEB && !had) wizOpen();
})();
