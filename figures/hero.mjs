// Fig 0 — The exchange. Claude Queue drawn as a pneumatic-tube exchange:
// department stations send capsules (jobs) up glass tubes into a turret,
// the turret routes them to a local worker that runs Claude, and the result rides back.
import { k, G, A, makeFigure, screenRoute, planeMatrix, round2 } from "./common.mjs";

const W = 640;
const H = 560;
const PLATE = { x: -150, y: -132, w: 282, d: 228, r: 12 };

const EX = [0, 0];
const DRUM_R = 28;
const DECK = 56;
const PORT_R = 19;

const STATIONS = [
  { id: "ops", at: [-116, 4], over: 100, port: 172, legs: "" },
  { id: "uat", at: [-104, -76], over: 92, port: 220, legs: "yx" },
  { id: "returns", at: [1.3, -110], over: 76, port: 268, legs: "" },
];
const ST_TOP = 27;
const CUP_H = 7;

const WK = { x: 64, y: -82, w: 56, d: 50, r: 3 };
const WK_TOP = 62;
const WK_CUP = [88, -60];
const DIAL = [-46, 62];
const DIAL_Z = 28;
const DIAL_R = 18;
const DIAL_TOP = DIAL_Z + 7;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [EX[0], EX[1], 122], [WK_CUP[0], WK_CUP[1], 130], [STATIONS[0].at[0], STATIONS[0].at[1], 106], [STATIONS[2].at[0], STATIONS[2].at[1], 92]],
  W,
  H,
  { pad: 18, azimuth: 40 },
);
const F = makeFigure(P);
const { at, S, Ln, Dots, put, slab, post, tube } = F;

const angleTo = (from, to) => Math.atan2(to[1] - from[1], to[0] - from[0]);
const portAt = (angle) => [EX[0] + Math.cos(angle) * PORT_R, EX[1] + Math.sin(angle) * PORT_R];

