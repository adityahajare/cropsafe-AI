const legacySyntheticHost = ['gibs', 'earthdata', 'nasa', 'gov'].join('.');
const { isUsefulLocalSentinelImage } = require('./imageQuality');
const { normalizePublicAssetUrl, normalizeImageSamples } = require('./publicAssetUrl');

function isSyntheticImageUrl(value) {
  const url = String(value || '').toLowerCase();
  if (url.includes('/uploads/analysis/')) return false;
  return (
    url.includes('generated') ||
    url.includes(legacySyntheticHost) ||
    url.endsWith('.svg') ||
    !isUsefulLocalSentinelImage(value)
  );
}

function isMissingOrSynthetic(value) {
  return !value || isSyntheticImageUrl(value);
}

function sanitizeAnalysis(analysis) {
  if (!analysis) return analysis;

  const plain = typeof analysis.toObject === 'function' ? analysis.toObject() : { ...analysis };
  const source = String(plain.imagerySource || '').toLowerCase();
  const status = String(plain.imageryStatus || '').toLowerCase();
  const invalidAll =
    source.includes('generated') ||
    status.includes('generated') ||
    isSyntheticImageUrl(plain.currentImageUrl) ||
    isSyntheticImageUrl(plain.previousImageUrl);

  if (invalidAll) {
    return {
      ...plain,
      currentImageUrl: '',
      previousImageUrl: '',
      ndviLayerUrl: '',
      imageSamples: [],
      imagerySource: 'Sentinel Hub unavailable',
      imageryStatus: 'sentinel-unavailable',
    };
  }

  const invalidNdvi = Boolean(plain.ndviLayerUrl) && isSyntheticImageUrl(plain.ndviLayerUrl);
  const validSamples = Array.isArray(plain.imageSamples)
    ? plain.imageSamples.filter((sample) => sample?.url && !isSyntheticImageUrl(sample.url))
    : [];

  if (invalidNdvi) {
    return {
      ...plain,
      currentImageUrl: normalizePublicAssetUrl(plain.currentImageUrl),
      previousImageUrl: normalizePublicAssetUrl(plain.previousImageUrl),
      ndviLayerUrl: '',
      imageSamples: normalizeImageSamples(validSamples),
    };
  }

  return {
    ...plain,
    currentImageUrl: normalizePublicAssetUrl(plain.currentImageUrl),
    previousImageUrl: normalizePublicAssetUrl(plain.previousImageUrl),
    ndviLayerUrl: normalizePublicAssetUrl(plain.ndviLayerUrl),
    imageSamples: normalizeImageSamples(validSamples),
  };
}

module.exports = {
  isSyntheticImageUrl,
  isMissingOrSynthetic,
  sanitizeAnalysis,
};
