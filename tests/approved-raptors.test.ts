import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getSpecies } from '../src/species.ts';

const reference = JSON.parse(
  readFileSync(new URL('./fixtures/approved-raptors-v0.2.json', import.meta.url), 'utf8'),
);
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
for (const approved of reference.species) {
  test(`${approved.id}: approved anatomy, cameras and authored poses remain frozen`, () => {
    const species = getSpecies(approved.id),
      mesh = species.create();
    assert.equal(hash(JSON.stringify(mesh)), approved.meshSHA256);
    assert.deepEqual(species.framing, approved.framing);
    assert.deepEqual(species.studies, approved.studies);
    for (const frame of approved.frames) {
      const pose = species.flight(frame.time, frame.mode, frame.seed);
      assert.equal(JSON.stringify(pose), JSON.stringify(frame.pose));
      const positions = species.transform(mesh, pose).positions;
      assert.equal(hash(new Uint8Array(positions.buffer)), frame.geometrySHA256);
    }
  });
}
test('approved v0.2 executable and visual evidence have not changed', () => {
  for (const [file, digest] of Object.entries(reference.files)) {
    if (file.startsWith('tests/fixtures/') || file.startsWith('docs/reference/'))
      assert.equal(hash(readFileSync(new URL(`../${file}`, import.meta.url))), digest, file);
  }
});
