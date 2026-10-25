import type { BirdMesh, Material } from '../src/bird.ts';

/** A continuous tapered bill for the sky, replacing the overlapping round parts. */
export function sculptEagleBill(mesh: BirdMesh, bald = false) {
  const removed = new Set<number>();
  const faces = mesh.faces.filter((face) => {
    if (face.material !== 'cere' && face.material !== 'beak') return true;
    for (const index of [face.a, face.b, face.c]) removed.add(index);
    return false;
  });
  const retained = new Set(faces.flatMap((face) => [face.a, face.b, face.c]));
  const indices = new Map<number, number>();
  const vertices = mesh.vertices.filter((_, index) => {
    if (removed.has(index) && !retained.has(index)) return false;
    indices.set(index, indices.size);
    return true;
  });
  mesh.vertices = vertices;
  mesh.faces = faces.map((face) => ({
    ...face,
    a: indices.get(face.a)!,
    b: indices.get(face.b)!,
    c: indices.get(face.c)!,
  }));

  // y, z, half-width, half-depth. The tip bends down and back into a real hook.
  const profile = [
    [0.85, 0.035, 0.09, 0.067],
    [0.89, 0.015, 0.105, 0.075],
    [0.94, -0.007, 0.091, 0.07],
    [0.985, -0.03, 0.069, 0.059],
    [1.018, -0.058, 0.048, 0.047],
    [1.037, -0.092, 0.028, 0.032],
    [1.028, -0.123, 0.012, 0.016],
    [1.016, -0.141, 0.002, 0.003],
  ];
  const sectors = 12;
  const start = vertices.length;
  const surface = Math.max(...mesh.faces.map((face) => face.id)) + 1;
  for (let ring = 0; ring < profile.length; ring++) {
    const [y, z, width, depth] = profile[ring];
    const previous = profile[Math.max(0, ring - 1)];
    const next = profile[Math.min(profile.length - 1, ring + 1)];
    const dy = (next[0] - previous[0]) * (bald ? 1.14 : 1);
    const dz = next[1] - previous[1];
    const length = Math.hypot(dy, dz);
    for (let sector = 0; sector <= sectors; sector++) {
      const angle = (sector / sectors) * Math.PI * 2;
      const across = Math.sin(angle) * depth;
      vertices.push({
        point: {
          x: Math.cos(angle) * width * (bald ? 0.8 : 1),
          y: (bald ? 0.53 + (y - 0.53) * 1.14 : y) - (across * dz) / length,
          z: z + (across * dy) / length,
        },
        u: sector / sectors,
        v: ring / (profile.length - 1),
        side: 0,
        region: 'head',
      });
    }
  }
  const tip: Material = bald ? 'cere' : 'beak';
  for (let ring = 0; ring < profile.length - 1; ring++)
    for (let sector = 0; sector < sectors; sector++) {
      const a = start + ring * (sectors + 1) + sector;
      const b = a + sectors + 1;
      const material = ring < 4 ? 'cere' : tip;
      mesh.faces.push(
        { a, b, c: a + 1, material, id: surface },
        { a: b, b: b + 1, c: a + 1, material, id: surface },
      );
    }
  // Close both ends; the base is embedded in the original head.
  for (const ring of [0, profile.length - 1]) {
    const [y, z] = profile[ring];
    const center = vertices.length;
    vertices.push({
      point: { x: 0, y: bald ? 0.53 + (y - 0.53) * 1.14 : y, z },
      u: 0.5,
      v: ring / (profile.length - 1),
      side: 0,
      region: 'head',
    });
    for (let sector = 0; sector < sectors; sector++) {
      const a = start + ring * (sectors + 1) + sector;
      mesh.faces.push({
        a: center,
        b: ring === 0 ? a : a + 1,
        c: ring === 0 ? a + 1 : a,
        material: ring === 0 ? 'cere' : tip,
        id: surface,
      });
    }
  }
}
