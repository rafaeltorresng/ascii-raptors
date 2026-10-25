import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getSpecies } from '../src/species.ts';
import { approvedSpecies } from './approved-models.ts';

const reference = JSON.parse(
  readFileSync(new URL('./fixtures/approved-raptors-v0.2.json', import.meta.url), 'utf8'),
);
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
for (const approved of reference.species) {
  test(`${approved.id}: approved anatomy, cameras and authored poses remain frozen`, () => {
    const species = getSpecies(approved.id),
      mesh = species.create();
    const original = approvedSpecies(approved.id);
    const approvedMesh = original.create();
    // Exact executable comparison within one runtime avoids cross-platform
    // floating-point drift in the archived JSON fingerprints.
    assert.deepEqual(mesh, approvedMesh);
    assert.deepEqual(species.framing, approved.framing);
    assert.deepEqual(species.studies, approved.studies);
    for (const frame of approved.frames) {
      const pose = species.flight(frame.time, frame.mode, frame.seed);
      const approvedPose = original.flight(frame.time, frame.mode, frame.seed);
      assert.equal(JSON.stringify(pose), JSON.stringify(approvedPose));
      const positions = species.transform(mesh, pose).positions;
      const approvedPositions = original.transform(approvedMesh, approvedPose).positions;
      assert.equal(
        hash(new Uint8Array(positions.buffer)),
        hash(new Uint8Array(approvedPositions.buffer)),
      );
    }
  });
}
test('approved v0.2 executable and visual evidence have not changed', () => {
  for (const [file, digest] of Object.entries(reference.files)) {
    if (file.startsWith('tests/fixtures/') || file.startsWith('docs/reference/'))
      assert.equal(hash(readFileSync(new URL(`../${file}`, import.meta.url))), digest, file);
  }
});
