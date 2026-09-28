const {JSDOM} = require("jsdom");
const fs = require("fs");
const path = require("path");
const {PNG} = require("pngjs");

const W = 1200;
const H = 800;
const raw = require("gl")(W, H, {preserveDrawingBuffer: true, antialias: true});
if (!raw) {
  console.log("WebGL-контекст не создался. На Linux запускай через xvfb-run.");
  process.exit(1);
}
Object.defineProperty(raw, "canvas", {value: {width: W, height: H, style: {}}});
const conv = x => (x && typeof x === "object" && x.buffer && x.BYTES_PER_ELEMENT && !(x instanceof globalThis[x.constructor.name]) ? new globalThis[x.constructor.name](x) : x);
const gl = new Proxy(raw, {
  get(t, p) {
    const v = t[p];
    if (typeof v !== "function") return v;
    return (...a) => v.apply(t, a.map(conv));
  }
});
const html = fs.readFileSync(path.join(__dirname, "..", "dist", "plan-doma.html"), "utf8");
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/",
  beforeParse(w) {
    w.ResizeObserver = class {
      observe() {}
    };
    w.HTMLCanvasElement.prototype.getContext = t => (t === "webgl" || t === "experimental-webgl" ? gl : null);
  }
});
const outDir = path.join(__dirname, "..", "renders");
fs.mkdirSync(outDir, {recursive: true});

function shot(name) {
  const px = new Uint8Array(W * H * 4);
  raw.readPixels(0, 0, W, H, raw.RGBA, raw.UNSIGNED_BYTE, px);
  const png = new PNG({width: W, height: H});
  for (let y = 0; y < H; y++) png.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

setTimeout(() => {
  const run = c => dom.window.eval(c);
  if (!run("V.ok")) {
    console.log("three.js не поднял рендер");
    process.exit(1);
  }
  run(`V.renderer.setSize(${W}, ${H}, false); V.camera.aspect = ${W / H}; V.camera.updateProjectionMatrix();`);
  const shots = [["example", "iso", "noroof"], ["example", "street", "roof"], ["example", "top", "noroof"], ["example", "iso", "cut"], ["furnished", "iso", "noroof"], ["furnished", "street", "roof"]];
  const presets = {example: "presetExample()", furnished: "presetExampleFurnished()"};
  for (const [preset, cam, mode] of shots) {
    run(`S = ${presets[preset]}; sel = null; V.mode = "${mode}"; build3D(); camPreset("${cam}", true); render3D();`);
    shot(`${preset}-${cam}-${mode}.png`);
  }
  console.log("Картинки лежат в renders/");
  process.exit(0);
}, 800);
