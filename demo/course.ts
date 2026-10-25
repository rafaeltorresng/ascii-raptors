import { cameraBasis } from '../src/ascii.ts';
import type { FlightPose } from '../src/flight.ts';
import { clamp } from '../src/math.ts';
import { SKY_LAYOUT, skySpriteSize } from './layout.ts';

export type FlyerId =
  | 'swallow-tailed-kite'
  | 'golden-eagle'
  | 'peregrine-falcon'
  | 'bald-eagle'
  | 'california-condor';
export interface FlightCourse {
  x: number;
  y: number;
  vx: number;
  vy: number;
  yaw: number;
  bank: number;
  pitch: number;
  scale: number;
  /** Smooth glide → powered flight envelope; stroke frequency stays species-authored. */
  effort: number;
}

type Point = readonly [number, number];
interface Pilot {
  cruise: number;
  phase: number;
  bankGain: number;
  bankLimit: number;
  baseScale: number;
  turnLimit: number;
  start: number;
  route: readonly Point[];
}

// Each route has its own phrasing, rather than scaling one shared orbit. Closed
// cubic B-splines have continuous curvature and stay inside their control hull.
// Kite: crossing sweeps; eagle: thermal and traverse; falcon: long diagonal
// passes; bald eagle: an open, lopsided circuit; condor: a broad inward crescent.
function points(count: number, shape: (angle: number) => Point): Point[] {
  return Array.from({ length: count }, (_, i) => shape((i * Math.PI * 2) / count));
}
const PILOTS: Record<FlyerId, Pilot> = {
  'swallow-tailed-kite': {
    cruise: 127,
    phase: 0.4,
    bankGain: 0.62,
    bankLimit: 0.46,
    baseScale: 0.84,
    turnLimit: 0.95,
    start: 0.86,
    route: points(20, (a) => [Math.sin(a), 0.88 * Math.sin(2 * a)]),
  },
  'golden-eagle': {
    cruise: 78,
    phase: 2.1,
    bankGain: 0.7,
    bankLimit: 0.4,
    baseScale: 0.9,
    turnLimit: 0.65,
    start: 0.366,
    route: points(18, (a) => [
      Math.cos(a) * (0.86 + 0.12 * Math.sin(a)),
      Math.sin(a) * (0.83 + 0.14 * Math.cos(a)),
    ]),
  },
  'peregrine-falcon': {
    cruise: 183,
    phase: 4.2,
    bankGain: 0.5,
    bankLimit: 0.5,
    baseScale: 0.74,
    turnLimit: 1.35,
    start: 0.374,
    route: points(22, (a) => [0.94 * Math.sin(a), 0.85 * Math.sin(2 * a + 0.32)]),
  },
  'bald-eagle': {
    cruise: 90,
    phase: 1.15,
    bankGain: 0.66,
    bankLimit: 0.42,
    baseScale: 0.92,
    turnLimit: 0.72,
    start: 0.414,
    route: points(18, (a) => [
      -Math.cos(a) * (0.84 + 0.13 * Math.cos(2 * a)),
      0.9 * Math.sin(a) + 0.08 * Math.sin(2 * a),
    ]),
  },
  'california-condor': {
    cruise: 68,
    phase: 3.4,
    bankGain: 0.55,
    bankLimit: 0.34,
    baseScale: 1.04,
    turnLimit: 0.6,
    start: 0.732,
    route: points(20, (a) => [
      Math.cos(a) * (0.9 - 0.08 * Math.sin(a)),
      0.9 * Math.sin(a) - 0.08 * Math.cos(2 * a),
    ]),
  },
};
export const FLYERS: readonly FlyerId[] = [
  'swallow-tailed-kite',
  'golden-eagle',
  'peregrine-falcon',
  'bald-eagle',
  'california-condor',
];
const TAU = Math.PI * 2;
const mod = (n: number, period: number) => ((n % period) + period) % period;

