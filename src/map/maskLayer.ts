import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Style } from 'ol/style';
import type { FeatureLike } from 'ol/Feature';
import type { ProjectState } from '../types/project';

export function createMaskLayer(project: ProjectState) {
  return new VectorLayer({
    source: new VectorSource(),
    style: new Style({
      fill: new Fill({ color: `rgba(15, 23, 42, ${project.highlight.darkOverlayOpacity})` }),
    }),
    visible: project.highlight.darkOverlay,
  });
}

export function updateMaskLayer(layer: VectorLayer<VectorSource<FeatureLike>>, selectedFeatures: Feature[], project: ProjectState) {
  const source = layer.getSource();
  if (!source) return;
  source.clear();
  layer.setVisible(project.highlight.darkOverlay && selectedFeatures.length > 0);
  layer.setStyle(
    new Style({
      fill: new Fill({ color: `rgba(15, 23, 42, ${project.highlight.darkOverlayOpacity})` }),
    }),
  );
  if (!project.highlight.darkOverlay || selectedFeatures.length === 0) return;
  const world = [
    [-20037508.342789244, -20037508.342789244],
    [20037508.342789244, -20037508.342789244],
    [20037508.342789244, 20037508.342789244],
    [-20037508.342789244, 20037508.342789244],
    [-20037508.342789244, -20037508.342789244],
  ];
  const holes = selectedFeatures.flatMap((feature) => {
    const geometry = feature.getGeometry();
    if (geometry instanceof Polygon) return [geometry.getCoordinates()[0]];
    if (geometry?.getType() === 'MultiPolygon') {
      return (geometry as import('ol/geom/MultiPolygon').default).getCoordinates().map((polygon) => polygon[0]);
    }
    return [];
  });
  source.addFeature(new Feature(new Polygon([world, ...holes])));
}
