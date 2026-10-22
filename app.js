document.documentElement.classList.add("js");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const cssMs = (name, fallback) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;

// transitions.dev: text states swap (exit up, swap, enter from below)
function swapText(el, next) {
  if (el.textContent === next) return;
  if (reduceMotion || !el.textContent) { el.textContent = next; return; }
  el.classList.add("is-exit");
  setTimeout(() => {
    el.textContent = next;
    el.classList.remove("is-exit");
    el.classList.add("is-enter-start");
    void el.offsetHeight; // force reflow so the next change transitions
    el.classList.remove("is-enter-start");
  }, cssMs("--text-swap-dur", 200));
}

// transitions.dev: number pop-in (last two digits stagger)
function setDigits(group, str) {
  group.classList.remove("is-animating");
  group.replaceChildren();
  const chars = String(str).split("");
  chars.forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "t-digit";
    span.textContent = ch;
    if (i === chars.length - 2) span.dataset.stagger = "1";
    else if (i === chars.length - 1) span.dataset.stagger = "2";
    group.appendChild(span);
  });
  void group.offsetHeight; // force reflow
  group.classList.add("is-animating");
}

function onView(el, cb, opts = { threshold: 0.35 }) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => cb(e.isIntersecting, e));
  }, opts);
  io.observe(el);
  return io;
}

/* ---------- Reveal on scroll ---------- */
{
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  // Stagger siblings that enter together.
  const groups = new Map();
  $$(".reveal").forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });
  groups.forEach((list) => list.forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 6) * 70}ms`)));
  $$(".reveal").forEach((el) => io.observe(el));
}

/* ---------- Nav: scrolled border + active pill ---------- */
{
  const nav = $(".nav");
  const links = $(".nav-links");
  const pill = $(".nav-pill");
  const anchors = $$("a", links);
  addEventListener("scroll", () => nav.classList.toggle("is-scrolled", scrollY > 8), { passive: true });

  const movePill = (a) => {
    anchors.forEach((x) => x.classList.toggle("is-active", x === a));
    links.classList.toggle("has-active", !!a);
    if (!a) return;
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };

  const visible = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null, ratio = 0;
    visible.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
    movePill(best ? anchors.find((a) => a.hash === `#${best}`) : null);
  }, { threshold: [0, 0.15, 0.3, 0.5], rootMargin: "-64px 0px -40% 0px" });
  anchors.forEach((a) => { const s = $(a.hash); if (s) io.observe(s); });
}

/* ---------- Copy email ---------- */
$$("[data-copy]").forEach((btn) => {
  let t;
  btn.addEventListener("click", async () => {
    const email = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(email);
      btn.classList.add("is-copied");
      clearTimeout(t);
      t = setTimeout(() => btn.classList.remove("is-copied"), 1800);
    } catch {
      location.href = `mailto:${email}`;
    }
  });
});

/* ---------- Count-up ---------- */
$$("[data-count]").forEach((el) => {
  const target = +el.dataset.count;
  if (reduceMotion) return;
  el.textContent = "0";
  const io = onView(el, (inView) => {
    if (!inView) return;
    io.disconnect();
    const start = performance.now(), dur = 1100;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.6 });
});

/* ---------- Tools accordion ---------- */
$$(".tool").forEach((tool, i, all) => {
  const btn = $(".tool-row", tool);
  btn.addEventListener("click", () => {
    const open = !tool.classList.contains("is-open");
    all.forEach((t) => { t.classList.remove("is-open"); $(".tool-row", t).setAttribute("aria-expanded", "false"); });
    tool.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open);
  });
  if (i === 0) { tool.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
});

/* ---------- Videos play only while visible ---------- */
$$("video[data-autoplay]").forEach((v) => {
  if (reduceMotion) return;
  onView(v, (inView) => (inView ? v.play().catch(() => {}) : v.pause()), { threshold: 0.25 });
});
