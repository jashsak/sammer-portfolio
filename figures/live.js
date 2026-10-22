// Live behaviour for the anatomy figures. Needs figures/kit-runtime.js (lineOnTop, iso…).
(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const SVGNS = "http://www.w3.org/2000/svg";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Theme: figures follow the page's colour scheme.
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const syncTheme = () => document.querySelectorAll(".iso").forEach((el) => el.setAttribute("data-theme", dark.matches && document.documentElement.dataset.theme !== "light" ? "dark" : "light"));
  syncTheme();
  dark.addEventListener("change", syncTheme);

  // A gate that only lets time pass while the figure is on screen.
  function visibility(el) {
    let visible = false;
    let waiters = [];
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) { waiters.forEach((r) => r()); waiters = []; }
    }, { rootMargin: "80px 0px" }).observe(el);
    const ready = () => (visible ? Promise.resolve() : new Promise((r) => waiters.push(r)));
    const frame = async () => { await ready(); return new Promise((r) => requestAnimationFrame(r)); };
    const sleep = async (ms) => { let left = ms; while (left > 0) { await ready(); const t = performance.now(); await wait(Math.min(left, 100)); left -= performance.now() - t; } };
    return { frame, sleep, ready };
  }

  // Points along a screen polyline, by arc length.
  function track(points) {
    const acc = [0];
    for (let i = 1; i < points.length; i++) acc.push(acc[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = acc[acc.length - 1];
    const at = (s) => {
      s = Math.max(0, Math.min(total, s));
      let i = 1;
      while (i < acc.length - 1 && acc[i] < s) i++;
      const t = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
      return [lerp(points[i - 1][0], points[i][0], t), lerp(points[i - 1][1], points[i][1], t)];
    };
    return { total, at };
  }

  const FIGS = {};

  FIGS.hero = (root, D) => {
    const svg = root.querySelector("svg");
    const layer = svg.querySelector('[data-part="capsules"]');
    const pointer = svg.querySelector('[data-part="pointer"]');
    const needle = svg.querySelector('[data-part="needle"]');
    const crt = svg.querySelector('[data-part="crt"]');
    const led = svg.querySelector('[data-led="run"]');
    const slots = [...svg.querySelectorAll(".fx-queued")];
    const readout = document.querySelector('[data-readout="hero"]');
    const gate = visibility(root);
    const P = D.P;
    const tracks = Object.fromEntries(Object.entries(D.routes).map(([id, pts]) => [id, track(pts)]));
    const apps = { ops: "ops-dashboard", uat: "uat-tracker", returns: "returns" };
    const tasks = { ops: ["weekly KPI report", "trial cohort digest"], uat: ["draft Jira bug", "summarize test run"], returns: ["summarize RMA", "flag carrier exception"] };
    const tools = { ops: "mixpanel.query", uat: "jira.create", returns: "salesforce.rma" };
    const models = ["sonnet", "sonnet", "haiku", "opus"];
    let jobId = 4816, done = 0, queue = [], auto = true;
    let angle = D.portAngles.worker, angleTarget = angle;
    let needleAt = 0, needleTarget = 0;

    const sayEl = readout && (readout.querySelector(".t-text-swap") || readout.appendChild(Object.assign(document.createElement("span"), { className: "t-text-swap" })));
    let sayTimer = 0;
    const say = (text) => {
      if (!sayEl || sayEl.textContent === text) return;
      if (still.matches || !sayEl.textContent) { sayEl.textContent = text; return; }
      clearTimeout(sayTimer);
      sayEl.classList.add("is-exit");
      sayTimer = setTimeout(() => { sayEl.textContent = text; sayEl.classList.remove("is-exit"); sayEl.classList.add("is-enter-start"); void sayEl.offsetHeight; sayEl.classList.remove("is-enter-start"); }, 200);
    };
    const drawPointer = () => {
      const [x, y, z] = D.hub;
      pointer.setAttribute("d", lineOnTop([x, y], [x + Math.cos(angle) * 13, y + Math.sin(angle) * 13], z, P));
    };
    const drawNeedle = () => {
      const { x, y, z, r } = D.dial;
      const a = (needleAt / 100) * Math.PI * 2;
      needle.setAttribute("d", lineOnTop([x - Math.sin(a) * 3.4, y + Math.cos(a) * 3.4], [x + Math.sin(a) * (r - 4), y - Math.cos(a) * (r - 4)], z, P));
    };
    const drawSlots = () => slots.forEach((s, i) => s.classList.toggle("is-on", i < queue.length));

    // Pointer and needle ease toward their targets on one loop.
    let last = 0;
    (async function settle() {
      for (;;) {
        await gate.frame();
        const now = performance.now();
        const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
        last = now;
        let diff = Math.atan2(Math.sin(angleTarget - angle), Math.cos(angleTarget - angle));
        angle += diff * (1 - Math.exp(-dt / 0.12));
        needleAt += (needleTarget - needleAt) * (1 - Math.exp(-dt / 0.35));
        drawPointer();
        drawNeedle();
      }
    })();

    function capsule() {
      const g = document.createElementNS(SVGNS, "g");
      g.innerHTML = `<path class="fx-capsule" stroke-width="${D.capsule}"/><path class="fx-capsule-core" stroke-width="${(D.capsule * 0.28).toFixed(2)}"/>`;
      layer.appendChild(g);
      const [body, core] = g.children;
      const place = (tr, s) => {
        const a = tr.at(s - 4.5), b = tr.at(s + 4.5);
        const d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
        body.setAttribute("d", d);
        const c1 = tr.at(s - 2.5), c2 = tr.at(s + 0.5);
        core.setAttribute("d", `M${c1[0].toFixed(1)} ${c1[1].toFixed(1)}L${c2[0].toFixed(1)} ${c2[1].toFixed(1)}`);
      };
      const ride = async (id, reverse = false) => {
        const tr = tracks[id];
        const dur = Math.max(700, tr.total * 5.2);
        const t0 = performance.now();
        let paused = 0;
        for (;;) {
          const before = performance.now();
          await gate.frame();
          const gap = performance.now() - before;
          if (gap > 200) paused += gap;
          const t = Math.min(1, (performance.now() - t0 - paused) / dur);
          const s = ease(t) * tr.total;
          place(tr, reverse ? tr.total - s : s);
          if (t >= 1) break;
        }
      };
      return { ride, remove: () => g.remove(), hide: () => (g.style.opacity = "0"), show: () => (g.style.opacity = "") };
    }

    const lines = [];
    const print = (text, cls = "") => {
      lines.push({ text, cls });
      while (lines.length > 6) lines.shift();
      crt.innerHTML = lines.map((l, i) => `<text x="2.2" y="${4.6 + i * 4.3}" class="${l.cls}">${l.text}</text>`).join("");
    };
    print("worker-01 ready", "dim");
    print("poll · every 3s", "dim");

    async function submit(id) {
      const lamp = svg.querySelector(`[data-lamp="${id}"]`);
      lamp?.classList.add("is-on");
      const job = { id: jobId++, station: id, task: pick(tasks[id]), model: pick(models), cap: capsule() };
      say(`#${job.id} · ${apps[id]} submitted “${job.task}”`);
      angleTarget = D.portAngles[id];
      await job.cap.ride(id);
      job.cap.hide();
      lamp?.classList.remove("is-on");
      queue.push(job);
      drawSlots();
    }

    async function worker() {
      for (;;) {
        await gate.sleep(3000);
        led?.classList.add("is-on");
        await gate.sleep(160);
        led?.classList.remove("is-on");
        if (!queue.length) continue;
        const job = queue.shift();
        drawSlots();
        angleTarget = D.portAngles.worker;
        job.cap.show();
        say(`#${job.id} · claimed → ${job.model}`);
        await job.cap.ride("worker");
        job.cap.hide();
        led?.classList.add("is-on");
        const took = (1.2 + Math.random() * 2.6).toFixed(1);
        print(`<tspan class="app">${apps[job.station]}</tspan>`);
        print(job.task);
        await gate.sleep(420);
        print(`› claude · ${job.model}`, "dim");
        await gate.sleep(520);
        print(`› ${tools[job.station]} ✓`, "dim");
        await gate.sleep(620);
        print(`✓ done ${took}s`);
        led?.classList.remove("is-on");
        job.cap.show();
        await job.cap.ride("worker", true);
        angleTarget = D.portAngles[job.station];
        await job.cap.ride(job.station, true);
        job.cap.remove();
        done += 1;
        needleTarget = done;
        say(`#${job.id} · ${apps[job.station]} → ${job.model} · done in ${took}s`);
      }
    }

    // Stations near the pointer send a job on demand.
    const stationPts = Object.keys(apps).map((id) => ({ id, pt: D.routes[id][0] }));
    let lastAsk = 0;
    const nearest = (event) => {
      const box = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const x = ((event.clientX - box.left) / box.width) * vb.width;
      const y = ((event.clientY - box.top) / box.height) * vb.height;
      let best = null, dist = 46;
      stationPts.forEach((s) => { const d = Math.hypot(s.pt[0] - x, s.pt[1] + 18 - y); if (d < dist) { dist = d; best = s.id; } });
      return best;
    };
    svg.addEventListener("pointermove", (e) => {
      const id = nearest(e);
      svg.style.cursor = id ? "pointer" : "";
      if (id && performance.now() - lastAsk > 1400) { lastAsk = performance.now(); auto = false; submit(id); }
    });
    svg.addEventListener("pointerleave", () => (auto = true));

    drawPointer();
    drawNeedle();
    if (still.matches) {
      queue = [{}, {}];
      drawSlots();
      needleAt = needleTarget = 64;
      drawNeedle();
      print(`<tspan class="app">uat-tracker</tspan>`);
      print("draft Jira bug");
      print(`✓ done 2.4s`);
      say("50–100 jobs a day through one gateway");
      return;
    }

    worker();
    (async function tour() {
      const order = ["uat", "ops", "returns", "uat", "returns", "ops"];
      let i = 0;
      await gate.sleep(600);
      for (;;) {
        if (auto && queue.length < 3) submit(order[i++ % order.length]);
        await gate.sleep(2200 + Math.random() * 1600);
      }
    })();
  };


  FIGS.gateway = (root, D) => {
    const svg = root.querySelector("svg");
    const fig = root.closest(".case-visual") || root;
    const stack = svg.querySelector('[data-part="stack"]');
    const car = svg.querySelector('[data-part="carriage"]');
    const cap = svg.querySelector('[data-part="capsule"]');
    const table = svg.querySelector('[data-part="table"]');
    const pins = svg.querySelector('[data-part="pins"]');
    const barrier = svg.querySelector('[data-part="barrier"]');
    const steps = [...svg.querySelectorAll("[data-step]")];
    const tabs = [...fig.querySelectorAll("[data-stage]")];
    const caption = fig.querySelector(".step-caption .t-text-swap");
    const modelEl = fig.querySelector("[data-gw-model]");
    const pill = fig.querySelector(".seg-pill");
    const gate = visibility(root);
    const P = D.P, V = D.V;
    const statics = [...stack.children].filter((el) => el.dataset.key !== undefined);
    const dot = (p) => p[0] * V[0] + p[1] * V[1] + p[2] * V[2];
    const move = (el, [x, y, z]) => el.setAttribute("transform", translateAlong(P, [x, y, z]));
    const s = { x: D.dock, y: 0, capZ: 48, tableY: 0, pin: 0, bar: 0 };
    const CAPTIONS = [
      "An internal app adds the prompt as a pending job.",
      "Access is OAuth-scoped per app. Keys stay on the worker.",
      "The worker polls every 3s, claims it and picks a model.",
      "Claude CLI runs it, streaming tool progress live.",
      "Status flips to done and the app polls the answer.",
    ];
    const swap = (el, text) => {
      if (!el || el.textContent === text) return;
      if (still.matches || !el.textContent) { el.textContent = text; return; }
      el.classList.add("is-exit");
      setTimeout(() => { el.textContent = text; el.classList.remove("is-exit"); el.classList.add("is-enter-start"); void el.offsetHeight; el.classList.remove("is-enter-start"); }, 200);
    };
    const slot = (el, key) => {
      const next = statics.find((it) => +it.dataset.key > key);
      if (next) { if (el.nextElementSibling !== next) stack.insertBefore(el, next); } else if (stack.lastElementChild !== el) stack.appendChild(el);
    };
    const draw = () => {
      move(car, [s.x, s.y, 0]);
      move(cap, [0, 0, s.capZ]);
      move(table, [0, s.tableY, 0]);
      move(pins, [0, 0, -s.pin]);
      move(barrier, [0, 0, s.bar]);
      [[car, dot([s.x, s.y, D.carZ])], [barrier, dot([D.gate + 8.5, 0, 10.5 + s.bar])], [pins, dot([D.gate, 0, 24])]].sort((a, b) => a[1] - b[1]).forEach(([el, key]) => slot(el, key));
    };
    const tween = async (props, ms, my, curve = ease) => {
      const from = Object.fromEntries(Object.keys(props).map((k) => [k, s[k]]));
      const t0 = performance.now();
      let paused = 0;
      for (;;) {
        const before = performance.now();
        await gate.frame();
        if (my !== runId) return false;
        const gap = performance.now() - before;
        if (gap > 200) paused += gap;
        const t = still.matches ? 1 : Math.min(1, (performance.now() - t0 - paused) / ms);
        for (const k in props) s[k] = from[k] + (props[k] - from[k]) * curve(t);
        draw();
        if (t >= 1) return true;
      }
    };
    const pause = (ms, my) => gate.sleep(still.matches ? 0 : ms).then(() => my === runId);
    const movePill = () => {
      const a = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      if (!a || !pill) return;
      pill.style.width = `${a.offsetWidth}px`;
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    const stage = (i) => { tabs.forEach((t, k) => t.setAttribute("aria-selected", k === i)); movePill(); swap(caption, CAPTIONS[i]); swap(modelEl, D.models[lane]); };
    addEventListener("resize", movePill);
    requestAnimationFrame(movePill);
    const lampsOff = () => { steps.forEach((l) => l.classList.remove("is-on")); svg.querySelectorAll("[data-bay]").forEach((b) => b.classList.remove("is-on")); };
    const START = [
      { x: D.dock, y: 0, capZ: 48, tableY: 0, pin: 0, bar: 0 },
      { x: D.dock, y: 0, capZ: 0, tableY: 0, pin: 0, bar: 0 },
      { x: D.gate, y: 0, capZ: 0, tableY: 0, pin: 0, bar: 13 },
      null,
      null,
    ];
    let runId = 0, lane = 1;
    const fall = (t) => t * t;
    async function run(from = 0) {
      const my = ++runId;
      lampsOff();
      lane = from >= 3 ? lane : Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 0 : 2;
      const laneY = D.lanes[lane];
      if (START[from]) Object.assign(s, START[from]);
      if (from === 3) Object.assign(s, { x: D.table, y: laneY, capZ: 0, tableY: laneY, pin: 0, bar: 0 });
      if (from === 4) Object.assign(s, { x: D.bay, y: laneY, capZ: 0, tableY: laneY, pin: 0, bar: 0 });
      draw();
      for (let i = from; ; i = 0) {
        if (i <= 0) {
          stage(0);
          Object.assign(s, START[0]); draw();
          if (!(await pause(500, my))) return;
          if (!(await tween({ capZ: 0 }, 650, my, fall))) return;
          if (!(await pause(500, my))) return;
        }
        if (i <= 1) {
          stage(1);
          if (!(await tween({ x: D.gate }, 750, my))) return;
          if (!(await tween({ pin: 3 }, 220, my))) return;
          if (!(await pause(380, my))) return;
          if (!(await tween({ pin: 0 }, 220, my))) return;
          if (!(await tween({ bar: 13 }, 320, my))) return;
        }
        if (i <= 2) {
          stage(2);
          const y = D.lanes[i === 2 && from === 2 ? lane : lane];
          if (!(await tween({ x: D.table }, 650, my))) return;
          if (!(await tween({ bar: 0 }, 260, my))) return;
          if (!(await tween({ tableY: y, y }, 560, my))) return;
        }
        if (i <= 3) {
          stage(3);
          if (!(await tween({ x: D.bay }, 700, my))) return;
          svg.querySelector(`[data-bay="${D.models[lane]}"]`)?.classList.add("is-on");
          const calls = 3 + Math.floor(Math.random() * 4);
          for (let c = 0; c < calls; c++) { steps[c].classList.add("is-on"); if (!(await pause(360, my))) return; }
          if (!(await pause(500, my))) return;
        }
        stage(4);
        svg.querySelector(`[data-bay="${D.models[lane]}"]`)?.classList.remove("is-on");
        if (!(await tween({ x: D.table }, 650, my))) return;
        if (!(await tween({ tableY: 0, y: 0 }, 520, my))) return;
        if (!(await tween({ bar: 13 }, 260, my))) return;
        if (!(await tween({ x: D.dock }, 950, my))) return;
        if (!(await tween({ bar: 0 }, 200, my))) return;
        if (!(await tween({ capZ: 48 }, 560, my))) return;
        lampsOff();
        if (!(await pause(700, my))) return;
        lane = Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 0 : 2;
      }
    }
    tabs.forEach((t) => t.addEventListener("click", () => run(+t.dataset.stage)));
    draw();
    stage(0);
    if (still.matches) { Object.assign(s, { x: D.bay, y: 0, capZ: 0, tableY: 0 }); draw(); stage(3); steps.slice(0, 3).forEach((l) => l.classList.add("is-on")); return; }
    run(0);
  };

  FIGS.fleet = (root, D) => {
    const svg = root.querySelector("svg");
    const fig = root.closest(".fleet") || root;
    const rack = svg.querySelector('[data-part="rack"]');
    const far = svg.querySelector('[data-part="gantry-far"]');
    const near = svg.querySelector('[data-part="gantry-near"]');
    const flash = svg.querySelector('[data-part="flash"]');
    const rows = [...svg.querySelectorAll("[data-row]")];
    const leds = [...svg.querySelectorAll("[data-tab]")].sort((a, b) => a.dataset.tab - b.dataset.tab);
    const needle = svg.querySelector('[data-part="needle"]');
    const selector = svg.querySelector('[data-part="selector"]');
    const release = svg.querySelector("[data-release]");
    const failEl = fig.querySelector("#fleetFail");
    const tiers = [...fig.querySelectorAll(".tier")];
    const tabs = [...fig.querySelectorAll("[data-mode]")];
    const pill = fig.querySelector(".seg-pill");
    const gate = visibility(root);
    const P = D.P;
    const unit = axisVector(P, [1, 0, 0]);
    const N = D.rows * D.cols;
    let mode = "after", runId = 0, row = 0, failPct = 0, failShown = 0, knob = -135, knobShown = -135;

    const placeGantry = (x) => {
      const t = `translate(${(unit[0] * x * D.rowStep).toFixed(2)} ${(unit[1] * x * D.rowStep).toFixed(2)})`;
      far.setAttribute("transform", t);
      near.setAttribute("transform", t);
      const slot = Math.max(0, Math.min(D.rows - 1, Math.round(x)));
      if (slot !== row || !near.previousElementSibling) {
        row = slot;
        rack.insertBefore(far, rows[slot]);
        rows[slot].after(near);
      }
    };
    const drawDials = () => {
      const { x, y, z, r } = D.dial;
      const a = (failShown / 50) * Math.PI * 2;
      needle.setAttribute("d", lineOnTop([x - Math.sin(a) * 3.2, y + Math.cos(a) * 3.2], [x + Math.sin(a) * (r - 4), y - Math.cos(a) * (r - 4)], z, P));
      const [kx, ky, kz] = D.knob;
      const b = (knobShown * Math.PI) / 180;
      selector.setAttribute("d", lineOnTop([kx, ky], [kx + Math.sin(b) * 5.6, ky - Math.cos(b) * 5.6], kz, P));
    };
    let last = 0;
    (async function settle() {
      for (;;) {
        await gate.frame();
        const now = performance.now();
        const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
        last = now;
        failShown += (failPct - failShown) * (1 - Math.exp(-dt / 0.3));
        knobShown += (knob - knobShown) * (1 - Math.exp(-dt / 0.12));
        drawDials();
      }
    })();

    let gx = 0;
    const moveTo = async (target, my, ms = 420) => {
      const from = gx, t0 = performance.now();
      for (;;) {
        await gate.frame();
        if (my !== runId) return false;
        const t = Math.min(1, (performance.now() - t0) / (still.matches ? 1 : ms));
        gx = from + (target - from) * ease(t);
        placeGantry(gx);
        if (t >= 1) return true;
      }
    };
    const setFail = (n) => {
      failPct = (n / N) * 100;
      if (failEl) failEl.textContent = Math.round(failPct);
    };
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    async function run() {
      const my = ++runId;
      const live = () => my === runId;
      leds.forEach((l) => l.setAttribute("class", "fx-tab-led"));
      tiers.forEach((t) => t.classList.remove("is-on"));
      fig.classList.toggle("is-before", mode === "before");
      setFail(0);
      let failed = 0;
      const speed = still.matches ? 0 : 1;
      const plan = mode === "before"
        ? [{ tier: 3, idx: [...Array(N).keys()], bad: new Set(shuffle([...Array(N).keys()]).slice(0, 30)), rowMs: 160 }]
        : (() => {
            const bad = new Set(shuffle([...Array(N - 10).keys()].map((i) => i + 10)).slice(0, 4));
            const span = (a, b) => [...Array(b - a).keys()].map((i) => i + a);
            return [{ tier: 0, idx: [0], bad, rowMs: 520 }, { tier: 1, idx: span(1, 10), bad, rowMs: 520 }, { tier: 2, idx: span(10, 50), bad, rowMs: 340 }, { tier: 3, idx: span(50, 100), bad, rowMs: 300 }];
          })();
      if (!(await moveTo(0, my, 300))) return;
      for (const step of plan) {
        if (!live()) return;
        knob = -135 + step.tier * 90;
        if (mode === "after") tiers[step.tier]?.classList.add("is-on");
        else tiers.forEach((t) => t.classList.add("is-on"));
        release?.classList.add("is-on");
        await gate.sleep(260 * speed);
        release?.classList.remove("is-on");
        const byRow = new Map();
        step.idx.forEach((i) => { const r = Math.floor(i / D.cols); byRow.set(r, [...(byRow.get(r) || []), i]); });
        for (const [r, list] of byRow) {
          if (!(await moveTo(r, my, step.rowMs))) return;
          flash.classList.add("is-on");
          for (const i of list) {
            if (!live()) return;
            const isBad = step.bad.has(i);
            leds[i].setAttribute("class", `fx-tab-led ${isBad ? "bad" : "ok"}`);
            if (isBad) setFail(++failed);
            if (speed) await gate.sleep(mode === "before" ? 8 : step.tier < 2 ? 60 : 18);
          }
          flash.classList.remove("is-on");
        }
        if (mode === "after") await gate.sleep(520 * speed);
      }
      await moveTo(0, my, 900);
    }

    const movePill = () => {
      const a = tabs.find((t) => t.dataset.mode === mode);
      if (!a || !pill) return;
      pill.style.width = `${a.offsetWidth}px`;
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    tabs.forEach((t) => t.addEventListener("click", () => {
      mode = t.dataset.mode;
      tabs.forEach((x) => x.setAttribute("aria-selected", x === t));
      movePill();
      run();
    }));
    fig.querySelector(".fleet-replay")?.addEventListener("click", run);
    requestAnimationFrame(movePill);
    addEventListener("resize", movePill);

    placeGantry(0);
    drawDials();
    let played = false;
    new IntersectionObserver((entries) => {
      if (entries[entries.length - 1].isIntersecting && !played) { played = true; run(); }
    }, { threshold: 0.4 }).observe(root);
  };

  document.querySelectorAll("script[data-fig-data]").forEach((node) => {
    const name = node.dataset.figData;
    const init = FIGS[name];
    if (!init) return;
    const root = node.parentElement;
    try { init(root, JSON.parse(node.textContent)); } catch (error) { console.error(`figure ${name}`, error); }
  });
})();
