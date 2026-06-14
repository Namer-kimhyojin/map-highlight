import type { FeatureCollection, Point } from 'geojson';
import type { IndustrialParkInfo } from '../types/project';

type IndustrialParkFeatureCollection = FeatureCollection<Point, {
  id: string;
  name: string;
  type: string;
  address: string;
  municipality: string;
  status?: string;
}>;

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
    coordinates: feature.geometry.coordinates as [number, number],
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
