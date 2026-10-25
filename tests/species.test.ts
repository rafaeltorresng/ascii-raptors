import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, getSpecies } from '../src/species.ts';
import { cameraBasis, cameraEnvelope } from '../src/ascii.ts';
import { articulatedWing } from '../src/species/rig.ts';
import { EAGLE_RIG } from '../src/species/golden-eagle.ts';
import { FALCON_RIG } from '../src/species/peregrine-falcon.ts';
import type { FlightPose } from '../src/flight.ts';

const modes = ['soar', 'glide', 'flap'] as const;
const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const newSpecies = SPECIES.slice(1);

test('species have valid original surfaces, separate material identities and closed tails', () => {
  assert.equal(SPECIES.length, 3);
  assert.throws(() => getSpecies('unknown' as never), RangeError);
  for (const species of newSpecies) {
    const mesh = species.create();
    assert.deepEqual(mesh, species.create());
    assert.ok(mesh.vertices.length > 3000 && mesh.vertices.length < 10000);
    for (const face of mesh.faces)
      for (const index of [face.a, face.b, face.c])
        assert.ok(Number.isInteger(index) && index >= 0 && index < mesh.vertices.length);
    assert.ok(mesh.vertices.every((v) => Object.values(v.point).every(Number.isFinite)));
    const tails = mesh.vertices.filter((v) => v.region === 'tail');
    const centralTip = Math.min(...tails.filter((v) => v.point.x < 0.1).map((v) => v.point.y));
    const outerTip = Math.min(...tails.filter((v) => v.point.x > 0.25).map((v) => v.point.y));
    assert.ok(centralTip < outerTip, `${species.id}: unexpected fork`);
    const materials = new Set(mesh.faces.map((f) => f.material));
    assert.ok(materials.has(species.id === 'golden-eagle' ? 'eagle-nape' : 'falcon-hood'));
  }
});

test('eagle fingers and peregrine pointed hand are distinct silhouettes', () => {
  const eagle = getSpecies('golden-eagle').create(),
    falcon = getSpecies('peregrine-falcon').create();
  const outline = (mesh: typeof eagle) =>
    mesh.vertices.filter((v) => v.region === 'wing' && v.u === 1);
  const eagleTips = outline(eagle).filter((v) => v.point.x > 3.1),
    falconTips = outline(falcon).filter((v) => v.point.x > 2.6);
  assert.ok(
    Math.max(...eagleTips.map((v) => v.point.y)) - Math.min(...eagleTips.map((v) => v.point.y)) >
      0.9,
  );
  assert.ok(
    Math.max(...falconTips.map((v) => v.point.y)) - Math.min(...falconTips.map((v) => v.point.y)) <
      0.15,
  );
  assert.notEqual(eagle.faces.length, falcon.faces.length);
});

for (const species of newSpecies) {
  test(`${species.id}: seeded flight, mode boundaries, finite continuous movement`, () => {
    assert.deepEqual(species.flight(19, 'soar', 29), species.flight(19, 'soar', 29));
    assert.notDeepEqual(species.flight(19, 'soar', 7), species.flight(19, 'soar', 29));
    for (const mode of modes)
      for (let t = 0.001; t < 65; t += 0.019) {
        const p = species.flight(t, mode),
          a = species.flight(t - 0.0001, mode),
          b = species.flight(t + 0.0001, mode);
        assert.ok(Object.values(p).every(Number.isFinite));
        assert.ok(
          p.activity >= 0 &&
            p.activity <= 1 &&
            p.fold >= 0 &&
            p.fold < 0.4 &&
            Math.abs(p.bank) < 0.5,
        );
        if (mode === 'glide') assert.equal(p.activity, 0);
        if (mode === 'flap') assert.equal(p.activity, 1);
        for (const key of ['lift', 'elbow', 'tip', 'fold', 'tailPitch', 'activity'] as const)
          assert.ok(Math.abs(a[key] - b[key]) < 0.006, `${key}/${t}`);
        assert.ok(Math.abs((b.yaw - a.yaw) / 0.0002 - p.curvature) < 1e-6);
        assert.ok(p.bank * p.curvature <= 1e-6);
      }
  });
  test(`${species.id}: own articulated skeleton preserves bones and mirrored neutral wings`, () => {
    const rig = species.id === 'golden-eagle' ? EAGLE_RIG : FALCON_RIG;
    for (let t = 0; t < 12; t += 0.071) {
      const pose = { ...species.flight(t, 'flap'), bank: 0 };
      const points = [rig.shoulder, rig.elbow, rig.wrist];
      const right = points.map((p) => articulatedWing(p, 1, pose, rig)),
        left = points.map((p) => articulatedWing(p, -1, pose, rig));
      for (let i = 0; i < 2; i++)
        assert.ok(
          Math.abs(distance(right[i], right[i + 1]) - distance(points[i], points[i + 1])) < 1e-6,
        );
      right.forEach((p, i) => {
        assert.equal(p.x, -left[i].x);
        assert.equal(p.y, left[i].y);
        assert.equal(p.z, left[i].z);
      });
    }
  });
  test(`${species.id}: full movement and authored studies fit all four fixed cameras`, () => {
    const mesh = species.create(),
      buffer = new Float32Array(mesh.vertices.length * 3);
    const poses: FlightPose[] = [];
    for (const mode of modes) for (let t = 0; t < 90; t += 0.5) poses.push(species.flight(t, mode));
    for (const study of species.studies) poses.push({ ...species.flight(2), ...study.pose });
    for (const pose of poses) {
      const { positions: p } = species.transform(mesh, pose, buffer);
      assert.equal(p, buffer);
      assert.ok(p.every(Number.isFinite));
      for (const view of ['ventral', 'oblique', 'dorsal', 'profile'] as const) {
        const { right: r, up: u } = cameraBasis(view),
          envelope = cameraEnvelope(view, species.id);
        for (let i = 0; i < p.length; i += 3) {
          const x = p[i] * r.x + p[i + 1] * r.y + p[i + 2] * r.z,
            y = p[i] * u.x + p[i + 1] * u.y + p[i + 2] * u.z;
          assert.ok(Math.abs(x) < envelope.width * 0.5 - 0.12, `${view}/${pose.time}: horizontal`);
          assert.ok(Math.abs(y) < envelope.height * 0.5 - 0.12, `${view}/${pose.time}: vertical`);
        }
      }
    }
  });
}

test('free-flight patterns differ in structure, beyond speed or scale', () => {
  const eagle = getSpecies('golden-eagle'),
    falcon = getSpecies('peregrine-falcon');
  assert.equal(eagle.flight(2).activity, 0);
  assert.equal(falcon.flight(2).activity, 1);
  assert.equal(eagle.flight(15).activity, 1);
  assert.equal(falcon.flight(6).activity, 0);
  assert.ok(falcon.flight(6).fold > eagle.flight(6).fold + 0.15);
});
