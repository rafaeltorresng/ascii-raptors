import test from 'node:test';
import assert from 'node:assert/strict';
import { blendPose, flightPose } from '../src/flight.ts';
import { createKite, ELBOW, SHOULDER, WRIST, transformKite, wingPoint } from '../src/bird.ts';
import { cameraBasis, cameraEnvelope } from '../src/ascii.ts';
import { dot, v3 } from '../src/math.ts';

const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const EPSILON = 1e-6;

test('flight is deterministic and independent of presentation history', () => {
  const expected = flightPose(12.5, 'soar', 17);
  for (const rate of [30, 60, 120]) {
    for (let i = 0; i < rate * 12; i++) flightPose(i / rate, 'soar', 17);
    assert.deepEqual(flightPose(12.5, 'soar', 17), expected);
  }
  assert.notDeepEqual(flightPose(12.5, 'soar', 18), expected);
});

test('poses remain finite and bounded through bursts and wrap boundaries', () => {
  for (const mode of ['soar', 'glide', 'flap'] as const)
    for (let t = 0; t < 80; t += 0.013) {
      const pose = flightPose(t, mode);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(Math.abs(pose.bank) <= 0.48);
      assert.ok(Math.abs(pose.lift) < 0.72);
      assert.ok(pose.fold >= 0 && pose.fold <= 0.18);
      assert.ok(pose.tailSpread > 0.75 && pose.tailSpread < 1.3);
    }
});

test('continuous strokes and burst transitions have no pose jumps', () => {
  for (const mode of ['soar', 'flap'] as const)
    for (let t = 0.001; t < 40; t += 0.017) {
      const a = flightPose(t - 0.0001, mode),
        b = flightPose(t + 0.0001, mode);
      for (const key of ['lift', 'elbow', 'tip', 'fold', 'tailPitch', 'activity'] as const)
        assert.ok(Math.abs(a[key] - b[key]) < 0.004, `${mode}, ${key}, ${t}`);
    }
});

test('bank direction is coordinated with heading curvature', () => {
  for (let t = 0; t < 70; t += 0.1) {
    const p = flightPose(t),
      derivative =
        (flightPose(t + 0.0001).yaw - flightPose(Math.max(0, t - 0.0001)).yaw) /
        (t === 0 ? 0.0001 : 0.0002);
    assert.ok(Math.abs(derivative - p.curvature) < 0.00001);
    assert.ok(p.bank * derivative <= EPSILON);
  }
});

test('manual mode blending preserves endpoints and has eased entry/exit', () => {
  const a = flightPose(2, 'glide'),
    b = flightPose(2, 'flap');
  assert.deepEqual(blendPose(a, b, 0), a);
  assert.deepEqual(blendPose(a, b, 1), b);
  assert.ok(Math.abs(blendPose(a, b, 0.0001).lift - a.lift) < 1e-6);
  assert.ok(Math.abs(blendPose(a, b, 0.9999).lift - b.lift) < 1e-6);
});

test('wing joints preserve bone lengths during coupled folding and flapping', () => {
  const shoulderElbow = distance(SHOULDER, ELBOW),
    elbowWrist = distance(ELBOW, WRIST);
  for (let t = 0; t < 20; t += 0.071)
    for (const side of [-1, 1]) {
      const pose = flightPose(t, 'flap');
      const a = wingPoint(SHOULDER, side, pose),
        b = wingPoint(ELBOW, side, pose),
        c = wingPoint(WRIST, side, pose);
      assert.ok(Math.abs(distance(a, b) - shoulderElbow) < EPSILON);
      assert.ok(Math.abs(distance(b, c) - elbowWrist) < EPSILON);
    }
});

test('neutral wings mirror each other', () => {
  const pose = { ...flightPose(0, 'glide'), bank: 0 };
  for (const point of [SHOULDER, ELBOW, WRIST, v3(2.8, 0.2, 0.03)]) {
    const a = wingPoint(point, 1, pose),
      b = wingPoint(point, -1, pose);
    assert.equal(a.x, -b.x);
    assert.equal(a.y, b.y);
    assert.equal(a.z, b.z);
  }
});

