import { TAU, clamp, lerp, smoothstep } from './math.ts';

export type FlightMode = 'soar' | 'glide' | 'flap';
export type View = 'oblique' | 'ventral' | 'dorsal' | 'profile';
export interface FlightPose {
  time: number;
  yaw: number;
  bank: number;
  pitch: number;
  lift: number;
  elbow: number;
  tip: number;
  fold: number;
  tailSpread: number;
  tailYaw: number;
  tailPitch: number;
  x: number;
  y: number;
  z: number;
  activity: number;
  curvature: number;
}

/** Art-directed kinematics, not a measured aerodynamic or wingbeat-frequency model. */
export function flightPose(time: number, mode: FlightMode = 'soar', seed = 7): FlightPose {
  const t = Math.max(0, time),
    phaseOffset = (seed % 101) * 0.037;
  const phase = (t * 1.32 + 0.08) % 1;
  // A brief two-stroke burst, with a zero-slope envelope at both boundaries.
  const burstTime = ((t + 4) % 19) - 13;
  const burst = smoothstep(0, 0.8, burstTime) * (1 - smoothstep(2.8, 3.8, burstTime));
  const activity = mode === 'flap' ? 1 : mode === 'glide' ? 0 : burst;
  // Slow recovery and faster power stroke. Continuous position and velocity.
  const strokePhase = phase < 0.43 ? smoothstep(0, 0.43, phase) : 1 - smoothstep(0.43, 1, phase);
  const stroke = lerp(0.67, -0.67, strokePhase);
  const recovery = Math.sin(TAU * phase - 0.5);
  const yaw = -0.29 + 0.4 * Math.sin(t * 0.145 + phaseOffset) + 0.11 * Math.sin(t * 0.31);
  const curvature = 0.058 * Math.cos(t * 0.145 + phaseOffset) + 0.0341 * Math.cos(t * 0.31);
  const bank = clamp(-curvature * 4.8, -0.48, 0.48);
  return {
    time: t,
    yaw,
    bank,
    curvature,
    activity,
    pitch: 0.025 + 0.025 * Math.sin(t * 0.29) + activity * 0.014 * Math.sin(TAU * phase),
    lift: 0.025 * Math.sin(t * 0.73) + activity * stroke,
    elbow: activity * 0.16 * recovery,
    tip: activity * 0.23 * Math.sin(TAU * phase - 1.1) + 0.035 * Math.sin(t * 1.15),
    fold: activity * 0.18 * smoothstep(-0.15, 0.8, recovery),
    tailSpread: 0.9 + 0.1 * Math.sin(t * 0.49) + Math.abs(bank) * 0.3,
    tailYaw: bank * -0.25 + 0.035 * Math.sin(t * 0.91 + phaseOffset),
    tailPitch: 0.045 + 0.028 * Math.sin(t * 0.61) - activity * stroke * 0.05,
    x: 0.13 * Math.sin(t * 0.145 + phaseOffset),
    y: 0.07 * Math.sin(t * 0.23),
    z: 0.035 * Math.sin(t * 0.37),
  };
}

export function poseAtAngle(pose: FlightPose, yaw: number, bank = pose.bank): FlightPose {
  return { ...pose, yaw, bank };
}

export function blendPose(from: FlightPose, to: FlightPose, progress: number): FlightPose {
  const amount = smoothstep(0, 1, progress);
  const result = { ...to };
  for (const key of Object.keys(to) as (keyof FlightPose)[])
    result[key] = lerp(from[key], to[key], amount);
  return result;
}
