import { create } from 'zustand';
import type { AdminLevel, BaseMapType, CustomShape, ProjectState, ShapeType, StyleConfig } from '../types/project';
import { loadProjectFromStorage, saveProjectToStorage } from '../utils/localStorage';

export const defaultStyle: StyleConfig = {
  fillColor: '#2563EB',
  fillOpacity: 0.46,
  fillPattern: 'none',
  fillPatternColor: '#FFFFFF',
  fillPatternOpacity: 0.38,
  strokeColor: '#0F3A78',
  strokeOpacity: 1,
  strokeWidth: 2.6,
  strokePattern: 'solid',
};

export const shapeDefaultStyle: StyleConfig = {
  fillColor: '#F97316',
  fillOpacity: 0.24,
  fillPattern: 'none',
  fillPatternColor: '#FFFFFF',
  fillPatternOpacity: 0.38,
  strokeColor: '#C2410C',
  strokeOpacity: 0.95,
  strokeWidth: 2.2,
  strokePattern: 'solid',
};

export const defaultProjectState: ProjectState = {
  version: '1.0.0',
  map: {
    center: [129.36, 36.03],
    zoom: 10,
    baseMap: 'carto-light',
    baseOpacity: 0.95,
    darkBase: false,
    tone: {
      preserveOriginalColors: true,
      brightness: 1,
      contrast: 1,
      saturation: 1,
      grayscale: 0,
      sepia: 0,
      hueRotate: 0,
    },
    content: {
      labels: true,
      roads: true,
      terrain: false,
      poi: false,
      seaBoundaries: false,
    },
  },
  highlight: {
    preset: 'proposal',
    darkOverlay: true,
    darkOverlayOpacity: 0.22,
    dimOthers: true,
    dimOpacity: 0.1,
    grayscaleOthers: false,
    othersFillColor: '#EFF6FF',
    othersStrokeColor: '#CBD5E1',
    othersStrokeOpacity: 0.22,
    othersStrokeWidth: 0.6,
    hideOtherBoundaries: false,
    selectedHalo: true,
    haloColor: '#FFFFFF',
    haloWidth: 5,
    landBoundaryOnly: true,
  },
  adminLayer: {
    level: 'emd',
    visible: true,
    selectedCodes: [],
    style: defaultStyle,
    regionStyles: {},
  },
  compareLayer: {
    enabled: true,
    level: 'sigungu',
    strokeColor: '#0F172A',
    strokeOpacity: 0.45,
    strokeWidth: 1.4,
    fillOpacity: 0,
    labels: false,
    labelFontFamily: 'Pretendard',
    labelFontSize: 11,
    labelFontColor: '#0F172A',
    labelOpacity: 0.78,
    labelBackground: false,
    labelBackgroundColor: '#FFFFFF',
    labelBackgroundOpacity: 0.9,
  },
  customShapes: [],
  labels: {
    enabled: true,
    scope: 'selected',
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontColor: '#0F172A',
    fontOpacity: 1,
    fontWeight: 'bold',
    numbering: false,
    background: false,
    backgroundColor: '#FFFFFF',
    backgroundOpacity: 0.18,
    outlineColor: '#FFFFFF',
    outlineOpacity: 0.9,
  },
  export: {
    width: 1920,
    height: 1080,
    format: 'svg',
    transparentBackground: false,
    includeBaseMap: true,
    includeLegend: true,
    legendTitle: '지역 구분',
  },
  recentStyles: [],
};

interface ProjectStore {
  project: ProjectState;
  activeAdminCode?: string;
  activeShapeId?: string;
  selectedShapeIds: string[];
  drawMode?: ShapeType;
  shapePointEditMode: boolean;
  fitSelectedRequest: number;
  autosaveStatus: string;
  setProject: (project: ProjectState) => void;
  resetProject: () => void;
  setMapView: (center: [number, number], zoom: number) => void;
  setBaseMap: (baseMap: BaseMapType) => void;
  setAdminLevel: (level: AdminLevel) => void;
  toggleAdminVisible: () => void;
  toggleSelectedCode: (code: string) => void;
  selectSingleCode: (code: string) => void;
  clearSelection: () => void;
  updateAdminStyle: (style: Partial<StyleConfig>) => void;
  updateRegionStyle: (code: string, style: Partial<StyleConfig>) => void;
  applyRegionStyle: (code: string, style: StyleConfig) => void;
  applyStyleToAllSelected: (style: StyleConfig) => void;
  updateSelectedStyles: (style: Partial<StyleConfig>) => void;
  clearSelectedRegionStyles: () => void;
  updateHighlight: (highlight: Partial<ProjectState['highlight']>) => void;
  updateCompareLayer: (compareLayer: Partial<ProjectState['compareLayer']>) => void;
  updateLabels: (labels: Partial<ProjectState['labels']>) => void;
  updateExport: (exportConfig: Partial<ProjectState['export']>) => void;
  rememberStyle: (style: StyleConfig) => void;
  setDrawMode: (drawMode?: ShapeType) => void;
  setShapePointEditMode: (enabled: boolean) => void;
  addShape: (shape: CustomShape) => void;
  updateShape: (id: string, patch: Partial<CustomShape>) => void;
  updateSelectedShapeStyles: (style: Partial<StyleConfig>) => void;
  applyStyleToSelectedShapes: (style: StyleConfig) => void;
  removeShape: (id: string) => void;
  removeSelectedShapes: () => void;
  setActiveShape: (id?: string) => void;
  toggleSelectedShape: (id: string) => void;
  clearShapeSelection: () => void;
  setActiveAdminCode: (code?: string) => void;
  requestFitSelected: () => void;
}

