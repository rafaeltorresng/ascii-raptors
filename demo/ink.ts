import type { Theme } from '../src/ascii.ts';

/**
 * Sky-only plumage grade. Glyph luminance still drives light and shadow.
 * The hue is the species: white kite, umber and gold eagle, slate falcon,
 * white-headed bald eagle, black condor with an orange head. Studies keep the renderer colors.
 */
export type Ink = 'kite' | 'golden' | 'peregrine' | 'bald' | 'condor';

type Family = 'neutral' | 'warm' | 'gold' | 'slate';
type Rgb = readonly [number, number, number];

const DARK: Record<Ink, Record<Family, readonly [Rgb, Rgb]>> = {
  kite: {
    neutral: [
      [16, 18, 22],
      [255, 255, 252],
    ],
    warm: [
      [16, 18, 22],
      [255, 255, 252],
    ],
    gold: [
      [16, 18, 22],
      [255, 255, 252],
    ],
    slate: [
      [16, 18, 22],
      [255, 255, 252],
    ],
  },
  golden: {
    neutral: [
      [64, 40, 22],
      [214, 170, 112],
    ],
    warm: [
      [110, 52, 8],
      [255, 186, 36],
    ],
    gold: [
      [255, 196, 24],
      [255, 236, 72],
    ],
    slate: [
      [110, 52, 8],
      [255, 186, 36],
    ],
  },
  peregrine: {
    neutral: [
      [28, 48, 112],
      [236, 224, 196],
    ],
    warm: [
      [96, 72, 40],
      [220, 180, 120],
    ],
    gold: [
      [255, 204, 20],
      [255, 240, 64],
    ],
    slate: [
      [12, 36, 168],
      [72, 132, 255],
    ],
  },
  bald: {
    neutral: [
      [32, 30, 28],
      [255, 255, 248],
    ],
    warm: [
      [72, 32, 12],
      [176, 96, 42],
    ],
    gold: [
      [255, 196, 12],
      [255, 230, 48],
    ],
    slate: [
      [72, 32, 12],
      [176, 96, 42],
    ],
  },
  condor: {
    neutral: [
      [18, 18, 20],
      [255, 255, 252],
    ],
    warm: [
      [8, 8, 10],
      [36, 38, 42],
    ],
    gold: [
      [232, 84, 24],
      [255, 124, 40],
    ],
    slate: [
      [8, 8, 10],
      [36, 38, 42],
    ],
  },
};

/** Day ink stays darker than the sky. Light plumage is the pale end of the ink, not white glyphs. */
const LIGHT: Record<Ink, Record<Family, readonly [Rgb, Rgb]>> = {
  kite: {
    neutral: [
      [14, 16, 20],
      [86, 102, 118],
    ],
    warm: [
      [14, 16, 20],
      [86, 102, 118],
    ],
    gold: [
      [14, 16, 20],
      [86, 102, 118],
    ],
    slate: [
      [14, 16, 20],
      [86, 102, 118],
    ],
  },
  golden: {
    neutral: [
      [48, 26, 12],
      [112, 74, 40],
    ],
    warm: [
      [54, 24, 8],
      [118, 64, 20],
    ],
    gold: [
      [168, 112, 0],
      [196, 146, 16],
    ],
    slate: [
      [54, 24, 8],
      [118, 64, 20],
    ],
  },
  peregrine: {
    neutral: [
      [16, 32, 78],
      [96, 108, 122],
    ],
    warm: [
      [62, 44, 24],
      [124, 96, 64],
    ],
    gold: [
      [176, 124, 0],
      [204, 156, 16],
    ],
    slate: [
      [12, 32, 96],
      [58, 92, 150],
    ],
  },
  bald: {
    neutral: [
      [22, 24, 28],
      [108, 98, 86],
    ],
    warm: [
      [48, 20, 8],
      [112, 56, 20],
    ],
    gold: [
      [176, 122, 0],
      [204, 154, 12],
    ],
    slate: [
      [48, 20, 8],
      [112, 56, 20],
    ],
  },
  condor: {
    neutral: [
      [16, 20, 26],
      [78, 94, 112],
    ],
    warm: [
      [10, 12, 16],
      [42, 48, 58],
    ],
    gold: [
      [150, 52, 14],
      [186, 78, 24],
    ],
    slate: [
      [10, 12, 16],
      [42, 48, 58],
    ],
  },
};

const CREAM: Record<'dark' | 'light', readonly [Rgb, Rgb]> = {
  dark: [
    [168, 142, 102],
    [248, 236, 208],
  ],
  light: [
    [28, 40, 72],
    [96, 108, 122],
  ],
};

const PAPER: Record<'dark' | 'light', Rgb> = {
  dark: [11, 11, 12],
  light: [244, 241, 234],
};

export function familyOf(r: number, g: number, b: number): Family {
  const max = Math.max(r, g, b);
  const spread = max - Math.min(r, g, b);
  if (spread < 10 && spread / Math.max(max, 1) < 0.08) return 'neutral';
  if (b > r + Math.max(3, spread * 0.12) && b + 4 >= g) return 'slate';
  if (r >= g && g >= b && (r - b) / Math.max(r, 1) > 0.28 && b < g * 0.8) return 'gold';
  if (r > b + Math.max(6, r * 0.08)) return 'warm';
  return 'neutral';
}

