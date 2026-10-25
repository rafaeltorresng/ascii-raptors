import { clamp, lerp, smoothstep, TAU, v3 } from '../math.ts';
import type { FlightMode, FlightPose } from '../flight.ts';
import type { BirdMesh } from '../bird.ts';
import { MeshBuilder } from './mesh.ts';
import { transformArticulated } from './rig.ts';
import type { Rig } from './rig.ts';

export const FALCON_RIG: Rig = {
  shoulder: v3(0.21, 0.25, 0.035),
  elbow: v3(0.84, 0.4, 0.035),
  wrist: v3(1.47, 0.29, 0.035),
  elbowSweep: 0.78,
  wristSweep: 1.25,
  headAnchor: 0.42,
  tailAnchor: -0.43,
  headStabilization: 0.72,
};

/** Adult peregrine: compact chest, swept pointed hand, closed rounded tail, hood and malar stripes. */
export function createFalcon(): BirdMesh {
  const b = new MeshBuilder();
  for (const side of [-1, 1]) {
    for (let i = 5; i >= 0; i--) {
      const t = i / 5;
      b.feather(
        v3(0.012 + t * 0.06, -0.4, 0.005),
        v3(0.025 + t * 0.27, -1.29 + 0.11 * t * t, 0.015),
        0.067,
        side,
        'tail',
        'falcon-flight',
      );
    }
    for (let i = 0; i < 12; i++) {
      const t = i / 11,
        x = lerp(0.27, 1.48, t);
      b.feather(
        v3(x + 0.04, 0.32 + 0.12 * Math.sin(t * Math.PI), 0.005),
        v3(x - 0.12, -0.22 - 0.18 * Math.sin(t * Math.PI), -0.014),
        0.078,
        side,
        'wing',
        'falcon-flight',
      );
    }
    const tips = [
      v3(1.37, -0.44, 0),
      v3(1.53, -0.52, 0),
      v3(1.7, -0.58, 0),
      v3(1.88, -0.63, 0),
      v3(2.07, -0.64, 0),
      v3(2.25, -0.62, 0),
      v3(2.41, -0.57, 0),
      v3(2.54, -0.51, 0),
      v3(2.63, -0.43, 0),
      v3(2.69, -0.35, 0),
    ];
    for (let i = 0; i < tips.length; i++) {
      const t = i / 9;
      b.feather(
        v3(1.3 + t * 0.3, 0.33 - t * 0.09, 0.012),
        tips[i],
        0.088 - t * 0.034,
        side,
        'wing',
        'falcon-flight',
        -0.015,
      );
    }
    b.panel(
      [
        v3(0.18, 0.35, 0.048),
        v3(0.66, 0.49, 0.048),
        v3(1.17, 0.49, 0.05),
        v3(1.56, 0.31, 0.045),
        v3(2.03, -0.01, 0.035),
        v3(2.69, -0.35, 0.012),
      ],
      [
        v3(0.22, -0.12, 0.04),
        v3(0.66, -0.15, 0.04),
        v3(1.17, -0.14, 0.04),
        v3(1.56, -0.2, 0.035),
        v3(2.03, -0.31, 0.025),
        v3(2.69, -0.35, 0.012),
      ],
      side,
      'falcon-back',
    );
    for (let i = 0; i < 11; i++) {
      const t = i / 10,
        x = 0.32 + t * 1.25;
      b.feather(
        v3(x, 0.36 + 0.06 * Math.sin(t * Math.PI), 0.06),
        v3(x - 0.06, -0.12 + 0.05 * t, 0.06),
        0.074,
        side,
        'wing',
        'falcon-back',
      );
    }
  }
  b.ellipsoid(v3(0, 0.06, 0), v3(0.238, 0.56, 0.205), 'falcon-breast', 'body');
  b.ellipsoid(v3(0, 0.015, 0.13), v3(0.225, 0.51, 0.1), 'falcon-back', 'body');
  b.ellipsoid(v3(0, 0.51, 0.025), v3(0.15, 0.22, 0.145), 'falcon-head', 'head');
  b.ellipsoid(v3(0, 0.69, 0.035), v3(0.173, 0.18, 0.158), 'falcon-head', 'head');
  b.ellipsoid(v3(0, 0.683, 0.12), v3(0.176, 0.18, 0.095), 'falcon-hood', 'head');
  for (const side of [-1, 1]) {
    b.ellipsoid(
      v3(side * 0.155, 0.65, -0.027),
      v3(0.025, 0.076, 0.098),
      'falcon-hood',
      'head',
      8,
      12,
    );
    b.ellipsoid(v3(side * 0.159, 0.735, 0.043), v3(0.027, 0.029, 0.028), 'cere', 'head', 6, 10);
    b.ellipsoid(v3(side * 0.177, 0.738, 0.045), v3(0.017, 0.019, 0.019), 'eye', 'head', 5, 8);
  }
  b.ellipsoid(v3(0, 0.846, 0.018), v3(0.058, 0.048, 0.052), 'cere', 'head', 7, 12);
  b.ellipsoid(v3(0, 0.89, -0.007), v3(0.054, 0.058, 0.049), 'beak', 'head', 7, 12);
  b.ellipsoid(v3(0, 0.923, -0.044), v3(0.03, 0.025, 0.045), 'beak', 'head', 6, 10);
  // A peregrine's head meets its powerful chest with very little exposed neck.
  for (const vertex of b.mesh.vertices)
    if (vertex.region === 'head') vertex.point.y = 0.42 + (vertex.point.y - 0.42) * 0.76;
  return b.mesh;
}

