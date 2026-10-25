import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeRgb } from '../demo/ink.ts';

const lum = (rgb: readonly [number, number, number]) =>
  rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;

test('each plumage keeps its shade and takes its own hue', () => {
  const kiteDark = gradeRgb(120, 121, 123, 'kite', true)!;
  const kiteLight = gradeRgb(230, 231, 233, 'kite', true)!;
  assert.ok(lum(kiteLight) > lum(kiteDark));
  assert.ok(Math.abs(kiteLight[0] - kiteLight[2]) < 24);

  const eagleShade = gradeRgb(110, 100, 86, 'golden', true)!;
  const eagleBright = gradeRgb(210, 191, 164, 'golden', true)!;
  assert.ok(lum(eagleBright) > lum(eagleShade));
  assert.ok(eagleShade[0] > eagleShade[2] + 24, 'eagle body stays brown');

  const nape = gradeRgb(200, 160, 96, 'golden', true)!;
  const skin = gradeRgb(200, 160, 96, 'condor', true)!;
  const black = gradeRgb(160, 146, 125, 'condor', true)!;
  const lining = gradeRgb(230, 231, 233, 'condor', true)!;
  assert.ok(nape[0] > 240 && nape[1] > 190 && nape[2] < 100, 'golden nape stays yellow');
  assert.ok(
    skin[0] > 220 && skin[1] > 70 && skin[1] < 160 && skin[2] < 90,
    'condor head is orange',
  );
  assert.ok(black[0] < 50 && black[2] < 50, 'condor body stays black');
  assert.ok(lining[0] > 230 && lining[2] > 220, 'condor wing lining stays white');
  const bill = gradeRgb(186, 148, 91, 'bald', true)!;
  assert.ok(bill[0] > 240 && bill[1] > 190 && bill[2] < 90, 'bald bill stays bright yellow');

  const slate = gradeRgb(120, 138, 168, 'peregrine', true)!;
  assert.ok(slate[2] > slate[0] + 16, 'peregrine back is slate');

  const head = gradeRgb(230, 231, 233, 'bald', true)!;
  const body = gradeRgb(160, 146, 125, 'bald', true)!;
  assert.ok(head[0] > 220 && head[1] > 220 && head[2] > 210);
  assert.ok(body[0] > body[2] + 20 && body[0] < 210);

  assert.equal(gradeRgb(11, 11, 12, 'golden', true), null);

  const hood = gradeRgb(120, 121, 124, 'peregrine', true)!;
  const breast = gradeRgb(220, 221, 224, 'peregrine', true)!;
  assert.ok(hood[2] > hood[0] + 12, 'peregrine hood is blue');
  assert.ok(breast[0] > 190 && breast[0] + 16 > breast[2], 'peregrine breast is cream');

  const paperBird = gradeRgb(150, 136, 118, 'golden', false)!;
  assert.ok(paperBird[0] < 210 && paperBird[0] > paperBird[2] + 24);
  assert.equal(gradeRgb(244, 241, 234, 'golden', false), null);

  const dayWhite = gradeRgb(210, 211, 213, 'kite', false)!;
  const dayBlack = gradeRgb(70, 71, 73, 'kite', false)!;
  const dayHead = gradeRgb(210, 211, 213, 'bald', false)!;
  assert.ok(dayWhite[0] < 160 && dayWhite[0] > dayBlack[0] + 40, 'kite light ink stays visible');
  assert.ok(dayBlack[0] < 55, 'kite dark feathers stay dark');
  assert.ok(dayHead[0] < 160 && dayHead[0] > 70, 'bald head is light ink, not paper');
});
