import { Eye, EyeOff, GitCompare, LocateFixed, Map, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AdminFeatureCollection } from '../types/geojson';
import type { AdminFeatureInfo, BackgroundContentConfig, BaseMapType } from '../types/project';
import { useProjectStore } from '../store/useProjectStore';
import { getFeatureCode, getFeatureName } from '../utils/geojson';
import type { AdminFeatureGroup, AdminSearchResult } from '../utils/adminGrouping';
import { searchAdminFeatures } from '../utils/adminGrouping';
import { hexToRgba } from '../utils/color';

interface LayerPanelProps {
  adminGeoJson: AdminFeatureCollection | null;
}

const baseMapOptions: Array<{ type: BaseMapType; label: string; group: string }> = [
  { type: 'carto-light', label: '밝은 백지도', group: 'proposal' },
  { type: 'carto-voyager', label: '도로 중심', group: 'proposal' },
  { type: 'blank', label: '무배경', group: 'proposal' },
  { type: 'esri-imagery', label: '위성', group: 'photo' },
  { type: 'esri-topographic', label: '지형 상세', group: 'analysis' },
  { type: 'esri-terrain', label: '음영 지형', group: 'analysis' },
  { type: 'carto-dark', label: '어두운 지도', group: 'presentation' },
  { type: 'osm', label: 'OSM 상세', group: 'detail' },
];

const labelFontOptions = ['Pretendard', 'Inter', 'Noto Sans KR', 'Arial'];

const mapTonePresets = [
  { label: '원본', tone: { preserveOriginalColors: true, brightness: 1, contrast: 1, saturation: 1, grayscale: 0, sepia: 0, hueRotate: 0 } },
  { label: '선명', tone: { preserveOriginalColors: false, brightness: 1.04, contrast: 1.12, saturation: 1.18, grayscale: 0, sepia: 0, hueRotate: 0 } },
  { label: '담백', tone: { preserveOriginalColors: false, brightness: 1.08, contrast: 0.94, saturation: 0.72, grayscale: 0.08, sepia: 0, hueRotate: 0 } },
  { label: '흑백', tone: { preserveOriginalColors: false, brightness: 1.05, contrast: 1.08, saturation: 0.2, grayscale: 0.9, sepia: 0, hueRotate: 0 } },
  { label: '따뜻', tone: { preserveOriginalColors: false, brightness: 1.05, contrast: 1.02, saturation: 0.95, grayscale: 0, sepia: 0.18, hueRotate: -6 } },
];

type LeftPanelTab = 'regions' | 'labels' | 'basemap';

