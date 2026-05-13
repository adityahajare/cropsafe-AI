/**
 * Calculate NDVI (Normalized Difference Vegetation Index)
 * Formula: NDVI = (NIR - RED) / (NIR + RED)
 * 
 * @param {number} nir - Near Infrared band value (0-1 or 0-255)
 * @param {number} red - Red band value (0-1 or 0-255)
 * @returns {object} NDVI result with health assessment
 */
const calculateNDVI = (nir, red) => {
  // Avoid division by zero
  const denominator = nir + red;
  let ndvi = denominator === 0 ? 0 : (nir - red) / denominator;
  
  // Clamp NDVI between -1 and 1, but for vegetation we expect 0-1
  ndvi = Math.min(0.95, Math.max(-0.05, ndvi));
  
  // Convert to percentage (0-100%)
  const healthPercentage = Math.round((ndvi + 0.05) / 1.05 * 100);
  
  // Determine health status
  let healthStatus = 'Moderate';
  let damage = 'Moderate crop stress detected';
  
  if (ndvi > 0.66) {
    healthStatus = 'Excellent';
    damage = 'Excellent crop health - no stress detected';
  } else if (ndvi > 0.56) {
    healthStatus = 'Good';
    damage = 'Good crop health - minimal stress';
  } else if (ndvi > 0.46) {
    healthStatus = 'Moderate';
    damage = 'Moderate crop stress detected';
  } else if (ndvi > 0.36) {
    healthStatus = 'Poor';
    damage = 'Poor crop health - significant stress';
  } else {
    healthStatus = 'Critical';
    damage = 'Critical crop condition - potential crop failure';
  }
  
  return {
    ndvi: parseFloat(ndvi.toFixed(4)),
    healthStatus,
    healthPercentage,
    damage,
    rawValues: { nir, red }
  };
};

module.exports = calculateNDVI;