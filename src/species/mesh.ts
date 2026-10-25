import { cross, lerp, sub, v3 } from '../math.ts';
import type { Vec3 } from '../math.ts';
import type { BirdMesh, Material } from '../bird.ts';

type Region = BirdMesh['vertices'][number]['region'];
/** Only geometric primitives are shared. Species author their own feather insertions and outlines. */
export class MeshBuilder {
  mesh: BirdMesh = { vertices: [], faces: [] };
  private id = 1;
  vertex(point: Vec3, u: number, v: number, side: number, region: Region) {
    this.mesh.vertices.push({ point, u, v, side, region });
    return this.mesh.vertices.length - 1;
  }
  triangle(a: number, b: number, c: number, material: Material, id: number) {
    const vertices = this.mesh.vertices;
    if (vertices[a].region === 'wing' || vertices[a].region === 'tail') {
      if (
        cross(sub(vertices[b].point, vertices[a].point), sub(vertices[c].point, vertices[a].point))
          .z < 0
      )
        [b, c] = [c, b];
    }
    this.mesh.faces.push({ a, b, c, material, id });
  }
  ellipsoid(
    center: Vec3,
    radius: Vec3,
    material: Material,
    region: Region,
    rings = 10,
    sectors = 16,
  ) {
    const start = this.mesh.vertices.length,
      id = this.id++;
    for (let r = 0; r <= rings; r++)
      for (let s = 0; s <= sectors; s++) {
        const lat = (Math.PI * r) / rings,
          a = (Math.PI * 2 * s) / sectors;
        this.vertex(
          v3(
            center.x + radius.x * Math.sin(lat) * Math.cos(a),
            center.y + radius.y * Math.cos(lat),
            center.z + radius.z * Math.sin(lat) * Math.sin(a),
          ),
          s / sectors,
          r / rings,
          0,
          region,
        );
      }
    for (let r = 0; r < rings; r++)
      for (let s = 0; s < sectors; s++) {
        const a = start + r * (sectors + 1) + s,
          b = a + sectors + 1;
        this.triangle(a, a + 1, b, material, id);
        this.triangle(b, a + 1, b + 1, material, id);
      }
  }
  feather(
    root: Vec3,
    tip: Vec3,
    width: number,
    side: number,
    region: 'wing' | 'tail',
    material: Material,
    bend = 0,
  ) {
    const start = this.mesh.vertices.length,
      id = this.id++,
      segments = 7,
      across = 4;
    const dx = tip.x - root.x,
      dy = tip.y - root.y,
      length = Math.hypot(dx, dy);
    const nx = -dy / length,
      ny = dx / length;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments,
        w = width * Math.pow(Math.sin(Math.PI * (0.035 + t * 0.965)), 0.48) * (1 - t * 0.18);
      for (let k = 0; k <= across; k++) {
        const q = (k / across) * 2 - 1;
        this.vertex(
          v3(
            lerp(root.x, tip.x, t) + nx * w * q + bend * Math.sin(Math.PI * t),
            lerp(root.y, tip.y, t) + ny * w * q,
            lerp(root.z, tip.z, t) + (1 - q * q) * Math.sin(Math.PI * t) * 0.022,
          ),
          t,
          q * 0.5 + 0.5,
          side,
          region,
        );
      }
    }
    for (let j = 0; j < segments; j++)
      for (let k = 0; k < across; k++) {
        const a = start + j * (across + 1) + k,
          b = a + across + 1;
        this.triangle(a, a + 1, b, material, id);
        this.triangle(b, a + 1, b + 1, material, id);
      }
  }
  panel(leading: Vec3[], trailing: Vec3[], side: number, material: Material) {
    const id = this.id++;
    for (let i = 0; i < leading.length - 1; i++) {
      const a = this.vertex(leading[i], i / (leading.length - 1), 0, side, 'wing');
      const b = this.vertex(trailing[i], i / (leading.length - 1), 1, side, 'wing');
      const c = this.vertex(leading[i + 1], (i + 1) / (leading.length - 1), 0, side, 'wing');
      const d = this.vertex(trailing[i + 1], (i + 1) / (leading.length - 1), 1, side, 'wing');
      this.triangle(a, b, c, material, id);
      this.triangle(b, d, c, material, id);
    }
  }
}
