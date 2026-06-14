import { FileDown, FolderOpen, Image, Keyboard, MapPinned, Plus, RotateCcw, Save } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { defaultProjectState, useProjectStore } from '../store/useProjectStore';
import { downloadProject, readProjectFile } from '../utils/projectFile';
import { exportMapPng } from '../utils/pngExport';
import type { AdminFeatureCollection } from '../types/geojson';
import { downloadSvg } from '../utils/svgExport';

interface ToolbarProps {
  adminGeoJson: AdminFeatureCollection | null;
  mapElement: HTMLElement | null;
  onOpenShortcuts: () => void;
}

export function Toolbar({ adminGeoJson, mapElement, onOpenShortcuts }: ToolbarProps) {
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const resetProject = useProjectStore((state) => state.resetProject);

  async function handleOpen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProject(await readProjectFile(file));
    event.target.value = '';
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <MapPinned size={20} />
        <div className="brand-copy">
          <span>BATTERY ACADEMY MAP STUDIO</span>
          <strong>행정구역 이미지 제작기</strong>
        </div>
      </div>
      <div className="toolbar-actions">
        <button title="새 프로젝트" onClick={() => setProject(defaultProjectState)}>
          <Plus size={17} />
          새로
        </button>
        <label className="button" title="프로젝트 열기">
          <FolderOpen size={17} />
          열기
          <input type="file" accept="application/json,.json" hidden onChange={handleOpen} />
        </label>
        <button title="프로젝트 JSON 저장" onClick={() => downloadProject(project)}>
          <Save size={17} />
          JSON
        </button>
        <button className="primary-action" title="현재 지도 화면 기준 SVG 내보내기" onClick={() => downloadSvg(project, adminGeoJson, mapElement)}>
          <FileDown size={17} />
          SVG
        </button>
        <button title="PNG 내보내기" onClick={() => mapElement && exportMapPng(mapElement)}>
          <Image size={17} />
          PNG
        </button>
        <button title="지도 초기화" onClick={resetProject}>
          <RotateCcw size={17} />
          초기화
        </button>
        <button title="단축키 도움말 (?)" onClick={onOpenShortcuts}>
          <Keyboard size={17} />
          단축키
        </button>
      </div>
    </header>
  );
}
