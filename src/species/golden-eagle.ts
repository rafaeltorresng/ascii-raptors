import { clamp, lerp, smoothstep, TAU, v3 } from '../math.ts';
import type { FlightMode, FlightPose } from '../flight.ts';
import type { BirdMesh } from '../bird.ts';
import { MeshBuilder } from './mesh.ts';
import { transformArticulated } from './rig.ts';
import type { Rig } from './rig.ts';

export const EAGLE_RIG: Rig = {
  shoulder: v3(0.25, 0.26, 0.04),
  elbow: v3(1.3, 0.52, 0.04),
  wrist: v3(2.15, 0.49, 0.04),
  elbowSweep: 0.65,
  wristSweep: 0.7,
  headAnchor: 0.53,
  tailAnchor: -0.58,
  headStabilization: 0.5,
};

/** Adult Aquila: broad inner wing, independent slotted primaries, rounded fan and small head. */
export function createEagle(): BirdMesh {
  const b = new MeshBuilder();
  for (const side of [-1, 1]) {
    for (let i = 5; i >= 0; i--) {
      const t = i / 5;
      b.feather(
        v3(0.015 + t * 0.13, -0.54, 0.005),
        v3(0.035 + t * 0.49, -1.57 + t * t * 0.17, 0.012),
        0.087,
        side,
        'tail',
        'eagle-flight',
      );
    }
    for (let i = 0; i < 18; i++) {
      const t = i / 17,
        x = lerp(0.32, 2.15, t);
      b.feather(
        v3(x + 0.04, 0.41 + 0.17 * Math.sin(t * Math.PI), 0.004),
        v3(x - 0.15, -0.49 - 0.22 * Math.sin(t * Math.PI), -0.025),
        0.091,
        side,
        'wing',
        'eagle-flight',
      );
    }
    const tips = [
      v3(1.94, -0.63, 0),
      v3(2.15, -0.75, 0),
      v3(2.38, -0.85, 0),
      v3(2.65, -0.89, 0),
      v3(2.93, -0.81, 0.02),
      v3(3.18, -0.59, 0.045),
      v3(3.4, -0.27, 0.075),
      v3(3.53, 0.08, 0.105),
      v3(3.48, 0.42, 0.13),
      v3(3.3, 0.7, 0.14),
    ];
    for (let i = 0; i < tips.length; i++) {
      const t = i / 9;
      b.feather(
        v3(1.88 + t * 0.42, 0.39 + t * 0.14, 0.016),
        tips[i],
        0.126 - t * 0.035,
        side,
        'wing',
        'eagle-flight',
        0.025,
      );
    }
    b.panel(
      [
        v3(0.22, 0.38, 0.055),
        v3(0.7, 0.58, 0.055),
        v3(1.3, 0.74, 0.06),
        v3(2.15, 0.65, 0.055),
        v3(2.48, 0.48, 0.04),
      ],
      [
        v3(0.24, -0.28, 0.04),
        v3(0.7, -0.34, 0.04),
        v3(1.3, -0.34, 0.045),
        v3(2.15, -0.11, 0.045),
        v3(2.48, 0.32, 0.03),
      ],
      side,
      'eagle-coverts',
    );
    for (let i = 0; i < 16; i++) {
      const t = i / 15,
        x = 0.36 + t * 1.98;
      b.feather(
        v3(x, 0.43 + 0.12 * Math.sin(t * Math.PI), 0.065),
        v3(x - 0.08, -0.29 + 0.2 * t, 0.063),
        0.083,
        side,
        'wing',
        'eagle-coverts',
      );
    }
  }
  b.ellipsoid(v3(0, 0.015, 0), v3(0.29, 0.67, 0.235), 'eagle-body', 'body');
  b.ellipsoid(v3(0, 0.06, 0.14), v3(0.26, 0.59, 0.12), 'eagle-coverts', 'body');
  b.ellipsoid(v3(0, 0.56, 0.025), v3(0.155, 0.29, 0.16), 'eagle-body', 'head');
  b.ellipsoid(v3(0, 0.82, 0.06), v3(0.158, 0.19, 0.155), 'eagle-body', 'head');
  b.ellipsoid(v3(0, 0.69, 0.13), v3(0.148, 0.18, 0.103), 'eagle-nape', 'head');
  b.ellipsoid(v3(0, 0.977, 0.035), v3(0.078, 0.085, 0.065), 'cere', 'head', 7, 12);
  b.ellipsoid(v3(0, 1.035, 0.005), v3(0.074, 0.083, 0.066), 'beak', 'head', 7, 12);
  b.ellipsoid(v3(0, 1.08, -0.045), v3(0.042, 0.04, 0.074), 'beak', 'head', 6, 10);
  for (const side of [-1, 1])
    b.ellipsoid(v3(side * 0.146, 0.865, 0.071), v3(0.025, 0.026, 0.023), 'eye', 'head', 5, 8);
  // Keep the head projection small beside the long tail and broad shoulder.
  for (const vertex of b.mesh.vertices)
    if (vertex.region === 'head') vertex.point.y = 0.53 + (vertex.point.y - 0.53) * 0.8;
  return b.mesh;
}

export function eaglePose(time: number, mode: FlightMode = 'soar', seed = 7): FlightPose {
  const t = Math.max(0, time),
    offset = (seed % 101) * 0.031,
    phase = (t * 0.82 + 0.12) % 1;
  const burstTime = ((t + 6) % 29) - 18;
  const burst = smoothstep(0, 1.2, burstTime) * (1 - smoothstep(4.8, 6, burstTime));
  const activity = mode === 'flap' ? 1 : mode === 'glide' ? 0 : burst;
  const beat = phase < 0.48 ? smoothstep(0, 0.48, phase) : 1 - smoothstep(0.48, 1, phase);
  const stroke = lerp(0.65, -0.63, beat),
    recovery = Math.sin(TAU * phase - 0.45);
  const curvature = 0.0378 * Math.cos(t * 0.09 + offset) + 0.0138 * Math.cos(t * 0.23);
  const bank = clamp(-curvature * 6.5, -0.42, 0.42);
  return {
    time: t,
    activity,
    curvature,
    yaw: -0.16 + 0.42 * Math.sin(t * 0.09 + offset) + 0.06 * Math.sin(t * 0.23),
    bank,
    pitch: 0.025 + 0.014 * Math.sin(t * 0.23) + activity * 0.018 * Math.sin(TAU * phase - 0.4),
    lift: 0.11 + 0.014 * Math.sin(t * 0.45) + activity * (stroke - 0.11),
    elbow: activity * 0.11 * recovery,
    tip: -0.035 + activity * 0.19 * Math.sin(TAU * phase - 1.05),
    fold: activity * 0.16 * smoothstep(-0.1, 0.85, recovery),
    tailSpread: 0.88 + 0.1 * Math.sin(t * 0.33) + Math.abs(bank) * 0.48 + activity * 0.08,
    tailYaw: -bank * 0.22 + 0.022 * Math.sin(t * 0.64),
    tailPitch: 0.025 + 0.025 * Math.sin(t * 0.4) - activity * 0.035 * stroke,
    x: 0.11 * Math.sin(t * 0.09 + offset),
    y: 0.05 * Math.sin(t * 0.17),
    z: 0.025 * Math.sin(t * 0.29),
  };
}
export const transformEagle = (
  mesh: BirdMesh,
  pose: FlightPose,
  output?: Float32Array,
  flat = false,
) => transformArticulated(mesh, pose, EAGLE_RIG, output, flat);
