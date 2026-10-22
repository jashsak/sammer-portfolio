// Shared drawing helpers for the portfolio figures (anatomy kit, vendored in ./kit).
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";
import * as A from "./kit/audit.mjs";

export { k, G, A };

export function makeFigure(P) {
  const R = A.recorder(P);
  const KS = G.scaleOf(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

  const put = (name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) => R.put({ name: R.nameFor(name), at: ref, bias, svg, shapes, piece: "fig", ...rest });

  function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0.6, extra = "", inner = "", bias = 0, attrs = "" } = {}) {
    const shape = R.solid(A.slab(plan, z, h, { name }, steps));
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
    return shape;
  }

  function post(name, cx, cy, r, z, h, style = {}, { steps = 28, bevel = 0, extra = "", inner = "", bias = 0, attrs = "" } = {}) {
    const shape = R.solid(A.cylinder(cx, cy, r, z, h, { name }));
    put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
    return shape;
  }

  // Base plate on feet with groove, corner screws and a ruler strip.
  function bench(PLATE, { plateH = 10, footH = 5, ruler = true } = {}) {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -plateH - footH, plateH, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(S(k.cylinder(x, y, 7, -plateH - footH, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -plateH - footH + 1.6, footH - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -plateH, plateH, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -plateH / 2, P, 8), { tone: "faint" }) }));
    out.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const screws = k.corners(PLATE, 10);
    out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    R.solid(A.slab(PLATE, -plateH, plateH, { name: "stand.plate", ground: true }, 8));
    if (ruler) {
      const strip = { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 14, w: PLATE.w - 48, d: 6, r: 1 };
      out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
      const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y, 0.6, [1.8, 3.4], P);
      out.push(Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }));
      out.push(Dots([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
    }
    return out.join("");
  }

  // A glass pneumatic tube with a collar at each end. Returns the filleted route.
  function tube(name, points, r, { bend = 14, collar = r + 2.2, collarH = 3, tone = "mid", maxLength = 14, glass = true } = {}) {
    const route = G.fillet(points, bend, 10, { P, tube: r });
    const total = G.pathLength(route);
    const gaps = [[0, collarH], [total - collarH, total]];
    R.route(name, route, r, { gaps, rims: [collar, collar], piece: "fig" });
    tubePieces(route, r, P, { maxLength, spacing: 1.6, gaps }).forEach((piece, index) =>
      put(`${name}:${index}`, piece.mid, `<g class="${glass ? "fx-glass" : ""}">${tubeSvg(piece, { tone })}</g>`, [A.tube(piece.points, piece.radii)], { bias: 0.05, route: name }),
    );
    [0, 1].forEach((end) => {
      const p = end ? route[route.length - 1] : route[0];
      const tangent = G.tangentAlong(route, end ? total : 0);
      const F = G.frameAlong(p, tangent);
      const [s0, s1] = end ? [-collarH, 0] : [0, collarH];
      const shape = R.solid(A.disc(F, s0, s1, collar, { name: `${name}.collar${end}`, owner: name }));
      put(`${name}.collar${end}`, G.add3(p, G.mul3(tangent, (s0 + s1) / 2)), S(G.disc(s0, s1, collar, F, P, { bevel: 0.3 }), { tone: "mid" }), [shape], { bias: 0.1 });
    });
    return route;
  }

  let done = false;
  function finish(keep = () => true) {
    if (!done) { A.settle(R, P); R.items.sort((a, b) => a.key - b.key); done = true; }
    return R.items.filter((item) => keep(item.name)).map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`).join("");
  }

  return { R, KS, at, S, Ln, Dots, byDepth, put, slab, post, bench, tube, finish };
}

export const round2 = (v) => Math.round(v * 100) / 100;
export const screenRoute = (route, P, spacing = 1.5) => G.resample(route, spacing).map((p) => k.iso(p, P).map(round2));

export function planeMatrix(P, o, ex, ey) {
  const p0 = k.iso(o, P);
  const px = k.iso(G.add3(o, ex), P);
  const py = k.iso(G.add3(o, ey), P);
  const v = (x) => x.toFixed(4);
  return `matrix(${v(px[0] - p0[0])} ${v(px[1] - p0[1])} ${v(py[0] - p0[0])} ${v(py[1] - p0[1])} ${p0[0].toFixed(2)} ${p0[1].toFixed(2)})`;
}
