import {
  around,
  cross,
  lerp,
  normalized,
  rotateX,
  rotateY,
  rotateZ,
  smoothstep,
  sub,
  v3,
} from './math.ts';
import type { Vec3 } from './math.ts';
import type { FlightPose } from './flight.ts';

export type Material =
  | 'flight'
  | 'lining'
  | 'white'
  | 'back'
  | 'beak'
  | 'eye'
  | 'eagle-body'
  | 'eagle-coverts'
  | 'eagle-flight'
  | 'eagle-nape'
  | 'falcon-back'
  | 'falcon-breast'
  | 'falcon-head'
  | 'falcon-hood'
  | 'falcon-flight'
  | 'cere';
interface Vertex {
  point: Vec3;
  u: number;
  v: number;
  side: number;
  region: 'body' | 'wing' | 'tail' | 'head';
}
export interface Face {
  a: number;
  b: number;
  c: number;
  material: Material;
  id: number;
}
export interface BirdMesh {
  vertices: Vertex[];
  faces: Face[];
}
export interface TransformedMesh {
  positions: Float32Array;
  faces: Face[];
}

export const SHOULDER = v3(0.22, 0.3, 0.025);
export const ELBOW = v3(1.02, 0.39, 0.025);
export const WRIST = v3(1.7, 0.65, 0.025);

/** Coupled elbow/wrist folding. The left wing mirrors the right, before body attitude. */
export function wingPoint(point: Vec3, side: number, pose: FlightPose): Vec3 {
  let p = point;
  const wristWeight = smoothstep(WRIST.x - 0.08, WRIST.x + 0.08, point.x);
  const elbowWeight = smoothstep(ELBOW.x - 0.08, ELBOW.x + 0.08, point.x);
  p = around(p, WRIST, -pose.tip * wristWeight, -pose.fold * 0.85 * wristWeight);
  p = around(p, ELBOW, -pose.elbow * elbowWeight, -pose.fold * elbowWeight);
  p = around(p, SHOULDER, -pose.lift + side * pose.bank * 0.035);
  return v3(p.x * side, p.y, p.z);
}

