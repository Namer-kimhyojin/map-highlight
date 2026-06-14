import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import type { ProjectState } from '../types/project';

export function initMap(target: HTMLElement, project: ProjectState, layers: import('ol/layer/Layer').default[]) {
  return new Map({
    target,
    layers,
    controls: defaultControls({ attribution: false }).extend([]),
    view: new View({
      center: fromLonLat(project.map.center),
      zoom: project.map.zoom,
    }),
  });
}
