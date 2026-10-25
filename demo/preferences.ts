import type { Theme } from '../src/index.ts';
export function readTheme(): Theme {
  try {
    return localStorage.getItem('ascii-raptors-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem('ascii-raptors-theme', theme);
  } catch {
    /* Persistence is optional. */
  }
}
export function readPaused() {
  try {
    return sessionStorage.getItem('ascii-raptors-paused') === 'true';
  } catch {
    return false;
  }
}
export function savePaused(paused: boolean) {
  try {
    sessionStorage.setItem('ascii-raptors-paused', String(paused));
  } catch {
    /* Persistence is optional. */
  }
}