export function falconPose(time: number, mode: FlightMode = 'soar', seed = 7): FlightPose {
  const t = Math.max(0, time),
    offset = (seed % 101) * 0.027,
    phase = (t * 2.1 + 0.21) % 1;
  const glideTime = t % 12;
  const glide = smoothstep(4.5, 5.3, glideTime) * (1 - smoothstep(7.7, 8.5, glideTime));
  const activity = mode === 'flap' ? 1 : mode === 'glide' ? 0 : 1 - glide;
  const beat = phase < 0.37 ? smoothstep(0, 0.37, phase) : 1 - smoothstep(0.37, 1, phase);
  const stroke = lerp(0.72, -0.61, beat),
    recovery = Math.sin(TAU * phase - 0.4);
  const curvature = 0.044 * Math.cos(t * 0.22 + offset) + 0.0399 * Math.cos(t * 0.57);
  const bank = clamp(-curvature * 5, -0.48, 0.48);
  return {
    time: t,
    activity,
    curvature,
    yaw: -0.2 + 0.2 * Math.sin(t * 0.22 + offset) + 0.07 * Math.sin(t * 0.57),
    bank,
    pitch: -0.035 + 0.013 * Math.sin(t * 0.48) + activity * 0.012 * Math.sin(TAU * phase - 0.6),
    lift: -0.025 + activity * (stroke + 0.025),
    elbow: activity * 0.14 * recovery,
    tip: activity * 0.25 * Math.sin(TAU * phase - 1.0),
    fold: (1 - activity) * 0.19 + activity * (0.07 + 0.24 * smoothstep(-0.2, 0.8, recovery)),
    tailSpread: 0.72 + Math.abs(bank) * 0.52 + 0.045 * Math.sin(t * 0.94),
    tailYaw: -bank * 0.31 + 0.022 * Math.sin(t * 1.35),
    tailPitch: 0.012 + 0.021 * Math.sin(t * 0.73) - activity * 0.022 * stroke,
    x: 0.1 * Math.sin(t * 0.22 + offset),
    y: 0.045 * Math.sin(t * 0.39),
    z: 0.022 * Math.sin(t * 0.59),
  };
}
export const transformFalcon = (
  mesh: BirdMesh,
  pose: FlightPose,
  output?: Float32Array,
  flat = false,
) => transformArticulated(mesh, pose, FALCON_RIG, output, flat);
