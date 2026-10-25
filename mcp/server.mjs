import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {ListToolsRequestSchema, CallToolRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {WebSocketServer} from "ws";
import {createServer} from "node:http";
import {readFileSync, writeFileSync, statSync} from "node:fs";
import {dirname, join, normalize, sep, extname} from "node:path";
import {fileURLToPath} from "node:url";
import {randomBytes, timingSafeEqual} from "node:crypto";
import {spawn} from "node:child_process";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "src");
const defs = vm.runInNewContext(readFileSync(join(src, "app", "agenttools.js"), "utf8") + "\n;({AGENT_TOOLS, AGENT_VER, AGENT_HELP, AGENT_PORT})");
const TOOLS = JSON.parse(JSON.stringify(defs.AGENT_TOOLS));
const PORT = Number(process.env.PLAN_DOMA_PORT) || defs.AGENT_PORT;
const SITE = process.env.PLAN_DOMA_SITE || "https://foxihunter.github.io/plan-doma/";
const SITE_ORIGIN = new URL(SITE).origin;
const LONG = new Set(["export", "sun_info", "screenshot"]);
const TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml"};
const log = (...a) => console.error("[plan-doma]", ...a);
const TOKEN = loadToken();
const pend = new Map();
const waiters = [];
let page = null;
let seq = 0;
let listening = false;
let listenErr = "";

function loadToken() {
  if (process.env.PLAN_DOMA_TOKEN) return process.env.PLAN_DOMA_TOKEN;
  const file = join(here, ".token");
  try {
    const t = readFileSync(file, "utf8").trim();
    if (/^[A-Za-z0-9_-]{16,64}$/.test(t)) return t;
  } catch (err) {
    log("код подключения ещё не создан, создаю");
  }
  const t = randomBytes(18).toString("base64url");
  try {
    writeFileSync(file, t + "\n", {mode: 0o600});
  } catch (err) {
    log("не смог сохранить код в mcp/.token, он сменится при следующем запуске:", err.message);
  }
  return t;
}

function text(s) {
  return {content: [{type: "text", text: typeof s === "string" ? s : JSON.stringify(s, null, 1)}]};
}

function fail(s) {
  return Object.assign(text(s), {isError: true});
}

function sameToken(t) {
  if (typeof t !== "string") return false;
  const a = Buffer.from(t);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hostOk(h) {
  return h === `127.0.0.1:${PORT}` || h === `localhost:${PORT}`;
}

function originOk(o) {
  if (!o || o === "null" || o === SITE_ORIGIN) return true;
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
}

function localUrl() {
  return `http://127.0.0.1:${PORT}/`;
}

function hint() {
  if (!listening) return listenErr || "Сервер plan-doma ещё запускается, повтори через пару секунд";
  return `Вкладка плана не подключена. Вызови open_planner, он сам откроет план в браузере с кодом. Или попроси пользователя открыть план (${SITE} или ${localUrl()}), нажать кнопку Claude в верхней панели и вставить код ${TOKEN}, порт ${PORT}.`;
}

function serve(req, res) {
  if (!hostOk(req.headers.host) || req.method !== "GET") {
    res.writeHead(403).end();
    return;
  }
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, localUrl()).pathname);
  } catch (err) {
    res.writeHead(400).end();
    return;
  }
  if (rel === "/") rel = "/index.html";
  const file = normalize(join(src, rel));
  const type = TYPES[extname(file)];
  if (!file.startsWith(src + sep) || !type) {
    res.writeHead(404).end();
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error("dir");
    res.writeHead(200, {"Content-Type": type, "Cache-Control": "no-store"});
    res.end(readFileSync(file));
  } catch (err) {
    res.writeHead(404).end();
  }
}

const wss = new WebSocketServer({noServer: true, maxPayload: 64 * 1024 * 1024});

