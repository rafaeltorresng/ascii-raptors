import { clamp, cross, hash, normalized, v3 } from './math.ts';
import type { BirdMesh, Material, TransformedMesh } from './bird.ts';
import type { View } from './flight.ts';
import type { Vec3 } from './math.ts';
import { getSpecies } from './species.ts';
import type { SpeciesId } from './species.ts';

export type Theme = 'dark' | 'light';
export type Detail = 'fine' | 'balanced' | 'coarse';
export type Representation = 'articulated' | 'flat' | 'silhouette';
export interface RenderSettings {
  species?: SpeciesId;
  theme: Theme;
  view: View;
  detail: Detail;
  scale: number;
  representation: Representation;
}
export interface RenderStats {
  cells: number;
  triangles: number;
  columns: number;
  rows: number;
}

const GLYPHS = '.,:;!ilt+/=xos%S8&#@-|\\';
const LEVELS = 24;
const LIGHT = normalized(v3(-0.6, 0.5, -0.8));
interface Basis {
  right: Vec3;
  up: Vec3;
  toward: Vec3;
}
export function cameraBasis(view: View): Basis {
  const angle = ({ oblique: -58, ventral: -89, dorsal: 74, profile: -10 }[view] * Math.PI) / 180;
  const az = view === 'profile' ? Math.PI * 0.4 : 0;
  const toward = v3(
    Math.sin(az) * Math.cos(angle),
    -Math.cos(az) * Math.cos(angle),
    Math.sin(angle),
  );
  let right = v3(Math.cos(az), Math.sin(az), 0);
  let up = cross(toward, right);
  if (up.y < 0) {
    right = v3(-right.x, -right.y, -right.z);
    up = v3(-up.x, -up.y, -up.z);
  }
  return { right, up, toward };
}
/** Conservative fixed framing, sampled against 90 seconds of all three flight modes. */
export function cameraEnvelope(view: View, species: SpeciesId = 'swallow-tailed-kite') {
  const frame = getSpecies(species).framing;
  return {
    width: frame.width,
    height: view === 'profile' ? frame.profileHeight : frame.height,
    centerY: 0.5,
  };
}

