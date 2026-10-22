// Records og/og.mp4 and og/og.jpg from og/index.html with headless Chrome on a virtual clock.
// Needs the preview server on :4317 and ffmpeg.  `node og/record.mjs`
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAMES = join(HERE, "frames");
const FPS = 30, SECONDS = 9, SCALE = 2;
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const encodeOnly = process.argv.includes("--encode");
if (!encodeOnly) {
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "og-"))}`, "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map(), waiters = [];
ws.addEventListener("message", ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg.error); pending.delete(msg.id); }
  if (msg.method) waiters.filter((w) => w.method === msg.method).forEach((w) => { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg.params); });
});
const send = (method, params = {}) => new Promise((resolve) => { pending.set(++id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }));

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: SCALE, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: "http://localhost:4317/og/" });
await loaded;
await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
await sleep(2200); // let the exchange get busy before the clock is taken over

await send("Emulation.setVirtualTimePolicy", { policy: "pause" });
const total = FPS * SECONDS;
for (let f = 0; f < total; f++) {
  const expired = once("Emulation.virtualTimeBudgetExpired");
  await send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: 1000 / FPS });
  await expired;
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(FRAMES, `f${String(f).padStart(4, "0")}.png`), Buffer.from(data, "base64"));
  if (f % 30 === 0) process.stdout.write(`${f}/${total} `);
}
ws.close();
chrome.kill();
console.log("\nframes done");
}

// Seamless loop: frames 30..end, with the last second crossfading into frames 0..29.
const out = join(HERE, "og.mp4");
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error",
  "-framerate", String(FPS), "-start_number", "30", "-i", join(FRAMES, "f%04d.png"),
  "-framerate", String(FPS), "-start_number", "0", "-i", join(FRAMES, "f%04d.png"),
  "-filter_complex", `[0:v]scale=1200:630:flags=lanczos,format=yuv420p,setpts=PTS-STARTPTS,fps=${FPS}[a];[1:v]trim=end_frame=30,scale=1200:630:flags=lanczos,format=yuv420p,setpts=PTS-STARTPTS,fps=${FPS}[b];[a][b]xfade=transition=fade:duration=1:offset=${SECONDS - 2}[v]`,
  "-map", "[v]", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out,
]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(FRAMES, "f0150.png"), "-vf", "scale=1200:630:flags=lanczos", "-q:v", "2", join(HERE, "og.jpg")]);
console.log("wrote og.mp4 and og.jpg");
