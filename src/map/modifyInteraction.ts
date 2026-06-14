import Modify from 'ol/interaction/Modify';
import type Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type VectorSource from 'ol/source/Vector';

export function createModifyInteraction(source: VectorSource) {
  return new Modify({ source });
}

export function createPointModifyInteraction(features: Collection<Feature>) {
  return new Modify({ features });
}
