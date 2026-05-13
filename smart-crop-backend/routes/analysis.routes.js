const express = require('express');
const Farm = require('../models/Farm.model');
const Analysis = require('../models/SatelliteAnalysis');
const { authenticate } = require('../middleware/auth');
const { getSentinelHubImages } = require('../services/sentinelHubService');
const { createStoredFarmAnalysis } = require('../services/farmAnalysisService');
const { sanitizeAnalysis, isSyntheticImageUrl } = require('../utils/analysisSanitizer');

const router = express.Router();

// POST /api/analysis/run/:farmId - Run NDVI Analysis
router.post('/run/:farmId', authenticate, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.farmId, farmerId: req.user.id });
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found' });
    }

    const analysis = await createStoredFarmAnalysis(farm);

    res.json({
      success: true,
      message: 'Analysis completed successfully',
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed: ' + error.message });
  }
});

// GET /api/analysis/latest/:farmId - Get latest analysis
router.get('/latest/:farmId', authenticate, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ farmId: req.params.farmId }).sort({ analysisDate: -1 });
    if (!analysis) {
      return res.json({ success: true, analysis: null });
    }

    const hasBrokenFallback =
      analysis.imageryStatus === 'generated-fallback' ||
      String(analysis.imagerySource || '').toLowerCase().includes('generated') ||
      isSyntheticImageUrl(analysis.currentImageUrl) ||
      isSyntheticImageUrl(analysis.previousImageUrl) ||
      isSyntheticImageUrl(analysis.ndviLayerUrl);
    const needsSentinelRepair =
      !analysis.currentImageUrl ||
      !analysis.previousImageUrl ||
      !analysis.ndviLayerUrl ||
      !Array.isArray(analysis.imageSamples) ||
      analysis.imageSamples.length < 2 ||
      ['sentinel-stats-only', 'sentinel-unavailable', 'sentinel-ndvi-unavailable'].includes(String(analysis.imageryStatus || '').toLowerCase());

    if (hasBrokenFallback || needsSentinelRepair) {
      const farm = await Farm.findOne({ _id: req.params.farmId, farmerId: req.user.id });
      if (farm) {
        let imagery = null;

        try {
          imagery = await getSentinelHubImages(farm, analysis);
        } catch (error) {
          console.warn('Latest analysis Sentinel repair failed:', error?.response?.data || error.message);
        }

        if (imagery) {
          const hasUsefulNdviLayer = Boolean(imagery.ndviLayerUrl);
          analysis.currentImageUrl = imagery.currentImageUrl;
          analysis.previousImageUrl = imagery.previousImageUrl;
          analysis.ndviLayerUrl = hasUsefulNdviLayer ? imagery.ndviLayerUrl : '';
          analysis.imageSamples = imagery.imageSamples || [];
          analysis.imagerySource = imagery.source;
          analysis.imageryStatus = hasUsefulNdviLayer ? 'sentinel' : 'sentinel-ndvi-unavailable';
          await analysis.save();
        } else {
          analysis.currentImageUrl = '';
          analysis.previousImageUrl = '';
          analysis.ndviLayerUrl = '';
          analysis.imageSamples = [];
          analysis.imagerySource = 'Sentinel Hub unavailable';
          analysis.imageryStatus = 'sentinel-unavailable';
          await analysis.save();
        }
      }
    }

    res.json({ success: true, analysis: sanitizeAnalysis(analysis) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analysis' });
  }
});

// GET /api/analysis/history/:farmId - Get analysis history
router.get('/history/:farmId', authenticate, async (req, res) => {
  try {
    const analyses = await Analysis.find({ farmId: req.params.farmId }).sort({ analysisDate: -1 });
    res.json({ success: true, analyses: analyses.map(sanitizeAnalysis) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analysis history' });
  }
});

module.exports = router;