/** A periodic C2 envelope, with long resting/powered sections and soft shoulders. */
function episode(phase: number, center: number, width: number) {
  const distance = Math.abs(mod(phase - center + 0.5, 1) - 0.5);
  const x = clamp((1 - distance / width) / 0.55, 0, 1);
  return x * x * x * (10 + x * (-15 + x * 6));
}
function effortAt(id: FlyerId, phase: number) {
  switch (id) {
    case 'swallow-tailed-kite':
      return Math.max(episode(phase, 0.18, 0.16), episode(phase, 0.66, 0.13));
    case 'golden-eagle':
      return Math.max(episode(phase, 0.27, 0.15), episode(phase, 0.8, 0.12));
    case 'peregrine-falcon':
      return 1 - Math.max(episode(phase, 0.3, 0.1), episode(phase, 0.78, 0.11));
    case 'bald-eagle':
      return Math.max(episode(phase, 0.1, 0.17), episode(phase, 0.58, 0.14));
    case 'california-condor':
      return Math.max(episode(phase, 0.38, 0.11), episode(phase, 0.86, 0.08));
  }
}

/** Ventral camera: model yaw whose nose matches a screen heading (0 = right, y down). */
export function yawForHeading(heading: number) {
  const { right, up } = cameraBasis('ventral');
  const column = -right.x * -up.y - right.y * up.x;
  const sinYaw = (-up.y * Math.cos(heading) - right.y * Math.sin(heading)) / column;
  const cosYaw = (-right.x * Math.sin(heading) - up.x * Math.cos(heading)) / column;
  return Math.atan2(sinYaw, cosYaw);
}

export function flightBounds(id: FlyerId, viewport: { width: number; height: number }) {
  const { bulk, radius, frame } = SKY_LAYOUT[id];
  const { width, height } = viewport;
  const size = skySpriteSize(bulk, width, height);
  const reach = (size * PILOTS[id].baseScale * radius) / frame + 8;
  // Reserve room from the enlarged silhouette, not just its centre. On a very
  // narrow screen, keep a small lateral corridor rather than pinning a giant
  // condor in place; a few outer primaries can reach the edge during a bank.
  const reserve = width < 700 ? 0.82 : 0.9;
  const cap =
    width < height && id !== 'swallow-tailed-kite' && id !== 'peregrine-falcon' ? 0.38 : 0.32;
  const mx = Math.min(reach * reserve, width * cap);
  const my = Math.min(reach * reserve, height * 0.36);
  return {
    cx: width * 0.5,
    cy: height * 0.5,
    rx: Math.max(1, width * 0.5 - mx),
    ry: Math.max(1, height * 0.5 - my),
  };
}

