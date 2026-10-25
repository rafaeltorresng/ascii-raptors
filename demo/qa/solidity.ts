import { FlightScene } from '../scene.ts';
import type { Theme } from '../../src/ascii.ts';
import { checkDaylight } from './daylight-checks.ts';

const query = new URLSearchParams(location.search);
const canvas = document.querySelector('canvas')!;
// Keep before/after readback on the same CPU canvas path.
const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })!;
const output = document.querySelector('output')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const scene = new FlightScene(canvas, { theme: 'light', paused: true });
function frame(width: number, height: number, time: number, theme: Theme) {
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  scene.resize();
  scene.setTheme(theme);
  scene.renderAt(time);
}
function preview() {
  frame(
    Number(query.get('w') ?? 1440),
    Number(query.get('h') ?? 900),
    Number(query.get('t') ?? 1),
    query.get('theme') === 'dark' ? 'dark' : 'light',
  );
}
preview();
interface Evidence {
  width: number;
  height: number;
  time: number;
  theme: Theme;
  hash: string;
  png: string;
  frameMs: number;
}
let evidence: Evidence[] = [];
let report: unknown;
document.querySelector('#cells')!.addEventListener('click', () => {
  try {
    report = checkDaylight();
    output.textContent = JSON.stringify(report, null, 2);
    save.disabled = false;
  } catch (error) {
    output.textContent = String(error);
  }
});
document.querySelector('#dark-cells')!.addEventListener('click', () => {
  try {
    report = checkDaylight('dark');
    output.textContent = JSON.stringify(report, null, 2);
    save.disabled = false;
  } catch (error) {
    output.textContent = String(error);
  }
});
document.querySelector('#landing')!.addEventListener('click', () => {
  localStorage.setItem('ascii-raptors-theme', 'light');
  sessionStorage.setItem('ascii-raptors-paused', 'true');
  location.assign('/');
});
document.querySelector('#matrix')!.addEventListener('click', async () => {
  const button = document.querySelector<HTMLButtonElement>('#matrix')!;
  button.disabled = true;
  evidence = [];
  try {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      for (const theme of ['dark', 'light'] as const) {
        for (const time of [1, 4, 9, 15, 27]) {
          frame(width, height, time, theme);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels)))
            .map((n) => n.toString(16).padStart(2, '0'))
            .join('');
          evidence.push({
            width,
            height,
            time,
            theme,
            hash,
            png: canvas.toDataURL(),
            frameMs: scene.stats.frameMs,
          });
          output.textContent = `${evidence.length}/20 quadros`;
        }
      }
    }
    output.textContent = '20 quadros capturados para inspeção visual.';
    save.disabled = false;
    report = { frames: evidence };
  } catch (error) {
    output.textContent = String(error);
  } finally {
    button.disabled = false;
    preview();
  }
});
save.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify({
          userAgent: navigator.userAgent,
          dpr: devicePixelRatio,
          ...(report as object),
        }),
      ],
      { type: 'application/json' },
    ),
  );
  link.download = `raptors-solidity-${query.get('phase') ?? 'after'}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// Native-browser entry point for this first-party test page; never loaded by the demo.
if (query.get('run') === 'cells') {
  document.querySelector<HTMLButtonElement>('#cells')!.click();
  if (query.get('save') === '1' && !save.disabled) save.click();
}
