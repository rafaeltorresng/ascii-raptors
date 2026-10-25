import type { Theme } from '../src/ascii.ts';
import { familyOf } from './ink.ts';
import type { Ink } from './ink.ts';

export type FeatherRgb = readonly [number, number, number];
type Ramp = readonly (readonly [number, FeatherRgb])[];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const rgb = (r: number, g: number, b: number): FeatherRgb => [
  Math.round(r),
  Math.round(g),
  Math.round(b),
];

const WHITE: Ramp = [
  [0, [26, 34, 44]],
  [0.38, [48, 62, 78]],
  [0.62, [104, 124, 141]],
  [0.76, [169, 187, 193]],
  [0.88, [229, 235, 227]],
  [1, [250, 248, 233]],
];
const WHITE_DARK: Ramp = [
  [0, [30, 39, 51]],
  [0.38, [54, 69, 87]],
  [0.62, [132, 152, 170]],
  [0.76, [188, 206, 213]],
  [0.9, [235, 240, 232]],
  [1, [255, 252, 235]],
];
const GOLDEN: Ramp = [
  [0, [37, 29, 27]],
  [0.3, [53, 37, 30]],
  [0.45, [89, 60, 41]],
  [0.6, [143, 99, 62]],
  [0.75, [197, 157, 102]],
  [0.9, [225, 190, 134]],
  [1, [242, 215, 168]],
];
const GOLDEN_DARK: Ramp = [
  [0, [42, 33, 29]],
  [0.3, [79, 55, 40]],
  [0.45, [133, 95, 59]],
  [0.6, [201, 146, 89]],
  [0.75, [232, 185, 119]],
  [0.9, [250, 221, 167]],
  [1, [255, 235, 191]],
];
const NAPE: Ramp = [
  [0, [83, 55, 25]],
  [0.6, [136, 89, 28]],
  [0.76, [190, 137, 51]],
  [0.88, [229, 185, 93]],
  [1, [252, 229, 159]],
];
const NAPE_DARK: Ramp = [
  [0, [90, 66, 31]],
  [0.6, [143, 103, 42]],
  [0.76, [199, 154, 73]],
  [0.88, [235, 198, 112]],
  [1, [255, 237, 178]],
];
const BROWN: Ramp = [
  [0, [29, 26, 26]],
  [0.3, [45, 35, 30]],
  [0.5, [82, 57, 41]],
  [0.7, [136, 103, 71]],
  [0.9, [186, 154, 113]],
  [1, [213, 187, 148]],
];
const BROWN_DARK: Ramp = [
  [0, [32, 31, 32]],
  [0.3, [73, 54, 42]],
  [0.5, [135, 100, 68]],
  [0.7, [194, 155, 110]],
  [0.9, [215, 181, 132]],
  [1, [239, 213, 171]],
];
const BLACK: Ramp = [
  [0, [21, 27, 35]],
  [0.3, [28, 35, 44]],
  [0.5, [44, 54, 66]],
  [0.7, [76, 89, 103]],
  [1, [120, 133, 144]],
];
const BLACK_DARK: Ramp = [
  [0, [26, 34, 45]],
  [0.3, [35, 46, 60]],
  [0.5, [62, 78, 96]],
  [0.7, [111, 132, 151]],
  [1, [165, 184, 195]],
];
const FALCON: Ramp = [
  [0, [30, 42, 60]],
  [0.3, [55, 74, 99]],
  [0.48, [92, 123, 150]],
  [0.62, [156, 181, 192]],
  [0.78, [222, 221, 200]],
  [1, [248, 238, 211]],
];
const FALCON_DARK: Ramp = [
  [0, [33, 48, 74]],
  [0.3, [62, 86, 120]],
  [0.48, [94, 130, 169]],
  [0.62, [149, 177, 198]],
  [0.78, [223, 220, 197]],
  [1, [255, 241, 209]],
];
const SLATE: Ramp = [
  [0, [29, 43, 64]],
  [0.5, [75, 104, 134]],
  [1, [166, 190, 206]],
];
const SLATE_DARK: Ramp = [
  [0, [35, 54, 83]],
  [0.5, [92, 132, 172]],
  [1, [188, 214, 231]],
];
const BILL: Ramp = [
  [0, [133, 89, 21]],
  [0.5, [203, 151, 45]],
  [1, [255, 224, 128]],
];
// A small, warm focal point, kept distinct from both bronze feathers and ivory.
const EAGLE_BILL: Ramp = [
  [0, [188, 125, 25]],
  [0.5, [241, 188, 49]],
  [1, [255, 230, 132]],
];
const SKIN: Ramp = [
  [0, [104, 48, 29]],
  [0.5, [180, 87, 46]],
  [1, [250, 166, 107]],
];

