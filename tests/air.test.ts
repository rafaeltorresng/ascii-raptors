import test from 'node:test';
import assert from 'node:assert/strict';
import { airMotes } from '../demo/air.ts';

const WIDE = { width: 1440, height: 860 };

test('air is a sparse pixel field that drifts and repeats', () => {
  const now = airMotes(WIDE.width, WIDE.height, 4);
  const later = airMotes(WIDE.width, WIDE.height, 7);
  const again = airMotes(WIDE.width, WIDE.height, 4);
  assert.deepEqual(now, again);
  assert.ok(now.length > 40 && now.length < WIDE.width * WIDE.height * 0.01);
  assert.ok(now.some((mote) => mote.layer === 'cloud'));
  assert.ok(now.some((mote) => mote.layer === 'air'));
  for (const mote of now) {
    assert.ok(Number.isFinite(mote.x) && Number.isFinite(mote.y));
    assert.ok(mote.x >= -500 && mote.x <= WIDE.width + 500);
    assert.ok(mote.y >= -40 && mote.y <= WIDE.height + 40);
    assert.ok(Number.isInteger(mote.x) && Number.isInteger(mote.y));
    assert.ok(mote.opacity > 0 && mote.opacity <= 1);
    assert.ok(mote.span >= mote.size && mote.span <= 5);
  }
  const moved = later.filter(
    (mote, index) => !now[index] || mote.x !== now[index].x || mote.y !== now[index].y,
  );
  assert.ok(moved.length > now.length * 0.2, 'the field did not drift');
});

test('air fades continuously without switching motes on and off', () => {
  const field = airMotes(390, 844, 10);
  const next = airMotes(390, 844, 10 + 1 / 30);
  assert.equal(field.length, next.length);
  field.forEach((mote, i) => {
    assert.ok(Math.abs(mote.opacity - next[i].opacity) < 0.02);
    const dx = Math.abs(mote.x - next[i].x);
    assert.ok(dx <= 2 || dx >= 388, 'particle jumps without crossing the frame edge');
  });
  assert.deepEqual(airMotes(390, 844, -5), airMotes(390, 844, 0));
});