function normalizeProject(project: ProjectState): ProjectState {
  const labels = { ...defaultProjectState.labels, ...project.labels };
  const compareLayer = { ...defaultProjectState.compareLayer, ...project.compareLayer };
  (Object.keys(defaultProjectState.labels) as Array<keyof typeof defaultProjectState.labels>).forEach((key) => {
    if (labels[key] === undefined) labels[key] = defaultProjectState.labels[key] as never;
  });
  (Object.keys(defaultProjectState.compareLayer) as Array<keyof typeof defaultProjectState.compareLayer>).forEach((key) => {
    if (compareLayer[key] === undefined) compareLayer[key] = defaultProjectState.compareLayer[key] as never;
  });
  if (labels.background && labels.backgroundColor === '#FFFFFF' && labels.backgroundOpacity >= 0.9) {
    labels.background = false;
    labels.backgroundOpacity = defaultProjectState.labels.backgroundOpacity;
  }
  const normalized = {
    ...defaultProjectState,
    ...project,
    map: { ...defaultProjectState.map, ...project.map, tone: { ...defaultProjectState.map.tone, ...project.map?.tone } },
    highlight: { ...defaultProjectState.highlight, ...project.highlight },
    adminLayer: {
      ...defaultProjectState.adminLayer,
      ...project.adminLayer,
      style: { ...defaultProjectState.adminLayer.style, ...project.adminLayer?.style },
      regionStyles: Object.fromEntries(
        Object.entries(project.adminLayer?.regionStyles ?? {}).map(([code, style]) => [
          code,
          { ...defaultProjectState.adminLayer.style, ...style },
        ]),
      ),
    },
    compareLayer,
    labels,
    export: { ...defaultProjectState.export, ...project.export },
    recentStyles: project.recentStyles ?? [],
    customShapes: (project.customShapes ?? []).map((shape) => ({ ...shape, style: { ...shapeDefaultStyle, ...shape.style } })),
  };
  if (normalized.map.baseMap === 'osm' && !project.map?.content) {
    normalized.map.baseMap = 'carto-light';
  }
  return normalized;
}

const withAutosave = (project: ProjectState) => {
  saveProjectToStorage(project);
  return { project, autosaveStatus: `자동 저장됨 ${new Date().toLocaleTimeString('ko-KR')}` };
};

