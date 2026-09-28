import {readFileSync, writeFileSync, mkdirSync, existsSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const html = readFileSync(join(src, "index.html"), "utf8");

function bundle(web) {
  return html.replace(/<script src="([^"]+)"( data-local)?><\/script>\n?/g, (m, file, local) => {
    if (local && (web || !existsSync(join(src, file)))) return "";
    const code = readFileSync(join(src, file), "utf8");
    if (code.includes("</script")) throw new Error(`${file} содержит </script и сломает сборку`);
    return `<script>\n${code}\n</script>\n`;
  }).replace("<!--web-->\n", web ? "<script>window.PLAN_WEB = true;</script>\n" : "");
}

const local = bundle(false);
mkdirSync(join(root, "dist"), {recursive: true});
writeFileSync(join(root, "dist", "plan-doma.html"), local);
console.log(`dist/plan-doma.html собран, ${Math.round(local.length / 1024)} КБ${existsSync(join(src, "app", "presets.local.js")) ? ", с моими шаблонами" : ""}`);
const web = bundle(true);
mkdirSync(join(root, "site"), {recursive: true});
writeFileSync(join(root, "site", "index.html"), web);
writeFileSync(join(root, "site", ".nojekyll"), "");
console.log(`site/index.html собран для GitHub Pages, ${Math.round(web.length / 1024)} КБ`);
