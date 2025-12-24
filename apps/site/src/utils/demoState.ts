/**
 * Shared state for demo components.
 * Uses a simple event-based system to sync state across demos.
 */

export type ColorMode = 'system' | 'light' | 'dark';

let currentColorMode: ColorMode = 'system';
const listeners: Set<(mode: ColorMode) => void> = new Set();

export function getColorMode(): ColorMode {
  return currentColorMode;
}

export function getResolvedColorMode(): 'light' | 'dark' {
  if (currentColorMode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return currentColorMode;
}

export function setColorMode(mode: ColorMode): void {
  currentColorMode = mode;
  listeners.forEach(fn => fn(mode));
}

export function onColorModeChange(fn: (mode: ColorMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Sync all color mode selects on the page */
export function syncColorModeSelects(): void {
  document.querySelectorAll<HTMLSelectElement>('[data-color-mode-select]').forEach(select => {
    select.value = currentColorMode;
  });
}
