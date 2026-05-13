const Analysis = require('../models/SatelliteAnalysis');

async function analyzeFarmBoundary(farmerId) {
  const analysis = await Analysis.findOne()
    .populate({
      path: 'farmId',
      match: { farmerId },
    })
    .sort({ analysisDate: -1, createdAt: -1 });

  if (!analysis || !analysis.farmId) {
    throw new Error('Run /api/analysis/run/:farmId before requesting satellite analysis.');
  }

  return {
    source: analysis.imagerySource || 'Sentinel Hub',
    images: {
      current: analysis.currentImageUrl || null,
      baseline: analysis.previousImageUrl || null,
      currentNDVI: analysis.ndviLayerUrl || null,
    },
    statistics: {
      current: { mean: analysis.ndviValue, min: analysis.ndviMin, max: analysis.ndviMax },
      change: { damagePercent: analysis.damagePercentage },
    },
    aiRiskEngine: {
      riskLevel: analysis.riskLevel,
      riskScore: analysis.damagePercentage,
      damageDetected: analysis.damagePercentage > 20,
    },
    weatherImpact: {
      temperature: analysis.temperature ?? null,
      rainfall: analysis.rainfall ?? null,
      humidity: analysis.humidity ?? null,
    },
  };
}

module.exports = { analyzeFarmBoundary };
