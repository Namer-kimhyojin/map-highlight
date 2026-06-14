import type { FeatureCollection, Geometry, Point, Position } from 'geojson';
import type { IndustrialParkInfo } from '../types/project';

type IndustrialParkFeatureCollection = FeatureCollection<Geometry, {
  id: string;
  name: string;
  type: string;
  address: string;
  municipality: string;
  status?: string;
  center?: [number, number];
}>;

function getGeometryCenter(geometry: Geometry, fallback?: [number, number]): [number, number] {
  if (geometry.type === 'Point') return geometry.coordinates as [number, number];
  if (fallback) return fallback;

  const positions: Position[] = [];
  function collect(value: unknown): void {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      positions.push(value as Position);
      return;
    }
    value.forEach(collect);
  }
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((item) => collect('coordinates' in item ? item.coordinates : []));
  }
  else {
    collect(geometry.coordinates);
  }
  if (positions.length === 0) return [129.36, 36.03];
  const total = positions.reduce(
    (acc, position) => [acc[0] + Number(position[0]), acc[1] + Number(position[1])],
    [0, 0],
  );
  return [total[0] / positions.length, total[1] / positions.length];
}

export async function loadIndustrialParks(): Promise<IndustrialParkInfo[]> {
  const baseUrl = import.meta.env.BASE_URL;
  const response = await fetch(`${baseUrl}data/industrial_parks_pohang.geojson`);
  if (!response.ok) throw new Error('산업단지 데이터 파일을 찾을 수 없습니다.');
  const data = (await response.json()) as IndustrialParkFeatureCollection;
  return data.features.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    type: feature.properties.type,
    address: feature.properties.address,
    municipality: feature.properties.municipality,
    status: feature.properties.status,
    coordinates: getGeometryCenter(feature.geometry, feature.properties.center),
    geometry: feature.geometry,
  }));
}

function searchScore(park: IndustrialParkInfo, term: string) {
  const haystack = `${park.name} ${park.type} ${park.address} ${park.municipality} ${park.status ?? ''}`;
  if (park.name === term) return 0;
  if (park.name.startsWith(term)) return 1;
  if (park.address.includes(term)) return 2;
  if (park.type.includes(term)) return 3;
  if (haystack.includes(term)) return 4;
  return Number.POSITIVE_INFINITY;
}

export function searchIndustrialParks(parks: IndustrialParkInfo[], query: string, limit = 8) {
  const term = query.trim();
  if (!term) return parks.slice(0, limit);
  return parks
    .map((park) => ({ park, score: searchScore(park, term) }))
    .filter((result) => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.park.name.localeCompare(b.park.name, 'ko'))
    .slice(0, limit)
    .map((result) => result.park);
}