export function LayerPanel({ adminGeoJson }: LayerPanelProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<LeftPanelTab>('regions');
  const project = useProjectStore((state) => state.project);
  const setAdminLevel = useProjectStore((state) => state.setAdminLevel);
  const toggleAdminVisible = useProjectStore((state) => state.toggleAdminVisible);
  const toggleSelectedCode = useProjectStore((state) => state.toggleSelectedCode);
  const clearSelection = useProjectStore((state) => state.clearSelection);
  const setProject = useProjectStore((state) => state.setProject);
  const requestFitSelected = useProjectStore((state) => state.requestFitSelected);
  const activeAdminCode = useProjectStore((state) => state.activeAdminCode);
  const setActiveAdminCode = useProjectStore((state) => state.setActiveAdminCode);
  const updateCompareLayer = useProjectStore((state) => state.updateCompareLayer);
  const updateLabels = useProjectStore((state) => state.updateLabels);

  function updateMapContent(patch: Partial<BackgroundContentConfig>) {
    setProject({ ...project, map: { ...project.map, content: { ...project.map.content, ...patch } } });
  }

  function handleBaseMap(type: BaseMapType) {
    setProject({
      ...project,
      map: {
        ...project.map,
        baseMap: type,
        content: {
          ...project.map.content,
          seaBoundaries: project.map.content.seaBoundaries && type === 'osm',
        },
      },
    });
  }

  function updateMapTone(patch: Partial<typeof project.map.tone>) {
    setProject({ ...project, map: { ...project.map, tone: { ...project.map.tone, ...patch } } });
  }

  const features = useMemo<AdminFeatureInfo[]>(() => {
    return (
      adminGeoJson?.features.map((feature) => ({
        code: getFeatureCode(feature.properties),
        name: getFeatureName(feature.properties),
        level: project.adminLayer.level,
      })) ?? []
    );
  }, [adminGeoJson, project.adminLayer.level]);
  const selected = features.filter((feature) => project.adminLayer.selectedCodes.includes(feature.code));
  const selectedSummary =
    selected.length === 0
      ? '선택 없음'
      : selected.length === 1
        ? selected[0].name
        : `${selected[0].name} 외 ${selected.length - 1}개`;
  const searchResults = useMemo<AdminSearchResult[]>(() => {
    return searchAdminFeatures(features, project.adminLayer.level, query);
  }, [features, project.adminLayer.level, query]);

  function selectGroupOnly(group: AdminFeatureGroup) {
    setProject({
      ...project,
      adminLayer: {
        ...project.adminLayer,
        selectedCodes: group.codes,
      },
    });
    setActiveAdminCode(group.codes[0]);
    setQuery('');
    window.requestAnimationFrame(() => requestFitSelected());
  }

  const previewBackground = project.labels.background
    ? {
        backgroundColor: hexToRgba(project.labels.backgroundColor, project.labels.backgroundOpacity),
      }
    : {};
  const labelPreviewStyle = {
    color: project.labels.fontColor,
    opacity: project.labels.fontOpacity,
    fontFamily: `${project.labels.fontFamily}, Pretendard, Arial, sans-serif`,
    fontSize: `${project.labels.fontSize}px`,
    fontWeight: project.labels.fontWeight,
    textShadow: project.labels.background
      ? undefined
      : `0 0 2px ${hexToRgba(project.labels.outlineColor, project.labels.outlineOpacity)}, 0 1px 4px rgba(15, 23, 42, 0.18)`,
    ...previewBackground,
  };

  return (
    <aside className="panel left-panel">
      <div className="left-panel-tabs">
        <button className={activeTab === 'regions' ? 'active' : ''} onClick={() => setActiveTab('regions')}>
          <Search size={14} />
          지역
        </button>
        <button className={activeTab === 'labels' ? 'active' : ''} onClick={() => setActiveTab('labels')}>
          <Eye size={14} />
          표시
        </button>
        <button className={activeTab === 'basemap' ? 'active' : ''} onClick={() => setActiveTab('basemap')}>
          <Map size={14} />
          배경
        </button>
      </div>

      {activeTab === 'regions' && (
        <>
          <section className="selection-overview">
            <span className="panel-kicker">현재 선택</span>
            <strong>{selectedSummary}</strong>
            <small>{project.adminLayer.level === 'sido' ? '시도' : project.adminLayer.level === 'sigungu' ? '시군구' : '읍면동'} · {selected.length.toLocaleString()}개 선택</small>
            <div className="selection-actions">
              <button onClick={requestFitSelected} disabled={selected.length === 0}>
                <LocateFixed size={15} />
                확대
              </button>
              <button className="small-danger" onClick={clearSelection} disabled={selected.length === 0}>
                <Trash2 size={14} />
                해제
              </button>
            </div>
          </section>

          <section>
            <div className="section-title-row">
              <h2>행정구역 선택</h2>
              <button className="icon-button" title="표시/숨김" onClick={toggleAdminVisible}>
                {project.adminLayer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <div className="segmented">
              <button className={project.adminLayer.level === 'sido' ? 'active' : ''} onClick={() => setAdminLevel('sido')}>시도</button>
              <button className={project.adminLayer.level === 'sigungu' ? 'active' : ''} onClick={() => setAdminLevel('sigungu')}>시군구</button>
              <button className={project.adminLayer.level === 'emd' ? 'active' : ''} onClick={() => setAdminLevel('emd')}>읍면동</button>
            </div>
            <div className="search-box">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 포항, 포항시 전체, 47111" />
              {query && <button className="plain-icon" onClick={() => setQuery('')}><X size={14} /></button>}
            </div>
            {query && searchResults.length === 0 && (
              <p className="empty search-empty">검색 결과가 없습니다.</p>
            )}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => {
                  const isSelected = result.type === 'feature' && project.adminLayer.selectedCodes.includes(result.code);
                  return (
                    <button
                      key={result.code}
                      className={`${result.type === 'group' ? 'group-result' : ''}${isSelected ? ' selected-result' : ''}`.trim() || undefined}
                      onClick={() => (result.type === 'group' ? selectGroupOnly(result) : toggleSelectedCode(result.code))}
                    >
                      <span>{result.type === 'group' ? `${result.name} 전체` : result.name}</span>
                      <small>{result.type === 'group' ? result.memberNames.join(' + ') : isSelected ? '선택됨' : result.code}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="selected-section">
            <div className="section-title-row">
              <h2>선택 목록</h2>
              <button className="small-danger" onClick={clearSelection} disabled={selected.length === 0}>
                <Trash2 size={14} />
                전체 해제
              </button>
            </div>
            <div className="selected-list">
              {selected.length === 0 ? (
                <p className="empty">지도에서 행정구역을 클릭하거나 검색으로 선택하세요.</p>
              ) : (
                selected.map((feature) => (
                  <div
                    key={feature.code}
                    className={activeAdminCode === feature.code ? 'selected-item active' : 'selected-item'}
                    onClick={() => setActiveAdminCode(feature.code)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeAdminCode === feature.code}
                    title="이 지역 스타일 편집"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveAdminCode(feature.code);
                      }
                    }}
                  >
                    <div>
                      <strong>{feature.name}</strong>
                    </div>
                    {activeAdminCode === feature.code && <span className="edit-badge">편집중</span>}
                    <span
                      className="region-swatch"
                      style={{
                        backgroundColor: project.adminLayer.regionStyles[feature.code]?.fillColor ?? project.adminLayer.style.fillColor,
                        opacity: project.adminLayer.regionStyles[feature.code]?.fillOpacity ?? project.adminLayer.style.fillOpacity,
                      }}
                    />
                    <button title="선택 해제" onClick={(event) => { event.stopPropagation(); toggleSelectedCode(feature.code); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'labels' && (
        <>
          <section>
            <div className="section-title-row">
              <h2>지역명 표시</h2>
              <Eye size={16} />
            </div>
            <div className="label-preview">
              <span style={labelPreviewStyle}>포항시 남구</span>
            </div>
            <div className="segmented">
              <button
                className={!project.labels.enabled ? 'active' : ''}
                onClick={() => updateLabels({ enabled: false })}
              >
                숨김
              </button>
              <button
                className={project.labels.enabled && project.labels.scope === 'selected' ? 'active' : ''}
                onClick={() => updateLabels({ enabled: true, scope: 'selected' })}
              >
                선택
              </button>
              <button
                className={project.labels.enabled && project.labels.scope === 'all' ? 'active' : ''}
                onClick={() => updateLabels({ enabled: true, scope: 'all' })}
              >
                전체
              </button>
            </div>
            <p className="panel-hint">지도 위 행정구역명과 SVG 출력 라벨을 한 곳에서 제어합니다.</p>
            <details className="advanced-panel">
              <summary>지역명 고급 설정</summary>
              <div className="form-grid compact-form">
                <label>글자체<select value={project.labels.fontFamily} onChange={(event) => updateLabels({ fontFamily: event.target.value })}>{labelFontOptions.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
                <label>크기<input type="number" min="8" max="42" value={project.labels.fontSize} onChange={(event) => updateLabels({ fontSize: Number(event.target.value) })} /></label>
                <label>글자색<input type="color" value={project.labels.fontColor} onChange={(event) => updateLabels({ fontColor: event.target.value })} /></label>
                <label>글자 투명도<input type="range" min="0" max="1" step="0.05" value={project.labels.fontOpacity} onChange={(event) => updateLabels({ fontOpacity: Number(event.target.value) })} /></label>
                <label>배경색<input type="color" value={project.labels.backgroundColor} onChange={(event) => updateLabels({ backgroundColor: event.target.value })} /></label>
                <label>배경 투명도<input type="range" min="0" max="1" step="0.05" value={project.labels.backgroundOpacity} onChange={(event) => updateLabels({ backgroundOpacity: Number(event.target.value) })} /></label>
                <label>외곽색<input type="color" value={project.labels.outlineColor} onChange={(event) => updateLabels({ outlineColor: event.target.value })} /></label>
                <label>외곽 투명도<input type="range" min="0" max="1" step="0.05" value={project.labels.outlineOpacity} onChange={(event) => updateLabels({ outlineOpacity: Number(event.target.value) })} /></label>
              </div>
              <label className="checkbox-row"><input type="checkbox" checked={project.labels.background} onChange={(event) => updateLabels({ background: event.target.checked })} /> 지역명 배경 박스</label>
              <label className="checkbox-row"><input type="checkbox" checked={project.labels.numbering} onChange={(event) => updateLabels({ numbering: event.target.checked })} /> 선택 순번 표시</label>
            </details>
          </section>

          <section>
            <div className="section-title-row">
              <h2>단위 비교 레이어</h2>
              <GitCompare size={16} />
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={project.compareLayer.enabled}
                onChange={(event) => updateCompareLayer({ enabled: event.target.checked })}
              />
              비교 경계 표시
            </label>
            <div className="segmented">
              <button className={project.compareLayer.level === 'sido' ? 'active' : ''} onClick={() => updateCompareLayer({ level: 'sido' })}>시도</button>
              <button className={project.compareLayer.level === 'sigungu' ? 'active' : ''} onClick={() => updateCompareLayer({ level: 'sigungu' })}>시군구</button>
              <button className={project.compareLayer.level === 'emd' ? 'active' : ''} onClick={() => updateCompareLayer({ level: 'emd' })}>읍면동</button>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={project.compareLayer.labels}
                onChange={(event) => updateCompareLayer({ labels: event.target.checked })}
              />
              비교 단위명 표시
            </label>
            <details className="advanced-panel">
              <summary>비교 단위명 고급 설정</summary>
              <div className="form-grid compact-form">
                <label>글자체<select value={project.compareLayer.labelFontFamily} onChange={(event) => updateCompareLayer({ labelFontFamily: event.target.value })}>{labelFontOptions.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
                <label>크기<input type="number" min="8" max="32" value={project.compareLayer.labelFontSize} onChange={(event) => updateCompareLayer({ labelFontSize: Number(event.target.value) })} /></label>
                <label>글자색<input type="color" value={project.compareLayer.labelFontColor} onChange={(event) => updateCompareLayer({ labelFontColor: event.target.value })} /></label>
                <label>글자 투명도<input type="range" min="0" max="1" step="0.05" value={project.compareLayer.labelOpacity} onChange={(event) => updateCompareLayer({ labelOpacity: Number(event.target.value) })} /></label>
                <label>배경색<input type="color" value={project.compareLayer.labelBackgroundColor} onChange={(event) => updateCompareLayer({ labelBackgroundColor: event.target.value })} /></label>
                <label>배경 투명도<input type="range" min="0" max="1" step="0.05" value={project.compareLayer.labelBackgroundOpacity} onChange={(event) => updateCompareLayer({ labelBackgroundOpacity: Number(event.target.value) })} /></label>
              </div>
              <label className="checkbox-row"><input type="checkbox" checked={project.compareLayer.labelBackground} onChange={(event) => updateCompareLayer({ labelBackground: event.target.checked })} /> 비교 단위명 배경 박스</label>
            </details>
          </section>
        </>
      )}

      {activeTab === 'basemap' && (
        <section>
          <div className="section-title-row">
            <h2>배경지도</h2>
            <Map size={16} />
          </div>
          <div className="basemap-grid">
            {baseMapOptions.map((option) => (
              <button
                key={option.type}
                className={project.map.baseMap === option.type ? 'basemap-card active' : 'basemap-card'}
                onClick={() => handleBaseMap(option.type)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <h2 className="subhead">배경 컨텐츠</h2>
          <div className="content-toggle-grid">
            <label className="checkbox-row"><input type="checkbox" checked={project.map.content.labels} onChange={(event) => updateMapContent({ labels: event.target.checked })} /> 배경 지명</label>
            <label className="checkbox-row"><input type="checkbox" checked={project.map.content.roads} onChange={(event) => updateMapContent({ roads: event.target.checked })} /> 도로</label>
            <label className="checkbox-row"><input type="checkbox" checked={project.map.content.terrain} onChange={(event) => updateMapContent({ terrain: event.target.checked })} /> 지형</label>
            <label className="checkbox-row"><input type="checkbox" checked={project.map.content.poi} onChange={(event) => updateMapContent({ poi: event.target.checked })} /> 장소</label>
            <label className="checkbox-row wide"><input type="checkbox" checked={project.map.content.seaBoundaries} onChange={(event) => updateMapContent({ seaBoundaries: event.target.checked })} /> 해역 경계</label>
          </div>
          <label>
            배경 투명도
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.map.baseOpacity}
              onChange={(event) => setProject({ ...project, map: { ...project.map, baseOpacity: Number(event.target.value) } })}
            />
          </label>
          <details className="advanced-panel tone-panel">
            <summary>{project.map.tone.preserveOriginalColors ? '지도 원본색 보존' : '지도 톤 보정 사용'}</summary>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={project.map.tone.preserveOriginalColors}
                onChange={(event) => updateMapTone({ preserveOriginalColors: event.target.checked })}
              />
              원본색 보존
            </label>
            <div className="tone-preset-row">
              {mapTonePresets.map((preset) => (
                <button key={preset.label} onClick={() => updateMapTone(preset.tone)}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div className={project.map.tone.preserveOriginalColors ? 'tone-controls disabled' : 'tone-controls'}>
              <label>밝기<input type="range" min="0.65" max="1.4" step="0.01" value={project.map.tone.brightness} disabled={project.map.tone.preserveOriginalColors} onChange={(event) => updateMapTone({ brightness: Number(event.target.value), preserveOriginalColors: false })} /></label>
              <label>대비<input type="range" min="0.65" max="1.45" step="0.01" value={project.map.tone.contrast} disabled={project.map.tone.preserveOriginalColors} onChange={(event) => updateMapTone({ contrast: Number(event.target.value), preserveOriginalColors: false })} /></label>
              <label>채도<input type="range" min="0" max="1.8" step="0.01" value={project.map.tone.saturation} disabled={project.map.tone.preserveOriginalColors} onChange={(event) => updateMapTone({ saturation: Number(event.target.value), preserveOriginalColors: false })} /></label>
              <label>회색조<input type="range" min="0" max="1" step="0.01" value={project.map.tone.grayscale} disabled={project.map.tone.preserveOriginalColors} onChange={(event) => updateMapTone({ grayscale: Number(event.target.value), preserveOriginalColors: false })} /></label>
              <label>세피아<input type="range" min="0" max="0.8" step="0.01" value={project.map.tone.sepia} disabled={project.map.tone.preserveOriginalColors} onChange={(event) => updateMapTone({ sepia: Number(event.target.value), preserveOriginalColors: false })} /></label>
              <label>색상 회전<input type="range" min="-30" max="30" step="1" value={project.map.tone.hueRotate} disabled={project.map.tone.preserveOriginalColors} onChange={(event) => updateMapTone({ hueRotate: Number(event.target.value), preserveOriginalColors: false })} /></label>
            </div>
          </details>
        </section>
      )}
    </aside>
  );
}
