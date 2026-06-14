import { hexToRgba } from './color';
import type { StyleConfig } from '../types/project';

export const fillPatternOptions = [
  { value: 'none', label: '없음' },
  { value: 'diagonal', label: '사선' },
  { value: 'cross', label: '교차' },
  { value: 'dots', label: '점' },
  { value: 'grid', label: '격자' },
  { value: 'horizontal', label: '가로선' },
] as const;

export const strokePatternOptions = [
  { value: 'solid', label: '실선' },
  { value: 'dashed', label: '점선' },
  { value: 'dotted', label: '둥근점' },
  { value: 'long-dashed', label: '긴점선' },
  { value: 'dash-dot', label: '쇄선' },
  { value: 'double', label: '이중선' },
  { value: 'double-dashed', label: '이중점선' },
] as const;

export function getStrokeDash(style: StyleConfig) {
  switch (style.strokePattern ?? (style.strokeDasharray ? 'dashed' : 'solid')) {
    case 'dashed':
      return [6, 4];
    case 'dotted':
      return [1, 5];
    case 'long-dashed':
      return [12, 6];
    case 'dash-dot':
      return [10, 4, 2, 4];
    case 'double-dashed':
      return [8, 5];
    default:
      return style.strokeDasharray === '6 4' ? [6, 4] : undefined;
  }
}

export function isDoubleStroke(style: StyleConfig) {
  return style.strokePattern === 'double' || style.strokePattern === 'double-dashed';
}

export function createPatternCanvas(style: StyleConfig) {
  if (!style.fillPattern || style.fillPattern === 'none' || typeof document === 'undefined') return undefined;
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = hexToRgba(style.fillColor, style.fillOpacity);
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hexToRgba(style.fillPatternColor ?? style.strokeColor, style.fillPatternOpacity ?? 0.38);
  ctx.fillStyle = hexToRgba(style.fillPatternColor ?? style.strokeColor, style.fillPatternOpacity ?? 0.38);
  ctx.lineWidth = 1.6;
  if (style.fillPattern === 'diagonal' || style.fillPattern === 'cross') {
    ctx.beginPath();
    ctx.moveTo(-2, size + 2);
    ctx.lineTo(size + 2, -2);
    ctx.stroke();
  }
  if (style.fillPattern === 'cross') {
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(size + 2, size + 2);
    ctx.stroke();
  }
  if (style.fillPattern === 'dots') {
    ctx.beginPath();
    ctx.arc(3, 3, 1.3, 0, Math.PI * 2);
    ctx.arc(9, 9, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style.fillPattern === 'grid' || style.fillPattern === 'horizontal') {
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(size, 4);
    ctx.moveTo(0, 10);
    ctx.lineTo(size, 10);
    if (style.fillPattern === 'grid') {
      ctx.moveTo(4, 0);
      ctx.lineTo(4, size);
      ctx.moveTo(10, 0);
      ctx.lineTo(10, size);
    }
    ctx.stroke();
  }
  return ctx.createPattern(canvas, 'repeat') ?? undefined;
}

export function svgPatternMarkup(id: string, style: StyleConfig) {
  if (!style.fillPattern || style.fillPattern === 'none') return '';
  const markColor = style.fillPatternColor ?? style.strokeColor;
  const markOpacity = style.fillPatternOpacity ?? 0.38;
  const base = `<rect width="12" height="12" fill="${style.fillColor}" fill-opacity="${style.fillOpacity}"/>`;
  const stroke = `stroke="${markColor}" stroke-opacity="${markOpacity}" stroke-width="1.6"`;
  const fill = `fill="${markColor}" fill-opacity="${markOpacity}"`;
  const body = {
    diagonal: `<path d="M-2,14 L14,-2" ${stroke}/>`,
    cross: `<path d="M-2,14 L14,-2 M-2,-2 L14,14" ${stroke}/>`,
    dots: `<circle cx="3" cy="3" r="1.3" ${fill}/><circle cx="9" cy="9" r="1.3" ${fill}/>`,
    grid: `<path d="M0,4 H12 M0,10 H12 M4,0 V12 M10,0 V12" ${stroke}/>`,
    horizontal: `<path d="M0,4 H12 M0,10 H12" ${stroke}/>`,
    none: '',
  }[style.fillPattern];
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="12" height="12">${base}${body}</pattern>`;
}

export function svgDashAttribute(style: StyleConfig) {
  const dash = getStrokeDash(style);
  return dash ? ` stroke-dasharray="${dash.join(' ')}"` : '';
}
