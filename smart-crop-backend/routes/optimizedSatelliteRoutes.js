const express = require('express');

const router = express.Router();

function noSyntheticSatelliteResponse(res) {
  return res.status(410).json({
    success: false,
    message: 'Synthetic satellite helpers are disabled. Use /api/analysis/run/:farmId for stored Sentinel Hub farm analysis.',
  });
}

router.get('/image/:lat/:lng/:zoom?', async (req, res) => noSyntheticSatelliteResponse(res));
router.get('/ndvi/:lat/:lng', async (req, res) => noSyntheticSatelliteResponse(res));
router.post('/clear-cache', async (req, res) => {
  res.json({ success: true, message: 'No synthetic satellite cache is active.' });
});

module.exports = router;
