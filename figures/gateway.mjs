// Fig 1 — Inside the gateway. One job's path through Claude Queue as a dispatch bench:
// the capsule drops from the queue tube onto a carriage, a pin-tumbler gate reads the
// app's OAuth scope before the barrier lifts, a transfer table shifts it to the lane of
// the routed model, the bay runs it while tool-call lamps stream progress, and the
// result rides back up the tube.
import { k, G, A, makeFigure, round2 } from "./common.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

const W = 680;
const H = 420;
const AZ = 58;
const PLATE = { x: -146, y: -76, w: 286, d: 150, r: 10 };

const DOCK_X = -110;
const GATE_X = -66;
const TABLE = { x: -36, y: -16, w: 30, d: 32, r: 2 };
const TABLE_X = -21;
const LANES = [-38, 0, 38];
const LANE_FROM = -4;
const LANE_TO = 90;
const BAY_STOP = 74;
const BAYS = [
  { model: "haiku", y: LANES[0], w: 22, d: 24, h: 20 },
  { model: "sonnet", y: LANES[1], w: 26, d: 28, h: 28 },
  { model: "opus", y: LANES[2], w: 30, d: 32, h: 36 },
];
const CAR = { x: -9, y: -7, w: 18, d: 14, r: 2 };
const CAR_TOP = 7;
const CAP_R = 4.4;
const CAP_Z = CAR_TOP + CAP_R + 0.6;
const PIN_TOP = 27;
const PIN_BOTTOM = CAP_Z + CAP_R + 2.4;
const STRIP_Y = 58;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [DOCK_X, -60, 88], [GATE_X, 0, 44]], W, H, { pad: 14, azimuth: AZ });
const F = makeFigure(P);
const { at, S, Ln, Dots, put, slab, post } = F;
const V = G.viewOf(P);

const base = [F.bench(PLATE)];
const flat = [];

// ---------- flat things the carriage always rides over ----------
const railPair = (x0, x1, y, name) => {
  [-5, 5].forEach((dy, i) => flat.push(S(k.slabOf({ x: x0, y: y + dy - 1.4, w: x1 - x0, d: 2.8, r: 0.8 }, 0, 2.2, P, 2, 0.3), { tone: "mid" })));
  const ties = [];
  for (let x = x0 + 4; x < x1 - 2; x += 8) ties.push(k.lineOnTop([x, y - 7.5], [x, y + 7.5], 0, P));
  flat.unshift(Ln(ties.join(""), { tone: "faint" }));
  [-5, 5].forEach((dy, i) => R_rail(name + i, { x: x0, y: y + dy - 1.4, w: x1 - x0, d: 2.8, r: 0.8 }));
};
const R_rail = (name, plan) => F.R.solid(A.slab(plan, 0, 2.2, { name: `rail.${name}` }, 2));
railPair(DOCK_X - 12, TABLE.x - 1, 0, "main");
LANES.forEach((y, i) => railPair(LANE_FROM, LANE_TO - 4, y, `lane${i}`));
// transfer table guides (along y) and the moving table
const guides = [TABLE.x + 4, TABLE.x + TABLE.w - 4].map((x) => S(k.slabOf({ x: x - 1.6, y: LANES[0] - 20, w: 3.2, d: LANES[2] - LANES[0] + 40, r: 0.8 }, 0, 1.6, P, 2, 0.3), { tone: "lo" }));
flat.unshift(...guides);
const tableSvg = [
  S(k.slabOf(TABLE, 1.6, 2.6, P, 3, 0.5), { tone: "mid", inner: Ln(k.sideSeam(TABLE, 2.9, P, 3), { tone: "faint" }) }),
  ...[-5, 5].map((dy) => S(k.slabOf({ x: TABLE.x + 1, y: dy - 1.4, w: TABLE.w - 2, d: 2.8, r: 0.8 }, 4.2, 1.2, P, 2, 0.2), { tone: "mid" })),
  Dots(k.corners(TABLE, 3).map(([x, y]) => at([x, y, 4.2])), { size: 0.4 }),
].join("");

