const Analysis = require("../models/SatelliteAnalysis");

function toHealthStatus(analysis) {
  const health = analysis.vegetationHealth || "Moderate";
  return String(health).toUpperCase();
}

async function generateFarmReport({ farmId, lat, lon, crop }) {
  const analysis = await Analysis.findOne({ farmId }).sort({
    analysisDate: -1,
    createdAt: -1,
  });

  if (!analysis) {
    throw new Error("Run farm analysis before generating report.");
  }

  const ndviCurrent = analysis.ndviValue || 0;
  const damagePercent = analysis.damagePercentage || 0;
  const riskLevel = String(analysis.riskLevel || "Medium").toUpperCase();
  const decision =
    damagePercent > 50
      ? "APPROVE_CLAIM"
      : damagePercent > 25
      ? "MANUAL_REVIEW"
      : "REJECT_CLAIM";

  return {
    meta: {
      farmId,
      lat,
      lon,
      crop,
      generatedAt: new Date(),
    },

    executiveSummary: {
      riskLevel,
      insuranceDecision: decision,
      summaryText: analysis.recommendation,
    },

    satelliteAnalysis: {
      currentImage: analysis.currentImageUrl || null,
      previousImage: analysis.previousImageUrl || null,
      ndviMap: analysis.ndviLayerUrl || null,
      source: analysis.imagerySource || "Sentinel Hub",
      status: analysis.imageryStatus || "unknown",
    },

    ndviAnalysis: {
      currentNDVI: ndviCurrent,
      baselineNDVI: null,
      ndviChange: null,
      damagePercent,
      healthStatus: toHealthStatus(analysis),
    },

    weatherImpact: {
      temperature: typeof analysis.temperature === "number" ? analysis.temperature : null,
      humidity: typeof analysis.humidity === "number" ? analysis.humidity : null,
      rainfall: typeof analysis.rainfall === "number" ? analysis.rainfall : null,
      windSpeed: null,
      condition: null,
    },

    aiRiskEngine: {
      riskScore: Math.round(damagePercent),
      riskLevel,
      fraudProbability: null,
      damageDetected: damagePercent > 20,
      confidence: analysis.imageryStatus === "sentinel" ? 92 : 70,
    },

    damageAssessment: {
      estimatedLossPercentage: `${damagePercent}%`,
      estimatedLossValue: analysis.estimatedLoss || 0,
      areaAffected: null,
    },

    insuranceRecommendation: {
      decision,
      confidence: analysis.imageryStatus === "sentinel" ? 92 : 70,
      nextSteps: [analysis.recommendation],
    },

    metadata: {
      analysisDate: analysis.analysisDate,
      source: analysis.imagerySource || "Sentinel Hub",
      version: "2.0",
    },
  };
}

module.exports = { generateFarmReport };
