import { AsciiRenderer } from '../../src/ascii.ts';
import { FLYERS, flightCourse, steerPose } from '../course.ts';
import { MODEL } from '../scene.ts';
import { paintSky } from '../air.ts';
import { PlumagePlate } from '../daylight.ts';

const query = new URLSearchParams(location.search);
const timeSelect = document.querySelector<HTMLSelectElement>('#time')!;
const sizeSelect = document.querySelector<HTMLSelectElement>('#size')!;
timeSelect.value = query.get('t') ?? '1';
sizeSelect.value = query.get('size') ?? '560';
const gallery = document.querySelector('#gallery')!;
const speciesSelect = document.querySelector<HTMLSelectElement>('#species')!;
speciesSelect.value = query.get('species') ?? 'all';
const play = document.querySelector<HTMLButtonElement>('#play')!;
let playing = false,
  raf = 0,
  started = 0;
let exportedFrames: unknown[] | undefined;
const names = [
  'Gavião-tesoura',
  'Águia-real',
  'Falcão-peregrino',
  'Águia-careca',
  'Condor-da-califórnia',
];
const cards = FLYERS.flatMap((id, i) =>
  (['dark', 'light'] as const).map((theme) => {
    const model = MODEL[id],
      mesh = model.create();
    const figure = document.createElement('figure');
    figure.style.background = theme === 'dark' ? '#0b0b0c' : '#c5d8e6';
    const caption = document.createElement('figcaption');
    caption.textContent = `${names[i]} · ${theme}`;
    caption.style.color = theme === 'dark' ? '#eee' : '#263344';
    const canvas = document.createElement('canvas');
    const source = document.createElement('canvas');
    const renderer = new AsciiRenderer(source, {
      species: model.renderSpecies,
      theme,
      view: 'ventral',
      detail: 'balanced',
      scale: 0.92,
      representation: 'articulated',
    });
    figure.append(caption, canvas);
    gallery.append(figure);
    return {
      id,
      theme,
      model,
      mesh,
      renderer,
      canvas,
      source,
      plate: new PlumagePlate(document),
      figure,
      positions: new Float32Array(mesh.vertices.length * 3),
    };
  }),
);
function render(at = Number(timeSelect.value)) {
  const size = Number(sizeSelect.value),
    height = Math.round(size * 0.72),
    time = at;
  const dpr = query.get('dpr') === '1' ? 1 : Math.min(2, devicePixelRatio || 1);
  for (const card of cards) {
    card.figure.hidden = speciesSelect.value !== 'all' && speciesSelect.value !== card.id;
    if (card.figure.hidden) continue;
    if (
      card.canvas.width !== Math.round(size * dpr) ||
      card.canvas.height !== Math.round(height * dpr)
    ) {
      card.canvas.width = Math.round(size * dpr);
      card.canvas.height = Math.round(height * dpr);
      card.renderer.resize(size, height, dpr);
    }
    card.canvas.style.width = `${size}px`;
    card.canvas.style.height = `${height}px`;
    if (!playing) card.renderer.resetHistory();
    const course = flightCourse(card.id, time, { width: 1440, height: 900 });
    const pose = steerPose(card.model.flight(time, course), course, card.id);
    const transformed = card.model.transform(card.mesh, pose, card.positions);
    const draw = () => card.renderer.render(card.mesh, transformed);
    const plate = card.plate.render(card.source, card.model.ink, draw, card.theme);
    const ctx = card.canvas.getContext('2d', { alpha: false })!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSky(ctx, size, height, card.theme);
    ctx.drawImage(plate, 0, 0, size, height);
  }
  document.querySelector('output')!.textContent = `${time.toFixed(1)}s · ${size}px`;
}
function stop() {
  playing = false;
  cancelAnimationFrame(raf);
  play.textContent = 'Reproduzir';
}
for (const select of [timeSelect, sizeSelect, speciesSelect])
  select.addEventListener('change', () => {
    stop();
    exportedFrames = undefined;
    render();
  });
play.addEventListener('click', () => {
  if (playing) {
    stop();
    return;
  }
  playing = true;
  play.textContent = 'Pausar';
  started = performance.now();
  const tick = (now: number) => {
    render(Number(timeSelect.value) + (now - started) / 1000);
    if (playing) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
});
function frames() {
  return cards
    .filter((card) => !card.figure.hidden)
    .map((card) => ({
      species: card.id,
      theme: card.theme,
      time: Number(timeSelect.value),
      size: Number(sizeSelect.value),
      png: card.canvas.toDataURL(),
    }));
}
async function matrix() {
  const button = document.querySelector<HTMLButtonElement>('#matrix')!;
  button.disabled = true;
  stop();
  exportedFrames = [];
  speciesSelect.value = 'all';
  for (const size of ['560', '240'])
    for (const time of ['1', '4', '9', '15', '27']) {
      sizeSelect.value = size;
      timeSelect.value = time;
      render();
      exportedFrames.push(...frames());
      document.querySelector('output')!.textContent = `${exportedFrames.length}/100 quadros`;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  document.querySelector('output')!.textContent = '100 quadros prontos para exportar.';
  button.disabled = false;
}
function save() {
  stop();
  const evidence = exportedFrames ?? frames();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify({ userAgent: navigator.userAgent, frames: evidence })], {
      type: 'application/json',
    }),
  );
  link.download = `raptors-feathers-${query.get('phase') ?? 'after'}-${timeSelect.value}-${sizeSelect.value}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
document.querySelector('#matrix')!.addEventListener('click', () => void matrix());
document.querySelector('#save')!.addEventListener('click', save);
render();
if (query.get('run') === 'frames' && query.get('save') === '1') save();
if (query.get('run') === 'matrix')
  void matrix().then(() => {
    if (query.get('save') === '1') save();
  });
window.addEventListener('pagehide', stop);
