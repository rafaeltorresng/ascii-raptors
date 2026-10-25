import { around, rotateX, rotateY, rotateZ, smoothstep, sub, v3 } from '../math.ts';
import type { Vec3 } from '../math.ts';
import type { BirdMesh, TransformedMesh } from '../bird.ts';
import type { FlightPose } from '../flight.ts';

export interface Rig {
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  elbowSweep: number;
  wristSweep: number;
  headAnchor: number;
  tailAnchor: number;
  headStabilization: number;
}
export function articulatedWing(point: Vec3, side: number, pose: FlightPose, rig: Rig): Vec3 {
  const ww = smoothstep(rig.wrist.x - 0.08, rig.wrist.x + 0.08, point.x);
  const ew = smoothstep(rig.elbow.x - 0.08, rig.elbow.x + 0.08, point.x);
  let p = around(point, rig.wrist, -pose.tip * ww, -pose.fold * rig.wristSweep * ww);
  p = around(p, rig.elbow, -pose.elbow * ew, -pose.fold * rig.elbowSweep * ew);
  p = around(p, rig.shoulder, -pose.lift + side * pose.bank * 0.025);
  return v3(p.x * side, p.y, p.z);
}
export function transformArticulated(
  mesh: BirdMesh,
  pose: FlightPose,
  rig: Rig,
  output?: Float32Array,
  flat = false,
): TransformedMesh {
  const positions = output ?? new Float32Array(mesh.vertices.length * 3);
  for (let i = 0; i < mesh.vertices.length; i++) {
    const vertex = mesh.vertices[i];
    let p: Vec3;
    if (vertex.region === 'wing') p = articulatedWing(vertex.point, vertex.side, pose, rig);
    else if (vertex.region === 'tail') {
      p = v3(
        vertex.point.x * vertex.side * pose.tailSpread,
        vertex.point.y - rig.tailAnchor,
        vertex.point.z,
      );
      p = rotateZ(rotateX(p, pose.tailPitch), pose.tailYaw);
      p.y += rig.tailAnchor;
    } else if (vertex.region === 'head') {
      p = sub(vertex.point, v3(0, rig.headAnchor, 0));
      p = rotateX(rotateY(p, -pose.bank * rig.headStabilization), -pose.pitch * 0.55);
      p.y += rig.headAnchor;
    } else p = vertex.point;
    p = rotateZ(rotateX(rotateY(p, flat ? 0 : pose.bank), pose.pitch), pose.yaw);
    positions[i * 3] = p.x + pose.x;
    positions[i * 3 + 1] = p.y + pose.y;
    positions[i * 3 + 2] = (flat ? 0 : p.z) + pose.z;
  }
  return { positions, faces: mesh.faces };
}
