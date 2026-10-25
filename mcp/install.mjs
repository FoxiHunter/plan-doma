import {readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const server = join(here, "server.mjs");
const say = s => console.log(s);

function configPath() {
  if (process.argv[2]) return process.argv[2];
  if (process.platform === "win32") return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  return join(homedir(), ".config", "Claude", "claude_desktop_config.json");
}

if (!existsSync(join(here, "..", "node_modules", "@modelcontextprotocol", "sdk")) || !existsSync(join(here, "..", "node_modules", "ws"))) {
  say("Сначала поставь пакеты: в папке plan-doma выполни npm install --omit=optional, потом запусти этот файл ещё раз.");
  process.exit(1);
}

const file = configPath();
let cfg = {};
if (existsSync(file)) {
  const raw = readFileSync(file, "utf8").replace(/^﻿/, "").trim();
  if (raw) {
    try {
      cfg = JSON.parse(raw);
    } catch (err) {
      say(`Файл настроек Claude Desktop испорчен, я его не трогаю: ${file}`);
      say("Открой его в Блокноте и исправь ошибку или удали файл, потом запусти этот файл ещё раз.");
      process.exit(1);
    }
  }
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
    say(`В файле настроек не объект JSON, я его не трогаю: ${file}`);
    process.exit(1);
  }
  copyFileSync(file, file + ".bak");
} else {
  mkdirSync(dirname(file), {recursive: true});
}

if (!cfg.mcpServers || typeof cfg.mcpServers !== "object" || Array.isArray(cfg.mcpServers)) cfg.mcpServers = {};
const was = !!cfg.mcpServers["plan-doma"];
cfg.mcpServers["plan-doma"] = {command: process.execPath, args: [server]};
writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");

say(was ? "Обновил сервер plan-doma в настройках Claude Desktop." : "Добавил сервер plan-doma в настройки Claude Desktop.");
say(`Файл настроек: ${file}`);
if (existsSync(file + ".bak")) say(`Старая копия: ${file}.bak`);
say(`Node: ${process.execPath}`);
say(`Сервер: ${server}`);
say("Теперь закрой Claude Desktop полностью и открой заново. Если у часов остался значок Claude, закрой и его. Потом напиши Claude «открой план».");
