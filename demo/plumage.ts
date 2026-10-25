import type { BirdMesh, Material } from '../src/bird.ts';
import { createEagle } from '../src/species/golden-eagle.ts';
import { createFalcon } from '../src/species/peregrine-falcon.ts';
import { sculptEagleBill } from './eagle-bill.ts';

/**
 * Plumage for the shared sky only. The approved golden-eagle mesh is rebuilt
 * and then repainted here, so the study catalog stays untouched.
 * Bald eagle: white head, white tail, dark body, yellow bill.
 * California condor: black body and fingers, white underwing, bare orange head.
 */
function regionOf(mesh: BirdMesh, face: BirdMesh['faces'][number]) {
  const regions = new Set([face.a, face.b, face.c].map((index) => mesh.vertices[index].region));
  return regions.size === 1 ? [...regions][0] : 'mixed';
}

function repaint(mesh: BirdMesh, material: (current: Material, region: string) => Material) {
  for (const face of mesh.faces) {
    const region = regionOf(mesh, face);
    face.material = material(face.material, region);
  }
  return mesh;
}

function marked(mesh: BirdMesh, materials: readonly Material[]) {
  const wanted = new Set(materials);
  const indices = new Set<number>();
  for (const face of mesh.faces) {
    if (!wanted.has(face.material)) continue;
    indices.add(face.a);
    indices.add(face.b);
    indices.add(face.c);
  }
  return indices;
}

/** Grow a painted part in place so its color reads from the ventral sky. */
function grow(mesh: BirdMesh, materials: readonly Material[], scale: number, drop = 0) {
  const indices = marked(mesh, materials);
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const index of indices) {
    const point = mesh.vertices[index].point;
    cx += point.x;
    cy += point.y;
    cz += point.z;
  }
  const count = indices.size || 1;
  cx /= count;
  cy /= count;
  cz /= count;
  for (const index of indices) {
    const point = mesh.vertices[index].point;
    point.x = cx + (point.x - cx) * scale;
    point.y = cy + (point.y - cy) * scale;
    point.z = cz + (point.z - cz) * scale - drop;
  }
}

export function createSkyGolden(): BirdMesh {
  const mesh = createEagle();
  grow(mesh, ['eagle-nape'], 1.6, 0.045);
  sculptEagleBill(mesh);
  return mesh;
}

export function createSkyFalcon(): BirdMesh {
  const mesh = createFalcon();
  grow(mesh, ['cere'], 2.15);
  return mesh;
}

export function createBaldEagle(): BirdMesh {
  const mesh = repaint(createEagle(), (current, region) => {
    if (region === 'tail') return 'white';
    if (region !== 'head') return current;
    if (current === 'eye') return 'eye';
    if (current === 'beak' || current === 'cere') return 'cere';
    return 'white';
  });
  for (const vertex of mesh.vertices) {
    if (vertex.region !== 'head') continue;
    vertex.point.x *= 1.1;
    vertex.point.z *= 1.1;
    vertex.point.y = 0.53 + (vertex.point.y - 0.53) * 1.14;
  }
  sculptEagleBill(mesh, true);
  return mesh;
}

function faceX(mesh: BirdMesh, face: BirdMesh['faces'][number]) {
  return (
    (Math.abs(mesh.vertices[face.a].point.x) +
      Math.abs(mesh.vertices[face.b].point.x) +
      Math.abs(mesh.vertices[face.c].point.x)) /
    3
  );
}

/** Inner wing stays white from below. The fingered tips stay black. */
const CONDOR_LINING = 2.05;

export function createCaliforniaCondor(): BirdMesh {
  const mesh = createEagle();
  for (const face of mesh.faces) {
    const region = regionOf(mesh, face);
    if (region === 'head') {
      if (face.material === 'eye') continue;
      face.material = face.material === 'beak' || face.material === 'cere' ? 'white' : 'eagle-nape';
      continue;
    }
    if (region !== 'wing') continue;
    if (face.material === 'eagle-coverts' || faceX(mesh, face) < CONDOR_LINING)
      face.material = 'white';
  }
  for (const vertex of mesh.vertices) {
    if (vertex.region !== 'head') continue;
    vertex.point.x *= 0.84;
    vertex.point.z *= 0.84;
    vertex.point.y = 0.53 + (vertex.point.y - 0.53) * 0.88;
  }
  return mesh;
}
