import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraBasis } from '../src/ascii.ts';
import { FLYERS, flightBounds, flightCourse, steerPose, yawForHeading } from '../demo/course.ts';
import type { FlyerId } from '../demo/course.ts';
import { eaglePose } from '../src/species/golden-eagle.ts';
import { getSpecies } from '../src/species.ts';

const WIDE = { width: 1440, height: 860 };
const NARROW = { width: 390, height: 780 };
const STEP = 1 / 30;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

function track(species: FlyerId, viewport: { width: number; height: number }, seconds = 70) {
  const samples = [];
  for (let i = 0; i <= seconds * 30; i++) samples.push(flightCourse(species, i * STEP, viewport));
  return samples;
}

function screenHeading(yaw: number) {
  const { right, up } = cameraBasis('ventral');
  const forwardX = -Math.sin(yaw);
  const forwardY = Math.cos(yaw);
  const dx = forwardX * right.x + forwardY * right.y;
  const dy = -(forwardX * up.x + forwardY * up.y);
  return Math.atan2(dy, dx);
}

test('ventral yaw points the nose along the heading', () => {
  for (let heading = -Math.PI + 0.05; heading < Math.PI; heading += 0.17)
    assert.ok(Math.abs(wrap(screenHeading(yawForHeading(heading)) - heading)) < 1e-6);
});

test('each raptor travels and turns its body', () => {
  const speeds = new Map<FlyerId, number>();
  for (const species of FLYERS) {
    const samples = track(species, WIDE);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      minSpeed = Infinity,
      maxStep = 0,
      maxTurn = 0,
      turned = 0,
      inside = 0,
      bankAlign = 0;
    for (let i = 0; i < samples.length; i++) {
      const course = samples[i];
      assert.ok(Object.values(course).every(Number.isFinite), species);
      minX = Math.min(minX, course.x);
      maxX = Math.max(maxX, course.x);
      minY = Math.min(minY, course.y);
      maxY = Math.max(maxY, course.y);
      if (course.x > -0.08 && course.x < 1.08 && course.y > -0.08 && course.y < 1.08) inside++;
      const speed = Math.hypot(course.vx * WIDE.width, course.vy * WIDE.height);
      minSpeed = Math.min(minSpeed, speed);
      assert.ok(Math.abs(course.bank) <= 0.5 + 1e-9);
      const travel = Math.atan2(course.vy * WIDE.height, course.vx * WIDE.width);
      assert.ok(
        Math.abs(wrap(screenHeading(course.yaw) - travel)) < 0.08,
        `${species} nose leaves its path`,
      );
      if (i === 0) continue;
      const previous = samples[i - 1];
      const yawStep = Math.abs(wrap(course.yaw - previous.yaw));
      maxTurn = Math.max(maxTurn, yawStep);
      turned += yawStep;
      maxStep = Math.max(
        maxStep,
        Math.hypot((course.x - previous.x) * WIDE.width, (course.y - previous.y) * WIDE.height),
      );
      const yawRate = wrap(course.yaw - previous.yaw) / STEP;
      bankAlign += course.bank * yawRate;
      assert.ok(course.bank * yawRate <= 0.35, `${species} banks out of the turn`);
    }
    const bounds = flightBounds(species, WIDE);
    assert.ok(
      maxX - minX > (bounds.rx / WIDE.width) * 1.45,
      `${species} horizontal range ${maxX - minX}`,
    );
    assert.ok(
      maxY - minY > (bounds.ry / WIDE.height) * 1.45,
      `${species} vertical range ${maxY - minY}`,
    );
    assert.ok(inside / samples.length > 0.9, `${species} leaves the frame`);
    assert.ok(minSpeed > 15, `${species} stalls at ${minSpeed.toFixed(1)} px/s`);
    assert.ok(maxStep < 12, `${species} jumps ${maxStep.toFixed(1)} px/frame`);
    assert.ok(maxTurn < 0.08, `${species} snaps yaw by ${maxTurn.toFixed(3)} rad`);
    assert.ok(turned > 2.2, `${species} barely turns (${turned.toFixed(2)} rad)`);
    assert.ok(bankAlign < 0, `${species} banks away from its turns`);
    speeds.set(
      species,
      samples.reduce(
        (sum, course) => sum + Math.hypot(course.vx * WIDE.width, course.vy * WIDE.height),
        0,
      ) / samples.length,
    );
  }
  assert.ok(speeds.get('peregrine-falcon')! > speeds.get('swallow-tailed-kite')!);
  assert.ok(speeds.get('swallow-tailed-kite')! > speeds.get('bald-eagle')!);
  assert.ok(speeds.get('bald-eagle')! > speeds.get('golden-eagle')!);
  assert.ok(speeds.get('golden-eagle')! > speeds.get('california-condor')!);
});