function sample(ramp: Ramp, t: number): FeatherRgb {
  for (let i = 1; i < ramp.length; i++) {
    if (t > ramp[i][0]) continue;
    const [a, from] = ramp[i - 1],
      [b, to] = ramp[i];
    const k = clamp((t - a) / (b - a));
    return rgb(
      from[0] + (to[0] - from[0]) * k,
      from[1] + (to[1] - from[1]) * k,
      from[2] + (to[2] - from[2]) * k,
    );
  }
  return ramp[ramp.length - 1][1];
}

/**
 * Decode the approved atlas, not antialiased pixels already mixed with paper.
 * Its existing normal light, material shading and UV-anchored feather grain
 * drive these continuous color ramps. No screen noise or animation clock.
 */
export function featherColors(r: number, g: number, b: number, ink: Ink, theme: Theme) {
  const family = familyOf(r, g, b),
    dark = theme === 'dark';
  const value =
    family === 'gold' ? g / 0.86 : family === 'slate' && ink === 'peregrine' ? r / 0.86 : r;
  let light = (value - 90) / 163;
  if (!dark) {
    if (ink === 'peregrine' && family !== 'gold') light = (0.95 - (172 - value) / 150) / 0.7;
    else if (family === 'warm' || family === 'gold' || family === 'slate')
      light = (value - 22) / 97.5;
    else light = value >= 80 ? 0.72 + ((value - 80) / 50) * 0.28 : 0.25 + ((value - 22) / 65) * 0.4;
  }
  light = clamp(light);
  let palette: Ramp = dark ? WHITE_DARK : WHITE;
  if (family === 'gold') {
    if (ink === 'golden') {
      // The frozen atlas puts cere and nape in the same hue family, but their
      // shade bands do not overlap. Keep the yellow cere distinct from feathers.
      const cere = dark ? light < 0.75 : value < 90;
      palette = cere ? EAGLE_BILL : dark ? NAPE_DARK : NAPE;
    } else palette = ink === 'condor' ? SKIN : ink === 'bald' ? EAGLE_BILL : BILL;
  } else if (ink === 'golden' && family !== 'neutral') palette = dark ? GOLDEN_DARK : GOLDEN;
  else if (ink === 'bald' && family !== 'neutral') palette = dark ? BROWN_DARK : BROWN;
  else if (ink === 'condor' && family !== 'neutral') palette = dark ? BLACK_DARK : BLACK;
  else if (ink === 'peregrine')
    palette = family === 'slate' ? (dark ? SLATE_DARK : SLATE) : dark ? FALCON_DARK : FALCON;
  const surface = sample(palette, light);
  if (dark) return { surface, glyph: surface };
  const lum = surface[0] * 0.2126 + surface[1] * 0.7152 + surface[2] * 0.0722;
  const brown = family === 'warm' && (ink === 'golden' || ink === 'bald');
  const graphite = ink === 'condor' && family !== 'neutral' && family !== 'gold';
  const glyph =
    (lum < 126 && !brown && family !== 'gold') || graphite
      ? rgb(132 + light * 25, 149 + light * 23, 161 + light * 21)
      : rgb(surface[0] * 0.27, surface[1] * 0.29, surface[2] * 0.32);
  return { surface, glyph };
}
