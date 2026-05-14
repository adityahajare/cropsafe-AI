const PLACEHOLDER_HOST = "your-render-service-name.onrender.com";

function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function normalizePublicAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    return `${getPublicBaseUrl()}${url.startsWith("/") ? url : `/${url}`}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === PLACEHOLDER_HOST && parsed.pathname.startsWith("/uploads/")) {
      return `${getPublicBaseUrl()}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }

  return url;
}

function normalizeImageSamples(samples) {
  return Array.isArray(samples)
    ? samples.map((sample) => ({
        ...sample,
        url: normalizePublicAssetUrl(sample?.url),
      }))
    : [];
}

module.exports = {
  getPublicBaseUrl,
  normalizePublicAssetUrl,
  normalizeImageSamples,
};