function spline(points: readonly Point[], u: number, rx: number, ry: number) {
  const n = points.length,
    whole = Math.floor(u),
    t = u - whole;
  const a = points[mod(whole - 1, n)],
    b = points[mod(whole, n)],
    c = points[mod(whole + 1, n)],
    d = points[mod(whole + 2, n)];
  const basis = [
    (1 - t) ** 3 / 6,
    (3 * t ** 3 - 6 * t * t + 4) / 6,
    (-3 * t ** 3 + 3 * t * t + 3 * t + 1) / 6,
    t ** 3 / 6,
  ];
  const first = [-((1 - t) ** 2) / 2, 1.5 * t * t - 2 * t, -1.5 * t * t + t + 0.5, (t * t) / 2];
  const second = [1 - t, 3 * t - 2, 1 - 3 * t, t];
  const p = [a, b, c, d];
  const sum = (weights: number[], axis: 0 | 1) =>
    p.reduce((v, q, i) => v + q[axis] * weights[i], 0) * (axis === 0 ? rx : ry);
  return {
    x: sum(basis, 0),
    y: sum(basis, 1),
    dx: sum(first, 0),
    dy: sum(first, 1),
    ddx: sum(second, 0),
    ddy: sum(second, 1),
  };
}
// A stretched ellipse has tiny turning radii at its ends. For the large
// soarers, round those ends into a capsule with long traverses instead of
// letting viewport compression make them pivot almost on the spot.
function fitRoute(id: FlyerId, points: readonly Point[], rx: number, ry: number): readonly Point[] {
  if (
    id === 'swallow-tailed-kite' ||
    id === 'peregrine-falcon' ||
    Math.max(rx, ry) / Math.min(rx, ry) < 2.25
  )
    return points;
  const horizontal = rx > ry,
    radius = Math.min(rx, ry),
    end = Math.max(rx, ry) - radius;
  const cap: Point[] = [];
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + side * Math.PI + (i * Math.PI) / 8;
      const x = (side === 0 ? end : -end) + radius * Math.cos(a);
      const y = radius * Math.sin(a);
      cap.push(horizontal ? [x / rx, y / ry] : [y / rx, x / ry]);
    }
    cap.push(horizontal ? [0, side === 0 ? 1 : -1] : [side === 0 ? 1 : -1, 0]);
  }
  return id === 'bald-eagle' ? cap.reverse() : cap;
}
interface Sample {
  u: number;
  time: number;
  rate: number;
  distance: number;
}
interface Route {
  points: readonly Point[];
  bounds: ReturnType<typeof flightBounds>;
  samples: Sample[];
  period: number;
  length: number;
}
const routes = new Map<string, Route>();
function routeFor(id: FlyerId, width: number, height: number) {
  const key = `${id}:${width}x${height}`;
  const cached = routes.get(key);
  if (cached) return cached;
  const pilot = PILOTS[id],
    bounds = flightBounds(id, { width, height });
  const authored =
    width < height && (id === 'swallow-tailed-kite' || id === 'peregrine-falcon')
      ? pilot.route.map(([x, y]) => [y, x] as Point)
      : pilot.route;
  const points = fitRoute(id, authored, bounds.rx, bounds.ry);
  const n = points.length,
    count = n * 64;
  const pace = clamp(Math.min(width, height) / 820, 0.62, 1.2);
  const geometry = Array.from({ length: count + 1 }, (_, i) => {
    const u = (i * n) / count,
      p = spline(points, u, bounds.rx, bounds.ry);
    const length = Math.hypot(p.dx, p.dy);
    const curvature = Math.abs(p.dx * p.ddy - p.dy * p.ddx) / Math.max(1e-6, length ** 3);
    return { u, length, curvature, distance: 0 };
  });
  for (let i = 1; i < geometry.length; i++)
    geometry[i].distance =
      geometry[i - 1].distance + ((geometry[i - 1].length + geometry[i].length) * 0.5 * n) / count;
  const length = geometry[geometry.length - 1].distance;
  const samples: Sample[] = [];
  let time = 0,
    previousRate = 0;
  for (let i = 0; i <= count; i++) {
    const p = geometry[i],
      phase = p.distance / length;
    const effort = effortAt(id, phase);
    const cruise =
      pilot.cruise * pace * (0.78 + 0.48 * effort + 0.08 * Math.sin(phase * TAU + pilot.phase));
    // Slow before a tight bend, retaining a finite turn radius and readable
    // silhouettes on phones. Smooth minimum avoids a hard acceleration edge.
    const quick = id === 'swallow-tailed-kite' || id === 'peregrine-falcon';
    const turnLimit = pilot.turnLimit * (width < 700 ? (quick ? 1.35 : 1.6) : 1);
    const corner = turnLimit / Math.max(0.00001, p.curvature);
    const speed = cruise / (1 + (cruise / corner) ** 4) ** 0.25;
    const rate = p.length / Math.max(1, speed);
    if (i) time += ((previousRate + rate) * 0.5 * n) / count;
    samples.push({ u: p.u, time, rate, distance: p.distance });
    previousRate = rate;
  }
  const result = { points, bounds, samples, period: time, length };
  // One current viewport plus a few QA/responsive sizes; never an unbounded cache.
  if (routes.size >= 20) routes.delete(routes.keys().next().value!);
  routes.set(key, result);
  return result;
}