function channel(value: number) {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function mix(from: number, to: number, t: number) {
  return channel(from + (to - from) * t);
}

function ramp(ink: Ink, family: Family, tone: number, dark: boolean): readonly [Rgb, Rgb] {
  if (ink === 'peregrine' && family === 'neutral') {
    const slate = (dark ? DARK : LIGHT).peregrine.slate;
    const cream = dark ? CREAM.dark : CREAM.light;
    if (tone >= 0.58) return cream;
    if (tone <= 0.42) return slate;
    const t = (tone - 0.42) / 0.16;
    return [
      [
        mix(slate[0][0], cream[0][0], t),
        mix(slate[0][1], cream[0][1], t),
        mix(slate[0][2], cream[0][2], t),
      ],
      [
        mix(slate[1][0], cream[1][0], t),
        mix(slate[1][1], cream[1][1], t),
        mix(slate[1][2], cream[1][2], t),
      ],
    ];
  }
  return (dark ? DARK : LIGHT)[ink][family];
}

/** Recolor one glyph pixel. Returns null when the pixel is background. */
export function gradeRgb(r: number, g: number, b: number, ink: Ink, dark: boolean): Rgb | null {
  const paper = dark ? PAPER.dark : PAPER.light;
  if (Math.abs(r - paper[0]) < 14 && Math.abs(g - paper[1]) < 14 && Math.abs(b - paper[2]) < 14)
    return null;
  const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  if (dark && lum < 0.2) return null;
  let tone = dark
    ? Math.min(1, Math.max(0, (lum - 0.3) / 0.62))
    : Math.min(1, Math.max(0, (lum - 0.06) / 0.62));
  const family = familyOf(r, g, b);
  if (family === 'gold') tone = Math.max(tone, 0.92);
  else if (dark && ink === 'kite') tone = tone < 0.55 ? tone * 0.18 : 0.72 + (tone - 0.55) * 0.62;
  const [shadow, highlight] = ramp(ink, family, tone, dark);
  return [
    mix(shadow[0], highlight[0], tone),
    mix(shadow[1], highlight[1], tone),
    mix(shadow[2], highlight[2], tone),
  ];
}

const plates = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

/** Opaque day plumage, separate from the darker ASCII ink. Input is atlas ink, not paper. */
export function dayCellRgb(r: number, g: number, b: number, ink: Ink): Rgb {
  const family = familyOf(r, g, b);
  const tone = Math.min(
    1,
    Math.max(0, ((r * 0.2126 + g * 0.7152 + b * 0.0722) / 255 - 0.06) / 0.62),
  );
  let shadow: Rgb,
    highlight: Rgb,
    t = tone;
  if (ink === 'kite' || ((ink === 'bald' || ink === 'condor') && family === 'neutral')) {
    shadow = [55, 62, 70];
    highlight = [242, 240, 226];
    // White underwing and dark flight feathers remain distinct under the same light.
    t = Math.min(1, Math.max(0, (tone - 0.23) / 0.39));
    t = t * t * (3 - 2 * t);
  } else if (ink === 'golden') {
    shadow = family === 'gold' ? [173, 119, 42] : [96, 65, 40];
    highlight = family === 'gold' ? [231, 192, 105] : [192, 153, 105];
  } else if (ink === 'bald') {
    shadow = family === 'gold' ? [194, 141, 34] : [63, 45, 32];
    highlight = family === 'gold' ? [242, 197, 82] : [145, 103, 65];
  } else if (ink === 'condor') {
    shadow = family === 'gold' ? [196, 101, 55] : [42, 47, 53];
    highlight = family === 'gold' ? [239, 158, 91] : [78, 83, 88];
  } else if (family === 'gold') {
    shadow = [193, 142, 34];
    highlight = [238, 197, 87];
  } else {
    shadow = [61, 80, 104];
    highlight = [232, 224, 203];
    t = family === 'slate' ? tone * 0.35 : Math.min(1, Math.max(0, (tone - 0.24) / 0.4));
  }
  return [
    mix(shadow[0], highlight[0], t),
    mix(shadow[1], highlight[1], t),
    mix(shadow[2], highlight[2], t),
  ];
}

/**
 * The species canvas is opaque. Grade it, then return a transparent plate so
 * the sky can show between glyphs.
 */
export function enrichInk(canvas: HTMLCanvasElement, ink: Ink, theme: Theme) {
  const ctx = canvas.getContext('2d');
  const plate = plates.get(canvas) ?? canvas.ownerDocument.createElement('canvas');
  plates.set(canvas, plate);
  if (!ctx || canvas.width < 2 || canvas.height < 2) return plate;
  if (plate.width !== canvas.width || plate.height !== canvas.height) {
    plate.width = canvas.width;
    plate.height = canvas.height;
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const dark = theme === 'dark';
  const paper = dark ? PAPER.dark : PAPER.light;
  for (let i = 0; i < data.length; i += 4) {
    const graded = gradeRgb(data[i], data[i + 1], data[i + 2], ink, dark);
    if (!graded) {
      if (
        Math.abs(data[i] - paper[0]) < 14 &&
        Math.abs(data[i + 1] - paper[1]) < 14 &&
        Math.abs(data[i + 2] - paper[2]) < 14
      )
        data[i + 3] = 0;
      continue;
    }
    data[i] = graded[0];
    data[i + 1] = graded[1];
    data[i + 2] = graded[2];
    data[i + 3] = 255;
  }
  plate.getContext('2d')!.putImageData(image, 0, 0);
  return plate;
}
