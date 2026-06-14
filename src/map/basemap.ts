import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import type { BackgroundContentConfig, BaseMapType } from '../types/project';

function xyz(url: string) {
  return new XYZ({ url, crossOrigin: 'anonymous' });
}

function tile(url: string, opacity = 1) {
  return new TileLayer({ source: xyz(url), opacity, className: 'ol-layer base-map-layer' });
}

function carto(kind: 'light' | 'voyager' | 'dark', content: BackgroundContentConfig) {
  const prefix = kind === 'light' ? 'light' : kind === 'dark' ? 'dark' : 'voyager';
  const baseVariant = content.roads ? `${prefix}_nolabels` : 'light_nolabels';
  const layers = [tile(`https://{a-c}.basemaps.cartocdn.com/rastertiles/${baseVariant}/{z}/{x}/{y}.png`)];
  if (content.terrain) {
    layers.push(tile('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', 0.28));
  }
  if (content.labels) {
    layers.push(tile(`https://{a-c}.basemaps.cartocdn.com/rastertiles/${prefix}_only_labels/{z}/{x}/{y}.png`, content.poi ? 0.95 : 0.75));
  }
  return layers;
}

function esriReferenceLayers(content: BackgroundContentConfig) {
  const layers: TileLayer<XYZ>[] = [];
  if (content.terrain) {
    layers.push(tile('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', 0.25));
  }
  if (content.labels || content.poi) {
    layers.push(tile('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', content.poi ? 0.9 : 0.7));
  }
  return layers;
}

export function createBaseLayers(type: BaseMapType, content: BackgroundContentConfig) {
  if (type === 'blank') return [];

  if (type === 'osm' && !content.seaBoundaries) return carto('light', content);

  if (type === 'carto-light') return carto('light', content);
  if (type === 'carto-voyager') return carto('voyager', content);
  if (type === 'carto-dark') return carto('dark', content);

  if (type === 'esri-imagery' || type === 'vworld-satellite') {
    return [
      tile('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
      ...esriReferenceLayers(content),
    ];
  }

  if (type === 'esri-topographic') {
    return [tile('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}')];
  }

  if (type === 'esri-terrain') {
    return [
      tile('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'),
      ...esriReferenceLayers({ ...content, terrain: false }),
    ];
  }

  return [new TileLayer({ source: new OSM({ crossOrigin: 'anonymous' }), className: 'ol-layer base-map-layer' })];
}
