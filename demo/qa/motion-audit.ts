// Node-only QA: projected vertices against the actual demo compositor dimensions.
// No source model, frozen renderer or production canvas readbacks are changed.
import { FLYERS, flightCourse } from '../course.ts';
import type { FlightCourse } from '../course.ts';
import { steerPose } from '../course.ts';
import { MODEL } from '../scene.ts';
import { cameraBasis, cameraEnvelope } from '../../src/ascii.ts';
import { skySpriteSize } from '../layout.ts';

export function auditMotion(courseOf: typeof flightCourse = flightCourse, legacy = false) {
  const { right, up } = cameraBasis('ventral');
  const results = [];
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
    { width: 960, height: 540 },
  ]) {
    for (const id of FLYERS) {
      const model = MODEL[id],
        mesh = model.create(),
        positions = new Float32Array(mesh.vertices.length * 3);
      const size = skySpriteSize(model.bulk, viewport.width, viewport.height),
        frame = cameraEnvelope('ventral', model.renderSpecies);
      let samples = 0,
        total = 0,
        outside = 0,
        clipped = 0,
        worstVisible = 1,
        minSpeed = Infinity,
        maxSpeed = 0,
        speedSum = 0,
        maxYawStep = 0,
        maxBankStep = 0,
        effortMin = 1,
        effortMax = 0;
      const xs: number[] = [],
        ys: number[] = [],
        trace: number[][] = [];
      let previous: FlightCourse | undefined;
      for (let i = 0; i <= 600; i++) {
        const t = i * 0.2,
          c = courseOf(id, t, viewport),
          pose = steerPose(model.flight(t, legacy ? undefined : c), c, id);
        const transformed = model.transform(mesh, pose, positions);
        const scale = Math.min(size / frame.width, size / frame.height) * c.scale;
        let lost = 0;
        for (let j = 0; j < transformed.positions.length; j += 3) {
          const [x, y, z] = transformed.positions.subarray(j, j + 3);
          const sx = c.x * viewport.width + (x * right.x + y * right.y + z * right.z) * scale;
          const sy = c.y * viewport.height - (x * up.x + y * up.y + z * up.z) * scale;
          if (sx < 0 || sx > viewport.width || sy < 0 || sy > viewport.height) lost++;
        }
        const vertices = mesh.vertices.length;
        total += vertices;
        outside += lost;
        if (lost) clipped++;
        worstVisible = Math.min(worstVisible, 1 - lost / vertices);
        const speed = Math.hypot(c.vx * viewport.width, c.vy * viewport.height);
        minSpeed = Math.min(minSpeed, speed);
        maxSpeed = Math.max(maxSpeed, speed);
        speedSum += speed;
        effortMin = Math.min(effortMin, c.effort ?? pose.activity);
        effortMax = Math.max(effortMax, c.effort ?? pose.activity);
        if (previous) {
          maxYawStep = Math.max(
            maxYawStep,
            Math.abs(Math.atan2(Math.sin(c.yaw - previous.yaw), Math.cos(c.yaw - previous.yaw))),
          );
          maxBankStep = Math.max(maxBankStep, Math.abs(c.bank - previous.bank));
        }
        previous = c;
        xs.push(c.x);
        ys.push(c.y);
        trace.push([t, c.x, c.y, c.yaw, c.bank, pose.activity]);
        samples++;
      }
      results.push({
        viewport,
        id,
        samples,
        visibleVertexFraction: 1 - outside / total,
        fullyVisibleFrames: 1 - clipped / samples,
        worstVisible,
        minSpeed,
        maxSpeed,
        meanSpeed: speedSum / samples,
        maxYawStepAt5Hz: maxYawStep,
        maxBankStepAt5Hz: maxBankStep,
        effortMin,
        effortMax,
        rangeX: Math.max(...xs) - Math.min(...xs),
        rangeY: Math.max(...ys) - Math.min(...ys),
        trace,
      });
    }
  }
  return results;
}
