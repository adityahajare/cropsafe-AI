async function disabledSyntheticService() {
  throw new Error('Legacy satellite preview service is disabled. Use /api/analysis/run/:farmId for real Sentinel Hub farm analysis.');
}

module.exports = {
  saveFarmCoordinates: disabledSyntheticService,
  processSatelliteAnalysis: disabledSyntheticService,
  getCachedAnalysis: disabledSyntheticService,
  quickPreview: disabledSyntheticService,
};
