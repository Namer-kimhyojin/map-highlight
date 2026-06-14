export type BaseMapType =
  | 'blank'
  | 'osm'
  | 'carto-light'
  | 'carto-voyager'
  | 'carto-dark'
  | 'esri-imagery'
  | 'esri-topographic'
  | 'esri-terrain'
  | 'vworld-normal'
  | 'vworld-satellite';

export interface BackgroundContentConfig {
  labels: boolean;
  roads: boolean;
  terrain: boolean;
  poi: boolean;
  seaBoundaries: boolean;
}

export interface MapToneConfig {
  preserveOriginalColors: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
}

export type AdminLevel = 'sido' | 'sigungu' | 'emd';

export type ShapeType = 'polygon' | 'rectangle' | 'circle' | 'line' | 'point';

export interface StyleConfig {
  fillColor: string;
  fillOpacity: number;
  fillPattern?: 'none' | 'diagonal' | 'cross' | 'dots' | 'grid' | 'horizontal';
  fillPatternColor?: string;
  fillPatternOpacity?: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokePattern?: 'solid' | 'dashed' | 'dotted' | 'long-dashed' | 'dash-dot' | 'double' | 'double-dashed';
  strokeDasharray?: string;
}

export interface LabelConfig {
  enabled: boolean;
  scope: 'selected' | 'all';
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontOpacity: number;
  fontWeight: 'normal' | 'bold';
  numbering: boolean;
  background: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineOpacity: number;
}

export interface ExportConfig {
  width: number;
  height: number;
  format: 'svg' | 'png';
  transparentBackground: boolean;
  includeBaseMap: boolean;
  includeLegend: boolean;
  legendTitle: string;
}

export interface CustomShape {
  id: string;
  type: ShapeType;
  name: string;
  geometry: GeoJSON.Geometry;
  style: StyleConfig;
}

export interface ProjectState {
  version: string;
  map: {
    center: [number, number];
    zoom: number;
    baseMap: BaseMapType;
    baseOpacity: number;
    darkBase: boolean;
    tone: MapToneConfig;
    content: BackgroundContentConfig;
  };
  highlight: {
    preset: 'proposal' | 'analysis' | 'minimal' | 'risk';
    darkOverlay: boolean;
    darkOverlayOpacity: number;
    dimOthers: boolean;
    dimOpacity: number;
    grayscaleOthers: boolean;
    othersFillColor: string;
    othersStrokeColor: string;
    othersStrokeOpacity: number;
    othersStrokeWidth: number;
    hideOtherBoundaries: boolean;
    selectedHalo: boolean;
    haloColor: string;
    haloWidth: number;
    landBoundaryOnly: boolean;
  };
  adminLayer: {
    level: AdminLevel;
    visible: boolean;
    selectedCodes: string[];
    style: StyleConfig;
    regionStyles: Record<string, StyleConfig>;
  };
  compareLayer: {
    enabled: boolean;
    level: AdminLevel;
    strokeColor: string;
    strokeOpacity: number;
    strokeWidth: number;
    fillOpacity: number;
    labels: boolean;
    labelFontFamily: string;
    labelFontSize: number;
    labelFontColor: string;
    labelOpacity: number;
    labelBackground: boolean;
    labelBackgroundColor: string;
    labelBackgroundOpacity: number;
  };
  industrialLayer: {
    visible: boolean;
    selectedId?: string;
    displayMode: 'marker' | 'area' | 'both';
    markerColor: string;
    markerOpacity: number;
    labelVisible: boolean;
  };
  customShapes: CustomShape[];
  labels: LabelConfig;
  export: ExportConfig;
  recentStyles: StyleConfig[];
}

export interface IndustrialParkInfo {
  id: string;
  name: string;
  type: string;
  address: string;
  municipality: string;
  status?: string;
  coordinates: [number, number];
  geometry: GeoJSON.Geometry;
}

export interface AdminFeatureInfo {
  code: string;
  name: string;
  level: AdminLevel;
}
