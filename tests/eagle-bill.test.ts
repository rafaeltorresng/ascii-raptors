import test from 'node:test';
import assert from 'node:assert/strict';
import type { BirdMesh } from '../src/bird.ts';
import { createEagle } from '../src/species/golden-eagle.ts';
import { createBaldEagle, createSkyGolden } from '../demo/plumage.ts';

function bodySurfaces(mesh: BirdMesh) {
  return mesh.faces
    .filter((face) => mesh.vertices[face.a].region !== 'head')
    .map((face) => [face.id, ...[face.a, face.b, face.c].map((i) => mesh.vertices[i].point)]);
}

for (const [name, create] of [
  ['golden eagle', createSkyGolden],
  ['bald eagle', createBaldEagle],
] as const)
  test(`${name}: the sky bill is closed, consistently wound, tapered, and leaves the body intact`, () => {
    const mesh = create();
    assert.deepEqual(bodySurfaces(mesh), bodySurfaces(createEagle()));
    const surface = Math.max(...mesh.faces.map((face) => face.id));
    const bill = mesh.faces.filter((face) => face.id === surface);
    const key = (p: { x: number; y: number; z: number }) =>
      [p.x, p.y, p.z].map((n) => n.toFixed(8)).join(',');
    const edges = new Map<string, { count: number; orientation: number }>();
    let volume = 0;
    for (const face of bill) {
      assert.ok([face.a, face.b, face.c].every((i) => i >= 0 && i < mesh.vertices.length));
      assert.ok([face.a, face.b, face.c].every((i) => mesh.vertices[i].region === 'head'));
      const [a, b, c] = [face.a, face.b, face.c].map((i) => mesh.vertices[i].point);
      const nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y);
      const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
      const nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      assert.ok(Math.hypot(nx, ny, nz) > 1e-9, 'Degenerate bill triangle');
      volume +=
        a.x * (b.y * c.z - b.z * c.y) +
        a.y * (b.z * c.x - b.x * c.z) +
        a.z * (b.x * c.y - b.y * c.x);
      for (const [p, q] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const from = key(p),
          to = key(q);
        const edge = [from, to].sort().join('|');
        const record = edges.get(edge) ?? { count: 0, orientation: 0 };
        record.count++;
        record.orientation += from < to ? 1 : -1;
        edges.set(edge, record);
      }
    }
    assert.ok(volume > 0, 'Bill faces must point outward');
    assert.ok(
      [...edges.values()].every((edge) => edge.count === 2 && edge.orientation === 0),
      'Open, overlapping, or inconsistently wound seam',
    );
    const points = [...new Set(bill.flatMap((face) => [face.a, face.b, face.c]))].map(
      (i) => mesh.vertices[i].point,
    );
    const baseWidth = Math.max(...points.filter((p) => p.z > -0.04).map((p) => Math.abs(p.x)));
    const tipWidth = Math.max(...points.filter((p) => p.z < -0.12).map((p) => Math.abs(p.x)));
    assert.ok(tipWidth < baseWidth * 0.5, 'The hook must taper instead of ending in a bulb');
    assert.equal(
      bill.some((face) => face.material === 'beak'),
      name === 'golden eagle',
    );
    assert.ok(bill.some((face) => face.material === 'cere'));
  });
