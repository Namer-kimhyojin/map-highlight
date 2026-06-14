import type { ShapeType } from '../types/project';

export interface ShortcutAction {
  id: string;
  keys: string;
  title: string;
  description: string;
  group: 'file' | 'edit' | 'draw' | 'view';
}

export const shortcutActions: ShortcutAction[] = [
  { id: 'save-json', keys: 'Ctrl+S', title: 'JSON 저장', description: '프로젝트 파일을 저장합니다.', group: 'file' },
  { id: 'export-svg', keys: 'Ctrl+Shift+S', title: 'SVG 내보내기', description: 'PowerPoint 편집용 SVG를 저장합니다.', group: 'file' },
  { id: 'export-png', keys: 'Ctrl+Shift+P', title: 'PNG 내보내기', description: '현재 지도 화면을 PNG로 저장합니다.', group: 'file' },
  { id: 'clear-selection', keys: 'Esc', title: '선택 해제', description: '선택지역과 도형 그리기 모드를 정리합니다.', group: 'edit' },
  { id: 'delete-target', keys: 'Delete', title: '선택 속성 제거', description: '행정구역은 색상·테두리 속성을 제거하고, 도형은 삭제합니다.', group: 'edit' },
  { id: 'fit-selected', keys: 'F', title: '선택지역 확대', description: '선택된 행정구역으로 화면을 이동합니다.', group: 'view' },
  { id: 'draw-polygon', keys: 'P', title: '폴리곤', description: '폴리곤 그리기 모드로 전환합니다.', group: 'draw' },
  { id: 'draw-rectangle', keys: 'R', title: '사각형', description: '사각형 그리기 모드로 전환합니다.', group: 'draw' },
  { id: 'draw-circle', keys: 'C', title: '원형', description: '원형 그리기 모드로 전환합니다.', group: 'draw' },
  { id: 'draw-line', keys: 'L', title: '선', description: '선 그리기 모드로 전환합니다.', group: 'draw' },
  { id: 'draw-point', keys: 'M', title: '점', description: '점 찍기 모드로 전환합니다.', group: 'draw' },
  { id: 'select-mode', keys: 'V', title: '선택 모드', description: '그리기 모드를 종료합니다.', group: 'draw' },
  { id: 'help', keys: '?', title: '단축키 도움말', description: '단축키 목록을 엽니다.', group: 'view' },
];

export const drawShortcutMap: Record<string, ShapeType | undefined> = {
  p: 'polygon',
  r: 'rectangle',
  c: 'circle',
  l: 'line',
  m: 'point',
  v: undefined,
};

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}