// ---------- static base ----------
const back = [F.bench(PLATE)];
{
  const label = { x: PLATE.x + 18, y: PLATE.y + PLATE.d - 36, w: 34, d: 14, r: 1.2 };
  back.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  back.push(Ln(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  back.push(Ln([[6, 4], [24, 4], [6, 7.4], [18, 7.4], [6, 10.8], [26, 10.8]].reduce((d, _, i, a) => (i % 2 ? d : d + k.lineOnTop([label.x + a[i][0], label.y + a[i][1]], [label.x + a[i + 1][0], label.y + a[i + 1][1]], 0.8, P)), ""), { tone: "lo", free: true }));
  back.push(Dots([at([label.x + 2.4, label.y + 2.4, 0.8]), at([label.x + label.w - 2.4, label.y + label.d - 2.4, 0.8])], { size: 0.4 }));
}

// ---------- exchange (the queue) ----------
const portAngles = {};
STATIONS.forEach((s) => (portAngles[s.id] = (s.port * Math.PI) / 180));
portAngles.worker = (322 * Math.PI) / 180;
{
  const [x, y] = EX;
  post("ex.pedestal", x, y, 38, 0, 4, { tone: "lo" }, { steps: 72 });
  post("ex.flange", x, y, 33, 4, 5, { tone: "mid" }, { steps: 72, bevel: 0.6, extra: Dots(Array.from({ length: 12 }, (_, i) => at([x + Math.cos((i / 12) * Math.PI * 2) * 30.5, y + Math.sin((i / 12) * Math.PI * 2) * 30.5, 9])), { size: 0.45 }) });
  // queue window on the drum's visible side: capsules waiting to be claimed
  const wa = (40 * Math.PI) / 180;
  const wx = x + Math.cos(wa) * (DRUM_R + 0.4);
  const wy = y + Math.sin(wa) * (DRUM_R + 0.4);
  const tan = [-Math.sin(wa), Math.cos(wa), 0];
  const corner = (u, z) => [wx + tan[0] * u, wy + tan[1] * u, z];
  const winMatrix = planeMatrix(P, corner(-8, 44), tan, [0, 0, -1]);
  const slots = [0, 1, 2, 3].map((i) => `<rect class="fx-queued" data-slot="${i}" x="3" y="${21 - i * 6.2}" width="10" height="4.4" rx="2.2"/>`).join("");
  const windowSvg = [
    `<g transform="${winMatrix}"><rect class="fx-window" x="0" y="0" width="16" height="28" rx="3"/>${slots}<path class="fx-window-glint" d="M3 2.5H6.5V26"/></g>`,
    Ln(k.pathOf([corner(-10, 14), corner(10, 14), corner(10, 46), corner(-10, 46)].map(at), true), { tone: "lo" }),
    Dots([corner(-9, 15.2), corner(9, 15.2), corner(9, 44.8), corner(-9, 44.8)].map(at), { size: 0.4 }),
  ].join("");
  post("ex.drum", x, y, DRUM_R, 9, 42, { tone: "hi" }, {
    steps: 72,
    extra: windowSvg,
    inner: Ln(k.knurl(x, y, DRUM_R, 15, 45, 44, P, 0.3), { tone: "faint" }) + Ln(k.sideArc(x, y, DRUM_R, 15, P, 48) + k.sideArc(x, y, DRUM_R, 45, P, 48), { tone: "lo" }),
  });
  post("ex.cap", x, y, 31, 51, 5, { tone: "mid" }, {
    steps: 72,
    bevel: 0.6,
    extra: (() => {
      const t = k.radialTicks(x, y, 29.6, 72, 6, DECK, [1, 2.2], P);
      return Ln(k.ring(x, y, 24, DECK, P, 64), { tone: "lo" }) + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" });
    })(),
  });
  // ports on the deck
  Object.entries(portAngles).forEach(([id, a]) => {
    const [px, py] = portAt(a);
    post(`ex.port.${id}`, px, py, 7.2, DECK, 3, { tone: "mid" }, { steps: 32, bevel: 0.3 });
  });
  post("ex.hub", x, y, 5.4, DECK, 5, { tone: "mid" }, { steps: 32, inner: Ln(k.knurl(x, y, 5.4, DECK, DECK + 5, 22, P), { tone: "lo" }) });
}

// ---------- stations (the apps) ----------
STATIONS.forEach(({ id, at: [sx, sy] }) => {
  slab(`st.${id}.base`, { x: sx - 18, y: sy - 15, w: 36, d: 30, r: 2 }, 0, 3, { tone: "lo" }, { bevel: 0.4 });
  const body = { x: sx - 15, y: sy - 12, w: 30, d: 24, r: 2 };
  slab(`st.${id}.body`, body, 3, ST_TOP - 3, { tone: "mid" }, {
    bevel: 0.6,
    inner: Ln(k.sideSeam(body, 9, P, 4), { tone: "faint" }),
    extra: Ln(k.planOutline(k.insetPlan(body, 3), ST_TOP, P, 3), { tone: "faint" }) + Dots(k.corners(body, 4.5).map(([x, y]) => at([x, y, ST_TOP])), { size: 0.4 }),
  });
  post(`st.${id}.cup`, sx - 2, sy - 1, 8, ST_TOP, CUP_H, { tone: "hi" }, { steps: 36, bevel: 0.4, extra: Ln(k.sideArc(sx - 2, sy - 1, 8, ST_TOP + 2.2, P, 24), { tone: "faint" }) });
  post(`st.${id}.lamp`, sx + 9, sy + 7, 2.4, ST_TOP, 2.4, { tone: "mid" }, { steps: 20, attrs: ` data-lamp="${id}"` });
  slab(`st.${id}.lever`, { x: sx + 6, y: sy - 9, w: 6, d: 4, r: 1 }, ST_TOP, 2, { tone: "mid" }, { steps: 2, bevel: 0.3 });
  post(`st.${id}.knob`, sx + 9, sy - 7, 2.2, ST_TOP + 2, 3, { tone: "mid" }, { steps: 18, inner: Ln(k.knurl(sx + 9, sy - 7, 2.2, ST_TOP + 2, ST_TOP + 5, 14, P), { tone: "lo" }) });
});

// ---------- worker (runs Claude) ----------
const WK_BASE = k.insetPlan(WK, -3);
slab("wk.plinth", WK_BASE, 0, 4, { tone: "lo" }, { bevel: 0.5 });
const screenFace = WK.x + WK.w; // +x face
{
  const crtMatrix = planeMatrix(P, [screenFace + 0.05, WK.y + WK.d - 8, 52], [0, -1, 0], [0, 0, -1]);
  const vent = (i) => {
    const z = 14 + i * 4.2;
    return k.pathOf([[WK.x + 12, WK.y + WK.d, z], [WK.x + 34, WK.y + WK.d, z], [WK.x + 34, WK.y + WK.d, z + 1.6], [WK.x + 12, WK.y + WK.d, z + 1.6]].map(at), true);
  };
  slab("wk.body", WK, 4, WK_TOP - 4, { tone: "mid" }, {
    bevel: 0.8,
    inner: Ln(k.sideSeam(WK, 12, P, 4) + k.sideSeam(WK, 54, P, 4), { tone: "faint" }),
    extra: [
      // CRT on the +x face, drawn in the face plane
      `<g transform="${crtMatrix}">`,
      `<rect class="fx-bezel" x="-2" y="-2" width="40" height="34" rx="3"/>`,
      `<rect class="fx-crt" x="0" y="0" width="36" height="30" rx="2"/>`,
      `<clipPath id="hero-crt"><rect x="0.8" y="0.8" width="34.4" height="28.4" rx="1.6"/></clipPath>`,
      `<g class="fx-crt-text" clip-path="url(#hero-crt)" data-part="crt"></g>`,
      `<path class="iso-line" data-tone="lo" d="M-2 34.5H38"/>`,
      `</g>`,
      Ln(Array.from({ length: 6 }, (_, i) => vent(i)).join(""), { tone: "lo" }),
      [0, 1, 2].map((i) => { const [lx, ly] = at([screenFace, WK.y + 12 + i * 5, 12]); return `<ellipse class="fx-led"${i === 0 ? ' data-led="run"' : ""} cx="${round2(lx)}" cy="${round2(ly)}" rx="1.1" ry="1.3"/>`; }).join(""),
      Ln(k.planOutline(k.insetPlan(WK, 4), WK_TOP, P, 3), { tone: "faint" }),
      Dots(k.corners(WK, 5).map(([x, y]) => at([x, y, WK_TOP])), { size: 0.45 }),
      k.faceTextSvg(k.topMatrix([WK.x + 8, WK.y + WK.d - 10], WK_TOP, P, "x"), "WORKER-01 · LOCAL", { size: 3.4, tone: "mid" }),
    ].join(""),
  });
  // status LEDs under the screen
}
post("wk.cup", WK_CUP[0], WK_CUP[1], 9, WK_TOP, CUP_H, { tone: "hi" }, { steps: 36, bevel: 0.4, extra: Ln(k.sideArc(WK_CUP[0], WK_CUP[1], 9, WK_TOP + 2.4, P, 24), { tone: "faint" }) });

// ---------- dial (jobs on the day's scale) ----------
{
  const [x, y] = DIAL;
  post("dial.foot", x, y, 11, 0, 3, { tone: "lo" }, { steps: 36, bevel: 0.4 });
  post("dial.post", x, y, 2.8, 3, DIAL_Z - 3, { tone: "mid" }, { steps: 20, inner: Ln(k.sideArc(x, y, 2.8, 14, P, 12), { tone: "faint" }) });
  const t = k.radialTicks(x, y, DIAL_R - 3, 50, 5, DIAL_TOP, [1.3, 2.8], P);
  // the 50–100 band: where a normal day lands
  const band = Array.from({ length: 41 }, (_, i) => {
    const a = Math.PI + (i / 40) * Math.PI;
    return [x + Math.sin(a) * (DIAL_R - 7.5), y - Math.cos(a) * (DIAL_R - 7.5)];
  });
  post("dial.puck", x, y, DIAL_R, DIAL_Z, 7, { tone: "hi", crease: "lo" }, {
    steps: 64,
    bevel: 0.8,
    extra: [
      Ln(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 72, P, 0.3), { tone: "lo" }),
      Ln(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }),
      Ln(t.minor, { tone: "lo" }),
      Ln(t.major, { tone: "mid" }),
      `<path class="fx-band" d="${k.onTop(band, DIAL_TOP, P)}"/>`,
      Ln(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }),
    ].join(""),
  });
}

