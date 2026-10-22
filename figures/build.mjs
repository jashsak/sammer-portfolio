// Builds the anatomy figures and injects them into ../index.html between
// <!--fig:NAME--> and <!--/fig:NAME--> markers.  `node figures/build.mjs [--audit]`
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const names = (only ? only.split(",") : ["hero", "gateway", "fleet"]);

// The kit's functions as plain globals for the live scripts.
writeFileSync(join(HERE, "kit-runtime.js"), "// generated from figures/kit/iso-kit.mjs\n" + readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, ""));

let html = readFileSync(join(ROOT, "index.html"), "utf8");
for (const name of names) {
  let mod;
  try {
    mod = await import(`./${name}.mjs`);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && !only) continue;
    throw error;
  }
  const fragment = `${mod.SVG}<script type="application/json" data-fig-data="${name}">${JSON.stringify(mod.DATA)}</script>`;
  const re = new RegExp(`(<!--fig:${name}-->)[\\s\\S]*?(<!--/fig:${name}-->)`);
  if (!re.test(html)) throw new Error(`no markers for ${name} in index.html`);
  html = html.replace(re, `$1${fragment}$2`);
  mkdirSync(join(HERE, "out"), { recursive: true });
  writeFileSync(join(HERE, "out", `${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../kit/iso.css"><link rel="stylesheet" href="../../styles.css"><style>body{padding:40px}.fig{max-width:1100px;margin:auto}</style></head><body><div class="iso fig fig-${name}" data-theme="light">${fragment}</div><p class="mono" data-readout="${name}"></p><script src="../kit-runtime.js"></script><script src="../live.js"></script></body></html>`);
  console.log(name, `${(fragment.length / 1024).toFixed(0)} KB`, mod.STATS);
  if (process.argv.includes("--audit")) mod.audit();
}
writeFileSync(join(ROOT, "index.html"), html);

// The Open Graph card reuses the hero figure.
const ogPath = join(ROOT, "og", "index.html");
try {
  let og = readFileSync(ogPath, "utf8");
  const hero = html.match(/<!--fig:hero-->[\s\S]*?<!--\/fig:hero-->/);
  if (hero) writeFileSync(ogPath, og.replace(/<!--fig:hero-->[\s\S]*?<!--\/fig:hero-->/, hero[0]));
} catch {}
