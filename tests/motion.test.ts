import test from 'node:test';
import assert from 'node:assert/strict';
import { FLYERS, flightCourse } from '../demo/course.ts';
import { MODEL } from '../demo/scene.ts';
import { auditMotion } from '../demo/qa/motion-audit.ts';
import { skySpriteSize } from '../demo/layout.ts';

const views = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 700 },
  { width: 960, height: 540 },
];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

test('routes keep enlarged silhouettes on stage over two minutes and four viewport shapes', () => {
  const report = auditMotion();
  for (const r of report) {
    const label = `${r.id} ${r.viewport.width}`;
    const desktop = r.viewport.width >= 700;
    assert.ok(
      r.visibleVertexFraction > (desktop ? 0.997 : 0.98),
      `${label}: visible ${r.visibleVertexFraction}`,
    );
    assert.ok(r.worstVisible > (desktop ? 0.985 : 0.94), `${label}: worst ${r.worstVisible}`);
    assert.ok(r.minSpeed > 18, `${label}: nearly stalls at ${r.minSpeed}`);
    assert.ok(r.maxSpeed / r.minSpeed > 1.35, `${label}: no phrasing in its speed`);
    assert.equal(r.effortMin, 0, `${label}: no fully settled glide`);
    assert.equal(r.effortMax, 1, `${label}: no fully powered series`);
  }
});

test('heading, bank and velocity remain continuous through route knots and cycle seams', () => {
  for (const view of views)
    for (const id of FLYERS) {
      let previous = flightCourse(id, 0, view);
      for (let i = 1; i <= 120 * 30; i++) {
        const t = i / 30,
          c = flightCourse(id, t, view),
          before = flightCourse(id, t - 0.0001, view),
          after = flightCourse(id, t + 0.0001, view);
        const dx = ((after.x - before.x) * view.width) / 0.0002,
          dy = ((after.y - before.y) * view.height) / 0.0002;
        assert.ok(
          Math.hypot(dx - c.vx * view.width, dy - c.vy * view.height) < 0.06,
          `${id}: velocity disagrees with trajectory`,
        );
        assert.ok(Math.abs(wrap(c.yaw - previous.yaw)) < 0.065, `${id}: snaps heading`);
        assert.ok(Math.abs(c.bank - previous.bank) < 0.03, `${id}: snaps bank`);
        assert.ok(Math.abs(c.effort - previous.effort) < 0.09, `${id}: snaps wingbeat envelope`);
        previous = c;
      }
    }
});

test('seeking and interleaved viewports produce the same flight, without replaying elapsed time', () => {
  for (const id of FLYERS) {
    const expected = flightCourse(id, 73.219, views[0]);
    for (const v of views) {
      flightCourse(id, 1_000_000, v);
      flightCourse(id, 0.1, v);
    }
    assert.deepEqual(flightCourse(id, 73.219, views[0]), expected);
    assert.throws(() => flightCourse(id, NaN, views[0]), RangeError);
  }
});

test('powered and resting poses use the authored strokes, with a gathered peregrine glide', () => {
  for (const id of FLYERS) {
    const model = MODEL[id];
    let glide = false,
      flap = false;
    for (let t = 0; t < 120; t += 0.1) {
      const course = flightCourse(id, t, views[0]),
        pose = model.flight(t, course);
      assert.equal(pose.activity, course.effort);
      assert.ok(Object.values(pose).every(Number.isFinite));
      if (pose.activity === 0) {
        glide = true;
        if (id === 'peregrine-falcon') {
          assert.equal(pose.fold, 0.56);
          assert.equal(pose.tailSpread, 0.66);
        }
      }
      if (pose.activity === 1) flap = true;
    }
    assert.ok(glide && flap, id);
  }
  // The enlargement approved in the preceding phase stays exactly the same.
  assert.equal(skySpriteSize(0.92, 1440, 900), 437);
  assert.equal(skySpriteSize(1.6, 1440, 900), 761);
  assert.equal(skySpriteSize(1.6, 390, 844), 434);
});
