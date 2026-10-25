import type { Theme } from '../src/ascii.ts';
import { featherColors } from './feather-colors.ts';
import type { Ink } from './ink.ts';

interface PlumageAtlas {
  source: CanvasImageSource;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  ink: Ink;
  theme: Theme;
  canvas: HTMLCanvasElement;
  pixels: ImageData;
  colors: Map<number, string>;
}

/**
 * Demo-only plumage adapter around the approved renderer's Canvas cell draws.
 * Its 2×2 coverage is already encoded in globalAlpha: .55, .70, .85, 1.
 * No second raster, silhouette dilation, private renderer fields, or mesh edits.
 * The hook is scoped to one synchronous render and restored even on error.
 */
export class PlumagePlate {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private atlas?: PlumageAtlas;
  constructor(ownerDocument: Document) {
    this.canvas = ownerDocument.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  private prepare(
    source: HTMLCanvasElement,
    cellWidth: number,
    cellHeight: number,
    ink: Ink,
    theme: Theme,
  ) {
    const current = this.atlas;
    if (
      current &&
      current.source === source &&
      current.width === source.width &&
      current.height === source.height &&
      current.cellWidth === cellWidth &&
      current.cellHeight === cellHeight &&
      current.ink === ink &&
      current.theme === theme
    )
      return current;
    const original = source.getContext('2d')!.getImageData(0, 0, source.width, source.height);
    const canvas = source.ownerDocument.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d')!;
    const graded = ctx.createImageData(source.width, source.height);
    for (let i = 0; i < original.data.length; i += 4) {
      if (!original.data[i + 3]) continue;
      const color = featherColors(
        original.data[i],
        original.data[i + 1],
        original.data[i + 2],
        ink,
        theme,
      ).glyph;
      graded.data[i] = color[0];
      graded.data[i + 1] = color[1];
      graded.data[i + 2] = color[2];
      graded.data[i + 3] = original.data[i + 3];
    }
    ctx.putImageData(graded, 0, 0);
    this.atlas = {
      source,
      width: source.width,
      height: source.height,
      cellWidth,
      cellHeight,
      ink,
      theme,
      canvas,
      pixels: original,
      colors: new Map(),
    };
    return this.atlas;
  }

  private color(atlas: PlumageAtlas, sx: number, sy: number, sw: number, sh: number) {
    // All glyphs in an atlas row share one ink color. Read the most opaque sample
    // once per row, avoiding paper-contaminated antialiasing and per-frame readbacks.
    const cached = atlas.colors.get(sy);
    if (cached) return cached;
    const { data, width } = atlas.pixels;
    let best = 0,
      alpha = -1;
    for (let y = sy; y < sy + sh; y++)
      for (let x = sx; x < sx + sw; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > alpha) {
          best = i;
          alpha = data[i + 3];
        }
      }
    const surface = featherColors(
      data[best],
      data[best + 1],
      data[best + 2],
      atlas.ink,
      atlas.theme,
    ).surface;
    // Opaque material below the luminous dark-mode ink. Keep the cell darker
    // than its glyph so solidity does not erase the ASCII texture.
    const rgb = atlas.theme === 'dark' ? surface.map((value) => Math.round(value * 0.42)) : surface;
    const color = `rgb(${rgb.join(' ')})`;
    atlas.colors.set(sy, color);
    return color;
  }

  render(source: HTMLCanvasElement, ink: Ink, draw: () => void, theme: Theme = 'light') {
    const sourceCtx = source.getContext('2d')!;
    if (this.canvas.width !== source.width || this.canvas.height !== source.height) {
      this.canvas.width = source.width;
      this.canvas.height = source.height;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = true;
    const original = sourceCtx.drawImage;
    const hadOwn = Object.hasOwn(sourceCtx, 'drawImage');
    // The approved renderer keeps this transform fixed between resizes. Avoid a
    // Canvas/DOMMatrix query for every glyph; only the alpha changes per cell.
    const transform = sourceCtx.getTransform();
    const renderCell = (image: CanvasImageSource, ...args: number[]) => {
      // The original renderer still paints its own canvas exactly as before.
      original.apply(sourceCtx, [image, ...args] as Parameters<typeof original>);
      if (args.length !== 8 || !(image instanceof HTMLCanvasElement))
        throw new Error('PlumagePlate expects cropped Canvas ASCII cell draws.');
      const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      const atlas = this.prepare(image, dw, dh, ink, theme);
      const x = Math.round(dx * transform.a),
        y = Math.round(dy * transform.d);
      const right = Math.round((dx + dw) * transform.a),
        bottom = Math.round((dy + dh) * transform.d);
      // Majority coverage fills the whole cell, including counters and gutters.
      // One/two-sample edges retain glyph-only coverage, preserving feather gaps.
      if (sourceCtx.globalAlpha >= 0.84) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color(atlas, sx, sy, sw, sh);
        ctx.fillRect(x, y, right - x, bottom - y);
      }
      ctx.globalAlpha = sourceCtx.globalAlpha;
      ctx.drawImage(atlas.canvas, sx, sy, sw, sh, x, y, right - x, bottom - y);
    };
    sourceCtx.drawImage = renderCell as typeof sourceCtx.drawImage;
    try {
      draw();
    } finally {
      if (hadOwn) sourceCtx.drawImage = original;
      else delete (sourceCtx as Partial<CanvasRenderingContext2D>).drawImage;
      ctx.globalAlpha = 1;
    }
    return this.canvas;
  }
}

// Existing opacity checks exercise the same light path without a new test adapter.
export { PlumagePlate as DaylightPlate };
