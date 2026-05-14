const express = require('express');
const SatelliteAnalysis = require('../models/SatelliteAnalysis');
const Farm = require('../models/Farm.model');
const Weather = require('../models/weather');

// ✅ FIXED - correct middleware import
const { authenticate } = require('../middleware/auth'); // ✅ CHANGED from authMiddleware to auth

const router = express.Router();

// ================= RISK ASSESSMENT =================
router.post('/assess', authenticate, async (req, res) => {
  try {
    const { farmId } = req.body;

    if (!farmId) {
      return res.status(400).json({ error: 'farmId is required' });
    }

    // Get farm
    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    // Get latest satellite + weather data
    const analysis = await SatelliteAnalysis.findOne({ farmId })
      .sort({ analysisDate: -1 });

    const weather = await Weather.findOne({ farmId })
      .sort({ recordedDate: -1 });

    let riskScore = 0;
    let riskFactors = [];

    // ================= NDVI RISK (40%) =================
    if (analysis && analysis.ndviValue !== undefined) {
      if (analysis.ndviValue < 0.3) {
        riskScore += 40;
        riskFactors.push('Very low NDVI → Severe crop stress');
      } else if (analysis.ndviValue < 0.5) {
        riskScore += 25;
        riskFactors.push('Low NDVI → Moderate crop stress');
      } else if (analysis.ndviValue < 0.7) {
        riskScore += 10;
        riskFactors.push('Slight NDVI drop → Mild stress');
      }
    }

    // ================= WEATHER RISK (30%) =================
    if (weather) {
      if (weather.temperature && weather.temperature > 38) {
        riskScore += 15;
        riskFactors.push('Extreme heat conditions');
      }

      if (weather.rainfall !== undefined && weather.rainfall < 20) {
        riskScore += 15;
        riskFactors.push('Low rainfall → drought risk');
      }

      if (weather.humidity && weather.humidity < 30) {
        riskScore += 10;
        riskFactors.push('Low humidity stress');
      }
    }

    // ================= RISK LEVEL =================
    let riskLevel = 'Low';

    if (riskScore >= 70) riskLevel = 'Critical';
    else if (riskScore >= 50) riskLevel = 'High';
    else if (riskScore >= 30) riskLevel = 'Medium';

    // ================= RESPONSE =================
    res.json({
      success: true,
      farmId,
      farm: {
        cropType: farm.cropType,
        areaHectares: farm.areaHectares,
        season: farm.season
      },
      riskScore,
      riskLevel,
      riskFactors,
      analysis: analysis || null,
      weather: weather || null,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
