/* Web Worker: heavy image processing off the main thread */
'use strict';

async function canvasToBlob(canvas, type = 'image/png') {
  return await canvas.convertToBlob({ type });
}

async function processMonochrome(buffer, mime, invert = false) {
  const blob = new Blob([buffer], { type: mime });
  const bmp = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported by this browser.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, bmp.width, bmp.height);
    ctx.drawImage(bmp, 0, 0);
    const imageData = ctx.getImageData(0, 0, bmp.width, bmp.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      const value = invert ? 255 - gray : gray;
      d[i] = value;
      d[i + 1] = value;
      d[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);
    const outBlob = await canvasToBlob(canvas);
    return { blob: outBlob, width: imageData.width, height: imageData.height };
  } finally {
    bmp.close();
  }
}

async function processFilters(buffer, mime, filters) {
  const blob = new Blob([buffer], { type: mime });
  const bmp = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported by this browser.');
    const f = filters || {};
    const parts = [];
    if (f.brightness != null) parts.push(`brightness(${f.brightness}%)`);
    if (f.contrast != null) parts.push(`contrast(${f.contrast}%)`);
    if (f.saturate != null) parts.push(`saturate(${f.saturate}%)`);
    if (f.grayscale) parts.push('grayscale(100%)');
    if (f.sepia) parts.push('sepia(100%)');
    if (f.invert) parts.push('invert(100%)');
    if (f.blur) parts.push(`blur(${f.blur}px)`);
    if (f.hueRotate) parts.push(`hue-rotate(${f.hueRotate}deg)`);
    ctx.filter = parts.join(' ') || 'none';
    ctx.drawImage(bmp, 0, 0);
    const outBlob = await canvasToBlob(canvas);
    return { blob: outBlob, width: bmp.width, height: bmp.height };
  } finally {
    bmp.close();
  }
}

async function processThumbnail(buffer, mime, maxDim) {
  const blob = new Blob([buffer], { type: mime });
  const bmp = await createImageBitmap(blob);
  try {
    const ratio = Math.min(maxDim / bmp.width, maxDim / bmp.height, 1);
    const w = Math.round(bmp.width * ratio);
    const h = Math.round(bmp.height * ratio);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported by this browser.');
    ctx.drawImage(bmp, 0, 0, w, h);
    const outBlob = await canvasToBlob(canvas);
    return { blob: outBlob, width: w, height: h };
  } finally {
    bmp.close();
  }
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  try {
    let result;
    if (type === 'monochrome') result = await processMonochrome(payload.buffer, payload.mime, payload.invert);
    else if (type === 'filters') result = await processFilters(payload.buffer, payload.mime, payload.filters);
    else if (type === 'thumbnail') result = await processThumbnail(payload.buffer, payload.mime, payload.maxDim);
    else throw new Error(`Unknown worker task: ${type}`);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message || String(err) });
  }
};
