"use strict";
const WZ = {el: null};

function wizBuild() {
  if (WZ.el) return WZ.el;
  const el = document.createElement("div");
  el.className = "modal";
  el.id = "wiz";
  el.hidden = true;
  const cities = CITIES.map(([n]) => `<option${n === "Москва" ? " selected" : ""}>${n}</option>`).join("");
  el.innerHTML = `<div class="card2 wiz" role="dialog" aria-labelledby="wz-t">` +
    `<h2 id="wz-t">Новый участок</h2>` +
    `<p class="hint">Всё это потом меняется на вкладке «Проект». Улица на плане всегда снизу.</p>` +
    `<div class="row"><label class="f">Ширина вдоль улицы, м<input type="number" id="wz-w" value="28.3" step="0.1" min="5" max="300"></label><label class="f">Глубина от улицы, м<input type="number" id="wz-d" value="28.3" step="0.1" min="5" max="300"></label></div>` +
    `<div class="row3"><label class="f">Отступ от улицы, м<input type="number" id="wz-s" value="5" step="0.5" min="0"></label><label class="f">От соседей, м<input type="number" id="wz-side" value="3" step="0.5" min="0"></label><label class="f">Сзади, м<input type="number" id="wz-b" value="3" step="0.5" min="0"></label></div>` +
    `<div class="row"><label class="f">Город рядом<select id="wz-city"><option value="">Свои координаты</option>${cities}</select></label><label class="f">Улица со стороны<select id="wz-n"><option value="0">юга</option><option value="90">востока</option><option value="180">севера</option><option value="270">запада</option></select></label></div>` +
    `<div class="row" id="wz-ll" hidden><label class="f">Широта, °<input type="number" id="wz-lat" value="55.75" step="0.01"></label><label class="f">Долгота, °<input type="number" id="wz-lon" value="37.62" step="0.01"></label></div>` +
    `<div class="row" id="wz-tzr" hidden><label class="f">Часовой пояс, UTC+<input type="number" id="wz-tz" value="3" step="1"></label><span></span></div>` +
    `<p class="hint">Координаты нужны, чтобы солнце и тени шли как на настоящем участке. Их можно взять в любой онлайн-карте.</p>` +
    `<div class="btns end"><button type="button" class="btn" id="wz-no">Отмена</button><button type="button" class="btn primary" id="wz-ok">Создать участок</button></div></div>`;
  document.body.appendChild(el);
  WZ.el = el;
  const city = el.querySelector("#wz-city");
  city.addEventListener("change", () => {
    const own = !city.value;
    el.querySelector("#wz-ll").hidden = !own;
    el.querySelector("#wz-tzr").hidden = !own;
  });
  el.querySelector("#wz-no").addEventListener("click", () => wizClose());
  el.querySelector("#wz-ok").addEventListener("click", () => wizCreate());
  el.addEventListener("keydown", e => {
    if (e.key === "Escape") wizClose();
    if (e.key === "Enter" && e.target.tagName === "INPUT") wizCreate();
  });
  return el;
}

function wizOpen() {
  const el = wizBuild();
  el.hidden = false;
  setTimeout(() => el.querySelector("#wz-w").focus(), 30);
}

function wizClose() {
  if (WZ.el) WZ.el.hidden = true;
}

function wizCreate() {
  const el = WZ.el;
  const num = (id, def) => {
    const v = parseFloat(String(el.querySelector(id).value).replace(",", "."));
    return isFinite(v) ? v : def;
  };
  const plot = {
    w: clamp(r2(num("#wz-w", 28.3)), 5, 300),
    d: clamp(r2(num("#wz-d", 28.3)), 5, 300),
    street: clamp(r2(num("#wz-s", 5)), 0, 300),
    side: clamp(r2(num("#wz-side", 3)), 0, 300),
    back: clamp(r2(num("#wz-b", 3)), 0, 300)
  };
  const cv = el.querySelector("#wz-city").value;
  const c = CITIES.find(x => x[0] === cv);
  const site = c
    ? {lat: c[1], lon: c[2], tz: c[3], north: Number(el.querySelector("#wz-n").value) || 0, city: c[0]}
    : {lat: clamp(num("#wz-lat", 55.75), -89, 89), lon: clamp(num("#wz-lon", 37.62), -180, 180), tz: clamp(Math.round(num("#wz-tz", 3)), -12, 14), north: Number(el.querySelector("#wz-n").value) || 0, city: ""};
  S = sanitize(presetBlank(plot, site));
  sel = null;
  tab = "plot";
  setTool(null);
  V2.plot = {z: 1, ox: 0, oy: 0};
  V2.house = {z: 1, ox: 0, oy: 0};
  wizClose();
  changed();
  camPreset("plot");
  setStatus("Участок создан. Нарисуй комнаты на вкладке «Дом»");
}