// ---------- tall static things, depth-settled ----------
// dock buffer stop
slab("dock.stop", { x: DOCK_X - 22, y: -9, w: 6, d: 18, r: 1.2 }, 0, 9, { tone: "mid" }, { steps: 3, bevel: 0.5, extra: Dots([at([DOCK_X - 19, -5, 9]), at([DOCK_X - 19, 5, 9])], { size: 0.4 }) });
// bulkhead the queue tube comes from
const BULK = { x: DOCK_X - 18, y: -70, w: 36, d: 6, r: 1.5 };
slab("bulkhead", BULK, 0, 84, { tone: "mid" }, { steps: 3, bevel: 0.6, inner: Ln(k.sideSeam(BULK, 10, P, 3), { tone: "faint" }), extra: Dots([[BULK.x + 4, 6], [BULK.x + BULK.w - 4, 6], [BULK.x + 4, 78], [BULK.x + BULK.w - 4, 78]].map(([x, z]) => at([x, BULK.y + BULK.d, z])), { size: 0.45 }) });
// gate: two posts, a lintel, a pin housing
const GATE_POST = (y) => ({ x: GATE_X - 4, y: y - 3, w: 8, d: 6, r: 1 });
slab("gate.post.far", GATE_POST(-15), 0, PIN_TOP, { tone: "mid" }, { steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(GATE_POST(-15), 6, P, 3), { tone: "faint" }) });
slab("gate.post.near", GATE_POST(15), 0, PIN_TOP, { tone: "mid" }, { steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(GATE_POST(15), 6, P, 3), { tone: "faint" }) });
const LINTEL = { x: GATE_X - 9, y: -19, w: 18, d: 38, r: 2 };
slab("gate.lintel", LINTEL, PIN_TOP, 8, { tone: "hi" }, { bevel: 0.7, bias: 60, inner: Ln(k.sideSeam(LINTEL, PIN_TOP + 4, P, 4), { tone: "faint" }), extra: Dots([-6, -2, 2, 6].map((dx) => at([GATE_X + dx, 0, PIN_TOP + 8])), { size: 0.55, tone: "hi" }) + Ln(k.planOutline(k.insetPlan(LINTEL, 2.5), PIN_TOP + 8, P, 3), { tone: "faint" }) });
// bays: the three model lanes end in a bay sized to the model
BAYS.forEach(({ model, y, w, d, h }) => {
  const plan = { x: LANE_TO - 2, y: y - d / 2, w, d, r: 2.5 };
  slab(`bay.${model}.base`, k.insetPlan(plan, -2), 0, 2.5, { tone: "lo" }, { bevel: 0.4 });
  slab(`bay.${model}`, plan, 2.5, h, { tone: "hi" }, {
    bevel: 0.8,
    inner: Ln(k.sideSeam(plan, 8, P, 4), { tone: "faint" }),
    extra: [
      Ln(k.planOutline(k.insetPlan(plan, 3), 2.5 + h, P, 3), { tone: "faint" }),
      Ln(Array.from({ length: 4 }, (_, i) => k.pathOf([[plan.x + 6 + i * 4.4, plan.y + d, 8], [plan.x + 8.6 + i * 4.4, plan.y + d, 8], [plan.x + 8.6 + i * 4.4, plan.y + d, h - 4], [plan.x + 6 + i * 4.4, plan.y + d, h - 4]].map(at), true)).join(""), { tone: "lo" }),
      Dots(k.corners(plan, 3.5).map(([cx, cy]) => at([cx, cy, 2.5 + h])), { size: 0.4 }),
    ].join(""),
  });
  post(`bay.${model}.lamp`, plan.x + w - 6, y, 2.6, 2.5 + h, 2.2, { tone: "mid" }, { steps: 20, attrs: ` data-bay="${model}"` });
});
// tool-call progress strip along the front
{
  const strip = { x: -24, y: STRIP_Y - 4, w: 96, d: 8, r: 2 };
  slab("strip", strip, 0, 3, { tone: "mid" }, { steps: 3, bevel: 0.5 });
  for (let i = 0; i < 6; i++) post(`strip.lamp${i}`, strip.x + 10 + i * 15, STRIP_Y, 2.6, 3, 1.6, { tone: "mid" }, { steps: 20, attrs: ` data-step="${i}"` });
}

