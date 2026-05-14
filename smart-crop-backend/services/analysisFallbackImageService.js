const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getPublicBaseUrl } = require("../utils/publicAssetUrl");

function ensureDir() {
  const dir = path.join(__dirname, "..", "public", "uploads", "analysis");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function colorForNdvi(ndvi) {
  if (ndvi >= 0.6) return "#15803d";
  if (ndvi >= 0.4) return "#ca8a04";
  if (ndvi >= 0.25) return "#ea580c";
  return "#dc2626";
}

function labelForNdvi(ndvi) {
  if (ndvi >= 0.6) return "Healthy";
  if (ndvi >= 0.4) return "Moderate";
  if (ndvi >= 0.25) return "Stressed";
  return "Critical";
}

function writeSvg(kind, svg) {
  const dir = ensureDir();
  const filename = `${Date.now()}-${kind}-${crypto.randomUUID()}.svg`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, svg, "utf8");
  return `${getPublicBaseUrl()}/uploads/analysis/${filename}`;
}

function buildCardSvg({ title, subtitle, ndvi, secondaryValue, accent, footer }) {
  const safeNdvi = clamp(Number(ndvi || 0), 0, 1);
  const percent = Math.round(safeNdvi * 100);
  const color = accent || colorForNdvi(safeNdvi);
  const label = labelForNdvi(safeNdvi);
  const angle = Math.max(12, Math.round(percent * 3.6));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="680" rx="36" fill="#ffffff" filter="url(#shadow)"/>
  <text x="110" y="150" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#0f172a">${title}</text>
  <text x="110" y="205" font-family="Arial, sans-serif" font-size="28" fill="#475569">${subtitle}</text>
  <circle cx="325" cy="430" r="132" fill="none" stroke="#e2e8f0" stroke-width="30"/>
  <path d="M325 298
           A132 132 0 ${angle > 180 ? 1 : 0} 1 ${325 + 132 * Math.sin((angle * Math.PI) / 180)} ${430 - 132 * Math.cos((angle * Math.PI) / 180)}"
        fill="none" stroke="${color}" stroke-width="30" stroke-linecap="round"/>
  <text x="325" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="#0f172a">${percent}%</text>
  <text x="325" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${color}">${label}</text>
  <text x="620" y="330" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">NDVI Value</text>
  <text x="620" y="388" font-family="Arial, sans-serif" font-size="68" font-weight="700" fill="${color}">${safeNdvi.toFixed(3)}</text>
  <text x="620" y="455" font-family="Arial, sans-serif" font-size="28" fill="#475569">${secondaryValue || ""}</text>
  <rect x="620" y="520" width="420" height="18" rx="9" fill="#e2e8f0"/>
  <rect x="620" y="520" width="${Math.max(24, percent * 4.2)}" height="18" rx="9" fill="${color}"/>
  <text x="620" y="600" font-family="Arial, sans-serif" font-size="24" fill="#64748b">${footer || "CropSafe analysis-based fallback image"}</text>
</svg>`;
}

function buildNdviMapSvg({ farmName, currentNdvi, previousNdvi, damagePercentage }) {
  const safeCurrent = clamp(Number(currentNdvi || 0), 0, 1);
  const safePrevious = clamp(Number(previousNdvi ?? currentNdvi ?? 0), 0, 1);
  const currentColor = colorForNdvi(safeCurrent);
  const previousColor = colorForNdvi(safePrevious);
  const damage = clamp(Math.round(Number(damagePercentage || 0)), 0, 100);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="NDVI fallback map">
  <defs>
    <linearGradient id="field" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#ecfccb"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="#f8fafc"/>
  <rect x="70" y="70" width="1060" height="660" rx="36" fill="url(#field)"/>
  <text x="110" y="145" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#0f172a">NDVI Evidence Map</text>
  <text x="110" y="195" font-family="Arial, sans-serif" font-size="28" fill="#475569">${farmName || "Selected farm"} - analysis-based visualization</text>
  <polygon points="290,270 860,220 940,520 410,610" fill="#ffffff" stroke="#0f172a" stroke-width="8"/>
  <polygon points="330,305 560,282 610,430 395,470" fill="${previousColor}" opacity="0.65"/>
  <polygon points="575,280 820,255 870,405 625,445" fill="${currentColor}" opacity="0.88"/>
  <polygon points="420,485 665,450 710,565 455,595" fill="${damage > 45 ? "#dc2626" : damage > 25 ? "#f59e0b" : "#16a34a"}" opacity="0.8"/>
  <text x="120" y="690" font-family="Arial, sans-serif" font-size="24" fill="#334155">Previous NDVI: ${safePrevious.toFixed(3)}</text>
  <text x="440" y="690" font-family="Arial, sans-serif" font-size="24" fill="#334155">Current NDVI: ${safeCurrent.toFixed(3)}</text>
  <text x="760" y="690" font-family="Arial, sans-serif" font-size="24" fill="#334155">Damage estimate: ${damage}%</text>
</svg>`;
}

function createAnalysisFallbackImages({ farm, analysis, previousNdvi }) {
  const currentNdvi = Number(analysis?.ndviValue || 0);
  const baselineNdvi =
    typeof previousNdvi === "number"
      ? previousNdvi
      : typeof analysis?.ndviDelta === "number"
      ? currentNdvi - analysis.ndviDelta
      : currentNdvi;

  const currentImageUrl = writeSvg(
    "analysis-current",
    buildCardSvg({
      title: "Current Crop Health",
      subtitle: `${farm?.farmName || farm?.cropType || "Farm"} - NDVI-based fallback image`,
      ndvi: currentNdvi,
      secondaryValue: `Crop: ${farm?.cropType || "Field"} | Risk: ${analysis?.riskLevel || "Review"}`,
      footer: "Visualization generated from current NDVI analysis",
    })
  );

  const previousImageUrl = writeSvg(
    "analysis-previous",
    buildCardSvg({
      title: "Previous Comparison View",
      subtitle: `${farm?.farmName || farm?.cropType || "Farm"} - baseline NDVI comparison`,
      ndvi: baselineNdvi,
      secondaryValue: `Baseline NDVI ${Number(baselineNdvi || 0).toFixed(3)} | Change ${typeof analysis?.ndviDelta === "number" ? (analysis.ndviDelta >= 0 ? "+" : "") + analysis.ndviDelta.toFixed(3) : "0.000"}`,
      footer: "Visualization generated from previous NDVI comparison",
    })
  );

  const ndviLayerUrl = writeSvg(
    "analysis-ndvi",
    buildNdviMapSvg({
      farmName: farm?.farmName || farm?.cropType,
      currentNdvi,
      previousNdvi: baselineNdvi,
      damagePercentage: analysis?.damagePercentage,
    })
  );

  return {
    currentImageUrl,
    previousImageUrl,
    ndviLayerUrl,
    imageSamples: [
      { label: "Current NDVI visualization", kind: "analysis-fallback", url: currentImageUrl },
      { label: "Previous NDVI comparison", kind: "analysis-fallback", url: previousImageUrl },
      { label: "NDVI evidence map", kind: "analysis-fallback", url: ndviLayerUrl },
    ],
    source: "CropSafe NDVI visualization",
    status: "analysis-fallback",
  };
}

module.exports = {
  createAnalysisFallbackImages,
};
