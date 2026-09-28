"use strict";
const LTPL = {
  day: {n: "День", d: "Ясно, солнце чуть до полудня, тени мягче полуденных", sw: "linear-gradient(135deg, #8fd0ff, #fff4c9)", w: "clear", lamp: "auto"},
  gold: {n: "Золотой час", d: "Низкое тёплое солнце за 45 минут до заката", sw: "linear-gradient(135deg, #f59e0b, #fbd9a4)", w: "clear", lamp: "auto"},
  dusk: {n: "Вечер с лампами", d: "Синие сумерки, в доме и на участке горит свет", sw: "linear-gradient(135deg, #2b3766, #f4a35a)", w: "clear", lamp: "on"},
  night: {n: "Ночь с лампами", d: "Тёмное небо, светят только лампы", sw: "linear-gradient(135deg, #0b1024, #3b416f)", w: "clear", lamp: "on"},
  bright: {n: "Светлый интерьер", d: "Для рендеров комнат: рассеянный свет, лампы горят, экспозиция выше. Держится, пока не выберешь другой шаблон", sw: "linear-gradient(135deg, #ffffff, #e8e1d4)", w: "cloudy", lamp: "on"}
};

function ltplTime(key) {
  const dy = daySun(SKY.m, SKY.d);
  if (dy.top < 1) return key === "night" ? 1380 : dy.noon;
  const rise = dy.rise === null ? 0 : dy.rise;
  const set = dy.set === null ? 1439 : dy.set;
  if (key === "day") return clamp(dy.noon - 100, rise + 60, 1439);
  if (key === "gold") return clamp(set - 45, rise, 1439);
  if (key === "dusk") return clamp(set + 25, 0, 1439);
  if (key === "night") return clamp(set + 150, 0, 1439);
  return dy.noon;
}

function ltplBright() {
  return UIP.lt === "bright";
}

function inAmbK() {
  const roof = V.mode === "roof";
  if (ltplBright()) return roof ? 0.62 : 1;
  return roof ? 0.3 : 0.8;
}

function ltplApply(key) {
  if (!has(LTPL, key)) return;
  const L = LTPL[key];
  const off = key === "bright" && ltplBright();
  UIP.lt = key === "bright" && !off ? "bright" : "";
  SKY.play = false;
  if (!off) skySet({t: ltplTime(key), weather: L.w});
  setLampMode(off ? "auto" : L.lamp);
  applySky(true);
  schedule3D();
  saveUI();
  ltplUI();
  setStatus(off ? "Светлый интерьер выключен" : "Шаблон света «" + L.n + "»");
}

function ltplUI() {
  const b = $("#sktpl");
  const box = $("#tplpop");
  if (b) b.setAttribute("aria-pressed", String(ltplBright() || !!(box && !box.hidden)));
  const list = $("#tpls");
  if (list) list.innerHTML = Object.entries(LTPL).map(([key, v]) => `<button type="button" class="tpl" data-tpl="${key}" aria-pressed="${key === "bright" && ltplBright()}"><i style="background: ${v.sw}"></i><b>${v.n}</b><small>${v.d}</small></button>`).join("");
}

function ltplInit() {
  const b = $("#sktpl");
  const box = $("#tplpop");
  if (!b || !box) return;
  b.addEventListener("click", () => {
    box.hidden = !box.hidden;
    const wx = $("#wxpop");
    if (!box.hidden && wx && !wx.hidden) {
      wx.hidden = true;
      const wb = $("#skwx");
      if (wb) wb.setAttribute("aria-pressed", "false");
    }
    ltplUI();
  });
  box.addEventListener("click", e => {
    if (e.target.closest("[data-tp='close']")) {
      box.hidden = true;
      ltplUI();
      return;
    }
    const t = e.target.closest("[data-tpl]");
    if (t) ltplApply(t.dataset.tpl);
  });
  ltplUI();
}