// the queue tube: down from the bulkhead to the dock
const route = G.fillet([[DOCK_X, BULK.y + BULK.d, 74], [DOCK_X, -8, 74], [DOCK_X, 0, 74], [DOCK_X, 0, 26]], 14, 10, { P, tube: 6 });
{
  const total = G.pathLength(route);
  const gaps = [[0, 3], [total - 3, total]];
  F.R.route("tube.queue", route, 6, { gaps, rims: [8.4, 8.4], free: [false, true], piece: "fig" });
  tubePieces(route, 6, P, { maxLength: 14, spacing: 1.6, gaps }).forEach((piece, i) => put(`tube:${i}`, piece.mid, `<g class="fx-glass">${tubeSvg(piece, { tone: "mid" })}</g>`, [A.tube(piece.points, piece.radii)], { bias: 30 }));
  [0, 1].forEach((end) => {
    const p = end ? route[route.length - 1] : route[0];
    const tangent = G.tangentAlong(route, end ? total : 0);
    const Fr = G.frameAlong(p, tangent);
    const [s0, s1] = end ? [-3, 0] : [0, 3];
    const shape = F.R.solid(A.disc(Fr, s0, s1, 8.4, { name: `tube.collar${end}`, owner: "tube.queue" }));
    put(`tube.collar${end}`, G.add3(p, G.mul3(tangent, (s0 + s1) / 2)), S(G.disc(s0, s1, 8.4, Fr, P, { bevel: 0.3 }), { tone: "mid" }), [shape], { bias: 30.1 });
  });
}
// the lower collar needs a hanger to the bulkhead so it doesn't float
{
  const RF = G.frameOf([DOCK_X, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const shape = F.R.solid(A.ring(RF, 23, 26, 6.6, 10, { name: "dock.receiver" }));
  put("dock.receiver", [DOCK_X, 0, 24.5], S(G.ringBand(23, 26, 6.6, 10, RF, P, { bevel: 0.3 }), { tone: "mid" }), [shape], { bias: 30 });
}
slab("tube.hanger", { x: DOCK_X - 2, y: BULK.y + BULK.d, w: 4, d: -9.95 - BULK.y - BULK.d, r: 0.8 }, 23, 3, { tone: "mid" }, { steps: 2, bevel: 0.3, bias: 30 });

const tall = F.finish();

// ---------- moving parts, built at rest and moved with translateAlong ----------
const capF = G.frameOf([-12, 0, CAP_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const capProfile = [[0, 0], [0.5, 2.8, 1], [1.8, 4.2, 1], [3.2, CAP_R], [20.8, CAP_R], [22.2, 4.2, 1], [23.5, 2.8, 1], [24, 0]];
const capsuleSvg = `<g class="fx-capsule-body">${S(G.solidOf(capProfile, capF, P, { steps: 40 }), { tone: "hi", lit: true, inner: Ln(G.arcOf(capF, 6, CAP_R, P) + G.arcOf(capF, 18, CAP_R, P), { tone: "lo" }) })}</g>`;
const carriageSvg = [
  `<path class="iso-halo" d="${k.haloOf(k.insetPlan(CAR, 2), 2.2, 0.1, P)}" style="filter:blur(3px)"/>`,
  S(k.slabOf(CAR, 2.2, CAR_TOP - 2.2, P, 3, 0.6), { tone: "mid", inner: Ln(k.sideSeam(CAR, 4.2, P, 3), { tone: "faint" }) }),
  S(k.slabOf({ x: -11, y: -3.5, w: 3, d: 7, r: 0.6 }, CAR_TOP, 3, P, 2, 0.3), { tone: "mid" }),
  S(k.slabOf({ x: 8, y: -3.5, w: 3, d: 7, r: 0.6 }, CAR_TOP, 3, P, 2, 0.3), { tone: "mid" }),
  Dots(k.corners(CAR, 2.6).map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.4 }),
].join("");
const pinsSvg = [-6, -2, 2, 6].map((dx) => S(k.cylinder(GATE_X + dx, 0, 1.5, PIN_BOTTOM, PIN_TOP - PIN_BOTTOM, P, 16), { tone: "hi", crease: "none" })).join("");
const barrierSvg = S(k.slabOf({ x: GATE_X + 7, y: -13, w: 3, d: 26, r: 1 }, 9, 3, P, 2, 0.4), { tone: "hi", crease: "lo" });

// Painter's slots: tall items carry their depth key so the live code can slot the carriage.
const tallKeys = F.R.items.map((item) => round2(item.key));
const body = [
  ...base,
  `<g class="fx-flat">${flat.join("")}<g data-part="table">${tableSvg}</g></g>`,
  `<g data-part="stack">`,
  tall.replace(/<g class="it" data-name="([^"]+)"/g, (m, name) => `${m} data-key="${tallKeys[F.R.items.findIndex((it) => it.name === name)]}"`),
  `<g data-part="carriage"><g data-part="capsule">${capsuleSvg}</g>${carriageSvg}</g>`,
  `<g data-part="pins">${pinsSvg}</g>`,
  `<g data-part="barrier">${barrierSvg}</g>`,
  `</g>`,
];
const svg = k.figureSvg({
  width: W,
  height: H,
  label: "A dispatch bench. A job capsule drops from the queue tube onto a carriage. At a gate, four pins read the app's OAuth scope before the barrier lifts. A transfer table shifts the carriage onto one of three lanes, for haiku, sonnet or opus, each ending in a bay sized to its model. A row of lamps lights for each tool call while the bay runs, and the result rides back up the tube.",
  body,
});

export const DATA = {
  P,
  V: V.map(round2),
  dock: DOCK_X,
  gate: GATE_X,
  table: TABLE_X,
  lanes: LANES,
  bay: BAY_STOP,
  models: BAYS.map((b) => b.model),
  carZ: CAP_Z,
};
export const SVG = svg;
export const STATS = { items: F.R.items.length };
export const audit = () => A.auditOrExit(F.R, P, {});
