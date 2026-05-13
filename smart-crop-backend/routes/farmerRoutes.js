const express = require('express');
const Farmer = require('../models/User.model');
const Farm = require('../models/Farm.model');
const authMiddleware = require('../middleware/auth'); // ✅ FIXED - changed from authMiddleware to auth

const authenticate = authMiddleware.authenticate || authMiddleware;
const isAdmin = authMiddleware.isAdmin;

const router = express.Router();

// GET ALL FARMERS
router.get('/all', authenticate, isAdmin, async (req, res) => {
  try {
    const farmers = await Farmer.find({ role: 'farmer' }).select('-password');
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

// GET FARMER BY ID
router.get('/:farmerId', authenticate, async (req, res) => {
  try {
    const farmer = await Farmer.findOne({
      _id: req.params.farmerId,
      role: 'farmer'
    }).select('-password');

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json(farmer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch farmer' });
  }
});

// GET FARMER DETAILS + FARMS
router.get('/:farmerId/details', authenticate, async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.farmerId).select('-password');

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const farms = await Farm.find({ farmerId: req.params.farmerId });

    res.json({ farmer, farms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch farmer details' });
  }
});

module.exports = router;