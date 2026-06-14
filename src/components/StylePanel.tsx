import { Circle, Diamond, FileDown, Layers3, Minus, MousePointer2, Palette, PenLine, Pentagon, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import type { AdminFeatureCollection } from '../types/geojson';
import type { ShapeType, StyleConfig } from '../types/project';
import { getFeatureCode, getFeatureName } from '../utils/geojson';
import { fillPatternOptions, strokePatternOptions } from '../utils/stylePatterns';

const shapeTools: Array<{ type: ShapeType; label: string; icon: React.ReactNode }> = [
  { type: 'polygon', label: '폴리곤', icon: <Pentagon size={16} /> },
  { type: 'rectangle', label: '사각형', icon: <Square size={16} /> },
  { type: 'circle', label: '원형', icon: <Circle size={16} /> },
  { type: 'line', label: '선', icon: <Minus size={16} /> },
  { type: 'point', label: '점', icon: <Diamond size={16} /> },
];

type StylePreset = { label: string; style: StyleConfig };
type StyleTheme = { id: string; label: string; description: string; presets: StylePreset[] };

const styleThemes: StyleTheme[] = [
  {
    id: 'business-blue',
    label: '비즈니스 블루',
    description: '사업계획서용 안정감',
    presets: [
      { label: '핵심', style: { fillColor: '#2563EB', fillOpacity: 0.48, strokeColor: '#0F3A78', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#F59E0B', fillOpacity: 0.42, strokeColor: '#9A3412', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#0EA5A4', fillOpacity: 0.32, strokeColor: '#0F766E', strokeOpacity: 0.94, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#7C3AED', fillOpacity: 0.34, strokeColor: '#4C1D95', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#EF4444', fillOpacity: 0.44, strokeColor: '#991B1B', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#22C55E', fillOpacity: 0.3, strokeColor: '#166534', strokeOpacity: 0.92, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'battery-neon',
    label: '배터리 네온',
    description: '첨단·에너지 산업 강조',
    presets: [
      { label: '핵심', style: { fillColor: '#00A3FF', fillOpacity: 0.42, strokeColor: '#005C99', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#B4F000', fillOpacity: 0.36, strokeColor: '#5D7C00', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#00D1B2', fillOpacity: 0.34, strokeColor: '#007A68', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#8B5CF6', fillOpacity: 0.34, strokeColor: '#5B21B6', strokeOpacity: 0.98, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#FF3B5C', fillOpacity: 0.43, strokeColor: '#A10024', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#16F195', fillOpacity: 0.28, strokeColor: '#008A54', strokeOpacity: 0.95, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'executive-muted',
    label: '임원 보고',
    description: '절제된 고급 보고서 톤',
    presets: [
      { label: '핵심', style: { fillColor: '#1E3A5F', fillOpacity: 0.46, strokeColor: '#0B1F35', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#B7791F', fillOpacity: 0.38, strokeColor: '#744210', strokeOpacity: 0.98, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#2F7668', fillOpacity: 0.32, strokeColor: '#164E46', strokeOpacity: 0.95, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#5B5F77', fillOpacity: 0.34, strokeColor: '#303345', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#B91C1C', fillOpacity: 0.4, strokeColor: '#641111', strokeOpacity: 1, strokeWidth: 2.7 } },
      { label: '보전', style: { fillColor: '#4D7C0F', fillOpacity: 0.28, strokeColor: '#365314', strokeOpacity: 0.95, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'earth-policy',
    label: '국토·환경',
    description: '지형·보전 분석 친화',
    presets: [
      { label: '핵심', style: { fillColor: '#2D6A4F', fillOpacity: 0.42, strokeColor: '#12382A', strokeOpacity: 1, strokeWidth: 2.7 } },
      { label: '성장', style: { fillColor: '#DDA15E', fillOpacity: 0.42, strokeColor: '#9C6644', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#40916C', fillOpacity: 0.34, strokeColor: '#1B4332', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#52796F', fillOpacity: 0.32, strokeColor: '#354F52', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#BC6C25', fillOpacity: 0.44, strokeColor: '#7F4F24', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#74C69D', fillOpacity: 0.28, strokeColor: '#2D6A4F', strokeOpacity: 0.94, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'civic-clean',
    label: '공공 클린',
    description: '행정자료용 밝은 색감',
    presets: [
      { label: '핵심', style: { fillColor: '#0EA5E9', fillOpacity: 0.38, strokeColor: '#0369A1', strokeOpacity: 1, strokeWidth: 2.7 } },
      { label: '성장', style: { fillColor: '#F97316', fillOpacity: 0.36, strokeColor: '#C2410C', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#14B8A6', fillOpacity: 0.3, strokeColor: '#0F766E', strokeOpacity: 0.95, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#6366F1', fillOpacity: 0.3, strokeColor: '#3730A3', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#F43F5E', fillOpacity: 0.38, strokeColor: '#BE123C', strokeOpacity: 1, strokeWidth: 2.7 } },
      { label: '보전', style: { fillColor: '#84CC16', fillOpacity: 0.26, strokeColor: '#4D7C0F', strokeOpacity: 0.93, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'warm-invest',
    label: '투자 제안',
    description: '따뜻한 성장 서사',
    presets: [
      { label: '핵심', style: { fillColor: '#D97706', fillOpacity: 0.42, strokeColor: '#92400E', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#FBBF24', fillOpacity: 0.38, strokeColor: '#B45309', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#FB7185', fillOpacity: 0.3, strokeColor: '#BE123C', strokeOpacity: 0.95, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#A16207', fillOpacity: 0.32, strokeColor: '#713F12', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#DC2626', fillOpacity: 0.42, strokeColor: '#7F1D1D', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#65A30D', fillOpacity: 0.26, strokeColor: '#3F6212', strokeOpacity: 0.94, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'mono-report',
    label: '모노 리포트',
    description: '흑백 인쇄·문서 삽입',
    presets: [
      { label: '핵심', style: { fillColor: '#111827', fillOpacity: 0.46, strokeColor: '#000000', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#4B5563', fillOpacity: 0.38, strokeColor: '#1F2937', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#6B7280', fillOpacity: 0.32, strokeColor: '#374151', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#9CA3AF', fillOpacity: 0.34, strokeColor: '#4B5563', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#7F1D1D', fillOpacity: 0.42, strokeColor: '#450A0A', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#374151', fillOpacity: 0.26, strokeColor: '#111827', strokeOpacity: 0.94, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'pastel-brief',
    label: '파스텔 브리프',
    description: '부드러운 홍보물 톤',
    presets: [
      { label: '핵심', style: { fillColor: '#93C5FD', fillOpacity: 0.46, strokeColor: '#2563EB', strokeOpacity: 0.95, strokeWidth: 2.5 } },
      { label: '성장', style: { fillColor: '#FCD34D', fillOpacity: 0.4, strokeColor: '#D97706', strokeOpacity: 0.95, strokeWidth: 2.3 } },
      { label: '연계', style: { fillColor: '#5EEAD4', fillOpacity: 0.32, strokeColor: '#0F766E', strokeOpacity: 0.9, strokeWidth: 2.1 } },
      { label: '비교', style: { fillColor: '#C4B5FD', fillOpacity: 0.34, strokeColor: '#7C3AED', strokeOpacity: 0.92, strokeWidth: 2.1 } },
      { label: '위험', style: { fillColor: '#FDA4AF', fillOpacity: 0.42, strokeColor: '#E11D48', strokeOpacity: 0.96, strokeWidth: 2.5 } },
      { label: '보전', style: { fillColor: '#BBF7D0', fillOpacity: 0.3, strokeColor: '#16A34A', strokeOpacity: 0.9, strokeWidth: 2 } },
    ],
  },
  {
    id: 'night-satellite',
    label: '야간 위성',
    description: '위성지도 위 고대비',
    presets: [
      { label: '핵심', style: { fillColor: '#38BDF8', fillOpacity: 0.36, strokeColor: '#E0F2FE', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#FACC15', fillOpacity: 0.36, strokeColor: '#FEF3C7', strokeOpacity: 1, strokeWidth: 2.5 } },
      { label: '연계', style: { fillColor: '#2DD4BF', fillOpacity: 0.3, strokeColor: '#CCFBF1', strokeOpacity: 0.98, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#A78BFA', fillOpacity: 0.32, strokeColor: '#EDE9FE', strokeOpacity: 0.98, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#FB7185', fillOpacity: 0.4, strokeColor: '#FFE4E6', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#86EFAC', fillOpacity: 0.28, strokeColor: '#DCFCE7', strokeOpacity: 0.96, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'marine-port',
    label: '해양·항만',
    description: '물류·연안권 분석',
    presets: [
      { label: '핵심', style: { fillColor: '#0369A1', fillOpacity: 0.44, strokeColor: '#0C4A6E', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#0891B2', fillOpacity: 0.36, strokeColor: '#155E75', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#22D3EE', fillOpacity: 0.3, strokeColor: '#0E7490', strokeOpacity: 0.95, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#64748B', fillOpacity: 0.32, strokeColor: '#334155', strokeOpacity: 0.95, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#F97316', fillOpacity: 0.42, strokeColor: '#C2410C', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#10B981', fillOpacity: 0.28, strokeColor: '#047857', strokeOpacity: 0.94, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'innovation-purple',
    label: '혁신 퍼플',
    description: 'R&D·신산업 발표용',
    presets: [
      { label: '핵심', style: { fillColor: '#7C3AED', fillOpacity: 0.42, strokeColor: '#4C1D95', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '성장', style: { fillColor: '#EC4899', fillOpacity: 0.34, strokeColor: '#BE185D', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '연계', style: { fillColor: '#06B6D4', fillOpacity: 0.3, strokeColor: '#0E7490', strokeOpacity: 0.95, strokeWidth: 2.2 } },
      { label: '비교', style: { fillColor: '#6366F1', fillOpacity: 0.32, strokeColor: '#3730A3', strokeOpacity: 0.96, strokeWidth: 2.2 } },
      { label: '위험', style: { fillColor: '#F43F5E', fillOpacity: 0.4, strokeColor: '#BE123C', strokeOpacity: 1, strokeWidth: 2.8 } },
      { label: '보전', style: { fillColor: '#22C55E', fillOpacity: 0.26, strokeColor: '#15803D', strokeOpacity: 0.94, strokeWidth: 2.1 } },
    ],
  },
  {
    id: 'print-vivid',
    label: '인쇄 선명',
    description: '출력물에서 선명한 대비',
    presets: [
      { label: '핵심', style: { fillColor: '#0047AB', fillOpacity: 0.5, strokeColor: '#002F6C', strokeOpacity: 1, strokeWidth: 3 } },
      { label: '성장', style: { fillColor: '#FFB000', fillOpacity: 0.46, strokeColor: '#B36B00', strokeOpacity: 1, strokeWidth: 2.6 } },
      { label: '연계', style: { fillColor: '#008C8C', fillOpacity: 0.36, strokeColor: '#005F5F', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '비교', style: { fillColor: '#6B2FB8', fillOpacity: 0.38, strokeColor: '#40176F', strokeOpacity: 1, strokeWidth: 2.4 } },
      { label: '위험', style: { fillColor: '#D00000', fillOpacity: 0.5, strokeColor: '#7A0000', strokeOpacity: 1, strokeWidth: 3 } },
      { label: '보전', style: { fillColor: '#2E9F43', fillOpacity: 0.32, strokeColor: '#1C6B2B', strokeOpacity: 1, strokeWidth: 2.2 } },
    ],
  },
];

const borderPresets: Array<{ label: string; style: Partial<StyleConfig> }> = [
  { label: '강조', style: { strokeWidth: 3.2, strokeOpacity: 1, strokePattern: 'solid', strokeDasharray: undefined } },
  { label: '보조', style: { strokeWidth: 1.8, strokeOpacity: 0.78, strokePattern: 'solid', strokeDasharray: undefined } },
  { label: '희미함', style: { strokeWidth: 1.2, strokeOpacity: 0.42, strokePattern: 'solid', strokeDasharray: undefined } },
  { label: '점선', style: { strokeWidth: 2.2, strokeOpacity: 0.92, strokePattern: 'dashed', strokeDasharray: '6 4' } },
  { label: '이중', style: { strokeWidth: 3.2, strokeOpacity: 1, strokePattern: 'double', strokeDasharray: undefined } },
  { label: '숨김', style: { strokeWidth: 0, strokeOpacity: 0, strokePattern: 'solid', strokeDasharray: undefined } },
];

const outputPresets = [
  { label: '16:9', width: 1920, height: 1080 },
  { label: '4:3', width: 1600, height: 1200 },
  { label: 'A4 가로', width: 2480, height: 1754 },
  { label: 'A4 세로', width: 1754, height: 2480 },
  { label: '정사각', width: 1600, height: 1600 },
];

type RightPanelTab = 'draw' | 'style' | 'export';

interface StylePanelProps {
  adminGeoJson: AdminFeatureCollection | null;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function StylePanel({ adminGeoJson }: StylePanelProps) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('draw');
  const [activeThemeId, setActiveThemeId] = useState(styleThemes[0].id);
  const project = useProjectStore((state) => state.project);
  const activeAdminCode = useProjectStore((state) => state.activeAdminCode);
  const drawMode = useProjectStore((state) => state.drawMode);
  const activeShapeId = useProjectStore((state) => state.activeShapeId);
  const selectedShapeIds = useProjectStore((state) => state.selectedShapeIds);
  const shapePointEditMode = useProjectStore((state) => state.shapePointEditMode);
  const setDrawMode = useProjectStore((state) => state.setDrawMode);
  const setShapePointEditMode = useProjectStore((state) => state.setShapePointEditMode);
  const setActiveShape = useProjectStore((state) => state.setActiveShape);
  const toggleSelectedShape = useProjectStore((state) => state.toggleSelectedShape);
  const setActiveAdminCode = useProjectStore((state) => state.setActiveAdminCode);
  const updateShape = useProjectStore((state) => state.updateShape);
  const removeSelectedShapes = useProjectStore((state) => state.removeSelectedShapes);
  const clearSelection = useProjectStore((state) => state.clearSelection);
  const clearSelectedRegionStyles = useProjectStore((state) => state.clearSelectedRegionStyles);
  const updateAdminStyle = useProjectStore((state) => state.updateAdminStyle);
  const updateSelectedStyles = useProjectStore((state) => state.updateSelectedStyles);
  const applyStyleToAllSelected = useProjectStore((state) => state.applyStyleToAllSelected);
  const updateSelectedShapeStyles = useProjectStore((state) => state.updateSelectedShapeStyles);
  const applyStyleToSelectedShapes = useProjectStore((state) => state.applyStyleToSelectedShapes);
  const updateHighlight = useProjectStore((state) => state.updateHighlight);
  const updateExport = useProjectStore((state) => state.updateExport);

  const activeShape = project.customShapes.find((shape) => shape.id === activeShapeId);
  const selectedShapes = project.customShapes.filter((shape) => selectedShapeIds.includes(shape.id));
  const hasShapeTarget = selectedShapeIds.length > 0 || Boolean(activeShape);
  const selectedCodes = project.adminLayer.selectedCodes;
  const adminFeatures = useMemo(() => adminGeoJson?.features ?? [], [adminGeoJson]);
  const selectedFeatures = useMemo(
    () => adminFeatures.filter((feature) => selectedCodes.includes(getFeatureCode(feature.properties))),
    [adminFeatures, selectedCodes],
  );
  const activeAdminFeature = adminFeatures.find((feature) => getFeatureCode(feature.properties) === activeAdminCode) ?? selectedFeatures[0];
  const activeAdminName = activeAdminFeature ? getFeatureName(activeAdminFeature.properties) : undefined;
  const hasAdminTarget = selectedCodes.length > 0 || Boolean(activeAdminCode);
  const targetKind = hasShapeTarget && hasAdminTarget ? 'mixed' : hasShapeTarget ? 'shape' : hasAdminTarget ? 'admin' : 'none';
  const activeAdminStyleCode = activeAdminCode ?? selectedCodes[0];
  const activeStyle =
    activeShape?.style ??
    selectedShapes[0]?.style ??
    (activeAdminStyleCode && project.adminLayer.regionStyles[activeAdminStyleCode]
      ? project.adminLayer.regionStyles[activeAdminStyleCode]
      : project.adminLayer.style);
  const activeTheme = styleThemes.find((theme) => theme.id === activeThemeId) ?? styleThemes[0];

  useEffect(() => {
    if (activeShape || activeAdminCode || selectedCodes.length > 0 || selectedShapeIds.length > 0) setActiveTab('style');
  }, [activeAdminCode, activeShape, selectedCodes.length, selectedShapeIds.length]);

  function applyWholeStyle(style: StyleConfig) {
    let applied = false;
    if (hasAdminTarget) {
      if (selectedCodes.length > 0) applyStyleToAllSelected(style);
      else updateAdminStyle(style);
      applied = true;
    }
    if (hasShapeTarget) {
      applyStyleToSelectedShapes(style);
      applied = true;
    }
    if (!applied) updateAdminStyle(style);
  }

  function patchStyle(style: Partial<StyleConfig>) {
    let applied = false;
    if (hasAdminTarget) {
      updateSelectedStyles(style);
      applied = true;
    }
    if (hasShapeTarget) {
      updateSelectedShapeStyles(style);
      applied = true;
    }
    if (!applied) updateAdminStyle(style);
  }

  const targetTitle =
    targetKind === 'mixed'
      ? `행정구역 ${selectedCodes.length || 1}개 · 도형 ${selectedShapeIds.length}개`
      : targetKind === 'shape'
        ? selectedShapeIds.length > 1
          ? `도형 ${selectedShapeIds.length}개`
          : activeShape?.name ?? selectedShapes[0]?.name ?? '도형'
        : selectedCodes.length > 1
          ? `행정구역 ${selectedCodes.length}개`
          : activeAdminName ?? '선택 개체 없음';
  const targetHint =
    targetKind === 'mixed'
      ? '선택된 행정구역과 도형에 같은 속성을 동시에 적용합니다.'
      : targetKind === 'shape'
        ? '선택된 도형에 색상과 선을 누적 적용합니다.'
        : selectedCodes.length > 0
          ? '선택된 행정구역에 같은 스타일을 누적 적용합니다.'
          : '지도에서 행정구역이나 도형을 클릭하면 이곳에서 바로 편집합니다.';

  return (
    <aside className="panel right-panel">
      <div className="right-panel-tabs" role="tablist" aria-label="작업 패널">
        <button className={activeTab === 'draw' ? 'active' : ''} onClick={() => setActiveTab('draw')}>
          <PenLine size={15} />
          도형
        </button>
        <button className={activeTab === 'style' ? 'active' : ''} onClick={() => setActiveTab('style')}>
          <Palette size={15} />
          속성
        </button>
        <button className={activeTab === 'export' ? 'active' : ''} onClick={() => setActiveTab('export')}>
          <FileDown size={15} />
          출력
        </button>
      </div>

      {activeTab === 'draw' && (
        <section>
          <h2>도형 그리기</h2>
          <div className="tool-grid">
            <button className={!drawMode ? 'active' : ''} onClick={() => setDrawMode(undefined)} title="선택">
              <MousePointer2 size={16} />
              선택
            </button>
            {shapeTools.map((tool) => (
              <button
                key={tool.type}
                className={drawMode === tool.type ? 'active' : ''}
                onClick={() => setDrawMode(drawMode === tool.type ? undefined : tool.type)}
                title={tool.label}
              >
                {tool.icon}
                {tool.label}
              </button>
            ))}
          </div>
          <div className="shape-list">
            {project.customShapes.length === 0 ? (
              <p className="empty">지도 위에 도형을 그리면 이곳에서 선택하고 편집할 수 있습니다.</p>
            ) : (
              project.customShapes.map((shape) => (
                <button
                  key={shape.id}
                  className={selectedShapeIds.includes(shape.id) ? 'shape-row active' : 'shape-row'}
                  onClick={(event) => {
                    const multiSelect = event.ctrlKey || event.metaKey || event.shiftKey;
                    if (multiSelect) toggleSelectedShape(shape.id);
                    else {
                      setActiveShape(shape.id);
                      setActiveAdminCode(undefined);
                    }
                    setShapePointEditMode(false);
                    setActiveTab('style');
                  }}
                >
                  <PenLine size={14} />
                  <span>{shape.name}</span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'style' && (
        <section>
          <h2>선택 개체 속성</h2>
          <div className={targetKind === 'none' ? 'target-summary empty-target' : 'target-summary'}>
            <div className="target-icon">{targetKind === 'shape' ? <PenLine size={17} /> : <Layers3 size={17} />}</div>
            <div>
              <strong>{targetTitle}</strong>
              <span>{targetHint}</span>
            </div>
            {targetKind !== 'none' && (
              <div className="target-action-stack">
                {(targetKind === 'admin' || targetKind === 'mixed') && (
                  <>
                    <button className="small-danger" onClick={clearSelectedRegionStyles} title="선택된 행정구역의 색상과 테두리 설정 제거">
                      지역 속성 제거
                    </button>
                    {selectedCodes.length > 0 && (
                      <button className="small-danger subtle" onClick={clearSelection} title="선택만 해제">
                        지역 해제
                      </button>
                    )}
                  </>
                )}
                {hasShapeTarget && (
                  <button className="small-danger" onClick={removeSelectedShapes} title="선택한 도형 삭제">
                    도형 삭제
                  </button>
                )}
              </div>
            )}
          </div>

          {targetKind !== 'none' ? (
            <div className="shape-editor object-style-editor">
              {targetKind === 'shape' && activeShape && selectedShapeIds.length <= 1 && (
                <>
                  <div className="point-edit-card">
                    <div>
                      <strong>점 편집</strong>
                      <span>꼭짓점이나 선분 점을 드래그해 형태를 세밀하게 조정합니다.</span>
                    </div>
                    <button className={shapePointEditMode ? 'active' : ''} onClick={() => setShapePointEditMode(!shapePointEditMode)}>
                      {shapePointEditMode ? '편집 중' : '점 편집'}
                    </button>
                  </div>
                  <label>
                    도형명
                    <input value={activeShape.name} onChange={(event) => updateShape(activeShape.id, { name: event.target.value })} />
                  </label>
                </>
              )}

              <div className="quick-style-block compact">
                <div className="style-block-title-row">
                  <div>
                    <h3>색상 프리셋</h3>
                    <span>{activeTheme.description}</span>
                  </div>
                  <select value={activeThemeId} onChange={(event) => setActiveThemeId(event.target.value)} aria-label="색상 테마">
                    {styleThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="theme-chip-row">
                  {styleThemes.map((theme) => (
                    <button
                      key={theme.id}
                      className={activeThemeId === theme.id ? 'active' : ''}
                      onClick={() => setActiveThemeId(theme.id)}
                      title={theme.description}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
                <div className="preset-grid">
                  {activeTheme.presets.map((preset) => (
                    <button key={preset.label} onClick={() => applyWholeStyle(preset.style)}>
                      <span style={{ backgroundColor: preset.style.fillColor, borderColor: preset.style.strokeColor }} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-style-block compact">
                <h3>테두리 프리셋</h3>
                <div className="border-preset-grid">
                  {borderPresets.map((preset) => (
                    <button key={preset.label} onClick={() => patchStyle(preset.style)}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid style-form-grid">
                <label>
                  면 색상
                  <input type="color" value={activeStyle.fillColor} onChange={(event) => patchStyle({ fillColor: event.target.value })} />
                </label>
                <label>
                  선 색상
                  <input type="color" value={activeStyle.strokeColor} onChange={(event) => patchStyle({ strokeColor: event.target.value })} />
                </label>
                <label>
                  면 투명도 <small>{formatPercent(activeStyle.fillOpacity)}</small>
                  <input type="range" min="0" max="1" step="0.05" value={activeStyle.fillOpacity} onChange={(event) => patchStyle({ fillOpacity: Number(event.target.value) })} />
                </label>
                <label>
                  면 패턴
                  <select value={activeStyle.fillPattern ?? 'none'} onChange={(event) => patchStyle({ fillPattern: event.target.value as StyleConfig['fillPattern'] })}>
                    {fillPatternOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  패턴 색상
                  <input type="color" value={activeStyle.fillPatternColor ?? activeStyle.strokeColor} onChange={(event) => patchStyle({ fillPatternColor: event.target.value })} />
                </label>
                <label>
                  패턴 투명도 <small>{formatPercent(activeStyle.fillPatternOpacity ?? 0.38)}</small>
                  <input type="range" min="0" max="1" step="0.05" value={activeStyle.fillPatternOpacity ?? 0.38} onChange={(event) => patchStyle({ fillPatternOpacity: Number(event.target.value) })} />
                </label>
                <label>
                  선 투명도 <small>{formatPercent(activeStyle.strokeOpacity)}</small>
                  <input type="range" min="0" max="1" step="0.05" value={activeStyle.strokeOpacity} onChange={(event) => patchStyle({ strokeOpacity: Number(event.target.value) })} />
                </label>
                <label>
                  선 두께
                  <input type="number" min="0" max="16" step="0.1" value={activeStyle.strokeWidth} onChange={(event) => patchStyle({ strokeWidth: Number(event.target.value) })} />
                </label>
                <label>
                  선 패턴
                  <select value={activeStyle.strokePattern ?? (activeStyle.strokeDasharray ? 'dashed' : 'solid')} onChange={(event) => patchStyle({ strokePattern: event.target.value as StyleConfig['strokePattern'], strokeDasharray: event.target.value === 'dashed' ? '6 4' : undefined })}>
                    {strokePatternOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="quick-style-block compact">
                <h3>선택 보조선</h3>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={project.highlight.selectedHalo}
                    onChange={(event) => updateHighlight({ selectedHalo: event.target.checked })}
                  />
                  흰색/보조 외곽선 표시
                </label>
                <div className="form-grid compact-form">
                  <label>
                    보조선 색상
                    <input type="color" value={project.highlight.haloColor} onChange={(event) => updateHighlight({ haloColor: event.target.value })} />
                  </label>
                  <label>
                    보조선 두께
                    <input type="number" min="0" max="16" step="0.5" value={project.highlight.haloWidth} onChange={(event) => updateHighlight({ haloWidth: Number(event.target.value) })} />
                  </label>
                </div>
              </div>

              {project.recentStyles.length > 0 && (
                <div className="quick-style-block compact">
                  <h3>최근 스타일</h3>
                  <div className="recent-style-row">
                    {project.recentStyles.map((style, index) => (
                      <button
                        key={`${style.fillColor}-${style.strokeColor}-${index}`}
                        className="recent-style-button"
                        title={`최근 스타일 ${index + 1}`}
                        onClick={() => applyWholeStyle(style)}
                      >
                        <span style={{ backgroundColor: style.fillColor, borderColor: style.strokeColor }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <p className="empty">상단 스타일 바는 제거되었습니다. 이제 지도에서 지역이나 도형을 선택한 뒤 이 패널에서 바로 색상, 투명도, 테두리를 조정하세요.</p>
          )}
        </section>
      )}

      {activeTab === 'export' && (
        <section>
          <h2>출력 설정</h2>
          <p className="panel-hint">SVG는 현재 지도 화면 범위와 비율을 기준으로 고해상도 생성됩니다.</p>
          <div className="output-presets">
            {outputPresets.map((preset) => (
              <button key={preset.label} onClick={() => updateExport({ width: preset.width, height: preset.height })}>
                {preset.label}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>너비<input type="number" min="320" value={project.export.width} onChange={(event) => updateExport({ width: Number(event.target.value) })} /></label>
            <label>높이<input type="number" min="240" value={project.export.height} onChange={(event) => updateExport({ height: Number(event.target.value) })} /></label>
          </div>
          <label className="checkbox-row"><input type="checkbox" checked={project.export.transparentBackground} onChange={(event) => updateExport({ transparentBackground: event.target.checked })} /> 투명 배경 SVG</label>
          <label className="checkbox-row"><input type="checkbox" checked={project.export.includeBaseMap} onChange={(event) => updateExport({ includeBaseMap: event.target.checked })} /> 배경지도 포함</label>
          <label className="checkbox-row"><input type="checkbox" checked={project.export.includeLegend} onChange={(event) => updateExport({ includeLegend: event.target.checked })} /> 범례 포함</label>
          <label>범례 제목<input value={project.export.legendTitle} onChange={(event) => updateExport({ legendTitle: event.target.value })} /></label>
        </section>
      )}
    </aside>
  );
}
