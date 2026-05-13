function inferSoilType({ centerLat, centerLng, cropType = "", city = "" }) {
  const lat = Number(centerLat);
  const lng = Number(centerLng);
  const crop = String(cropType).toLowerCase();
  const place = String(city).toLowerCase();

  if (crop.includes("rice") || crop.includes("paddy")) return "Alluvial Soil";
  if (crop.includes("cotton") || crop.includes("soybean") || crop.includes("sugarcane")) return "Black Soil";
  if (crop.includes("tea") || crop.includes("coffee") || crop.includes("rubber")) return "Laterite Soil";
  if (crop.includes("coconut") || crop.includes("arecanut")) return "Coastal Alluvial Soil";

  if (lng >= 72 && lng <= 80 && lat >= 15 && lat <= 24) return "Black Soil";
  if (lng >= 76 && lng <= 89 && lat >= 22 && lat <= 31) return "Alluvial Soil";
  if (lng >= 72 && lng <= 77 && lat >= 23 && lat <= 30) return "Sandy Soil";
  if (lng >= 74 && lng <= 78 && lat >= 8 && lat <= 16) return "Laterite Soil";
  if (place.includes("mumbai") || place.includes("goa") || place.includes("kochi")) return "Coastal Alluvial Soil";

  return "Satellite-derived Mixed Soil";
}

module.exports = { inferSoilType };
