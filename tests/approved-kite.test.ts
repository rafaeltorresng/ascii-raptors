import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createKite, transformKite } from '../src/bird.ts';
import { flightPose } from '../src/flight.ts';
import { getSpecies } from '../src/species.ts';
import { approvedSpecies, approvedKitePose } from './approved-models.ts';

const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/approved-kite-v0.1.json', import.meta.url), 'utf8'),
);
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
test('approved kite geometry remains byte-identical to v0.1', () => {
  assert.equal(digest(JSON.stringify(createKite())), baseline.meshSHA256);
  assert.equal(
    digest(JSON.stringify(getSpecies('swallow-tailed-kite').create())),
    baseline.meshSHA256,
  );
});
test('54 approved kite poses and transformed geometries remain unchanged', () => {
  const specimen = getSpecies('swallow-tailed-kite'),
    mesh = specimen.create();
  const original = approvedSpecies('swallow-tailed-kite');
  const approvedMesh = original.create();
  for (const reference of baseline.frames) {
    const pose = specimen.flight(reference.time, reference.mode, reference.seed);
    // Compare in the same runtime: platform libm differences must not become
    // false regressions. The immutable executable remains the exact oracle.
    const approvedPose = approvedKitePose(reference.time, reference.mode, reference.seed);
    assert.equal(JSON.stringify(pose), JSON.stringify(approvedPose));
    assert.equal(
      JSON.stringify(flightPose(reference.time, reference.mode, reference.seed)),
      JSON.stringify(approvedPose),
    );
    const positions = specimen.transform(mesh, pose).positions;
    const approvedPositions = original.transform(approvedMesh, approvedPose).positions;
    const approvedDigest = digest(new Uint8Array(approvedPositions.buffer));
    assert.equal(digest(new Uint8Array(positions.buffer)), approvedDigest);
    assert.equal(
      digest(new Uint8Array(transformKite(mesh, pose).positions.buffer)),
      approvedDigest,
    );
  }
});
test('frozen executable reference and approved recording retain their checksums', () => {
  for (const file of [
    'tests/fixtures/approved-kite-v0.1.js',
    'docs/reference/kite-v0.1/desktop-dark.png',
    'docs/reference/kite-v0.1/flight-study.webm',
  ]) {
    assert.equal(
      digest(readFileSync(new URL(`../${file}`, import.meta.url))),
      baseline.files[file],
    );
  }
});
