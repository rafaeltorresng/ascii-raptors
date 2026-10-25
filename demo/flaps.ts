import type { FlightMode, FlightPose } from '../src/flight.ts';
import { lerp, smoothstep } from '../src/math.ts';

const WING = ['pitch', 'lift', 'elbow', 'tip', 'fold', 'tailPitch', 'tailSpread'] as const;

/**
 * Extra flap series for the sky. The stroke itself stays at the species rate.
 * The optional scene effort blends the authored glide/flap endpoints along
 * a route. Without it, the original extra-series schedule remains available.
 * Studies keep the library-authored bursts.
 */
export function burstGate(time: number, period: number, length: number, phase: number) {
  const local = (((time + phase) % period) + period) % period;
  const edge = Math.min(0.65, length * 0.2);
  if (local >= length) return 0;
  if (local < edge) return smoothstep(0, edge, local);
  if (local > length - edge) return 1 - smoothstep(length - edge, length, local);
  return 1;
}

export function moreFlaps(
  time: number,
  pose: (time: number, mode?: FlightMode) => FlightPose,
  period: number,
  length: number,
  phase: number,
  effort?: number,
) {
  const soar = pose(time, 'soar');
  const extra = burstGate(time, period, length, phase);
  if (extra === 0 && effort === undefined) return soar;
  const gate = effort ?? 1 - (1 - soar.activity) * (1 - extra);
  const glide = pose(time, 'glide');
  const flap = pose(time, 'flap');
  const next = { ...soar, activity: gate };
  for (const key of WING) next[key] = lerp(glide[key], flap[key], gate);
  return next;
}
