export function exportMapPng(mapElement: HTMLElement, filename = 'map-highlight.png') {
  const canvases = Array.from(mapElement.querySelectorAll<HTMLCanvasElement>('canvas'));
  const size = mapElement.getBoundingClientRect();
  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(size.width * window.devicePixelRatio));
  output.height = Math.max(1, Math.round(size.height * window.devicePixelRatio));
  const context = output.getContext('2d');
  if (!context) return;

  canvases.forEach((canvas) => {
    if (canvas.width === 0 || canvas.height === 0) return;
    const opacity = Number(canvas.parentElement?.style.opacity || canvas.style.opacity || 1);
    const transform = canvas.style.transform;
    context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (transform && transform.startsWith('matrix(')) {
      const matrix = transform
        .replace(/^matrix\(|\)$/g, '')
        .split(',')
        .map((value) => Number(value.trim()));
      if (matrix.length === 6) {
        context.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
      }
    }
    context.drawImage(canvas, 0, 0);
  });

  const link = document.createElement('a');
  link.href = output.toDataURL('image/png');
  link.download = filename;
  link.click();
}
