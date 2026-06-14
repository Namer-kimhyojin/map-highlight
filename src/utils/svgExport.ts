import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { union } from '@turf/union';
import type { AdminFeatureCollection } from '../types/geojson';
import type { CustomShape, ProjectState, StyleConfig } from '../types/project';
import { downloadText } from './projectFile';
import { getFeatureCode, getFeatureName, loadAdminGeoJson } from './geojson';
import { isDoubleStroke, svgDashAttribute, svgPatternMarkup } from './stylePatterns';

interface SvgViewportOptions {
  viewportWidth: number;
  viewportHeight: number;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function shapeFeature(shape: CustomShape): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: shape.geometry,
    properties: {
      id: shape.id,
      name: shape.name,
      type: shape.type,
    },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimateTextWidth(text: string, fontSize: number) {
  const wideChars = Array.from(text).filter((char) => char.charCodeAt(0) > 255).length;
  return text.length * fontSize * 0.48 + wideChars * fontSize * 0.22;
}

function stylePatternKey(style: StyleConfig) {
  return [
    style.fillPattern ?? 'none',
    style.fillColor,
    style.fillOpacity,
    style.fillPatternColor ?? '',
    style.fillPatternOpacity ?? '',
  ].join('-').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function pointInArtboard(point: [number, number] | null, width: number, height: number): point is [number, number] {
  return Boolean(point && point[0] >= 0 && point[0] <= width && point[1] >= 0 && point[1] <= height);
}

export function buildProjectSvg(
  project: ProjectState,
  adminGeoJson: AdminFeatureCollection | null,
  compareGeoJson: AdminFeatureCollection | null = null,
  viewport?: SvgViewportOptions,
) {
  const width = project.export.width;
  const height = viewport ? Math.max(1, Math.round((project.export.width * viewport.viewportHeight) / viewport.viewportWidth)) : project.export.height;
  const selected = new Set([...project.adminLayer.selectedCodes, ...Object.keys(project.adminLayer.regionStyles)]);
  const adminFeatures = adminGeoJson?.features ?? [];
  const compareFeatures = project.compareLayer.enabled ? compareGeoJson?.features ?? [] : [];
  const selectedFeatures = adminFeatures.filter((feature) => selected.has(getFeatureCode(feature.properties)));
  const hideOtherBoundaries = project.highlight.hideOtherBoundaries && selectedFeatures.length > 0;
  const shapeFeatures = project.customShapes.map(shapeFeature);
  const exportFeatures = selectedFeatures.length > 0 ? selectedFeatures : adminFeatures;
  const projectionFeatures = [...exportFeatures, ...shapeFeatures, ...compareFeatures];
  const projectionCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: projectionFeatures.length ? projectionFeatures : adminFeatures,
  };
  const outerMargin = viewport ? 0 : clamp(Math.min(width, height) * 0.07, 56, 120);
  const projection = viewport
    ? geoMercator()
        .center(project.map.center)
        .scale(((256 * 2 ** project.map.zoom) / (2 * Math.PI)) * (width / viewport.viewportWidth))
        .translate([width / 2, height / 2])
        .clipExtent([[0, 0], [width, height]])
    : geoMercator().fitExtent(
        [
          [outerMargin, outerMargin],
          [width - outerMargin, height - outerMargin],
        ],
        projectionCollection,
      );
  const path = geoPath(projection);
  const patternDefs: string[] = [];
  const patternIds = new Set<string>();
  const fillValue = (style: StyleConfig, idSeed: string) => {
    if (!style.fillPattern || style.fillPattern === 'none') return style.fillColor;
    const id = `pattern-${idSeed}-${stylePatternKey(style)}`;
    if (!patternIds.has(id)) {
      patternIds.add(id);
      patternDefs.push(svgPatternMarkup(id, style));
    }
    return `url(#${id})`;
  };

  const defs = `<defs>
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.16"/>
    </filter>
    <filter id="label-shadow" x="-20%" y="-40%" width="140%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0F172A" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="paper-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EEF6FF"/>
    </linearGradient>
    <style>
      <![CDATA[
        .admin-boundary,
        .compare-boundary,
        .highlight-region,
        .custom-shape {
          shape-rendering: geometricPrecision;
        }
        .admin-label,
        .compare-label {
          paint-order: stroke fill;
        }
      ]]>
    </style>
    <clipPath id="artboard-clip">
      <rect x="0" y="0" width="${width}" height="${height}" rx="0"/>
    </clipPath>
  </defs>`;
  const background = project.export.transparentBackground
    ? ''
    : `<rect width="${width}" height="${height}" fill="url(#paper-gradient)"/>
    <rect x="${outerMargin * 0.42}" y="${outerMargin * 0.42}" width="${width - outerMargin * 0.84}" height="${height - outerMargin * 0.84}" rx="18" fill="#FFFFFF" fill-opacity="0.42" stroke="#D8E5F2" stroke-opacity="0.7"/>`;
  const selectedMaskPaths = selectedFeatures.map((feature) => path(feature as GeoJSON.Feature) || '').join(' ');
  const darkMask =
    project.highlight.darkOverlay && selectedMaskPaths
      ? `<path d="M0,0 H${width} V${height} H0 Z ${selectedMaskPaths}" fill="#111827" fill-opacity="${project.highlight.darkOverlayOpacity}" fill-rule="evenodd"/>`
        : project.highlight.darkOverlay
        ? `<rect width="${width}" height="${height}" fill="#111827" fill-opacity="${project.highlight.darkOverlayOpacity}"/>`
        : '';
  const compareBoundaries = compareFeatures
    .map((feature) => {
      const code = getFeatureCode(feature.properties);
      const name = getFeatureName(feature.properties);
      const d = path(feature as GeoJSON.Feature) || '';
      if (!d) return '';
      return `<path id="compare-${escapeXml(code)}" class="compare-boundary" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" d="${d}" fill="#FFFFFF" fill-opacity="${project.compareLayer.fillOpacity}" stroke="${project.compareLayer.strokeColor}" stroke-opacity="${project.compareLayer.strokeOpacity}" stroke-width="${project.compareLayer.strokeWidth}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    })
    .join('\n');
  const compareLabels =
    project.compareLayer.labels && compareFeatures.length > 0
      ? compareFeatures
          .map((feature) => {
            const code = getFeatureCode(feature.properties);
            const name = getFeatureName(feature.properties);
            const point = projection(geoCentroid(feature as GeoJSON.Feature));
            if (!pointInArtboard(point, width, height)) return '';
            const labelWidth = Math.max(42, name.length * project.compareLayer.labelFontSize * 0.64 + 14);
            const labelHeight = project.compareLayer.labelFontSize * 1.65;
            const labelBackground = project.compareLayer.labelBackground
              ? `<rect x="${(point[0] - labelWidth / 2).toFixed(2)}" y="${(point[1] - labelHeight / 2).toFixed(2)}" width="${labelWidth.toFixed(2)}" height="${labelHeight.toFixed(2)}" rx="${(labelHeight / 2).toFixed(2)}" fill="${project.compareLayer.labelBackgroundColor}" fill-opacity="${project.compareLayer.labelBackgroundOpacity}" filter="url(#label-shadow)"/>`
              : '';
            return `${labelBackground}<text id="compare-label-${escapeXml(code)}" class="compare-label" data-code="${escapeXml(code)}" x="${point[0].toFixed(2)}" y="${point[1].toFixed(2)}" fill="${project.compareLayer.labelFontColor}" fill-opacity="${project.compareLayer.labelOpacity}" font-family="${project.compareLayer.labelFontFamily}, Pretendard, Arial, sans-serif" font-size="${project.compareLayer.labelFontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeXml(name)}</text>`;
          })
          .join('\n')
      : '';
  const boundaries = adminFeatures
    .map((feature) => {
      const code = getFeatureCode(feature.properties);
      const name = getFeatureName(feature.properties);
      const d = path(feature as GeoJSON.Feature) || '';
      if (!d) return '';
      const fill = project.highlight.landBoundaryOnly ? 'none' : project.highlight.othersFillColor;
      const fillOpacity = project.highlight.landBoundaryOnly ? '0' : String(project.highlight.dimOpacity);
      const strokeOpacity = hideOtherBoundaries ? 0 : project.highlight.othersStrokeOpacity;
      const strokeWidth = hideOtherBoundaries ? 0 : project.highlight.othersStrokeWidth;
      return `<path id="boundary-${escapeXml(code)}" class="admin-boundary" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" d="${d}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${project.highlight.othersStrokeColor}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    })
    .join('\n');
  const selectedStyleGroups = new Map<string, typeof selectedFeatures>();
  selectedFeatures.forEach((feature) => {
    const code = getFeatureCode(feature.properties);
    const style = project.adminLayer.regionStyles[code] ?? project.adminLayer.style;
    const key = [
      style.fillColor,
      style.fillOpacity,
      style.strokeColor,
      style.strokeOpacity,
      style.strokeWidth,
      style.strokePattern ?? '',
      style.strokeDasharray ?? '',
      style.fillPattern ?? '',
      style.fillPatternColor ?? '',
      style.fillPatternOpacity ?? '',
    ].join('|');
    selectedStyleGroups.set(key, [...(selectedStyleGroups.get(key) ?? []), feature]);
  });
  const highlightFills = Array.from(selectedStyleGroups.values())
    .map((features, index) => {
      const firstCode = getFeatureCode(features[0].properties);
      const firstName = getFeatureName(features[0].properties);
      const style = project.adminLayer.regionStyles[firstCode] ?? project.adminLayer.style;
      const merged =
        features.length > 1
          ? union({ type: 'FeatureCollection', features } as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>)
          : features[0];
      const d = path(merged as GeoJSON.Feature) || '';
      if (!d) return '';
      const fill = fillValue(style, `highlight-${index + 1}`);
      return `<path id="highlight-fill-group-${index + 1}" class="highlight-fill" data-name="${escapeXml(firstName)}" d="${d}" fill="${fill}" fill-opacity="${style.fillPattern && style.fillPattern !== 'none' ? 1 : style.fillOpacity}" stroke="none" filter="url(#soft-shadow)"/>`;
    })
    .join('\n');
  const highlightOutlineCasings = project.highlight.selectedHalo
    ? selectedFeatures
        .map((feature) => {
          const code = getFeatureCode(feature.properties);
          const name = getFeatureName(feature.properties);
          const d = path(feature as GeoJSON.Feature) || '';
          if (!d) return '';
          const style = project.adminLayer.regionStyles[code] ?? project.adminLayer.style;
          return `<path id="halo-${escapeXml(code)}" class="highlight-halo" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" d="${d}" fill="none" stroke="${project.highlight.haloColor}" stroke-opacity="0.92" stroke-width="${style.strokeWidth + project.highlight.haloWidth}" stroke-linejoin="round" vector-effect="non-scaling-stroke"${svgDashAttribute(style)}/>`;
        })
        .join('\n')
    : '';
  const highlightOutlines = selectedFeatures
    .map((feature) => {
      const code = getFeatureCode(feature.properties);
      const name = getFeatureName(feature.properties);
      const d = path(feature as GeoJSON.Feature) || '';
      if (!d) return '';
      const style = project.adminLayer.regionStyles[code] ?? project.adminLayer.style;
      const doubleInner = isDoubleStroke(style)
        ? `<path id="admin-inner-${escapeXml(code)}" class="highlight-region inner" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="0.96" stroke-width="${Math.max(1, style.strokeWidth * 0.45)}" stroke-linejoin="round" vector-effect="non-scaling-stroke"${svgDashAttribute(style)}/>`
        : '';
      return `<path id="admin-${escapeXml(code)}" class="highlight-region" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" d="${d}" fill="none" stroke="${style.strokeColor}" stroke-opacity="${style.strokeOpacity}" stroke-width="${style.strokeWidth}" stroke-linejoin="round" vector-effect="non-scaling-stroke"${svgDashAttribute(style)}/>${doubleInner}`;
    })
    .join('\n');
  const shapes = project.customShapes
    .map((shape) => {
      const d = path(shapeFeature(shape)) || '';
      if (!d) return '';
      const isLine = shape.type === 'line';
      const fill = isLine ? 'none' : fillValue(shape.style, escapeXml(shape.id));
      const fillOpacity = isLine ? 0 : shape.style.fillPattern && shape.style.fillPattern !== 'none' ? 1 : shape.style.fillOpacity;
      const doubleInner = isDoubleStroke(shape.style)
        ? `<path id="${escapeXml(shape.id)}-inner" class="custom-shape-inner ${escapeXml(shape.type)}" data-name="${escapeXml(shape.name)}" d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="0.96" stroke-width="${Math.max(1, shape.style.strokeWidth * 0.45)}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${svgDashAttribute(shape.style)}/>`
        : '';
      return `<path id="${escapeXml(shape.id)}" class="custom-shape ${escapeXml(shape.type)}" data-name="${escapeXml(shape.name)}" d="${d}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${shape.style.strokeColor}" stroke-opacity="${shape.style.strokeOpacity}" stroke-width="${shape.style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${svgDashAttribute(shape.style)}/>${doubleInner}`;
    })
    .join('\n');
  const labelFeatures = project.labels.scope === 'all' ? adminFeatures : selectedFeatures;
  const labels = project.labels.enabled
    ? labelFeatures
        .map((feature) => {
          const code = getFeatureCode(feature.properties);
          const name = getFeatureName(feature.properties);
          const point = projection(geoCentroid(feature as GeoJSON.Feature));
          if (!pointInArtboard(point, width, height)) return '';
          const selectedIndex = project.adminLayer.selectedCodes.indexOf(code);
          const text = `${project.labels.numbering && selectedIndex >= 0 ? `${selectedIndex + 1}. ` : ''}${name}`;
          const labelWidth = Math.max(46, text.length * project.labels.fontSize * 0.68 + 18);
          const labelHeight = project.labels.fontSize * 1.7;
          const labelBackground = project.labels.background
            ? `<rect x="${(point[0] - labelWidth / 2).toFixed(2)}" y="${(point[1] - labelHeight / 2).toFixed(2)}" width="${labelWidth.toFixed(2)}" height="${labelHeight.toFixed(2)}" rx="${(labelHeight / 2).toFixed(2)}" fill="${project.labels.backgroundColor}" fill-opacity="${Math.min(project.labels.backgroundOpacity, 0.28)}" stroke="none"/>`
            : '';
          return `${labelBackground}<text id="label-${escapeXml(code)}" class="admin-label" data-code="${escapeXml(code)}" data-name="${escapeXml(name)}" x="${point[0].toFixed(2)}" y="${point[1].toFixed(2)}" fill="${project.labels.fontColor}" fill-opacity="${project.labels.fontOpacity}" stroke="${project.labels.outlineColor}" stroke-opacity="${project.labels.outlineOpacity}" stroke-width="3" paint-order="stroke fill" font-family="${project.labels.fontFamily}, Pretendard, Arial, sans-serif" font-size="${project.labels.fontSize}" font-weight="${project.labels.fontWeight}" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text>`;
        })
        .join('\n')
    : '';
  const legendLabels = selectedFeatures.map((feature, index) => {
    const code = getFeatureCode(feature.properties);
    const name = getFeatureName(feature.properties);
    return {
      code,
      name,
      text: `${project.labels.numbering ? `${index + 1}. ` : ''}${name}`,
      style: project.adminLayer.regionStyles[code] ?? project.adminLayer.style,
    };
  });
  const maxLegendRows = Math.max(1, Math.floor((height - 112) / 30));
  const legendColumns = Math.max(1, Math.ceil(legendLabels.length / maxLegendRows));
  const longestLegendText = [project.export.legendTitle, ...legendLabels.map((item) => item.text)].reduce(
    (longest, item) => (estimateTextWidth(item, 15) > estimateTextWidth(longest, 15) ? item : longest),
    '',
  );
  const legendColumnWidth = clamp(estimateTextWidth(longestLegendText, 15) + 96, 250, 360);
  const legendRows = Math.min(maxLegendRows, Math.max(1, legendLabels.length));
  const legendWidth = legendColumns * legendColumnWidth + 24;
  const legendHeight = Math.max(86, 58 + legendRows * 30);
  const legendItems = legendLabels.map((item, index) => {
    const column = Math.floor(index / maxLegendRows);
    const row = index % maxLegendRows;
    const x = 34 + column * legendColumnWidth;
    const y = 70 + row * 30;
    const style = item.style;
    return `<g id="legend-item-${escapeXml(item.code)}">
      <rect x="${x}" y="${y - 14}" width="18" height="18" rx="5" fill="${style.fillColor}" fill-opacity="${style.fillOpacity}" stroke="${style.strokeColor}" stroke-width="1.6"/>
      <text x="${x + 28}" y="${y}" fill="#1E293B" font-family="Pretendard, Arial, sans-serif" font-size="14" font-weight="700">${escapeXml(item.text)}</text>
    </g>`;
  }).join('\n');
  const legend = project.export.includeLegend && selectedFeatures.length > 0
    ? `<g id="legend">
      <rect x="24" y="24" width="${legendWidth}" height="${legendHeight}" rx="14" fill="#FFFFFF" fill-opacity="0.96" stroke="#CBD5E1" filter="url(#soft-shadow)"/>
      <rect x="24" y="24" width="6" height="${legendHeight}" rx="3" fill="#2563EB"/>
      <text x="34" y="50" fill="#0F172A" font-family="Pretendard, Arial, sans-serif" font-size="17" font-weight="800">${escapeXml(project.export.legendTitle)}</text>
      ${legendItems}
    </g>`
    : '';
  const selectedNames = selectedFeatures.map((feature) => getFeatureName(feature.properties)).join(', ');
  const title = selectedNames ? `행정구역 강조 지도: ${selectedNames}` : '행정구역 강조 지도';
  const desc = `${project.adminLayer.level} 단위 지도. 강조 ${selectedFeatures.length}개, 도형 ${project.customShapes.length}개.`;
  const generatedAt = new Date().toISOString();
  const defsWithPatterns = defs.replace('    <style>', `${patternDefs.join('\n')}\n    <style>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" preserveAspectRatio="xMidYMid meet">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(desc)}</desc>
  <metadata>
    ${escapeXml(JSON.stringify({
      generator: 'Battery Academy Map Studio',
      generatedAt,
      adminLevel: project.adminLayer.level,
      selectedCodes: project.adminLayer.selectedCodes,
      styledCodes: Object.keys(project.adminLayer.regionStyles),
      compareLayer: project.compareLayer.enabled ? project.compareLayer.level : null,
      exportSize: { width, height },
      viewportExport: viewport
        ? {
            sourceViewport: { width: viewport.viewportWidth, height: viewport.viewportHeight },
            center: project.map.center,
            zoom: project.map.zoom,
          }
        : null,
    }))}
  </metadata>
  ${defsWithPatterns}
  <g id="artboard" clip-path="url(#artboard-clip)">
    <g id="background-map">
      ${background}
    </g>
    <g id="compare-boundaries">
${compareBoundaries}
    </g>
    <g id="admin-boundaries">
${boundaries}
    </g>
    <g id="dark-mask">
      ${darkMask}
    </g>
    <g id="highlight-regions">
${highlightFills}
${highlightOutlineCasings}
${highlightOutlines}
    </g>
    <g id="custom-shapes">
${shapes}
    </g>
    <g id="labels">
${labels}
${compareLabels}
    </g>
  </g>
  ${legend}
</svg>`;
}

export async function downloadSvg(project: ProjectState, adminGeoJson: AdminFeatureCollection | null, mapElement?: HTMLElement | null) {
  const compareGeoJson =
    project.compareLayer.enabled && project.compareLayer.level === project.adminLayer.level
      ? adminGeoJson
      : project.compareLayer.enabled
      ? await loadAdminGeoJson(project.compareLayer.level).catch(() => null)
      : null;
  const viewportRect = mapElement?.getBoundingClientRect();
  const viewport =
    viewportRect && viewportRect.width > 0 && viewportRect.height > 0
      ? { viewportWidth: viewportRect.width, viewportHeight: viewportRect.height }
      : undefined;
  const svg = buildProjectSvg(project, adminGeoJson, compareGeoJson, viewport);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadText(`map-highlight-view-${stamp}.svg`, svg, 'image/svg+xml;charset=utf-8');
}