function withRecentStyle(project: ProjectState, style: StyleConfig) {
  const key = (item: StyleConfig) =>
    [
      item.fillColor,
      item.fillOpacity,
      item.fillPattern ?? 'none',
      item.fillPatternColor ?? '',
      item.fillPatternOpacity ?? '',
      item.strokeColor,
      item.strokeOpacity,
      item.strokeWidth,
      item.strokePattern ?? '',
      item.strokeDasharray ?? '',
    ].join('|');
  const nextRecentStyles = [style, ...(project.recentStyles ?? []).filter((item) => key(item) !== key(style))].slice(0, 8);
  return { ...project, recentStyles: nextRecentStyles };
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: normalizeProject(loadProjectFromStorage() ?? defaultProjectState),
  activeAdminCode: undefined,
  selectedShapeIds: [],
  shapePointEditMode: false,
  fitSelectedRequest: 0,
  autosaveStatus: '준비됨',
  setProject: (project) => set(withAutosave(normalizeProject(project))),
  resetProject: () => set(withAutosave(defaultProjectState)),
  setMapView: (center, zoom) =>
    set(({ project }) => {
      const centerChanged =
        Math.abs(project.map.center[0] - center[0]) > 0.000001 ||
        Math.abs(project.map.center[1] - center[1]) > 0.000001;
      const zoomChanged = Math.abs(project.map.zoom - zoom) > 0.001;
      if (!centerChanged && !zoomChanged) return {};
      return withAutosave({ ...project, map: { ...project.map, center, zoom } });
    }),
  setBaseMap: (baseMap) =>
    set(({ project }) => withAutosave({ ...project, map: { ...project.map, baseMap } })),
  setAdminLevel: (level) =>
    set(({ project }) =>
      withAutosave({
        ...project,
        adminLayer: { ...project.adminLayer, level, selectedCodes: [], regionStyles: {} },
      }),
    ),
  toggleAdminVisible: () =>
    set(({ project }) => withAutosave({ ...project, adminLayer: { ...project.adminLayer, visible: !project.adminLayer.visible } })),
  toggleSelectedCode: (code) =>
    set(({ project }) => {
      const selectedCodes = project.adminLayer.selectedCodes.includes(code)
        ? project.adminLayer.selectedCodes.filter((item) => item !== code)
        : [...project.adminLayer.selectedCodes, code];
      return {
        ...withAutosave({ ...project, adminLayer: { ...project.adminLayer, selectedCodes } }),
        activeAdminCode: selectedCodes.includes(code) ? code : undefined,
      };
    }),
  selectSingleCode: (code) =>
    set(({ project }) => ({
      ...withAutosave({ ...project, adminLayer: { ...project.adminLayer, selectedCodes: [code] } }),
      activeAdminCode: code,
    })),
  clearSelection: () =>
    set(({ project }) => ({
      ...withAutosave({ ...project, adminLayer: { ...project.adminLayer, selectedCodes: [] } }),
      activeAdminCode: undefined,
    })),
  updateAdminStyle: (style) =>
    set(({ project }) => {
      const nextStyle = { ...project.adminLayer.style, ...style };
      return withAutosave(withRecentStyle({ ...project, adminLayer: { ...project.adminLayer, style: nextStyle } }, nextStyle));
    }),
  updateRegionStyle: (code, style) =>
    set(({ project }) => {
      const nextStyle = { ...(project.adminLayer.regionStyles[code] ?? project.adminLayer.style), ...style };
      return withAutosave(
        withRecentStyle({
          ...project,
        adminLayer: {
          ...project.adminLayer,
          regionStyles: {
            ...project.adminLayer.regionStyles,
              [code]: nextStyle,
          },
        },
        }, nextStyle),
      );
    }),
  applyRegionStyle: (code, style) =>
    set(({ project }) =>
      withAutosave(withRecentStyle({
        ...project,
        adminLayer: {
          ...project.adminLayer,
          regionStyles: { ...project.adminLayer.regionStyles, [code]: style },
        },
      }, style)),
    ),
  applyStyleToAllSelected: (style) =>
    set(({ project }) => {
      const regionStyles = { ...project.adminLayer.regionStyles };
      project.adminLayer.selectedCodes.forEach((code) => {
        regionStyles[code] = style;
      });
      return withAutosave(withRecentStyle({ ...project, adminLayer: { ...project.adminLayer, regionStyles } }, style));
    }),
  updateSelectedStyles: (style) =>
    set(({ project, activeAdminCode }) => {
      const targetCodes = project.adminLayer.selectedCodes.length > 0 ? project.adminLayer.selectedCodes : activeAdminCode ? [activeAdminCode] : [];
      const nextDefaultStyle = targetCodes.length === 0 ? { ...project.adminLayer.style, ...style } : project.adminLayer.style;
      const regionStyles = { ...project.adminLayer.regionStyles };
      targetCodes.forEach((code) => {
        regionStyles[code] = { ...(regionStyles[code] ?? project.adminLayer.style), ...style };
      });
      const rememberedStyle = targetCodes.length > 0 ? regionStyles[targetCodes[0]] : nextDefaultStyle;
      return withAutosave(
        withRecentStyle(
          { ...project, adminLayer: { ...project.adminLayer, style: nextDefaultStyle, regionStyles } },
          rememberedStyle,
        ),
      );
    }),
  clearSelectedRegionStyles: () =>
    set(({ project, activeAdminCode }) => {
      const targetCodes = project.adminLayer.selectedCodes.length > 0 ? project.adminLayer.selectedCodes : activeAdminCode ? [activeAdminCode] : [];
      if (targetCodes.length === 0) return {};
      const regionStyles = { ...project.adminLayer.regionStyles };
      targetCodes.forEach((code) => {
        delete regionStyles[code];
      });
      return withAutosave({ ...project, adminLayer: { ...project.adminLayer, regionStyles } });
    }),
  updateHighlight: (highlight) =>
    set(({ project }) => withAutosave({ ...project, highlight: { ...project.highlight, ...highlight } })),
  updateCompareLayer: (compareLayer) =>
    set(({ project }) => withAutosave({ ...project, compareLayer: { ...project.compareLayer, ...compareLayer } })),
  updateLabels: (labels) =>
    set(({ project }) => withAutosave({ ...project, labels: { ...project.labels, ...labels } })),
  updateExport: (exportConfig) =>
    set(({ project }) => withAutosave({ ...project, export: { ...project.export, ...exportConfig } })),
  rememberStyle: (style) => set(({ project }) => withAutosave(withRecentStyle(project, style))),
  setDrawMode: (drawMode) => set({ drawMode, shapePointEditMode: drawMode ? false : false }),
  setShapePointEditMode: (shapePointEditMode) => set({ shapePointEditMode, drawMode: undefined }),
  addShape: (shape) =>
    set(({ project }) => withAutosave({ ...project, customShapes: [...project.customShapes, shape] })),
  updateShape: (id, patch) =>
    set(({ project }) =>
      withAutosave({
        ...project,
        customShapes: project.customShapes.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)),
      }),
    ),
  updateSelectedShapeStyles: (style) =>
    set(({ project, activeShapeId, selectedShapeIds }) => {
      const targetIds = selectedShapeIds.length > 0 ? selectedShapeIds : activeShapeId ? [activeShapeId] : [];
      if (targetIds.length === 0) return {};
      const nextProject = {
        ...project,
        customShapes: project.customShapes.map((shape) =>
          targetIds.includes(shape.id) ? { ...shape, style: { ...shape.style, ...style } } : shape,
        ),
      };
      const firstStyle = nextProject.customShapes.find((shape) => targetIds.includes(shape.id))?.style;
      return withAutosave(firstStyle ? withRecentStyle(nextProject, firstStyle) : nextProject);
    }),
  applyStyleToSelectedShapes: (style) =>
    set(({ project, activeShapeId, selectedShapeIds }) => {
      const targetIds = selectedShapeIds.length > 0 ? selectedShapeIds : activeShapeId ? [activeShapeId] : [];
      if (targetIds.length === 0) return {};
      return withAutosave(
        withRecentStyle({
          ...project,
          customShapes: project.customShapes.map((shape) => (targetIds.includes(shape.id) ? { ...shape, style } : shape)),
        }, style),
      );
    }),
  removeShape: (id) =>
    set(({ project, activeShapeId, selectedShapeIds, shapePointEditMode }) => ({
      ...withAutosave({ ...project, customShapes: project.customShapes.filter((shape) => shape.id !== id) }),
      activeShapeId: activeShapeId === id ? undefined : activeShapeId,
      selectedShapeIds: selectedShapeIds.filter((item) => item !== id),
      shapePointEditMode: activeShapeId === id ? false : shapePointEditMode,
    })),
  removeSelectedShapes: () =>
    set(({ project, activeShapeId, selectedShapeIds, shapePointEditMode }) => {
      const targetIds = selectedShapeIds.length > 0 ? selectedShapeIds : activeShapeId ? [activeShapeId] : [];
      if (targetIds.length === 0) return {};
      return {
        ...withAutosave({ ...project, customShapes: project.customShapes.filter((shape) => !targetIds.includes(shape.id)) }),
        activeShapeId: targetIds.includes(activeShapeId ?? '') ? undefined : activeShapeId,
        selectedShapeIds: [],
        shapePointEditMode: targetIds.includes(activeShapeId ?? '') ? false : shapePointEditMode,
      };
    }),
  setActiveShape: (activeShapeId) => set({ activeShapeId, selectedShapeIds: activeShapeId ? [activeShapeId] : [] }),
  toggleSelectedShape: (id) =>
    set(({ selectedShapeIds }) => {
      const nextIds = selectedShapeIds.includes(id) ? selectedShapeIds.filter((item) => item !== id) : [...selectedShapeIds, id];
      return { selectedShapeIds: nextIds, activeShapeId: nextIds.includes(id) ? id : nextIds[nextIds.length - 1] };
    }),
  clearShapeSelection: () => set({ activeShapeId: undefined, selectedShapeIds: [], shapePointEditMode: false }),
  setActiveAdminCode: (activeAdminCode) => set({ activeAdminCode }),
  requestFitSelected: () => set((state) => ({ fitSelectedRequest: state.fitSelectedRequest + 1 })),
}));