function upgrade(req, socket, head) {
  const path = (req.url || "").split("?")[0];
  if (path !== "/claude" || !hostOk(req.headers.host) || !originOk(req.headers.origin)) {
    log("отказал в подключении:", req.headers.origin || "без Origin", req.headers.host);
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
}

wss.on("connection", ws => {
  let ok = false;
  ws.alive = true;
  const timer = setTimeout(() => {
    if (!ok) ws.close(4003, "no hello");
  }, 20000);
  ws.on("pong", () => {
    ws.alive = true;
  });
  ws.on("message", raw => {
    let m;
    try {
      m = JSON.parse(String(raw));
    } catch (err) {
      return;
    }
    if (!m || typeof m !== "object") return;
    if (!ok) {
      if (m.type !== "hello" || !sameToken(m.token)) {
        ws.close(4001, "bad token");
        return;
      }
      if (m.ver !== defs.AGENT_VER) {
        ws.close(4002, "version");
        return;
      }
      ok = true;
      clearTimeout(timer);
      if (page && page !== ws) page.close(4000, "replaced");
      page = ws;
      ws.send(JSON.stringify({type: "welcome"}));
      log("вкладка подключилась:", m.web ? "сайт" : "локальная версия");
      waiters.splice(0).forEach(f => f());
      return;
    }
    if (m.type === "result" && pend.has(m.id)) {
      const p = pend.get(m.id);
      pend.delete(m.id);
      clearTimeout(p.timer);
      p.res(m.result && Array.isArray(m.result.content) ? m.result : fail("Вкладка вернула непонятный ответ"));
    }
  });
  ws.on("close", () => {
    clearTimeout(timer);
    for (const [id, p] of pend) {
      if (p.ws !== ws) continue;
      clearTimeout(p.timer);
      pend.delete(id);
      p.res(fail("Вкладка плана закрылась или перезагрузилась во время вызова"));
    }
    if (page === ws) {
      page = null;
      log("вкладка отключилась");
    }
  });
  ws.on("error", () => {});
});

setInterval(() => {
  if (!page) return;
  if (!page.alive) {
    page.terminate();
    return;
  }
  page.alive = false;
  page.ping();
}, 30000).unref();

function callPage(name, args) {
  return new Promise(res => {
    const id = ++seq;
    const ms = LONG.has(name) ? 170000 : 60000;
    const timer = setTimeout(() => {
      pend.delete(id);
      res(fail(`Вкладка не ответила за ${ms / 1000} с. Возможно, она свёрнута или занята рендером`));
    }, ms);
    pend.set(id, {res, timer, ws: page});
    page.send(JSON.stringify({type: "call", id, name, args}));
  });
}

function waitPage(ms) {
  if (page) return Promise.resolve(true);
  return new Promise(res => {
    const done = () => {
      clearTimeout(t);
      res(true);
    };
    const t = setTimeout(() => {
      const i = waiters.indexOf(done);
      if (i >= 0) waiters.splice(i, 1);
      res(false);
    }, ms);
    waiters.push(done);
  });
}

function openUrl(url) {
  const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const p = spawn(cmd, args, {detached: true, stdio: "ignore", windowsHide: true});
  p.on("error", e => log("браузер не открылся:", e.message));
  p.unref();
}

async function openPlanner(a) {
  if (!listening) return fail(hint());
  if (page && !a.again) return text("Вкладка плана уже подключена. Чтобы открыть ещё одну, вызови с again: true, тогда старая отключится");
  const base = a.where === "local" ? localUrl() : SITE;
  openUrl(`${base}#claude=${PORT}.${TOKEN}`);
  if (await waitPage(25000)) return text(`План открыт в браузере (${base}) и подключён`);
  return fail(`Браузер должен был открыть ${base}, но вкладка не подключилась за 25 секунд. Chrome может спросить разрешение «Приложения на устройстве» или «Доступ к локальной сети», его нужно разрешить. Можно открыть план вручную, нажать кнопку Claude в верхней панели и вставить код ${TOKEN}, порт ${PORT}. Если сайт не подключается, вызови open_planner с where: local, тогда план откроется прямо с этого сервера, там разрешение не нужно.`);
}

const LOCAL_TOOLS = [
  {
    name: "open_planner",
    description: "Открыть план в браузере пользователя и подключить вкладку. site открывает сайт на GitHub Pages, local открывает план с этого сервера по адресу 127.0.0.1, у них разные сохранения в браузере. Вызывай, когда остальные инструменты отвечают, что вкладка не подключена.",
    inputSchema: {type: "object", properties: {where: {type: "string", enum: ["site", "local"], description: "По умолчанию site"}, again: {type: "boolean", description: "Открыть новую вкладку, даже если одна уже подключена"}}}
  },
  {
    name: "planner_status",
    description: "Подключена ли вкладка плана, порт, адреса и код подключения для кнопки Claude в верхней панели.",
    inputSchema: {type: "object", properties: {}}
  }
];

const server = new Server({name: "plan-doma", version: String(defs.AGENT_VER)}, {capabilities: {tools: {}}, instructions: defs.AGENT_HELP});

server.setRequestHandler(ListToolsRequestSchema, async () => ({tools: LOCAL_TOOLS.concat(TOOLS)}));

server.setRequestHandler(CallToolRequestSchema, async req => {
  const name = req.params.name;
  const args = req.params.arguments && typeof req.params.arguments === "object" ? req.params.arguments : {};
  if (name === "open_planner") return openPlanner(args);
  if (name === "planner_status") return text({connected: !!page, listening, port: PORT, site: SITE, local: localUrl(), code: TOKEN, problem: listening ? null : hint()});
  if (!TOOLS.some(t => t.name === name)) return fail("Нет такого инструмента: " + name);
  if (!page) return fail(hint());
  return callPage(name, args);
});

const http = createServer(serve);
http.on("upgrade", upgrade);
http.on("error", e => {
  listenErr = e.code === "EADDRINUSE" ? `Порт ${PORT} занят. Скорее всего, сервер plan-doma уже запущен в другом приложении, например во втором окне Claude. Закрой лишнее или задай другой порт через переменную PLAN_DOMA_PORT` : "Сервер не запустился: " + e.message;
  log(listenErr);
});
http.listen(PORT, "127.0.0.1", () => {
  listening = true;
  log(`жду вкладку плана на 127.0.0.1:${PORT}`);
});

const transport = new StdioServerTransport();
server.onclose = () => process.exit(0);
process.stdin.on("end", () => process.exit(0));
await server.connect(transport);
