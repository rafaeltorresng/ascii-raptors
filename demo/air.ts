import type { Theme } from '../src/ascii.ts';
import { hash } from '../src/math.ts';
import { drawClouds } from './clouds.ts';

/**
 * Pixel air for the shared sky. Grains and short wind strokes travel on a
 * 2px lattice at different depths. Small wisps accompany the cached ASCII
 * cloud banks. Studies are not affected.
 */
const PUFFS = [
  { y: 0.18, rx: 210, ry: 64, speed: 18, seed: 2, count: 70 },
  { y: 0.36, rx: 130, ry: 46, speed: 12, seed: 8, count: 42 },
  { y: 0.58, rx: 170, ry: 54, speed: 22, seed: 15, count: 56 },
  { y: 0.27, rx: 96, ry: 36, speed: 15, seed: 21, count: 28 },
  { y: 0.76, rx: 150, ry: 44, speed: 9, seed: 27, count: 48 },
] as const;

const AIR = 120;

const unit = (n: number) => (hash(n) % 10000) / 10000;
const snap = (value: number) => Math.round(value / 2) * 2;
const wrap = (value: number, span: number) => ((value % span) + span) % span;

export interface AirMote {
  x: number;
  y: number;
  size: number;
  span: number;
  opacity: number;
  layer: 'cloud' | 'air';
}

/** Deterministic motes at one instant. The same time always returns the same field. */
export function airMotes(width: number, height: number, time: number): AirMote[] {
  const clock = Math.max(0, time);
  const scale = Math.min(width, height) / 860;
  const motes: AirMote[] = [];
  for (const puff of PUFFS) {
    const rx = puff.rx * scale;
    const ry = puff.ry * scale;
    const cx = wrap(unit(puff.seed * 19) * width + clock * puff.speed * scale, width + rx * 2) - rx;
    const cy = height * puff.y + Math.sin(clock * 0.15 + puff.seed) * 8 * scale;
    const count = Math.max(12, Math.round(puff.count * Math.min(1, Math.max(0.5, scale))));
    for (let i = 0; i < count; i++) {
      const angle = unit(hash(puff.seed * 1000 + i)) * Math.PI * 2;
      const radius = Math.sqrt(unit(hash(puff.seed * 1000 + i + 409)));
      if (unit(hash(puff.seed * 1000 + i + 809)) > 0.82) continue;
      motes.push({
        x: snap(cx + Math.cos(angle) * rx * radius),
        y: snap(cy + Math.sin(angle) * ry * radius),
        size: 2,
        span: 2,
        opacity: 0.55 + unit(puff.seed * 73 + i) * 0.45,
        layer: 'cloud',
      });
    }
  }
  const grains = Math.max(18, Math.round(AIR * (width / 1440)));
  for (let i = 0; i < grains; i++) {
    const seed = hash(i + 17);
    const depth = unit(seed);
    const size = depth > 0.85 ? 3 : depth > 0.24 ? 2 : 1;
    const speed = (3 + depth * 9) * Math.max(0.4, width / 1440);
    const twinkle = 0.7 + 0.3 * Math.sin(clock * (0.18 + depth * 0.2) + seed);
    const y = unit(hash(seed + 11)) * height + Math.sin(clock * 0.12 + seed) * (3 + depth * 5);
    const x = wrap(unit(hash(seed + 23)) * width + clock * speed, width);
    motes.push({
      x: snap(x),
      y: snap(y),
      size,
      span: depth > 0.85 ? 5 : depth > 0.55 ? 3 : size,
      opacity: (0.28 + depth * 0.72) * twinkle,
      layer: 'air',
    });
  }
  return motes;
}

/**
 * Day sky for the light theme: cool altitude, a low warm wash, and a deeper
 * corner. The dark theme stays the flat approved field.
 */
export function paintSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
) {
  if (theme === 'dark') {
    ctx.fillStyle = '#0b0b0c';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, width * 0.35, height);
  sky.addColorStop(0, '#a9c3d8');
  sky.addColorStop(0.48, '#c5d8e6');
  sky.addColorStop(1, '#d4e0e8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const sunX = width * 0.78;
  const sunY = height * 0.16;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(width, height) * 0.72);
  sun.addColorStop(0, 'rgba(236, 196, 148, 0.22)');
  sun.addColorStop(0.38, 'rgba(214, 186, 156, 0.08)');
  sun.addColorStop(1, 'rgba(214, 186, 156, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, width, height);
  const depth = ctx.createRadialGradient(
    width * 0.06,
    height * 0.96,
    0,
    width * 0.18,
    height,
    Math.max(width, height) * 0.62,
  );
  depth.addColorStop(0, 'rgba(86, 122, 152, 0.2)');
  depth.addColorStop(1, 'rgba(86, 122, 152, 0)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, width, height);
}

/** Both atmospheric layers sit behind the birds, keeping the plumage unobstructed. */
export function drawAir(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  theme: Theme,
  layer: 'cloud' | 'air',
) {
  const dark = theme === 'dark';
  if (layer === 'cloud') drawClouds(ctx, width, height, time, theme);
  const motes = airMotes(width, height, time).filter((mote) => mote.layer === layer);
  if (!motes.length) return;
  const [r, g, b, alpha] =
    layer === 'cloud'
      ? dark
        ? [178, 196, 216, 0.18]
        : [248, 248, 237, 0.34]
      : dark
        ? [190, 210, 230, 0.48]
        : [57, 87, 112, 0.31];
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  for (const mote of motes) {
    ctx.globalAlpha = mote.opacity;
    ctx.fillRect(mote.x, mote.y, mote.span, mote.size);
  }
  ctx.restore();
}
