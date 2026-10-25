import { FlightScene } from '../scene.ts';
import type { Theme } from '../../src/ascii.ts';
const query = new URLSearchParams(location.search);
const canvas = document.querySelector('canvas')!;
const time = document.querySelector<HTMLInputElement>('#time')!;
const size = document.querySelector<HTMLSelectElement>('#size')!;
const theme = document.querySelector<HTMLSelectElement>('#theme')!;
const play = document.querySelector<HTMLButtonElement>('#play')!;
const record = document.querySelector<HTMLButtonElement>('#record')!;
const video = document.querySelector<HTMLAnchorElement>('#video')!;
const output = document.querySelector('output')!;
time.value = query.get('t') ?? '0';
size.value = query.get('size') ?? '1440x900';
theme.value = query.get('theme') ?? 'dark';
const scene = new FlightScene(canvas, { theme: theme.value as Theme, paused: true });
let playing = false,
  raf = 0,
  previous = 0;
function frame() {
  const [w, h] = size.value.split('x').map(Number);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  scene.resize();
  scene.setTheme(theme.value as Theme);
  scene.renderAt(Number(time.value));
  output.textContent = `${Number(time.value).toFixed(1)}s · ${w} × ${h}`;
}
function stop() {
  playing = false;
  cancelAnimationFrame(raf);
  play.textContent = 'Reproduzir';
  scene.pause();
}
function start() {
  playing = true;
  play.textContent = 'Pausar';
  previous = performance.now();
  scene.play();
  const tick = (now: number) => {
    if (now - previous >= 100) {
      time.value = String(scene.stats.time);
      output.textContent = `${scene.stats.time.toFixed(1)}s · ${scene.stats.frameMs.toFixed(1)}ms`;
      previous = now;
    }
    if (playing) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
play.onclick = () => (playing ? stop() : start());
for (const input of [time, size, theme])
  input.addEventListener('input', () => {
    stop();
    frame();
  });
document.querySelector('#capture')!.addEventListener('click', () => {
  stop();
  const a = document.createElement('a');
  a.href = canvas.toDataURL();
  a.download = `motion-${size.value}-${theme.value}-${time.value}s.png`;
  a.click();
});
record.onclick = () => {
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  if (!mime) {
    output.textContent = 'MediaRecorder WebM indisponível neste navegador';
    return;
  }
  stop();
  frame();
  record.disabled = true;
  video.hidden = true;
  const stream = canvas.captureStream(30),
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 }),
    chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    stop();
    stream.getTracks().forEach((track) => track.stop());
    if (video.href.startsWith('blob:')) URL.revokeObjectURL(video.href);
    video.href = URL.createObjectURL(new Blob(chunks, { type: mime }));
    video.download = `motion-${size.value}-${theme.value}.webm`;
    video.hidden = false;
    record.disabled = false;
    output.textContent = '18 segundos gravados da cena real.';
  };
  recorder.start();
  start();
  setTimeout(() => recorder.stop(), 18_000);
};
window.addEventListener('pagehide', () => {
  stop();
  scene.destroy();
});
frame();
