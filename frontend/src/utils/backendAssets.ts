const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const BACKEND_ASSET_BASE = apiBase.replace(/\/api\/?$/, "");
const LOCAL_BACKEND_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function backendAsset(path: string) {
  return `${BACKEND_ASSET_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizeBackendAssetUrl(value?: string | null) {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    return backendAsset(url);
  }

  try {
    const parsed = new URL(url);
    if (LOCAL_BACKEND_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith("/uploads/")) {
      return `${BACKEND_ASSET_BASE}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }

  return url;
}