/** All control points and surfaces are original; no meshes or art from ascii-sharks. */
export function createKite(): BirdMesh {
  const vertices: Vertex[] = [],
    faces: Face[] = [];
  let surfaceId = 1;
  const vertex = (point: Vec3, u: number, v: number, side: number, region: Vertex['region']) => {
    vertices.push({ point, u, v, side, region });
    return vertices.length - 1;
  };
  const triangle = (a: number, b: number, c: number, material: Material, id: number) => {
    if (vertices[a].region === 'wing' || vertices[a].region === 'tail') {
      const n = cross(
        sub(vertices[b].point, vertices[a].point),
        sub(vertices[c].point, vertices[a].point),
      );
      if (n.z < 0) [b, c] = [c, b];
    }
    faces.push({ a, b, c, material, id });
  };

  function ellipsoid(
    center: Vec3,
    radius: Vec3,
    material: Material,
    region: Vertex['region'],
    rings = 12,
    sectors = 20,
  ) {
    const start = vertices.length,
      id = surfaceId++;
    for (let r = 0; r <= rings; r++) {
      const lat = (Math.PI * r) / rings;
      for (let s = 0; s <= sectors; s++) {
        const a = (Math.PI * 2 * s) / sectors;
        vertex(
          v3(
            center.x + radius.x * Math.sin(lat) * Math.cos(a),
            center.y + radius.y * Math.cos(lat),
            center.z + radius.z * Math.sin(lat) * Math.sin(a),
          ),
          s / sectors,
          r / rings,
          0,
          region,
        );
      }
    }
    for (let r = 0; r < rings; r++)
      for (let s = 0; s < sectors; s++) {
        const a = start + r * (sectors + 1) + s,
          b = a + sectors + 1;
        triangle(a, a + 1, b, material, id);
        triangle(b, a + 1, b + 1, material, id);
      }
  }

  function feather(
    root: Vec3,
    tip: Vec3,
    width: number,
    side: number,
    region: 'wing' | 'tail',
    material: Material,
    bend = 0,
  ) {
    const start = vertices.length,
      id = surfaceId++,
      segments = 7,
      across = 4;
    const dx = tip.x - root.x,
      dy = tip.y - root.y,
      length = Math.hypot(dx, dy);
    const nx = -dy / length,
      ny = dx / length;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const w = width * Math.pow(Math.sin(Math.PI * (0.035 + t * 0.965)), 0.48) * (1 - t * 0.18);
      for (let k = 0; k <= across; k++) {
        const q = (k / across) * 2 - 1;
        vertex(
          v3(
            lerp(root.x, tip.x, t) + nx * w * q + bend * Math.sin(Math.PI * t),
            lerp(root.y, tip.y, t) + ny * w * q,
            lerp(root.z, tip.z, t) + (1 - q * q) * Math.sin(Math.PI * t) * 0.018,
          ),
          t,
          q * 0.5 + 0.5,
          side,
          region,
        );
      }
    }
    for (let j = 0; j < segments; j++)
      for (let k = 0; k < across; k++) {
        const a = start + j * (across + 1) + k,
          b = a + across + 1;
        triangle(a, a + 1, b, material, id);
        triangle(b, a + 1, b + 1, material, id);
      }
  }

  // Six paired rectrices graduate outwards into the deeply forked tail.
  for (const side of [-1, 1])
    for (let i = 5; i >= 0; i--) {
      const u = i / 5;
      feather(
        v3(0.025 + i * 0.025, -0.41, 0.008),
        v3(0.025 + u * 0.36, -0.98 - 0.93 * Math.pow(u, 1.12), 0.025),
        0.068 + u * 0.009,
        side,
        'tail',
        'flight',
        0.025,
      );
    }

  // Secondary feathers: from forearm towards the trailing edge.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 13; i++) {
      const t = i / 12,
        x = lerp(0.3, 1.63, t);
      feather(
        v3(x + 0.055, 0.34 + t * 0.26, 0.005),
        v3(x - 0.075, -0.18 - 0.13 * Math.sin(t * Math.PI), -0.014),
        0.073,
        side,
        'wing',
        'flight',
      );
    }
    // Tightly overlapping, tapered primaries. No eagle-like spread fingers.
    const tips = [
      v3(1.42, -0.26, 0),
      v3(1.59, -0.29, 0),
      v3(1.77, -0.3, 0),
      v3(1.96, -0.28, 0),
      v3(2.15, -0.22, 0),
      v3(2.33, -0.13, 0),
      v3(2.49, -0.01, 0),
      v3(2.65, 0.08, 0),
      v3(2.79, 0.14, 0),
      v3(2.89, 0.16, 0),
    ];
    for (let i = 0; i < tips.length; i++) {
      const t = i / 9;
      feather(
        v3(1.44 + t * 0.33, 0.54 + t * 0.11, 0.012),
        tips[i],
        0.085 - t * 0.03,
        side,
        'wing',
        'flight',
        -0.02,
      );
    }
    // Continuous leading surface; ventral white wing lining, dorsal black back.
    const leading = [
      v3(0.18, 0.4, 0.045),
      v3(0.55, 0.51, 0.045),
      v3(1.02, 0.57, 0.045),
      v3(1.7, 0.76, 0.045),
      v3(2.07, 0.65, 0.025),
      v3(2.45, 0.44, 0.014),
      v3(2.89, 0.16, 0.008),
    ];
    const trailing = [
      v3(0.22, -0.13, 0.035),
      v3(0.55, -0.1, 0.035),
      v3(1.02, -0.03, 0.035),
      v3(1.7, 0.18, 0.035),
      v3(2.07, 0.28, 0.024),
      v3(2.45, 0.33, 0.014),
      v3(2.89, 0.16, 0.008),
    ];
    const id = surfaceId++;
    for (let i = 0; i < leading.length - 1; i++) {
      const a = vertex(leading[i], i / 6, 0, side, 'wing'),
        b = vertex(trailing[i], i / 6, 1, side, 'wing');
      const c = vertex(leading[i + 1], (i + 1) / 6, 0, side, 'wing'),
        d = vertex(trailing[i + 1], (i + 1) / 6, 1, side, 'wing');
      const material: Material = i >= 3 ? 'flight' : 'lining';
      triangle(a, b, c, material, id);
      triangle(b, d, c, material, id);
    }
    // Fine overlapping covert rows make the lining feel feathered, rather than a flat panel.
    for (let i = 0; i < 12; i++) {
      const t = i / 11,
        x = 0.35 + t * 1.38;
      feather(
        v3(x, 0.4 + t * 0.22, 0.056),
        v3(x - 0.045, 0.015 + t * 0.19, 0.058),
        0.069,
        side,
        'wing',
        'lining',
      );
    }
  }

  ellipsoid(v3(0, 0.08, 0), v3(0.205, 0.59, 0.19), 'white', 'body');
  ellipsoid(v3(0, 0.13, 0.115), v3(0.175, 0.44, 0.095), 'back', 'body');
  ellipsoid(v3(0, 0.48, 0.015), v3(0.128, 0.28, 0.125), 'white', 'head');
  ellipsoid(v3(0, 0.72, 0.045), v3(0.142, 0.19, 0.14), 'white', 'head');
  ellipsoid(v3(0, 0.905, 0.018), v3(0.069, 0.095, 0.055), 'beak', 'head', 7, 12);
  // Small hooked bill, not a long triangular beak.
  ellipsoid(v3(0, 0.957, -0.024), v3(0.039, 0.042, 0.061), 'beak', 'head', 6, 10);
  for (const side of [-1, 1])
    ellipsoid(v3(side * 0.13, 0.77, 0.075), v3(0.024, 0.025, 0.024), 'eye', 'head', 5, 8);
  return { vertices, faces };
}

export function transformKite(
  mesh: BirdMesh,
  pose: FlightPose,
  output?: Float32Array,
  flat = false,
): TransformedMesh {
  const positions = output ?? new Float32Array(mesh.vertices.length * 3);
  for (let i = 0; i < mesh.vertices.length; i++) {
    const v = mesh.vertices[i];
    let p: Vec3;
    if (v.region === 'wing') p = wingPoint(v.point, v.side, pose);
    else if (v.region === 'tail') {
      p = v3(v.point.x * v.side * pose.tailSpread, v.point.y + 0.42, v.point.z);
      p = rotateZ(rotateX(p, pose.tailPitch), pose.tailYaw);
      p.y -= 0.42;
    } else if (v.region === 'head') {
      const local = sub(v.point, v3(0, 0.44, 0));
      p = rotateX(rotateY(local, -pose.bank * 0.65), -pose.pitch * 0.6);
      p.y += 0.44;
    } else p = v.point;
    p = rotateZ(rotateX(rotateY(p, flat ? 0 : pose.bank), pose.pitch), pose.yaw);
    const j = i * 3;
    positions[j] = p.x + pose.x;
    positions[j + 1] = p.y + pose.y;
    positions[j + 2] = (flat ? 0 : p.z) + pose.z;
  }
  return { positions, faces: mesh.faces };
}

export function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return normalized(cross(sub(b, a), sub(c, a)));
}
