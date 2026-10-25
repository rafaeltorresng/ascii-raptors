import type { FlyerId } from './course.ts';

// Approved sprite sizes. Radius is a conservative sphere around the posed mesh,
// in model units; it includes the bill and the widest wing/tail poses.
export const SKY_LAYOUT: Record<FlyerId, { bulk: number; radius: number; frame: number }> = {
  'swallow-tailed-kite': { bulk: 0.92, radius: 2.91, frame: 6.5 },
  'golden-eagle': { bulk: 1.12, radius: 3.55, frame: 7.8 },
  'peregrine-falcon': { bulk: 0.86, radius: 2.65, frame: 6 },
  'bald-eagle': { bulk: 1.42, radius: 3.55, frame: 7.8 },
  'california-condor': { bulk: 1.6, radius: 3.55, frame: 7.8 },
};

export function skySpriteSize(bulk: number, width: number, height: number) {
  const unit = width < 700 ? width * 0.58 : Math.min(Math.min(width, height) * 0.44, 480);
  return Math.round(Math.max(240, Math.round(unit * bulk)) * 1.2);
}
