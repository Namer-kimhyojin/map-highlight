import type { MapStatus } from '../types/map';
import type { AdminFeatureCollection } from '../types/geojson';
import { useProjectStore } from '../store/useProjectStore';
import { getFeatureCode, getFeatureName } from '../utils/geojson';

interface StatusBarProps {
  status: MapStatus | null;
  adminGeoJson: AdminFeatureCollection | null;
}

const baseMapLabels = {
  blank: '무배경',
  osm: 'OSM 상세',
  'carto-light': '밝은 백지도',
  'carto-voyager': '도로 중심',
  'carto-dark': '어두운 지도',
  'esri-imagery': '위성',
  'esri-topographic': '지형 상세',
  'esri-terrain': '음영 지형',
  'vworld-normal': 'VWorld 일반',
  'vworld-satellite': 'VWorld 위성',
};

const levelLabels = {
  sido: '시도',
  sigungu: '시군구',
  emd: '읍면동',
};

const drawModeLabels = {
  polygon: '폴리곤',
  rectangle: '사각형',
  circle: '원형',
  line: '선',
  point: '점',
};

export function StatusBar({ status, adminGeoJson }: StatusBarProps) {
  const project = useProjectStore((state) => state.project);
  const autosaveStatus = useProjectStore((state) => state.autosaveStatus);
  const activeAdminCode = useProjectStore((state) => state.activeAdminCode);
  const activeShapeId = useProjectStore((state) => state.activeShapeId);
  const selectedShapeIds = useProjectStore((state) => state.selectedShapeIds);
  const drawMode = useProjectStore((state) => state.drawMode);

  const activeFeature = adminGeoJson?.features.find((feature) => getFeatureCode(feature.properties) === activeAdminCode);
  const activeShape = project.customShapes.find((shape) => shape.id === activeShapeId);
  const activeAdminName = activeFeature ? getFeatureName(activeFeature.properties) : activeAdminCode;
  const editingTarget = drawMode
    ? `그리기: ${drawModeLabels[drawMode]}`
    : selectedShapeIds.length > 1 && project.adminLayer.selectedCodes.length > 0
      ? `복합 편집: 지역 ${project.adminLayer.selectedCodes.length}개 · 도형 ${selectedShapeIds.length}개`
      : selectedShapeIds.length > 1
        ? `도형 편집: ${selectedShapeIds.length}개`
        : activeShape
      ? `도형 편집: ${activeShape.name}`
      : activeAdminName
        ? `지역 편집: ${activeAdminName}`
        : '지역 편집: 선택 없음';

  return (
    <footer className="statusbar" aria-live="polite">
      <span className="status-chip strong">{editingTarget}</span>
      <span className="status-chip">지도 {baseMapLabels[project.map.baseMap]}</span>
      <span className="status-chip">단위 {levelLabels[project.adminLayer.level]}</span>
      <span className={project.compareLayer.enabled ? 'status-chip hot' : 'status-chip'}>
        비교 {project.compareLayer.enabled ? levelLabels[project.compareLayer.level] : '끔'}
      </span>
      <span className="status-chip">선택 {project.adminLayer.selectedCodes.length.toLocaleString()}개</span>
      <span className="status-chip">도형 {selectedShapeIds.length > 0 ? `${selectedShapeIds.length.toLocaleString()}개 선택` : `${project.customShapes.length.toLocaleString()}개`}</span>
      <span className="status-chip">줌 {status ? status.zoom.toFixed(2) : project.map.zoom}</span>
      <span className="status-chip">좌표 {status ? `${status.lonLat[0].toFixed(5)}, ${status.lonLat[1].toFixed(5)}` : '-'}</span>
      <span className="status-chip save-state">{autosaveStatus}</span>
    </footer>
  );
}