// ---------- spare carriers in a tray ----------
{
  const TRAY = { x: 30, y: 48, w: 46, d: 26, r: 3 };
  slab("tray.base", TRAY, 0, 2, { tone: "lo" }, { bevel: 0.4 });
  slab("tray.floor", k.insetPlan(TRAY, 2), 2, 0.6, { tone: "mid" }, { steps: 3, bevel: 0 });
  [[TRAY.x, TRAY.y, TRAY.w, 2], [TRAY.x, TRAY.y + TRAY.d - 2, TRAY.w, 2]].forEach(([tx, ty, tw, td], i) => slab(`tray.rail${i}`, { x: tx, y: ty, w: tw, d: td, r: 0.6 }, 2, 4, { tone: "mid" }, { steps: 2, bevel: 0.3 }));
  [0, 1].forEach((i) => {
    const cy = TRAY.y + 8 + i * 10;
    const CF = G.frameOf([TRAY.x + 8, cy, 6.85], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const profile = [[0, 0], [0.4, 2.6, 1], [1.6, 4, 1], [3, 4.2], [27, 4.2], [28.4, 4, 1], [29.6, 2.6, 1], [30, 0]];
    const shape = F.R.solid(A.solid(CF, profile, { name: `tray.capsule${i}` }));
    put(`tray.capsule${i}`, [TRAY.x + 23, cy, 6.85], S(G.solidOf(profile, CF, P, { steps: 40 }), { tone: "hi", inner: Ln(G.arcOf(CF, 7, 4.2, P) + G.arcOf(CF, 23, 4.2, P), { tone: "faint" }) }), [shape]);
  });
}

// ---------- tubes ----------
const R4 = 4;
const routes = {};
STATIONS.forEach(({ id, at: [sx, sy], over, legs }) => {
  const [px, py] = portAt(portAngles[id]);
  const [cx, cy] = [sx - 2, sy - 1];
  const knee = legs === "yx" ? [[cx, py, over]] : legs === "xy" ? [[px, cy, over]] : [];
  const start = [[cx, cy, over]];
  routes[id] = tube(`tube.${id}`, [[cx, cy, ST_TOP + CUP_H], ...start, ...knee, [px, py, over], [px, py, DECK + 3]], R4);
});
{
  const [px, py] = portAt(portAngles.worker);
  routes.worker = tube("tube.worker", [[px, py, DECK + 3], [px, py, 122], [WK_CUP[0], WK_CUP[1], 122], [WK_CUP[0], WK_CUP[1], WK_TOP + CUP_H]], R4 + 0.6);
}

const items = F.finish();
const body = [
  ...back,
  `<g class="fx-items">${items}</g>`,
  `<path class="fx-pointer" data-part="pointer" d=""/>`,
  `<path class="fx-needle" data-part="needle" d=""/>`,
  `<g data-part="capsules"></g>`,
];
const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "A pneumatic-tube exchange on a bench. Three department stations send capsules up glass tubes into a turret. The turret's pointer swings to the port it is serving, sends each capsule on to a local worker cabinet whose screen runs Claude, and routes the result back to the station that asked. A dial counts jobs against a normal day of 50 to 100.",
  body,
});

export const DATA = {
  P,
  routes: Object.fromEntries(Object.entries(routes).map(([id, r]) => [id, screenRoute(r, P)])),
  hub: [EX[0], EX[1], DECK + 5],
  portAngles: Object.fromEntries(Object.entries(portAngles).map(([id, a]) => [id, round2(a)])),
  dial: { x: DIAL[0], y: DIAL[1], z: DIAL_TOP + 0.2, r: DIAL_R },
  capsule: round2(R4 * G.scaleOf(P) * 1.5),
};
export const SVG = svg;
export const STATS = { items: F.R.items.length };
export { F as FIG, P as PROJ };
export const audit = () => A.auditOrExit(F.R, P, {});
