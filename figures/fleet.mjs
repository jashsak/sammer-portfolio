// Fig 2 — Fleet release. A charging cart of 100 tablets (each one stands for 40 of
// ~4,000 devices), a gantry whose flash bar sweeps the rows tier by tier, a release
// console with a tier selector, and a dial reading the share of failed updates.
import { k, G, A, makeFigure, round2 } from "./common.mjs";

const W = 640;
const H = 420;
const PLATE = { x: -112, y: -104, w: 214, d: 214, r: 10 };

const ROWS = 10;
const COLS = 10;
const ROW_X = (i) => -76 + i * 7.6;
const COL_Y = (j) => -64 + j * 14;
const TRAY = { x: -84, y: -72, w: 86, d: 148, r: 4 };
const TRAY_TOP = 4;
const TAB_H = 15;
const RAIL_Y = [-84, 84];
const RAIL_X = [-96, 14];
const GANTRY_Z = 32;

const CONSOLE = { x: 34, y: 26, w: 44, d: 40, r: 3 };
const CONSOLE_H = 16;
const KNOB = [56, 40];
const DIAL = [58, -46];
const DIAL_Z = 22;
const DIAL_R = 17;
const DIAL_TOP = DIAL_Z + 6;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [RAIL_X[0], RAIL_Y[0], GANTRY_Z + 10], [RAIL_X[0], RAIL_Y[1], GANTRY_Z + 10]], W, H, { pad: 16, azimuth: 40 });
const F = makeFigure(P);
const { at, S, Ln, Dots, slab, post } = F;

const back = [F.bench(PLATE)];

// ---------- static, depth-settled parts ----------
slab("tray.base", TRAY, 0, TRAY_TOP, { tone: "mid" }, { steps: 6, bevel: 0.8, inner: Ln(k.sideSeam(TRAY, 1.6, P, 6), { tone: "faint" }), extra: Ln(Array.from({ length: ROWS + 1 }, (_, i) => k.lineOnTop([ROW_X(i) - 3.8, TRAY.y + 3], [ROW_X(i) - 3.8, TRAY.y + TRAY.d - 3], TRAY_TOP, P)).join(""), { tone: "faint" }) + Ln(k.planOutline(k.insetPlan(TRAY, 2.4), TRAY_TOP, P, 4), { tone: "lo" }) });
RAIL_Y.forEach((y, i) => {
  slab(`rail${i}`, { x: RAIL_X[0], y: y - 2.5, w: RAIL_X[1] - RAIL_X[0], d: 5, r: 1 }, 0, 3, { tone: "mid" }, { steps: 3, bevel: 0.4, extra: Dots([RAIL_X[0] + 5, RAIL_X[1] - 5].map((x) => at([x, y, 3])), { size: 0.4 }) });
  [RAIL_X[0] - 5, RAIL_X[1]].forEach((x, j) => slab(`stop${i}${j}`, { x, y: y - 4, w: 5, d: 8, r: 1.2 }, 0, 7, { tone: "mid" }, { steps: 3, bevel: 0.5 }));
});

// release console with a tier selector and a release button
slab("console.base", k.insetPlan(CONSOLE, -2.5), 0, 3, { tone: "lo" }, { bevel: 0.4 });
slab("console.body", CONSOLE, 3, CONSOLE_H - 3, { tone: "mid" }, {
  bevel: 0.8,
  inner: Ln(k.sideSeam(CONSOLE, 7, P, 4), { tone: "faint" }),
  extra: (() => {
    const [x, y] = KNOB;
    const marks = [0, 1, 2, 3].map((i) => {
      const a = (-135 + i * 90) * (Math.PI / 180);
      return k.lineOnTop([x + Math.sin(a) * 10, y - Math.cos(a) * 10], [x + Math.sin(a) * 12.6, y - Math.cos(a) * 12.6], CONSOLE_H, P);
    });
    return Ln(k.ring(x, y, 9, CONSOLE_H, P, 48), { tone: "faint" }) + Ln(marks.join(""), { tone: "hi" }) + Dots(k.corners(CONSOLE, 4).map(([cx, cy]) => at([cx, cy, CONSOLE_H])), { size: 0.4 });
  })(),
});
post("console.knob", KNOB[0], KNOB[1], 6.4, CONSOLE_H, 5, { tone: "hi" }, { steps: 36, bevel: 0.4, inner: Ln(k.knurl(KNOB[0], KNOB[1], 6.4, CONSOLE_H, CONSOLE_H + 5, 30, P), { tone: "lo" }) });
post("console.button", CONSOLE.x + 10, CONSOLE.y + 30, 3.6, CONSOLE_H, 2.4, { tone: "mid" }, { steps: 28, bevel: 0.3, attrs: ` data-release` });

// failure dial on a post
{
  const [x, y] = DIAL;
  post("dial.foot", x, y, 10, 0, 3, { tone: "lo" }, { steps: 36, bevel: 0.4 });
  post("dial.post", x, y, 2.6, 3, DIAL_Z - 3, { tone: "mid" }, { steps: 20 });
  const t = k.radialTicks(x, y, DIAL_R - 3, 50, 5, DIAL_TOP, [1.2, 2.6], P, 0, (Math.PI * 2 * 50) / 50);
  // red zone from 5% up (scale 0–50%)
  const zone = Array.from({ length: 41 }, (_, i) => {
    const a = (5 / 50 + (i / 40) * (45 / 50)) * Math.PI * 2;
    return [x + Math.sin(a) * (DIAL_R - 7), y - Math.cos(a) * (DIAL_R - 7)];
  });
  const okZone = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 8) * (5 / 50) * Math.PI * 2;
    return [x + Math.sin(a) * (DIAL_R - 7), y - Math.cos(a) * (DIAL_R - 7)];
  });
  post("dial.puck", x, y, DIAL_R, DIAL_Z, 6, { tone: "hi", crease: "lo" }, {
    steps: 64,
    bevel: 0.8,
    extra: [Ln(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.6, DIAL_TOP, 64, P, 0.3), { tone: "lo" }), Ln(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 64), { tone: "lo" }), Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }), `<path class="fx-band fx-band-bad" d="${k.onTop(zone, DIAL_TOP, P)}"/>`, `<path class="fx-band fx-band-ok" d="${k.onTop(okZone, DIAL_TOP, P)}"/>`, Ln(k.ring(x, y, 1.5, DIAL_TOP, P, 16), { tone: "mid" })].join(""),
  });
}

