export function hexToRgba(hex: string | undefined, alpha: number | undefined) {
  const normalized = (hex ?? '#000000').replace('#', '');
  const safeAlpha = Number.isFinite(alpha) ? alpha : 1;
  const value = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const numberValue = Number.parseInt(value, 16);
  const r = (numberValue >> 16) & 255;
  const g = (numberValue >> 8) & 255;
  const b = numberValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function hexToRgb(hex: string | undefined) {
  const normalized = (hex ?? '#000000').replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const numberValue = Number.parseInt(value, 16);
  return {
    r: (numberValue >> 16) & 255,
    g: (numberValue >> 8) & 255,
    b: numberValue & 255,
  };
}

function channelLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const fgLum = 0.2126 * channelLuminance(fg.r) + 0.7152 * channelLuminance(fg.g) + 0.0722 * channelLuminance(fg.b);
  const bgLum = 0.2126 * channelLuminance(bg.r) + 0.7152 * channelLuminance(bg.g) + 0.0722 * channelLuminance(bg.b);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}
