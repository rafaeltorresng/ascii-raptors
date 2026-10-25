import { FlightScene } from '../scene.ts';

const canvas = document.querySelector('canvas')!;
const output = document.querySelector('output')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const query = new URLSearchParams(location.search);
let report: unknown;
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
};

run.addEventListener('click', async () => {
  run.disabled = true;
  save.disabled = true;
  const results = [];
  const proto = CanvasRenderingContext2D.prototype;
  const read = proto.getImageData;
  const transform = proto.getTransform;
  let reads = 0,
    transforms = 0;
  proto.getImageData = function (...args: Parameters<typeof read>) {
    reads++;
    return read.apply(this, args);
  };
  proto.getTransform = function () {
    transforms++;
    return transform.call(this);
  };
  let scene: FlightScene | undefined;
  try {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ])
      for (const theme of ['dark', 'light'] as const) {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        scene = new FlightScene(canvas, { theme, paused: true });
        scene.play();
        const current = scene;
        const costs: number[] = [],
          gaps: number[] = [];
        let previousFrame = current.stats.frames,
          previousAt = 0;
        let started = 0,
          measuredAt = 0,
          hidden = false;
        await new Promise<void>((resolve) => {
          const observe = (now: number) => {
            if (!started) started = now;
            hidden ||= document.hidden;
            const stats = current.stats;
            if (now - started >= 1200) {
              if (!measuredAt) {
                measuredAt = now;
                reads = transforms = 0;
              }
              if (stats.frames !== previousFrame) {
                costs.push(stats.frameMs);
                if (previousAt) gaps.push(now - previousAt);
                previousAt = now;
              }
            }
            previousFrame = stats.frames;
            output.textContent = `${width} × ${height} / ${theme}: ${costs.length} quadros`;
            if (measuredAt && now - measuredAt >= 3200) resolve();
            else requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        });
        results.push({
          width,
          height,
          theme,
          hidden,
          frames: costs.length,
          fps: (gaps.length * 1000) / gaps.reduce((a, b) => a + b, 0),
          renderMedianMs: percentile(costs, 0.5),
          renderP95Ms: percentile(costs, 0.95),
          intervalMedianMs: percentile(gaps, 0.5),
          intervalP95Ms: percentile(gaps, 0.95),
          readsPerFrame: reads / costs.length,
          transformsPerFrame: transforms / costs.length,
        });
        current.destroy();
        scene = undefined;
      }
    report = {
      phase: query.get('phase') ?? 'current',
      userAgent: navigator.userAgent,
      dpr: devicePixelRatio,
      results,
    };
    output.textContent = JSON.stringify(report, null, 2);
    save.disabled = false;
  } catch (error) {
    output.textContent = String(error);
  } finally {
    scene?.destroy();
    proto.getImageData = read;
    proto.getTransform = transform;
    run.disabled = false;
  }
});
save.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
  );
  link.download = `raptors-performance-${query.get('phase') ?? 'current'}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});
