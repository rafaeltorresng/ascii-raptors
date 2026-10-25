export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export const TAU = Math.PI * 2;
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const sub = (a: Vec3, b: Vec3): Vec3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const cross = (a: Vec3, b: Vec3): Vec3 =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export function normalized(a: Vec3): Vec3 {
  const n = Math.hypot(a.x, a.y, a.z) || 1;
  return v3(a.x / n, a.y / n, a.z / n);
}
export function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return v3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}
export function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return v3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
}
export function rotateZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return v3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
}
export function around(p: Vec3, origin: Vec3, y: number, z = 0): Vec3 {
  const q = rotateY(rotateZ(sub(p, origin), z), y);
  return v3(q.x + origin.x, q.y + origin.y, q.z + origin.z);
}
/** Stateless integer noise; never frame- or screen-coordinate dependent. */
export function hash(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}
