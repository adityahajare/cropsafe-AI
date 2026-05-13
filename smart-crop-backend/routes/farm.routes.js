const express = require('express');
const Farm = require('../models/Farm.model');
const User = require('../models/User.model');
const Analysis = require('../models/SatelliteAnalysis');
const { authenticate } = require('../middleware/auth');
const { inferSoilType } = require('../utils/soilInference');
const { buildFarmMetadata } = require('../utils/farmMetadata');
const { createStoredFarmAnalysis } = require('../services/farmAnalysisService');
const { sanitizeAnalysis } = require('../utils/analysisSanitizer');

const router = express.Router();

// POST /api/farms - Create farm
router.post('/', authenticate, async (req, res) => {
  try {
    const { polygonCoordinates, centerLat, centerLng, areaHectares, cropType, season, sowingDate, city, farmName } = req.body;

    if (!farmName || !polygonCoordinates || !Array.isArray(polygonCoordinates) || polygonCoordinates.length < 3 || !Number.isFinite(Number(centerLat)) || !Number.isFinite(Number(centerLng)) || !Number.isFinite(Number(areaHectares)) || Number(areaHectares) <= 0 || !cropType || !season || !sowingDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: farmName, polygonCoordinates, centerLat, centerLng, areaHectares, cropType, season, sowingDate'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Farmer not found' });

    const metadataWithoutSoil = buildFarmMetadata({ payload: req.body, user, soilType: null });
    const soilType = inferSoilType({
      centerLat: metadataWithoutSoil.centerLat,
      centerLng: metadataWithoutSoil.centerLng,
      cropType,
      city: metadataWithoutSoil.city || user.city,
    });
    const farm = new Farm({ ...metadataWithoutSoil, soilType });

    await farm.save();

    let initialAnalysis = null;
    try {
      initialAnalysis = await createStoredFarmAnalysis(farm);
    } catch (error) {
      console.warn('Initial farm analysis failed:', error.message);
    }

    res.status(201).json({
      success: true,
      message: initialAnalysis
        ? 'Farm registered and real satellite analysis stored'
        : 'Farm registered. Real satellite analysis is not available yet.',
      farm,
      analysis: initialAnalysis,
    });
  } catch (error) {
    console.error('Create farm error:', error);
    res.status(500).json({ success: false, message: 'Failed to register farm: ' + error.message });
  }
});

// GET /api/farms - Get all farms for farmer
router.get('/', authenticate, async (req, res) => {
  try {
    const farms = await Farm.find({ farmerId: req.user.id }).sort({ createdAt: -1 }).lean();
    const farmIds = farms.map((farm) => farm._id);
    const analyses = await Analysis.find({ farmId: { $in: farmIds } }).sort({ analysisDate: -1 }).lean();
    const latestByFarm = new Map();

    analyses.forEach((analysis) => {
      const farmId = String(analysis.farmId);
      if (!latestByFarm.has(farmId)) latestByFarm.set(farmId, analysis);
    });

    res.json({
      success: true,
      farms: farms.map((farm) => ({
        ...farm,
        latestAnalysis: sanitizeAnalysis(latestByFarm.get(String(farm._id)) || null),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch farms' });
  }
});

// GET /api/farms/:id - Get single farm with analysis and claim
router.get('/:id', authenticate, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, farmerId: req.user.id });
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found' });
    }

    const Analysis = require('../models/SatelliteAnalysis');  // ✅ FIXED
    const Claim = require('../models/Claim.model');

    const analysis = await Analysis.findOne({ farmId: farm._id }).sort({ analysisDate: -1 });
    const claim = await Claim.findOne({ farmId: farm._id }).sort({ createdAt: -1 });

    res.json({ success: true, farm, analysis: sanitizeAnalysis(analysis), claim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch farm details' });
  }
});

// PUT /api/farms/:id - Update farm
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { polygonCoordinates, centerLat, centerLng, areaHectares, cropType, season, sowingDate, farmName, city } = req.body;

    if (!farmName || !polygonCoordinates || !Array.isArray(polygonCoordinates) || polygonCoordinates.length < 3 || !Number.isFinite(Number(centerLat)) || !Number.isFinite(Number(centerLng)) || !Number.isFinite(Number(areaHectares)) || Number(areaHectares) <= 0 || !cropType || !season || !sowingDate) {
      return res.status(400).json({
        success: false,
        message: 'All farm details are mandatory before updating'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Farmer not found' });

    const updateData = buildFarmMetadata({ payload: req.body, user, soilType: null });
    updateData.soilType = inferSoilType({
      centerLat: updateData.centerLat,
      centerLng: updateData.centerLng,
      cropType,
      city: updateData.city || user.city,
    });
    delete updateData.farmerId;
    delete updateData.status;

    const farm = await Farm.findOneAndUpdate(
      { _id: req.params.id, farmerId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );
    if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
    res.json({ success: true, farm });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update farm' });
  }
});

// DELETE /api/farms/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const farm = await Farm.findOneAndDelete({ _id: req.params.id, farmerId: req.user.id });
    if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
    res.json({ success: true, message: 'Farm deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete farm' });
  }
});

module.exports = router;
