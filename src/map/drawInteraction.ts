import Draw, { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import type VectorSource from 'ol/source/Vector';
import type { ShapeType } from '../types/project';

export function createDrawInteraction(source: VectorSource, type: ShapeType) {
  if (type === 'rectangle') {
    return new Draw({ source, type: 'Circle', geometryFunction: createBox() });
  }
  if (type === 'circle') {
    return new Draw({ source, type: 'Circle', geometryFunction: createRegularPolygon(96) });
  }
  if (type === 'line') {
    return new Draw({ source, type: 'LineString' });
  }
  if (type === 'point') {
    return new Draw({ source, type: 'Point' });
  }
  return new Draw({ source, type: 'Polygon' });
}
