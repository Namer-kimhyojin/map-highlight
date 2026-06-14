import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style, Text } from 'ol/style';
import type { FeatureLike } from 'ol/Feature';
import { hexToRgba } from '../utils/color';
import { getFeatureCode, getFeatureName } from '../utils/geojson';
import { createPatternCanvas, getStrokeDash, isDoubleStroke } from '../utils/stylePatterns';
import type { ProjectState } from '../types/project';

export function createAdminLayer(project: ProjectState) {
  return new VectorLayer({
    source: new VectorSource(),
    visible: project.adminLayer.visible,
  });
}

export function adminStyle(project: ProjectState) {
  return (feature: FeatureLike) => {
    const code = getFeatureCode(feature.getProperties());
    const selected = project.adminLayer.selectedCodes.includes(code);
    const persisted = Boolean(project.adminLayer.regionStyles[code]);
    const highlighted = selected || persisted;
    const selectedIndex = project.adminLayer.selectedCodes.indexOf(code);
    const showLabel = project.labels.enabled && (highlighted || project.labels.scope === 'all');
    const labelPrefix = project.labels.numbering && selectedIndex >= 0 ? `${selectedIndex + 1}. ` : '';
    const hideOtherBoundaries = project.highlight.hideOtherBoundaries && project.adminLayer.selectedCodes.length > 0;
    const style = project.adminLayer.regionStyles[code] ?? project.adminLayer.style;
    const fillOpacity = highlighted
      ? 0
      : project.highlight.landBoundaryOnly
        ? 0
        : project.highlight.dimOthers
          ? project.highlight.dimOpacity
          : 0.06;
    const strokeColor = highlighted ? style.strokeColor : project.highlight.othersStrokeColor;
    const fillColor = highlighted
      ? style.fillColor
      : project.highlight.grayscaleOthers
        ? '#6B7280'
        : project.highlight.othersFillColor;
    const fillPattern = highlighted ? createPatternCanvas(style) : undefined;
    const regionStyle = new Style({
      fill: new Fill({ color: fillPattern ?? hexToRgba(fillColor, fillOpacity) }),
      stroke: new Stroke({
        color: hexToRgba(strokeColor, highlighted ? style.strokeOpacity : hideOtherBoundaries ? 0 : project.highlight.othersStrokeOpacity),
        width: highlighted ? style.strokeWidth : hideOtherBoundaries ? 0 : project.highlight.othersStrokeWidth,
        lineDash: highlighted ? getStrokeDash(style) : undefined,
      }),
      text:
        showLabel
          ? new Text({
              text: `${labelPrefix}${getFeatureName(feature.getProperties())}`,
              font: `${project.labels.fontWeight} ${project.labels.fontSize}px ${project.labels.fontFamily}, Pretendard, Arial, sans-serif`,
              fill: new Fill({ color: hexToRgba(project.labels.fontColor, project.labels.fontOpacity) }),
              stroke: new Stroke({ color: hexToRgba(project.labels.outlineColor, project.labels.outlineOpacity), width: 3 }),
              backgroundFill: project.labels.background ? new Fill({ color: hexToRgba(project.labels.backgroundColor, project.labels.backgroundOpacity) }) : undefined,
              padding: project.labels.background ? [3, 6, 3, 6] : undefined,
            })
          : undefined,
    });
    if (highlighted && project.highlight.selectedHalo) {
      const styles = [
        new Style({
          stroke: new Stroke({
            color: hexToRgba(project.highlight.haloColor, 0.92),
            width: style.strokeWidth + project.highlight.haloWidth,
            lineDash: getStrokeDash(style),
          }),
        }),
      ];
      if (selected) {
        styles.push(new Style({
          stroke: new Stroke({
            color: hexToRgba('#111827', 0.95),
            width: style.strokeWidth + 2.4,
            lineDash: getStrokeDash(style),
          }),
        }));
      }
      if (isDoubleStroke(style)) {
        styles.push(new Style({
          stroke: new Stroke({
            color: hexToRgba('#FFFFFF', 0.98),
            width: Math.max(1, style.strokeWidth * 0.45),
            lineDash: getStrokeDash(style),
          }),
        }));
      }
      styles.push(regionStyle);
      return styles;
    }
    return regionStyle;
  };
}
