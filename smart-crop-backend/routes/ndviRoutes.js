const express = require('express');
const Farm = require('../models/Farm.model');
const SatelliteAnalysis = require('../models/SatelliteAnalysis');
const { authenticate } = require('../middleware/auth'); // ✅ FIXED

const router = express.Router();

// NDVI calculation constants
const NDVI_THRESHOLDS = {
  excellent: { min: 0.66, label: 'Excellent', color: '#28a745' },
  good: { min: 0.56, label: 'Good', color: '#20c997' },
  moderate: { min: 0.46, label: 'Moderate', color: '#ffc107' },
  poor: { min: 0.36, label: 'Poor', color: '#fd7e14' },
  critical: { min: 0, label: 'Critical', color: '#dc3545' }
};

// Calculate NDVI from bands (no auth required - public endpoint)
router.post('/calculate', async (req, res) => {
  try {
    const { nirBand, redBand } = req.body;
    
    if (!nirBand || !redBand) {
      return res.status(400).json({ error: 'NIR and RED bands are required' });
    }
    
    const ndvi = (nirBand - redBand) / (nirBand + redBand + 0.0001);
    const normalizedNdvi = Math.min(0.95, Math.max(0.05, ndvi));
    
    let healthStatus = 'Moderate';
    let color = '#ffc107';
    
    for (const [key, value] of Object.entries(NDVI_THRESHOLDS)) {
      if (normalizedNdvi >= value.min) {
        healthStatus = value.label;
        color = value.color;
        break;
      }
    }
    
    res.json({
      ndvi: parseFloat(normalizedNdvi.toFixed(4)),
      healthStatus,
      color,
      rawValue: ndvi
    });
  } catch (error) {
    res.status(500).json({ error: 'NDVI calculation failed' });
  }
});

// Get NDVI history for a farm
router.get('/history/:farmId', authenticate, async (req, res) => {
  try {
    const analyses = await SatelliteAnalysis.find({ farmId: req.params.farmId })
      .select('ndviValue analysisDate')
      .sort({ analysisDate: 1 });
    
    const history = analyses.map(a => ({
      date: a.analysisDate,
      ndvi: a.ndviValue,
      healthStatus: getHealthStatus(a.ndviValue)
    }));
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NDVI history' });
  }
});

// Get NDVI comparison (current vs previous)
router.get('/compare/:farmId', authenticate, async (req, res) => {
  try {
    const analyses = await SatelliteAnalysis.find({ farmId: req.params.farmId })
      .sort({ analysisDate: -1 })
      .limit(2);
    
    let current = null;
    let previous = null;
    
    if (analyses.length > 0) current = analyses[0];
    if (analyses.length > 1) previous = analyses[1];
    
    const change = current && previous ? 
      ((current.ndviValue - previous.ndviValue) / previous.ndviValue * 100).toFixed(2) : 0;
    
    res.json({
      current,
      previous,
      change: parseFloat(change),
      trend: change > 0 ? 'improving' : change < 0 ? 'degrading' : 'stable'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare NDVI' });
  }
});

function getHealthStatus(ndvi) {
  for (const [key, value] of Object.entries(NDVI_THRESHOLDS)) {
    if (ndvi >= value.min) return value.label;
  }
  return 'Critical';
}

module.exports = router;