import type { ProjectState } from '../types/project';

const STORAGE_KEY = 'map-highlight-editor.project';

export function saveProjectToStorage(project: ProjectState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadProjectFromStorage(): ProjectState | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as ProjectState) : null;
  } catch {
    return null;
  }
}