test('narrow sky still moves and turns', () => {
  for (const species of FLYERS) {
    const samples = track(species, NARROW, 40);
    const xs = samples.map((course) => course.x);
    const ys = samples.map((course) => course.y);
    let turned = 0;
    for (let i = 1; i < samples.length; i++)
      turned += Math.abs(wrap(samples[i].yaw - samples[i - 1].yaw));
    const bounds = flightBounds(species, NARROW);
    assert.ok(
      Math.max(...xs) - Math.min(...xs) > (bounds.rx / NARROW.width) * 1.45,
      `${species} narrow x`,
    );
    assert.ok(
      Math.max(...ys) - Math.min(...ys) > (bounds.ry / NARROW.height) * 1.45,
      `${species} narrow y`,
    );
    assert.ok(turned > 1.2, `${species} narrow turn ${turned}`);
  }
});

test('routes are deterministic and only occasionally overlap', () => {
  for (const species of FLYERS)
    assert.deepEqual(flightCourse(species, 9.5, WIDE), flightCourse(species, 9.5, WIDE));
  let close = 0;
  let pairs = 0;
  const steps = 50 * 8;
  for (let i = 0; i <= steps; i++) {
    const points = FLYERS.map((species) => flightCourse(species, i / 8, WIDE));
    for (let a = 0; a < points.length; a++)
      for (let b = a + 1; b < points.length; b++) {
        pairs++;
        if (Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y) < 0.12) close++;
      }
    const byId = Object.fromEntries(FLYERS.map((id, index) => [id, points[index]]));
    assert.ok(byId['peregrine-falcon'].scale < byId['golden-eagle'].scale);
    assert.ok(byId['california-condor'].scale > byId['bald-eagle'].scale);
  }
  assert.ok(close / pairs < 0.16, `overlap fraction ${close / pairs}`);
  const start = flightCourse('golden-eagle', 6, WIDE);
  const next = flightCourse('golden-eagle', 6 + STEP, WIDE);
  assert.ok(Math.abs(next.x - (start.x + start.vx * STEP)) < 0.008);
  assert.ok(Math.abs(next.y - (start.y + start.vy * STEP)) < 0.008);
});

test('steering follows the route and leaves the approved wingbeat intact', () => {
  const poseOf = (id: FlyerId, time: number) =>
    id === 'bald-eagle'
      ? eaglePose(time, 'soar', 41)
      : id === 'california-condor'
        ? eaglePose(time, 'soar', 59)
        : getSpecies(id).flight(time, 'soar', 23);
  for (const species of FLYERS) {
    for (const time of [0, 4.2, 11.8, 27]) {
      const pose = poseOf(species, time);
      const course = flightCourse(species, time, WIDE);
      const steered = steerPose(pose, course, species);
      for (const key of ['lift', 'elbow', 'tip', 'fold', 'activity', 'tailPitch'] as const)
        assert.equal(steered[key], pose[key]);
      assert.equal(steered.x, 0);
      assert.equal(steered.y, 0);
      assert.equal(steered.z, 0);
      assert.equal(steered.yaw, course.yaw);
    }
  }
});
