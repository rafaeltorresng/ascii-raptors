/// <reference types="vite/client" />
import './style.css';
import { readTheme, saveTheme, readPaused, savePaused } from './preferences.ts';
import { AsciiRaptor, SPECIES, getSpecies } from '../src/index.ts';
import type { FlightMode, View, Theme, Detail, Representation, SpeciesId } from '../src/index.ts';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('raptor');
let theme: Theme = readTheme();
document.documentElement.dataset.theme = theme;

const thumbnails: AsciiRaptor[] = [];
let mode: FlightMode = 'soar';
const requested = new URL(location.href).searchParams.get('species');
let species = getSpecies(SPECIES.find((s) => s.id === requested)?.id ?? 'swallow-tailed-kite');
let raptor: AsciiRaptor;
try {
  raptor = new AsciiRaptor(canvas, {
    theme,
    paused: readPaused(),
    species: species.id,
    maxFPS: matchMedia('(max-width: 600px)').matches ? 30 : 60,
  });
} catch (error) {
  const note = element('error-note');
  note.hidden = false;
  note.textContent = `Não foi possível iniciar o Canvas: ${error instanceof Error ? error.message : error}`;
  throw error;
}

const playButton = element<HTMLButtonElement>('play');
function updatePlayback() {
  const { running, reducedMotion } = raptor.stats;
  element('play-symbol').textContent = running ? 'Ⅱ' : '▷';
  element('play-text').textContent = running ? 'Pausar' : 'Reproduzir';
  playButton.setAttribute('aria-label', running ? 'Pausar animação' : 'Reproduzir animação');
  element('motion-note').hidden = !reducedMotion;
}
playButton.addEventListener('click', () => {
  if (raptor.stats.running) {
    raptor.pause();
    savePaused(true);
  } else {
    clearSelection();
    raptor.play();
    savePaused(false);
  }
  updatePlayback();
});
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=flight]'))
  radio.addEventListener('change', () => {
    mode = radio.value as FlightMode;
    raptor.setOptions({ mode });
    clearSelection();
    if (!raptor.stats.running) raptor.renderAt(raptor.stats.time);
    updatePlayback();
  });
element<HTMLSelectElement>('view').addEventListener('change', (e) =>
  raptor.setOptions({ view: (e.target as HTMLSelectElement).value as View }),
);
element<HTMLSelectElement>('detail').addEventListener('change', (e) =>
  raptor.setOptions({ detail: (e.target as HTMLSelectElement).value as Detail }),
);
element<HTMLSelectElement>('representation').addEventListener('change', (e) =>
  raptor.setOptions({ representation: (e.target as HTMLSelectElement).value as Representation }),
);
element<HTMLInputElement>('time').addEventListener('input', (e) => {
  raptor.renderAt(Number((e.target as HTMLInputElement).value));
  clearSelection();
  updatePlayback();
});
element<HTMLInputElement>('scale').addEventListener('input', (e) => {
  const scale = Number((e.target as HTMLInputElement).value);
  raptor.setOptions({ scale });
  element('scale-label').textContent = `${Math.round(scale * 100)}%`;
});

function renderStudies() {
  thumbnails.splice(0).forEach((instance) => instance.destroy());
  element('poses').replaceChildren();
  for (const preset of species.studies) {
    const button = document.createElement('button');
    button.className = 'pose-card';
    button.setAttribute('aria-pressed', 'false');
    const thumb = document.createElement('canvas');
    thumb.setAttribute('aria-hidden', 'true');
    const meta = document.createElement('span');
    meta.className = 'pose-meta';
    const name = document.createElement('span');
    name.textContent = preset.name;
    const detail = document.createElement('span');
    detail.textContent = preset.detail;
    meta.append(name, detail);
    button.append(thumb, meta);
    element('poses').append(button);
    const instance = new AsciiRaptor(thumb, {
      theme,
      species: species.id,
      view: preset.view,
      paused: true,
      detail: 'fine',
      scale: 0.96,
    });
    instance.renderAt(2, preset.pose);
    thumbnails.push(instance);
    button.addEventListener('click', () => {
      clearSelection();
      button.setAttribute('aria-pressed', 'true');
      element<HTMLSelectElement>('view').value = preset.view;
      raptor.setOptions({ view: preset.view });
      raptor.renderAt(2, preset.pose);
      element<HTMLInputElement>('time').value = '2';
      savePaused(true);
      updatePlayback();
      element('flight-label').textContent = `ESTUDO ESTÁTICO / ${preset.name.toUpperCase()}`;
    });
  }
}
function updateSpecies(announce = false) {
  element('scientific-name').textContent = species.scientificName.toUpperCase();
  const dot = document.createElement('span');
  dot.textContent = '.';
  element('title').replaceChildren(document.createTextNode(species.name), dot);
  element('english-name').textContent = species.englishName.toUpperCase();
  element('flight-label').textContent =
    mode === 'flap'
      ? 'VOO BATIDO'
      : mode === 'glide'
        ? 'VOO PLANADO'
        : species.id === 'golden-eagle'
          ? 'PLANEIO & CURVAS AMPLAS'
          : species.id === 'peregrine-falcon'
            ? 'VOO BATIDO & DESLIZES'
            : 'PLANEIO & CURVAS';
  element('specimen-number').textContent = species.number;
  element('species-story').textContent = species.story;
  element<HTMLAnchorElement>('species-reference').href = species.reference;
  canvas.setAttribute(
    'aria-label',
    `${species.name} em voo. ${species.description} Use os controles para pausar e observar outras poses.`,
  );
  element('scene-description').textContent =
    `Estudo autoral de ${species.name}. ${species.description}`;
  document.title = `ascii-raptors — ${species.name}`;
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name=species]'))
    input.checked = input.value === species.id;
  if (announce)
    element('species-announcement').textContent =
      `${species.name} em observação. ${species.description}`;
  renderStudies();
  updatePlayback();
}
for (const input of document.querySelectorAll<HTMLInputElement>('input[name=species]'))
  input.addEventListener('change', () => {
    species = getSpecies(input.value as SpeciesId);
    raptor.setOptions({ species: species.id });
    const url = new URL(location.href);
    url.searchParams.set('species', species.id);
    history.replaceState(null, '', url);
    element<HTMLInputElement>('time').value = '0';
    updateSpecies(true);
  });
