const Farm = require("../models/Farm.model");
const Analysis = require("../models/SatelliteAnalysis");

const fullAnalysis = async (req, res) => {
  try {
    const { farmId } = req.body;

    if (!farmId) {
      return res.status(400).json({
        success: false,
        message: "farmId required",
      });
    }

    const farmData = await Farm.findById(farmId);

    if (!farmData) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    const analysis = await Analysis.findOne({ farmId }).sort({
      analysisDate: -1,
      createdAt: -1,
    });

    if (!analysis) {
      return res.status(400).json({
        success: false,
        message: "Run farm analysis before requesting full analysis.",
      });
    }

    return res.json({
      success: true,
      data: {
        farmId,
        ndvi: analysis.ndviValue,
        riskLevel: String(analysis.riskLevel || "Medium").toUpperCase(),
        damagePercent: analysis.damagePercentage,
        insight: analysis.recommendation,
        cropType: farmData.cropType,
        areaHectares: farmData.areaHectares,
        weather: {
          temperature: analysis.temperature ?? null,
          rainfall: analysis.rainfall ?? null,
          humidity: analysis.humidity ?? null,
        },
        insuranceSuggestion:
          analysis.damagePercentage > 50
            ? "Eligible for claim - File immediately"
            : analysis.damagePercentage > 25
            ? "Monitor closely - May qualify for claim"
            : "Good health - No claim needed",
      },
    });
  } catch (err) {
    console.error("FULL ANALYSIS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = { fullAnalysis };
