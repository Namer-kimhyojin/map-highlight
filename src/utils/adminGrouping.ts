import type { AdminFeatureInfo } from '../types/project';

export interface AdminFeatureGroup {
  type: 'group';
  code: string;
  name: string;
  codes: string[];
  memberNames: string[];
}

export type AdminSearchResult = (AdminFeatureInfo & { type: 'feature' }) | AdminFeatureGroup;

function cityGroupName(name: string) {
  const normalized = name.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.+시)\s+.+구$/);
  return match?.[1];
}

export function buildCityGroups(features: AdminFeatureInfo[], level: string): AdminFeatureGroup[] {
  if (level !== 'sigungu') return [];

  const grouped = new globalThis.Map<string, AdminFeatureInfo[]>();
  features.forEach((feature) => {
    const name = cityGroupName(feature.name);
    if (!name) return;
    grouped.set(name, [...(grouped.get(name) ?? []), feature]);
  });

  return Array.from(grouped.entries())
    .filter(([, members]) => members.length > 1)
    .map(([name, members]) => ({
      type: 'group' as const,
      code: `group:${name}`,
      name,
      codes: members.map((member) => member.code),
      memberNames: members.map((member) => member.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

function scoreName(name: string, code: string, term: string, isGroup: boolean) {
  const normalizedTerm = term.replace(/\s+/g, ' ').trim();
  if (name === normalizedTerm || `${name} 전체` === normalizedTerm) return 0;
  if (isGroup && normalizedTerm.endsWith('전체') && `${name} 전체`.startsWith(normalizedTerm)) return 1;
  if (name.startsWith(normalizedTerm)) return isGroup ? 2 : 3;
  if (code === normalizedTerm) return 4;
  if (name.includes(normalizedTerm)) return isGroup ? 5 : 6;
  if (code.includes(normalizedTerm)) return 7;
  return Number.POSITIVE_INFINITY;
}

export function searchAdminFeatures(
  features: AdminFeatureInfo[],
  level: string,
  query: string,
  limit = 8,
): AdminSearchResult[] {
  const term = query.trim();
  if (!term) return [];

  const cityGroups = buildCityGroups(features, level).map((group) => ({
    item: group as AdminSearchResult,
    score: scoreName(group.name, group.code, term, true),
  }));
  const featureMatches = features.map((feature) => ({
    item: { ...feature, type: 'feature' as const } as AdminSearchResult,
    score: scoreName(feature.name, feature.code, term, false),
  }));

  return [...cityGroups, ...featureMatches]
    .filter((result) => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name, 'ko'))
    .slice(0, limit)
    .map((result) => result.item);
}
