import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dayCellRgb, gradeRgb } from '../demo/ink.ts';

const luminance = (rgb: readonly number[]) => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;

test('legacy ink mapping used by the before/after reference stays recorded', () => {
  const hash = createHash('sha256');
  for (const ink of ['kite', 'golden', 'peregrine', 'bald', 'condor'] as const)
    for (let r = 0; r < 256; r += 7)
      for (let g = 0; g < 256; g += 7)
        for (let b = 0; b < 256; b += 7) hash.update(JSON.stringify(gradeRgb(r, g, b, ink, true)));
  // Captured from the pre-change demo/ink.ts, not from the new day compositor.
  assert.equal(
    hash.digest('hex'),
    '160c921c189f191e7317ad7a7dcb77f6818661102158ab71b05e14b1283ff091',
  );
});

test('day cells carry white plumage while their ASCII ink remains dark', () => {
  for (const ink of ['kite', 'bald', 'condor'] as const) {
    const white = dayCellRgb(120, 120, 123, ink);
    const black = dayCellRgb(42, 42, 45, ink);
    const glyph = gradeRgb(120, 120, 123, ink, false)!;
    assert.ok(luminance(white) > 220, `${ink}: white feather is a light surface`);
    assert.ok(luminance(black) < 80, `${ink}: flight feather stays dark`);
    assert.ok(luminance(white) - luminance(glyph) > 100, `${ink}: white is not invisible ink`);
  }
});

test('day cell palettes keep the five plumages distinct and bounded', () => {
  const golden = dayCellRgb(90, 82, 70, 'golden');
  const bald = dayCellRgb(90, 82, 70, 'bald');
  const condor = dayCellRgb(90, 82, 70, 'condor');
  const slate = dayCellRgb(70, 80, 100, 'peregrine');
  const breast = dayCellRgb(120, 120, 123, 'peregrine');
  const head = dayCellRgb(108, 86, 53, 'condor');
  const bill = dayCellRgb(108, 86, 53, 'bald');
  assert.ok(golden[0] > golden[2] + 40);
  assert.ok(luminance(golden) > luminance(bald) + 20);
  assert.ok(luminance(condor) < luminance(bald) - 10);
  assert.ok(slate[2] > slate[0] + 20);
  assert.ok(breast[0] > breast[2] + 15 && luminance(breast) > 210);
  assert.ok(head[0] > head[1] + 50 && head[1] > head[2] + 25);
  assert.ok(bill[1] > head[1] + 25);
  for (const ink of ['kite', 'golden', 'peregrine', 'bald', 'condor'] as const)
    for (let v = 22; v <= 172; v += 6)
      assert.ok(
        dayCellRgb(v, v, v + 3, ink).every((c) => Number.isInteger(c) && c >= 0 && c <= 255),
      );
});
