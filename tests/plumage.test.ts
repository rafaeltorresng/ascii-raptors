import test from 'node:test';
import assert from 'node:assert/strict';
import { createEagle } from '../src/species/golden-eagle.ts';
import { getSpecies } from '../src/species.ts';
import {
  createBaldEagle,
  createCaliforniaCondor,
  createSkyFalcon,
  createSkyGolden,
} from '../demo/plumage.ts';
import { createFalcon } from '../src/species/peregrine-falcon.ts';

function reach(mesh: ReturnType<typeof createEagle>, material: string) {
  let max = -Infinity;
  for (const face of mesh.faces) {
    if (face.material !== material) continue;
    for (const index of [face.a, face.b, face.c]) max = Math.max(max, mesh.vertices[index].point.y);
  }
  return max;
}

function span(mesh: ReturnType<typeof createEagle>, material: string, region?: string) {
  let min = Infinity;
  let max = -Infinity;
  for (const face of mesh.faces) {
    if (face.material !== material) continue;
    for (const index of [face.a, face.b, face.c]) {
      if (region && mesh.vertices[index].region !== region) continue;
      const value = mesh.vertices[index].point.x;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return max - min;
}

function materials(
  mesh: ReturnType<typeof createEagle>,
  region: ReturnType<typeof createEagle>['vertices'][number]['region'],
) {
  return new Set(
    mesh.faces
      .filter((face) => {
        const regions = new Set(
          [face.a, face.b, face.c].map((index) => mesh.vertices[index].region),
        );
        return regions.size === 1 && regions.has(region);
      })
      .map((face) => face.material),
  );
}

test('bald eagle wears a white head and tail without changing the golden eagle', () => {
  const bald = createBaldEagle();
  const approved = getSpecies('golden-eagle').create();
  assert.deepEqual(materials(bald, 'tail'), new Set(['white']));
  assert.deepEqual(materials(bald, 'head'), new Set(['white', 'cere', 'eye']));
  assert.ok(materials(bald, 'body').has('eagle-body'));
  assert.ok(materials(approved, 'head').has('eagle-nape'));
  assert.ok(materials(approved, 'tail').has('eagle-flight'));
  assert.ok(reach(bald, 'cere') > reach(approved, 'beak'));
  assert.ok(span(bald, 'cere') < span(bald, 'white', 'head') * 0.65);
  assert.deepEqual(createEagle(), approved);
});

test('california condor keeps black fingers and a white underwing', () => {
  const condor = createCaliforniaCondor();
  const xOf = (face: (typeof condor.faces)[number]) =>
    (Math.abs(condor.vertices[face.a].point.x) +
      Math.abs(condor.vertices[face.b].point.x) +
      Math.abs(condor.vertices[face.c].point.x)) /
    3;
  const wing = condor.faces.filter((face) => {
    const regions = new Set([face.a, face.b, face.c].map((index) => condor.vertices[index].region));
    return regions.size === 1 && regions.has('wing');
  });
  assert.equal(wing.find((face) => xOf(face) < 0.8)?.material, 'white');
  assert.equal(wing.find((face) => xOf(face) > 2.8)?.material, 'eagle-flight');
  assert.ok(materials(condor, 'body').has('eagle-body'));
  assert.deepEqual(materials(condor, 'tail'), new Set(['eagle-flight']));
  assert.deepEqual(materials(condor, 'head'), new Set(['eagle-nape', 'white', 'eye']));
  const approved = createEagle();
  assert.ok(span(createSkyGolden(), 'eagle-nape') > span(approved, 'eagle-nape') * 1.4);
  assert.ok(span(createSkyFalcon(), 'cere') > span(createFalcon(), 'cere') * 1.8);
  assert.deepEqual(createEagle(), approved);
  assert.deepEqual(createFalcon(), getSpecies('peregrine-falcon').create());
});
