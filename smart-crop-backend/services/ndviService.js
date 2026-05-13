function calculateNDVI(nir, red) {
  // NDVI = (NIR - RED) / (NIR + RED)
  const denominator = nir + red;
  
  if (denominator === 0) {
    return {
      ndvi: 0,
      damage: "Unknown",
      healthPercentage: 0,
    };
  }

  const ndvi = (nir - red) / denominator;
  const normalizedNdvi = Math.min(1, Math.max(-1, ndvi));

  let damage, healthPercentage;

  if (normalizedNdvi >= 0.66) {
    damage = "Healthy";
    healthPercentage = Math.round(80 + (normalizedNdvi - 0.66) / 0.34 * 20);
  } else if (normalizedNdvi >= 0.46) {
    damage = "Mild Stress";
    healthPercentage = Math.round(50 + (normalizedNdvi - 0.46) / 0.20 * 30);
  } else if (normalizedNdvi >= 0.26) {
    damage = "Moderate Stress";
    healthPercentage = Math.round(25 + (normalizedNdvi - 0.26) / 0.20 * 25);
  } else {
    damage = "Severe Damage";
    healthPercentage = Math.round(Math.max(0, (normalizedNdvi / 0.26) * 25));
  }

  return {
    ndvi: parseFloat(normalizedNdvi.toFixed(4)),
    damage,
    healthPercentage,
  };
}

// Legacy function for Earth Engine image objects
function calculateNDVIFromImage(image) {
  const ndvi = image.normalizedDifference(["B8", "B4"]);

  const classify = (value) => {
    if (value < 0.2) return "Severe Damage";
    if (value < 0.4) return "Moderate Stress";
    if (value < 0.6) return "Mild Stress";
    return "Healthy";
  };

  return { ndvi, classify };
}

module.exports = calculateNDVI;
module.exports.calculateNDVIFromImage = calculateNDVIFromImage;