function sampleRoute(route: Route, time: number) {
  const { samples, bounds } = route;
  const at = mod(time, route.period);
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (samples[mid].time <= at) lo = mid;
    else hi = mid;
  }
  const a = samples[lo],
    b = samples[hi],
    duration = b.time - a.time,
    s = (at - a.time) / duration;
  // Cubic Hermite inverse arc-time lookup: position and velocity are continuous,
  // including the loop seam. Seeking and frame-rate changes produce the same pose.
  const m0 = duration / a.rate,
    m1 = duration / b.rate,
    delta = b.u - a.u;
  const u =
    a.u + (-2 * s ** 3 + 3 * s * s) * delta + (s ** 3 - 2 * s * s + s) * m0 + (s ** 3 - s * s) * m1;
  const du =
    ((-6 * s * s + 6 * s) * delta + (3 * s * s - 4 * s + 1) * m0 + (3 * s * s - 2 * s) * m1) /
    duration;
  const p = spline(route.points, u, bounds.rx, bounds.ry);
  const vx = p.dx * du,
    vy = p.dy * du,
    heading = Math.atan2(vy, vx);
  const curvature = (p.dx * p.ddy - p.dy * p.ddx) / Math.max(1e-6, Math.hypot(p.dx, p.dy) ** 3);
  const turn = curvature * Math.hypot(vx, vy);
  const distance = a.distance + ((b.distance - a.distance) * (u - a.u)) / (b.u - a.u);
  return { x: p.x, y: p.y, vx, vy, heading, turn, phase: distance / route.length };
}

export function flightCourse(
  species: FlyerId,
  time: number,
  viewport: { width: number; height: number },
): FlightCourse {
  if (
    !Number.isFinite(time) ||
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height)
  )
    throw new RangeError('Flight course requires finite time and viewport');
  const width = Math.max(1, Math.round(viewport.width)),
    height = Math.max(1, Math.round(viewport.height));
  const pilot = PILOTS[species],
    route = routeFor(species, width, height),
    clock = Math.max(0, time);
  const { samples, bounds } = route;
  const start = pilot.start * (samples.length - 1);
  const before = samples[Math.floor(start)],
    after = samples[Math.ceil(start)];
  const offset = before.time + (after.time - before.time) * (start - Math.floor(start));
  const at = mod(clock + offset, route.period);
  const p = sampleRoute(route, at);
  // A small, time-based anticipation filter coordinates roll with the coming
  // bend and softens the glide/flap envelope. Stateless: seeking, pause and
  // reduced-motion still resolve to exactly the same frame.
  const weights = [1, 4, 6, 4, 1];
  let bank = 0,
    effort = 0;
  for (let i = 0; i < weights.length; i++) {
    const offset = (i - 2) * 0.2;
    const roll = sampleRoute(route, at + offset + 0.12);
    const gait = offset === 0 ? p : sampleRoute(route, at + offset);
    bank +=
      (-pilot.bankLimit * Math.tanh((roll.turn * pilot.bankGain) / pilot.bankLimit) * weights[i]) /
      16;
    effort += (effortAt(species, gait.phase) * weights[i]) / 16;
  }
  const depth = 0.5 + 0.5 * Math.sin(clock * 0.11 + pilot.phase);
  return {
    x: (bounds.cx + p.x) / width,
    y: (bounds.cy + p.y) / height,
    vx: p.vx / width,
    vy: p.vy / height,
    yaw: yawForHeading(p.heading),
    bank,
    pitch: -Math.sin(p.heading) * 0.025 + 0.014 * (effort - 0.5),
    scale: pilot.baseScale * (0.9 + 0.1 * depth),
    effort: effort,
  };
}

const TAIL = {
  'swallow-tailed-kite': { yaw: -0.25, spread: 0.3 },
  'golden-eagle': { yaw: -0.22, spread: 0.48 },
  'peregrine-falcon': { yaw: -0.31, spread: 0.52 },
  'bald-eagle': { yaw: -0.22, spread: 0.48 },
  'california-condor': { yaw: -0.22, spread: 0.48 },
} as const;

/** Keep the species stroke. Body and tail coordinate with the route's turn. */
export function steerPose(pose: FlightPose, course: FlightCourse, species: FlyerId): FlightPose {
  const tail = TAIL[species],
    bankDelta = course.bank - pose.bank;
  return {
    ...pose,
    x: 0,
    y: 0,
    z: 0,
    yaw: course.yaw,
    bank: course.bank,
    pitch: pose.pitch + course.pitch,
    tailYaw: pose.tailYaw + tail.yaw * bankDelta,
    tailSpread: pose.tailSpread + tail.spread * (Math.abs(course.bank) - Math.abs(pose.bank)),
  };
}
