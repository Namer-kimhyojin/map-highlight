export type AdminFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  {
    code?: string | number;
    name?: string;
    level?: string;
    [key: string]: unknown;
  }
>;