updateSpecies();
function clearSelection() {
  for (const b of document.querySelectorAll('.pose-card')) b.setAttribute('aria-pressed', 'false');
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  raptor.setOptions({ theme });
  thumbnails.forEach((x) => x.setOptions({ theme }));
  element('theme').setAttribute(
    'aria-label',
    theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro',
  );
  saveTheme(theme);
}
element('theme').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});
applyTheme();
updatePlayback();

const interval = window.setInterval(() => {
  const stats = raptor.stats;
  element('metrics').textContent =
    `${stats.columns} × ${stats.rows} células · ${stats.cells.toLocaleString('pt-BR')} glifos · ${stats.frameMs.toFixed(1)} ms · p95 ${stats.p95Ms.toFixed(1)} ms`;
  element('time-label').textContent = `${stats.time.toFixed(1)} s`;
  if (stats.running) {
    element<HTMLInputElement>('time').value = String(stats.time % 40);
    element('flight-label').textContent = {
      soar:
        species.id === 'golden-eagle'
          ? 'PLANEIO & CURVAS AMPLAS'
          : species.id === 'peregrine-falcon'
            ? 'VOO BATIDO & DESLIZES'
            : 'PLANEIO & CURVAS',
      glide: 'VOO PLANADO',
      flap: 'VOO BATIDO',
    }[mode];
  }
  updatePlayback();
}, 500);

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element('export').addEventListener('click', () =>
  canvas.toBlob((blob) => {
    if (blob) download(blob, `ascii-raptors-${species.id}.png`);
  }),
);
const recordButton = element<HTMLButtonElement>('record');
let recorder: MediaRecorder | undefined;
let recordTimer: number | undefined;
let recordingStream: MediaStream | undefined;
let closing = false;
const formats = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const supported =
  typeof MediaRecorder !== 'undefined' &&
  !!canvas.captureStream &&
  formats.some((x) => MediaRecorder.isTypeSupported(x));
recordButton.hidden = !supported;
recordButton.addEventListener('click', () => {
  const wasRunning = raptor.stats.running;
  const chunks: Blob[] = [];
  const speciesField = document.querySelector<HTMLFieldSetElement>('.species-selector')!;
  const finish = () => {
    window.clearTimeout(recordTimer);
    recordTimer = undefined;
    recordingStream?.getTracks().forEach((track) => track.stop());
    recordingStream = undefined;
    recordButton.disabled = false;
    recordButton.textContent = 'Gravar 8 s ↗';
    speciesField.disabled = false;
    if (!wasRunning) raptor.pause();
    recorder = undefined;
    updatePlayback();
  };
  try {
    recordingStream = canvas.captureStream(30);
    const mimeType = formats.find((x) => MediaRecorder.isTypeSupported(x))!;
    recorder = new MediaRecorder(recordingStream, { mimeType, videoBitsPerSecond: 3_000_000 });
    const filename = `ascii-raptors-${species.id}-voo.webm`;
    recordButton.disabled = true;
    recordButton.textContent = 'Gravando…';
    speciesField.disabled = true;
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      element('error-note').hidden = false;
      element('error-note').textContent = 'Não foi possível gravar neste navegador.';
      finish();
    };
    recorder.onstop = () => {
      if (!closing && chunks.length) download(new Blob(chunks, { type: mimeType }), filename);
      finish();
    };
    clearSelection();
    raptor.play();
    recorder.start();
    updatePlayback();
    recordTimer = window.setTimeout(() => {
      if (recorder?.state === 'recording') recorder.stop();
    }, 8000);
  } catch {
    element('error-note').hidden = false;
    element('error-note').textContent = 'A gravação não está disponível neste navegador.';
    finish();
  }
});

const cleanup = () => {
  closing = true;
  window.clearTimeout(recordTimer);
  if (recorder?.state === 'recording') recorder.stop();
  recordingStream?.getTracks().forEach((track) => track.stop());
  clearInterval(interval);
  raptor.destroy();
  thumbnails.forEach((x) => x.destroy());
};
window.addEventListener(
  'pagehide',
  (e) => {
    if (!e.persisted) cleanup();
  },
  { once: true },
);
if (import.meta.hot) import.meta.hot.dispose(cleanup);
