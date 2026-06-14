import type { AdminFeatureCollection } from '../types/geojson';
import type { AdminLevel } from '../types/project';

const levelFileMap: Record<AdminLevel, string> = {
  sido: 'admin_sido.geojson',
  sigungu: 'admin_sigungu.geojson',
  emd: 'admin_emd.geojson',
};

export async function loadAdminGeoJson(level: AdminLevel): Promise<AdminFeatureCollection> {
  const baseUrl = import.meta.env.BASE_URL;
  const candidates = [`${baseUrl}data/${levelFileMap[level]}`, `${baseUrl}data/sample_admin.geojson`];
  for (const path of candidates) {
    const response = await fetch(path);
    if (response.ok) {
      return (await response.json()) as AdminFeatureCollection;
    }
  }
  throw new Error('행정구역 GeoJSON 파일을 찾을 수 없습니다.');
}

export function getFeatureCode(properties?: Record<string, unknown> | null) {
  return String(properties?.code ?? properties?.adm_cd ?? properties?.ADM_CD ?? properties?.id ?? '');
}

export function getFeatureName(properties?: Record<string, unknown> | null) {
  return String(properties?.name ?? properties?.adm_nm ?? properties?.ADM_NM ?? properties?.title ?? '이름 없음');
}
