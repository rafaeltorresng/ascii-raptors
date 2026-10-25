/// <reference types="vite/client" />
import { FlightScene } from './scene.ts';
import { readTheme, saveTheme, readPaused, savePaused } from './preferences.ts';
const play = document.getElementById('sky-play') as HTMLButtonElement;
const themeButton = document.getElementById('theme') as HTMLButtonElement;
let theme = readTheme();
document.documentElement.dataset.theme = theme;
let scene: FlightScene | undefined;
const preference = matchMedia('(prefers-reduced-motion: reduce)');
function update() {
  const running = scene?.stats.running ?? false;
  play.setAttribute('aria-label', running ? 'Pausar voo' : 'Reproduzir voo');
  document.getElementById('sky-symbol')!.textContent = running ? 'Ⅱ' : '▷';
  themeButton.setAttribute('aria-label', theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro');
}
try {
  scene = new FlightScene(document.getElementById('sky') as HTMLCanvasElement, {
    theme,
    paused: readPaused(),
  });
} catch {
  const note = document.getElementById('error-note')!;
  note.hidden = false;
  note.textContent = 'A animação não está disponível neste navegador.';
  play.disabled = true;
}
play.addEventListener('click', () => {
  if (scene?.stats.running) {
    scene.pause();
    savePaused(true);
  } else {
    scene?.play();
    savePaused(false);
  }
  update();
});
themeButton.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  saveTheme(theme);
  scene?.setTheme(theme);
  update();
});
preference.addEventListener('change', update);
document.addEventListener('visibilitychange', update);
update();
const cleanup = () => {
  scene?.destroy();
  preference.removeEventListener('change', update);
  document.removeEventListener('visibilitychange', update);
};
window.addEventListener('pagehide', (e) => {
  if (!e.persisted) cleanup();
});
if (import.meta.hot) import.meta.hot.dispose(cleanup);