/** Low-resolution geometry buffer. The only bird marks sent to the visible canvas are ASCII glyphs. */
export class AsciiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private atlas: HTMLCanvasElement;
  private atlasCtx: CanvasRenderingContext2D;
  private presentationAtlas: HTMLCanvasElement | undefined;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private cw = 7;
  private ch = 11;
  private cols = 0;
  private rows = 0;
  private sw = 0;
  private sh = 0;
  private depth = new Float32Array(0);
  private shade = new Float32Array(0);
  private keys = new Uint32Array(0);
  private ids = new Uint16Array(0);
  private tints = new Uint8Array(0);
  private previousKey = new Uint32Array(0);
  private previousLevel = new Uint8Array(0);
  private projected = new Float32Array(0);
  private densityOrder: number[] = [];
  private settings: RenderSettings;
  private atlasW = 0;
  private atlasH = 0;
  stats: RenderStats = { cells: 0, triangles: 0, columns: 0, rows: 0 };

  constructor(canvas: HTMLCanvasElement, settings: RenderSettings) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable.');
    this.ctx = ctx;
    this.atlas = canvas.ownerDocument.createElement('canvas');
    this.atlasCtx = this.atlas.getContext('2d', { willReadFrequently: true })!;
    this.settings = settings;
  }

  configure(settings: RenderSettings) {
    if (this.settings.species !== settings.species) {
      // Canvas implementations retain backing-store choices across resize.
      // A new species gets its own atlas, including a fresh CPU calibration context.
      this.atlas = this.canvas.ownerDocument.createElement('canvas');
      this.atlasCtx = this.atlas.getContext('2d', { willReadFrequently: true })!;
    }
    const rebuild =
      this.settings.theme !== settings.theme ||
      this.settings.detail !== settings.detail ||
      this.settings.species !== settings.species;
    this.settings = settings;
    if (rebuild && this.width) this.resize(this.width, this.height, this.dpr);
  }

  resize(width: number, height: number, dpr = 1) {
    this.width = width;
    this.height = height;
    this.dpr = clamp(dpr, 1, 2);
    const factor = { fine: 0.77, balanced: 1, coarse: 1.42 }[this.settings.detail];
    this.cw = clamp(width / 170, 5.2, 8.6) * factor;
    this.ch = this.cw * 1.55;
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);
    this.sw = this.cols * 2;
    this.sh = this.rows * 2;
    const n = this.sw * this.sh;
    this.depth = new Float32Array(n);
    this.shade = new Float32Array(n);
    this.keys = new Uint32Array(n);
    this.ids = new Uint16Array(n);
    this.tints = new Uint8Array(n);
    this.previousKey = new Uint32Array(this.cols * this.rows);
    this.previousLevel = new Uint8Array(this.cols * this.rows);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.buildAtlas();
  }

  private buildAtlas() {
    this.atlasW = Math.ceil(this.cw * this.dpr);
    this.atlasH = Math.ceil(this.ch * this.dpr);
    this.atlas.width = this.atlasW * GLYPHS.length;
    const palettes =
      !this.settings.species || this.settings.species === 'swallow-tailed-kite' ? 1 : 3;
    this.atlas.height = this.atlasH * LEVELS * palettes;
    const ctx = this.atlasCtx;
    ctx.clearRect(0, 0, this.atlas.width, this.atlas.height);
    ctx.font = `600 ${this.ch * this.dpr * 0.9}px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Calibrate the actual font's ink coverage once, never read screen pixels per frame.
    ctx.fillStyle = '#fff';
    for (let g = 0; g < GLYPHS.length; g++)
      ctx.fillText(GLYPHS[g], (g + 0.5) * this.atlasW, this.atlasH * 0.51);
    const data = ctx.getImageData(0, 0, this.atlas.width, this.atlasH).data;
    const density = Array.from(GLYPHS, (_, g) => {
      let ink = 0;
      for (let y = 0; y < this.atlasH; y++)
        for (let x = g * this.atlasW; x < (g + 1) * this.atlasW; x++)
          ink += data[(y * this.atlas.width + x) * 4 + 3];
      return { g, ink };
    }).sort((a, b) => a.ink - b.ink);
    this.densityOrder = density.map((x) => x.g);
    ctx.clearRect(0, 0, this.atlas.width, this.atlas.height);
    for (let palette = 0; palette < palettes; palette++)
      for (let l = 0; l < LEVELS; l++) {
        const t = l / (LEVELS - 1);
        const value =
          this.settings.theme === 'dark' ? Math.round(90 + t * 163) : Math.round(172 - t * 150);
        let r = value,
          g = value + (this.settings.theme === 'dark' ? 1 : 0),
          b = Math.min(255, value + 3);
        if (palette === 1) {
          if (this.settings.species === 'golden-eagle') {
            g = Math.round(value * 0.91);
            b = Math.round(value * 0.78);
          } else {
            r = Math.round(value * 0.86);
            g = Math.round(value * 0.95);
            b = Math.min(255, value + 7);
          }
        } else if (palette === 2) {
          r = Math.min(255, Math.round(value * 1.08));
          g = Math.round(value * 0.86);
          b = Math.round(value * 0.53);
        }
        ctx.fillStyle = `rgb(${r} ${g} ${b})`;
        for (let g = 0; g < GLYPHS.length; g++)
          ctx.fillText(
            GLYPHS[g],
            (g + 0.5) * this.atlasW,
            (palette * LEVELS + l + 0.51) * this.atlasH,
          );
      }
    // Calibration needs CPU readback. Present the larger, tinted atlas from a
    // separate draw-only surface so WebKit does not upload it for every glyph.
    // The approved kite retains its original presentation path exactly.
    if (palettes > 1 && !this.ctx.getContextAttributes?.().willReadFrequently) {
      const presentation = this.canvas.ownerDocument.createElement('canvas');
      presentation.width = this.atlas.width;
      presentation.height = this.atlas.height;
      presentation.getContext('2d')!.drawImage(this.atlas, 0, 0);
      this.presentationAtlas = presentation;
    } else this.presentationAtlas = undefined;
  }

  private materialShade(
    material: Material,
    diffuse: number,
    dorsal: boolean,
    u: number,
    v: number,
    id: number,
  ): number {
    const white = material === 'white' || (material === 'lining' && !dorsal);
    const dark = this.settings.theme === 'dark';
    const grain = (hash(id * 7853 + Math.floor(u * 18) * 277 + Math.floor(v * 5)) % 100) / 100;
    const shaft = material === 'flight' && Math.abs(v - 0.5) < 0.07 ? 0.06 : 0;
    if (material.startsWith('eagle-')) {
      const base = {
        'eagle-body': 0.53,
        'eagle-coverts': 0.58,
        'eagle-flight': 0.41,
        'eagle-nape': 0.77,
      }[material as 'eagle-body' | 'eagle-coverts' | 'eagle-flight' | 'eagle-nape'];
      const lightness = base + diffuse * 0.17 + grain * 0.055;
      return clamp(dark ? lightness : 1 - lightness * 0.65, 0, 1);
    }
    if (material === 'cere') return dark ? 0.69 : 0.63;
    if (material.startsWith('falcon-')) {
      const bars =
        Math.sin(
          (material === 'falcon-breast' ? v * 23 : u * 17) * Math.PI + Math.sin(v * 12) * 0.3,
        ) > 0.65;
      let base = 0.48;
      if (material === 'falcon-head') base = 0.81;
      else if (material === 'falcon-breast') base = v > 0.26 && bars ? 0.36 : 0.78;
      else if (material === 'falcon-hood') base = 0.25;
      else if (!dorsal) base = bars ? 0.35 : 0.7;
      const lightness = base + diffuse * 0.13 + grain * 0.045;
      return clamp(dark ? lightness : 0.95 - lightness * 0.7, 0, 1);
    }
    if (material === 'eye' || material === 'beak') return dark ? 0.12 : 0.92;
    if (dark)
      return clamp(
        (white ? 0.78 : 0.39) + diffuse * (white ? 0.18 : 0.2) + grain * 0.055 + shaft,
        0,
        1,
      );
    return clamp((white ? 0.33 : 0.78) + (1 - diffuse) * 0.12 + grain * 0.055 + shaft, 0, 1);
  }

  render(mesh: BirdMesh, transformed: TransformedMesh) {
    if (!this.width) return;
    const { positions } = transformed,
      { right, up, toward } = cameraBasis(this.settings.view);
    // Fixed envelopes per view avoid camera "breathing" as the wings flap.
    const envelope = cameraEnvelope(this.settings.view, this.settings.species);
    const scale =
      Math.min(this.width / envelope.width, this.height / envelope.height) * this.settings.scale;
    const centerY = this.height * envelope.centerY;
    if (this.projected.length !== positions.length)
      this.projected = new Float32Array(positions.length);
    const projected = this.projected;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i],
        y = positions[i + 1],
        z = positions[i + 2];
      projected[i] =
        (((x * right.x + y * right.y + z * right.z) * scale + this.width * 0.5) / this.cw) * 2;
      projected[i + 1] = ((-(x * up.x + y * up.y + z * up.z) * scale + centerY) / this.ch) * 2;
      projected[i + 2] = x * toward.x + y * toward.y + z * toward.z;
    }
    this.depth.fill(-Infinity);
    this.ids.fill(0);
    const { sw, sh, depth, shade, keys, ids } = this;
    let drawnTriangles = 0;
    for (const face of mesh.faces) {
      const va = mesh.vertices[face.a],
        vb = mesh.vertices[face.b],
        vc = mesh.vertices[face.c];
      const ia = face.a * 3,
        ib = face.b * 3,
        ic = face.c * 3;
      const abx = positions[ib] - positions[ia],
        aby = positions[ib + 1] - positions[ia + 1],
        abz = positions[ib + 2] - positions[ia + 2];
      const acx = positions[ic] - positions[ia],
        acy = positions[ic + 1] - positions[ia + 1],
        acz = positions[ic + 2] - positions[ia + 2];
      let nx = aby * acz - abz * acy,
        ny = abz * acx - abx * acz,
        nz = abx * acy - aby * acx;
      const length = Math.hypot(nx, ny, nz) || 1,
        sign = va.side < 0 ? -1 : 1;
      nx *= sign / length;
      ny *= sign / length;
      nz *= sign / length;
      const facing = nx * toward.x + ny * toward.y + nz * toward.z,
        dorsal = facing > 0;
      if ((va.region === 'body' || va.region === 'head') && facing <= 0) continue;
      if (facing < 0) {
        nx *= -1;
        ny *= -1;
        nz *= -1;
      }
      const diffuse = Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
      const ax = projected[ia],
        ay = projected[ia + 1],
        bx = projected[ib],
        by = projected[ib + 1],
        cx = projected[ic],
        cy = projected[ic + 1];
      const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(area) < 0.00001) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))),
        x1 = Math.min(sw - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))),
        y1 = Math.min(sh - 1, Math.ceil(Math.max(ay, by, cy)));
      const iarea = 1 / area;
      const bias =
        face.material === 'lining' ||
        (va.region === 'wing' &&
          (face.material === 'eagle-coverts' || face.material === 'falcon-back'))
          ? 0.055
          : 0;
      const tint =
        face.material === 'eagle-nape' || face.material === 'cere'
          ? 2
          : face.material.startsWith('eagle-') ||
              (face.material.startsWith('falcon-') &&
                dorsal &&
                face.material !== 'falcon-hood' &&
                face.material !== 'falcon-head' &&
                face.material !== 'falcon-breast')
            ? 1
            : 0;
      drawnTriangles++;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5,
            py = y + 0.5;
          const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) * iarea;
          const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) * iarea,
            c = 1 - a - b;
          if (a < -0.00001 || b < -0.00001 || c < -0.00001) continue;
          const z = projected[ia + 2] * a + projected[ib + 2] * b + projected[ic + 2] * c + bias;
          const index = y * sw + x;
          if (z <= depth[index]) continue;
          depth[index] = z;
          const u = va.u * a + vb.u * b + vc.u * c,
            v = va.v * a + vb.v * b + vc.v * c;
          ids[index] = face.id;
          this.tints[index] = tint;
          keys[index] = hash(face.id * 997 + Math.floor(u * 12) * 47 + Math.floor(v * 4));
          shade[index] = this.materialShade(face.material, diffuse, dorsal, u, v, face.id);
        }
    }
    const ctx = this.ctx;
    ctx.fillStyle = this.settings.theme === 'dark' ? '#0b0b0c' : '#f4f1ea';
    ctx.fillRect(0, 0, this.width, this.height);
    let cells = 0;
    const silhouette = this.settings.representation === 'silhouette';
    for (let row = 0; row < this.rows; row++)
      for (let col = 0; col < this.cols; col++) {
        const index = row * 2 * sw + col * 2;
        let count = 0,
          total = 0,
          best = index,
          bestDepth = -Infinity;
        for (let j = 0; j < 4; j++) {
          const k = index + (j & 1) + (j >> 1) * sw;
          if (!ids[k]) continue;
          count++;
          total += shade[k];
          if (depth[k] > bestDepth) {
            bestDepth = depth[k];
            best = k;
          }
        }
        if (!count) continue;
        const value = silhouette ? 0.85 : total / count;
        const key = keys[best],
          cell = row * this.cols + col;
        let level = Math.round(value * (LEVELS - 1));
        if (this.previousKey[cell] === key && Math.abs(level - this.previousLevel[cell]) <= 1)
          level = this.previousLevel[cell];
        this.previousKey[cell] = key;
        this.previousLevel[cell] = level;
        const rank =
          count < 3
            ? Math.min(3, count)
            : Math.floor(
                clamp(value * 0.6 + ((key % 997) / 997) * 0.4, 0, 0.999) * this.densityOrder.length,
              );
        let glyph = this.densityOrder[rank];
        if (count < 3) {
          const left = col > 0 && ids[index - 1] ? 1 : 0,
            right = col < this.cols - 1 && ids[index + 2] ? 1 : 0;
          const above = row > 0 && ids[index - sw] ? 1 : 0,
            below = row < this.rows - 1 && ids[index + 2 * sw] ? 1 : 0;
          const gx = right - left,
            gy = below - above;
          const edge = gx && gy ? (gx === gy ? '/' : '\\') : gy ? '-' : '|';
          glyph = GLYPHS.indexOf(edge);
          level = Math.max(level, this.settings.theme === 'dark' ? 7 : 11);
        }
        ctx.globalAlpha = count < 4 ? 0.4 + (count / 4) * 0.6 : 1;
        ctx.drawImage(
          this.presentationAtlas ?? this.atlas,
          glyph * this.atlasW,
          (this.tints[best] * LEVELS + level) * this.atlasH,
          this.atlasW,
          this.atlasH,
          col * this.cw,
          row * this.ch,
          this.cw,
          this.ch,
        );
        cells++;
      }
    ctx.globalAlpha = 1;
    this.stats = { cells, triangles: drawnTriangles, columns: this.cols, rows: this.rows };
  }
  resetHistory() {
    this.previousKey.fill(0);
    this.previousLevel.fill(0);
  }
}