const front = (name) => name.startsWith("console") || name.startsWith("dial");
const under = F.finish((name) => !front(name));
const over = F.finish(front);

// ---------- rack rows: drawn back to front so the gantry can be slotted between them ----------
const rows = [];
const leds = [];
for (let i = 0; i < ROWS; i++) {
  const parts = [];
  for (let j = 0; j < COLS; j++) {
    const x = ROW_X(i), y = COL_Y(j);
    const plan = { x: x - 1.2, y: y - 5.5, w: 2.4, d: 11, r: 0.7 };
    // slot in the tray, then the tablet standing in it
    parts.push(Ln(k.planOutline(k.insetPlan(plan, -0.8), TRAY_TOP, P, 2), { tone: "lo" }));
    const screen = [[x + 1.21, y - 4.3, TRAY_TOP + 2.2], [x + 1.21, y + 4.3, TRAY_TOP + 2.2], [x + 1.21, y + 4.3, TRAY_TOP + TAB_H - 1.6], [x + 1.21, y - 4.3, TRAY_TOP + TAB_H - 1.6]];
    parts.push(S(k.slabOf(plan, TRAY_TOP, TAB_H, P, 2, 0.3), { tone: "hi", inner: Ln(k.pathOf(screen.map(at), true), { tone: "faint" }) }));
    const [lx, ly] = at([x, y + 3.6, TRAY_TOP + TAB_H]);
    leds.push([i, j]);
    parts.push(`<circle class="fx-tab-led" data-tab="${i * COLS + j}" cx="${round2(lx)}" cy="${round2(ly)}" r="1.5"/>`);
  }
  rows.push(`<g data-row="${i}">${parts.join("")}</g>`);
  A.slab({ x: ROW_X(i) - 1.2, y: COL_Y(0) - 5.5, w: 2.4, d: COL_Y(COLS - 1) - COL_Y(0) + 11, r: 0.7 }, TRAY_TOP, TAB_H, { name: `row${i}` });
}

// ---------- gantry, built at row 0 and moved with translateAlong ----------
const gx = ROW_X(0);
const truck = (y) => {
  const plan = { x: gx - 4, y: y - 3.5, w: 8, d: 7, r: 1 };
  return S(k.slabOf(plan, 3, GANTRY_Z - 3, P, 3, 0.4), { tone: "mid", inner: Ln(k.sideSeam(plan, 8, P, 3), { tone: "faint" }) }) + Dots([at([gx - 2, y, GANTRY_Z]), at([gx + 2, y, GANTRY_Z])], { size: 0.4 });
};
const BEAM = { x: gx - 3, y: RAIL_Y[0] - 3, w: 6, d: RAIL_Y[1] - RAIL_Y[0] + 6, r: 1 };
const beam = S(k.slabOf(BEAM, GANTRY_Z, 4, P, 3, 0.5), { tone: "hi", crease: "lo", inner: Ln(k.sideSeam(BEAM, GANTRY_Z + 2, P, 3), { tone: "faint" }) });
const head = { x: gx - 5, y: -8, w: 10, d: 16, r: 2 };
const headSvg = S(k.slabOf(head, GANTRY_Z + 4, 5, P, 3, 0.5), { tone: "mid" }) + Ln(k.planOutline(k.insetPlan(head, 2), GANTRY_Z + 9, P, 3), { tone: "faint" });
const bar = `<path class="fx-flash" data-part="flash" d="${k.pathOf([at([gx, TRAY.y + 2, TRAY_TOP + TAB_H + 2]), at([gx, TRAY.y + TRAY.d - 2, TRAY_TOP + TAB_H + 2])])}"/>`;
const gantryFar = `<g data-part="gantry-far">${truck(RAIL_Y[0])}</g>`;
const gantryNear = `<g data-part="gantry-near">${bar}${beam}${headSvg}${truck(RAIL_Y[1])}</g>`;

const body = [...back, `<g class="fx-items">${under}</g>`, `<g data-part="rack">${gantryFar}${rows.join("")}${gantryNear}</g>`, `<g class="fx-items">${over}</g>`, `<path class="fx-needle" data-part="needle" d=""/>`, `<path class="fx-needle" data-part="selector" d=""/>`];
const svg = k.figureSvg({
  width: W,
  height: H,
  label: "A charging cart of 100 tablets, each standing for 40 of about 4,000 devices. A gantry's flash bar sweeps the rows to install an update, a release console's selector shows the rollout tier, and a dial reads the share of devices whose update failed.",
  body,
});

export const DATA = {
  P,
  rows: ROWS,
  cols: COLS,
  rowStep: 7.6,
  knob: [KNOB[0], KNOB[1], CONSOLE_H + 5.1],
  dial: { x: DIAL[0], y: DIAL[1], z: DIAL_TOP + 0.2, r: DIAL_R },
};
export const SVG = svg;
export const STATS = { items: F.R.items.length + ROWS * COLS };
export const audit = () => A.auditOrExit(F.R, P, {});
