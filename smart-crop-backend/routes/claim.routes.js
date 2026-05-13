const express = require('express');
const Farm = require('../models/Farm.model');
const Analysis = require('../models/SatelliteAnalysis');
const Claim = require('../models/Claim.model');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/claims/farmer - Get all claims for logged-in farmer
router.get('/farmer', authenticate, async (req, res) => {
  try {
    const farms = await Farm.find({ farmerId: req.user.id });
    const farmIds = farms.map(f => f._id);
    const claims = await Claim.find({ farmId: { $in: farmIds } })
      .sort({ createdAt: -1 })
      .populate('farmId', 'farmName cropType areaHectares season village district city state locationLabel')
      .populate('analysisId', 'ndviValue healthPercentage damagePercentage estimatedLoss riskLevel vegetationHealth problemTitle problemSummary damageCause damageSeverity evidence actionItems currentImageUrl ndviLayerUrl imageryStatus imagerySource analysisDate');
    res.json({ success: true, claims });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
});

// POST /api/claims/submit/:farmId - Submit insurance claim
router.post('/submit/:farmId', authenticate, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.farmId, farmerId: req.user.id });
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found' });
    }

    const analysis = await Analysis.findOne({ farmId: farm._id }).sort({ analysisDate: -1 });
    if (!analysis) {
      return res.status(400).json({ success: false, message: 'Please run NDVI analysis first before submitting a claim' });
    }

    const existingClaim = await Claim.findOne({ farmId: farm._id, status: { $in: ['pending', 'under_review'] } });
    if (existingClaim) {
      return res.status(400).json({ success: false, message: 'You already have a pending claim for this farm' });
    }

    const claim = new Claim({
      farmId: farm._id,
      analysisId: analysis._id,
      claimAmount: analysis.estimatedLoss,
      notes: req.body.notes || '',
      status: 'pending'
    });

    await claim.save();

    res.json({
      success: true,
      message: 'Claim submitted successfully',
      claim
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit claim: ' + error.message });
  }
});

// GET /api/claims/status/:farmId - Get claim status for a farm
router.get('/status/:farmId', authenticate, async (req, res) => {
  try {
    const claim = await Claim.findOne({ farmId: req.params.farmId }).sort({ createdAt: -1 });
    res.json({ success: true, claim: claim || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch claim status' });
  }
});

// GET /api/claims/:id - Get single claim
router.get('/:id', authenticate, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('farmId');
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }
    res.json({ success: true, claim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch claim' });
  }
});

module.exports = router;
