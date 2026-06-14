import type { ProjectState } from '../types/project';

export function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadProject(project: ProjectState) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadText(`map-highlight-project-${stamp}.json`, JSON.stringify(project, null, 2), 'application/json');
}

export async function readProjectFile(file: File): Promise<ProjectState> {
  const text = await file.text();
  return JSON.parse(text) as ProjectState;
}
