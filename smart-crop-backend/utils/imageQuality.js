const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MIN_TRUECOLOR_BYTES = 10000;
const MIN_NDVI_BYTES = 8000;
const MIN_TRUECOLOR_BUCKETS = 6;
const MIN_NDVI_BUCKETS = 2;
const MIN_TRUECOLOR_EDGE_SCORE = 1;
const MIN_NDVI_EDGE_SCORE = 1;

function decodePng(buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    }
    if (type === 'IDAT') chunks.push(data);
    offset += 12 + length;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let rawOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;
    const current = Buffer.alloc(stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= channels ? previous[x - channels] || 0 : 0;
      let value = row[x];

      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const predictor = left + up - upLeft;
        const pa = Math.abs(predictor - left);
        const pb = Math.abs(predictor - up);
        const pc = Math.abs(predictor - upLeft);
        value = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }

      current[x] = value;
    }

    current.copy(pixels, y * stride);
    previous = current;
  }

  return { width, height, channels, pixels };
}

function getPngQuality(buffer) {
  try {
    const image = decodePng(buffer);
    const colors = new Set();
    let edgeTotal = 0;
    let edgeCount = 0;
    let sampleCount = 0;

    for (let y = 0; y < image.height; y += 4) {
      for (let x = 0; x < image.width; x += 4) {
        const index = (y * image.width + x) * image.channels;
        const alpha = image.channels === 4 ? image.pixels[index + 3] : 255;
        if (alpha < 10) continue;

        const red = image.pixels[index];
        const green = image.pixels[index + 1] ?? red;
        const blue = image.pixels[index + 2] ?? red;
        colors.add(`${red >> 3},${green >> 3},${blue >> 3}`);
        sampleCount += 1;

        if (x + 4 < image.width) {
          const next = (y * image.width + x + 4) * image.channels;
          edgeTotal +=
            Math.abs(red - image.pixels[next]) +
            Math.abs(green - image.pixels[next + 1]) +
            Math.abs(blue - image.pixels[next + 2]);
          edgeCount += 1;
        }
      }
    }

    return {
      sampleCount,
      colorBuckets: colors.size,
      edgeScore: Math.round(edgeTotal / Math.max(1, edgeCount)),
    };
  } catch {
    return { sampleCount: 0, colorBuckets: 0, edgeScore: 0 };
  }
}

function isUsefulPngBuffer(buffer, options = {}) {
  const mode = options.mode === 'ndvi' ? 'ndvi' : 'truecolor';
  const minBytes = mode === 'ndvi' ? MIN_NDVI_BYTES : MIN_TRUECOLOR_BYTES;
  if (!buffer || buffer.length < minBytes) return false;

  const quality = getPngQuality(buffer);

  if (mode === 'ndvi') {
    return quality.sampleCount > 0 &&
      quality.colorBuckets >= MIN_NDVI_BUCKETS &&
      quality.edgeScore >= MIN_NDVI_EDGE_SCORE;
  }

  return quality.sampleCount > 0 &&
    quality.colorBuckets >= MIN_TRUECOLOR_BUCKETS &&
    quality.edgeScore >= MIN_TRUECOLOR_EDGE_SCORE;
}

function getLocalUploadPath(url) {
  const match = String(url || '').match(/\/uploads\/sentinel\/([^/?#]+)/);
  if (!match) return null;
  return path.join(__dirname, '..', 'public', 'uploads', 'sentinel', match[1]);
}

function isUsefulLocalSentinelImage(url) {
  const filepath = getLocalUploadPath(url);
  if (!filepath) return true;
  try {
    if (!fs.existsSync(filepath)) return false;
    const mode = path.basename(filepath).toLowerCase().includes('ndvi') ? 'ndvi' : 'truecolor';
    return isUsefulPngBuffer(fs.readFileSync(filepath), { mode });
  } catch {
    return false;
  }
}

module.exports = {
  getPngQuality,
  isUsefulPngBuffer,
  isUsefulLocalSentinelImage,
};
