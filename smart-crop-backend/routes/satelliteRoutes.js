const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function noSyntheticSatelliteResponse(res) {
  return res.status(410).json({
    success: false,
    message: 'Synthetic satellite helpers are disabled. Use /api/analysis/run/:farmId for stored Sentinel Hub farm analysis.',
  });
}

router.post('/fetch/:farmId', authenticate, async (req, res) => noSyntheticSatelliteResponse(res));
router.get('/ndvi/:lat/:lng', authenticate, async (req, res) => noSyntheticSatelliteResponse(res));

module.exports = router;
