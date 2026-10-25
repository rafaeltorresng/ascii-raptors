import { hash } from '../src/math.ts';
import type { Theme } from '../src/ascii.ts';

const unit = (seed: number) => (hash(seed) % 10000) / 10000;
const wrap = (x: number, span: number) => ((x % span) + span) % span;
const ease = (t: number) => t * t * (3 - 2 * t);

function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = ease(x - ix),
    fy = ease(y - iy);
  const at = (x: number, y: number) => unit(x * 1039 + y * 7919 + seed * 199);
  const a = at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx;
  const b = at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx;
  return a * (1 - fy) + b * fy;
}

export interface CloudBank {
  x: number;
  y: number;
  width: number;
  height: number;
  seed: number;
  opacity: number;
}

/** Slow cirrus at different depths. A wrap only happens fully outside the frame. */
export function cloudBanks(width: number, height: number, time: number): CloudBank[] {
  if (width <= 0 || height <= 0) return [];
  const scale = Math.min(1.25, Math.min(width, height) / 800);
  return [
    { x: 0.22, y: 0.15, width: 740, height: 190, speed: 2.4, seed: 17, opacity: 0.94 },
    { x: 0.82, y: 0.63, width: 620, height: 170, speed: 1.3, seed: 39, opacity: 0.82 },
    { x: 0.38, y: 0.89, width: 860, height: 150, speed: 3.1, seed: 61, opacity: 0.88 },
  ].map((bank) => {
    const w = bank.width * scale,
      h = bank.height * scale;
    return {
      x:
        wrap(bank.x * width + Math.max(0, time) * bank.speed * scale + w, width + 2 * w) -
        w -
        w * 0.5,
      y: bank.y * height - h * 0.5,
      width: Math.round(w),
      height: Math.round(h),
      seed: bank.seed,
      opacity: bank.opacity,
    };
  });
}

export interface CloudCell {
  x: number;
  y: number;
  glyph: string;
  alpha: number;
}

/** A fixed, body-anchored dither: grain travels with the cloud instead of re-rolling. */
export function cloudCells(width: number, height: number, seed: number): CloudCell[] {
  const cells: CloudCell[] = [];
  for (let y = 0; y < height; y += 7)
    for (let x = 0; x < width; x += 5) {
      const u = (x + 2.5) / width,
        v = (y + 3.5) / height;
      const bend = 0.47 + Math.sin(u * 7 + seed) * 0.1 + (noise(u * 4, 0, seed) - 0.5) * 0.12;
      const thickness = 0.19 + noise(u * 5, 2, seed) * 0.12;
      const envelope = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.7);
      const ribbon = Math.exp(-Math.pow((v - bend) / thickness, 2) * 1.35);
      const grain = noise(u * 13, v * 5, seed + 7);
      const density = envelope * ribbon * (0.42 + grain * 0.58);
      const roll = unit(x * 59 + y * 101 + seed * 997);
      if (density < 0.06 || roll > Math.min(0.95, density * 1.08)) continue;
      cells.push({
        x,
        y,
        glyph: density > 0.54 ? (roll > 0.3 ? '-' : ':') : roll > 0.12 ? '.' : ',',
        alpha: 0.28 + density * 0.72,
      });
    }
  return cells;
}

interface CloudCache {
  key: string;
  banks: { canvas: HTMLCanvasElement; seed: number }[];
}
const cache = new WeakMap<CanvasRenderingContext2D, CloudCache>();

/** Cached ASCII cloud plates; only three image draws are needed per animation frame. */
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  theme: Theme,
) {
  const banks = cloudBanks(width, height, time);
  const key = `${width}:${height}:${theme}`;
  let plates = cache.get(ctx);
  if (!plates || plates.key !== key) {
    plates = {
      key,
      banks: banks.map((bank) => {
        const canvas = ctx.canvas.ownerDocument.createElement('canvas');
        canvas.width = bank.width;
        canvas.height = bank.height;
        const cloud = canvas.getContext('2d')!;
        cloud.font = '600 10px "SFMono-Regular", Consolas, Menlo, monospace';
        cloud.textBaseline = 'top';
        cloud.fillStyle = theme === 'dark' ? '#bdcde0' : '#fffdf3';
        for (const cell of cloudCells(bank.width, bank.height, bank.seed)) {
          cloud.globalAlpha = cell.alpha * (theme === 'dark' ? 0.41 : 0.6);
          cloud.fillText(cell.glyph, cell.x, cell.y);
        }
        return { canvas, seed: bank.seed };
      }),
    };
    cache.set(ctx, plates);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const bank of banks) {
    const plate = plates.banks.find((p) => p.seed === bank.seed)!;
    ctx.globalAlpha = bank.opacity;
    ctx.drawImage(plate.canvas, Math.round(bank.x), Math.round(bank.y), bank.width, bank.height);
  }
  ctx.restore();
}
