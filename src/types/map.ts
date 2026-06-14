import type { Coordinate } from 'ol/coordinate';

export interface MapStatus {
  center: Coordinate;
  lonLat: [number, number];
  zoom: number;
}