test('geometry has valid indices, plausible span/length and an open tail fork', () => {
  const mesh = createKite();
  const pose = {
    ...flightPose(0, 'glide'),
    yaw: 0,
    bank: 0,
    pitch: 0,
    lift: 0,
    tip: 0,
    elbow: 0,
    fold: 0,
    tailSpread: 1,
    tailYaw: 0,
    tailPitch: 0,
    x: 0,
    y: 0,
    z: 0,
  };
  const { positions } = transformKite(mesh, pose);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    leftTip = false,
    rightTip = false;
  mesh.vertices.forEach((vertex, i) => {
    const x = positions[i * 3],
      y = positions[i * 3 + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    if (vertex.region === 'tail' && y < -1.5) {
      assert.ok(Math.abs(x) > 0.17);
      if (x < 0) leftTip = true;
      else rightTip = true;
    }
  });
  assert.ok(leftTip && rightTip);
  const ratio = (maxX - minX) / (maxY - minY);
  assert.ok(ratio > 1.8 && ratio < 2.3, `span/length ${ratio}`);
  for (const face of mesh.faces)
    for (const index of [face.a, face.b, face.c])
      assert.ok(Number.isInteger(index) && index >= 0 && index < mesh.vertices.length);
});

test('transformed geometry stays finite at extreme inspection poses', () => {
  const mesh = createKite(),
    output = new Float32Array(mesh.vertices.length * 3);
  for (const bank of [-1, 0, 1])
    for (const lift of [-0.68, 0, 0.68]) {
      const result = transformKite(mesh, { ...flightPose(3, 'flap'), bank, lift }, output);
      assert.equal(result.positions, output);
      assert.ok(result.positions.every(Number.isFinite));
    }
});

test('camera bases remain orthonormal in every supported view', () => {
  for (const view of ['ventral', 'oblique', 'dorsal', 'profile'] as const) {
    const { right, up, toward } = cameraBasis(view);
    for (const vector of [right, up, toward])
      assert.ok(Math.abs(dot(vector, vector) - 1) < EPSILON);
    assert.ok(Math.abs(dot(right, up)) < EPSILON);
    assert.ok(Math.abs(dot(right, toward)) < EPSILON);
    assert.ok(Math.abs(dot(up, toward)) < EPSILON);
  }
});

test('library imports in a non-browser process without DOM globals', async () => {
  assert.equal(typeof globalThis.window, 'undefined');
  const library = await import('../src/index.ts');
  assert.equal(typeof library.AsciiRaptor, 'function');
});

test('fixed camera envelope contains the full animated range without zoom breathing', () => {
  const mesh = createKite(),
    buffer = new Float32Array(mesh.vertices.length * 3);
  for (const mode of ['soar', 'glide', 'flap'] as const)
    for (let t = 0; t < 90; t += 0.5) {
      const { positions: p } = transformKite(mesh, flightPose(t, mode), buffer);
      for (const view of ['ventral', 'oblique', 'dorsal', 'profile'] as const) {
        const { right: r, up: u } = cameraBasis(view),
          envelope = cameraEnvelope(view);
        for (let i = 0; i < p.length; i += 3) {
          const x = p[i] * r.x + p[i + 1] * r.y + p[i + 2] * r.z,
            y = p[i] * u.x + p[i + 1] * u.y + p[i + 2] * u.z;
          assert.ok(
            Math.abs(x) < envelope.width * 0.5 - 0.12,
            `${mode}/${view}/${t}: horizontal crop`,
          );
          assert.ok(
            Math.abs(y) < envelope.height * 0.5 - 0.12,
            `${mode}/${view}/${t}: vertical crop`,
          );
        }
      }
    }
});
