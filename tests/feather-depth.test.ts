import test from 'node:test';
import assert from 'node:assert/strict';
import { featherColors } from '../demo/feather-colors.ts';
import type { Ink } from '../demo/ink.ts';

const luminance = (c: readonly number[]) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
function atlas(value: number, palette: number, falcon = false): [number, number, number] {
  if (palette === 2)
    return [
      Math.min(255, Math.round(value * 1.08)),
      Math.round(value * 0.86),
      Math.round(value * 0.53),
    ];
  if (palette === 1)
    return falcon
      ? [Math.round(value * 0.86), Math.round(value * 0.95), Math.min(255, value + 7)]
      : [value, Math.round(value * 0.91), Math.round(value * 0.78)];
  return [value, value, Math.min(255, value + 3)];
}

test('golden eagle day feathers have shadow, bronze and buff rather than a flat brown', () => {
  const dark = featherColors(...atlas(65, 1), 'golden', 'light').surface;
  const middle = featherColors(...atlas(85, 1), 'golden', 'light').surface;
  const bright = featherColors(...atlas(104, 1), 'golden', 'light').surface;
  assert.ok(luminance(middle) > luminance(dark) + 35);
  assert.ok(luminance(bright) > luminance(middle) + 35);
  assert.ok(bright[0] > bright[2] + 60 && dark[0] < 100);
  const cere = featherColors(...atlas(78, 2), 'golden', 'light').surface;
  const napeShade = featherColors(...atlas(98, 2), 'golden', 'light').surface;
  const napeLight = featherColors(...atlas(116, 2), 'golden', 'light').surface;
  assert.ok(cere[1] > 140 && cere[0] > cere[2] + 120, 'yellow cere must not become brown');
  assert.ok(luminance(napeLight) > luminance(napeShade) + 35, 'gold must retain its shadows');
});

test('all five birds preserve characteristic white, charcoal, slate and accent separation', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const ink of ['kite', 'bald', 'condor'] as const) {
      const white = featherColors(...atlas(theme === 'dark' ? 240 : 120, 0), ink, theme);
      const black = featherColors(...atlas(theme === 'dark' ? 156 : 42, 0), ink, theme);
      assert.ok(luminance(white.surface) > luminance(black.surface) + 100, ink);
      if (theme === 'light') assert.ok(luminance(white.surface) > luminance(white.glyph) + 100);
    }
    const slate = featherColors(
      ...atlas(theme === 'dark' ? 175 : 85, 1, true),
      'peregrine',
      theme,
    ).surface;
    assert.ok(slate[2] > slate[0] + 30);
    const skin = featherColors(...atlas(theme === 'dark' ? 230 : 110, 2), 'condor', theme).surface;
    assert.ok(skin[0] > skin[1] + 50 && skin[1] > skin[2] + 30);
  }
});

test('atlas shading is deterministic and keeps RGB bounded at both theme endpoints', () => {
  for (const ink of ['kite', 'golden', 'peregrine', 'bald', 'condor'] as Ink[])
    for (const theme of ['dark', 'light'] as const)
      for (const palette of [0, 1, 2])
        for (let level = 0; level < 24; level++) {
          const value =
            theme === 'dark'
              ? Math.round(90 + (level / 23) * 163)
              : Math.round(172 - (level / 23) * 150);
          const input = atlas(value, palette, ink === 'peregrine');
          const color = featherColors(...input, ink, theme);
          assert.deepEqual(color, featherColors(...input, ink, theme));
          assert.ok(
            [...color.surface, ...color.glyph].every(
              (v) => Number.isInteger(v) && v >= 0 && v <= 255,
            ),
          );
        }
});
