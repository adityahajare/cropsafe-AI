const PLACEHOLDER_HOST = "your-render-service-name.onrender.com";
const DEFAULT_RENDER_SERVICE_URL = "https://cropsafe-ai.onrender.com";

function sanitizeBaseUrl(value) {
  const url = String(value || "").trim().replace(/\/+$/, "");
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (parsed.hostname === PLACEHOLDER_HOST) return "";
    if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      return "";
    }
    return url;
  } catch {
    return "";
  }
}

function getPublicBaseUrl() {
  return (
    sanitizeBaseUrl(process.env.PUBLIC_BASE_URL) ||
    sanitizeBaseUrl(process.env.RENDER_EXTERNAL_URL) ||
    (process.env.RENDER_SERVICE_NAME ? `https://${process.env.RENDER_SERVICE_NAME}.onrender.com` : "") ||
    (process.env.NODE_ENV === "production" ? DEFAULT_RENDER_SERVICE_URL : "") ||
    `http://localhost:${process.env.PORT || 5000}`
  );
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
