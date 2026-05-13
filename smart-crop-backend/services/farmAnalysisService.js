const Analysis = require('../models/SatelliteAnalysis');
const { getSentinelHubAnalysis } = require('./sentinelHubService');
const getWeather = require('./weatherService');

const CROP_VALUE_PER_HECTARE = {
  Rice: 85000,
  Wheat: 70000,
  Maize: 65000,
  Soybean: 75000,
  Cotton: 90000,
  Sugarcane: 120000,
};

function clampNdvi(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function buildProblemAssessment({ ndvi, previousNdvi, damagePercentage, riskLevel, vegetationHealth, weather }) {
  const delta = typeof previousNdvi === 'number' ? Number((ndvi - previousNdvi).toFixed(4)) : null;
  const evidence = [
    `Current NDVI is ${ndvi.toFixed(3)} (${vegetationHealth})`,
    `Estimated crop damage is ${damagePercentage}%`,
  ];
  const causes = [];
  const actionItems = [];

  if (typeof delta === 'number') {
    evidence.push(`NDVI change from previous scene is ${delta >= 0 ? '+' : ''}${delta.toFixed(3)}`);
    if (delta <= -0.1) causes.push('vegetation dropped compared with the previous Sentinel scene');
  }

  if (ndvi < 0.25) causes.push('very low vegetation cover');
  else if (ndvi < 0.4) causes.push('low vegetation vigor');
  else if (ndvi < 0.55) causes.push('moderate crop stress');

  if (typeof weather?.temperature === 'number') {
    evidence.push(`Temperature is ${Math.round(weather.temperature)} C`);
    if (weather.temperature >= 36) causes.push('heat stress');
  }

  if (typeof weather?.rainfall === 'number') {
    evidence.push(`Recent rainfall is ${weather.rainfall} mm`);
    if (weather.rainfall < 2 && ndvi < 0.45) causes.push('low rainfall or dry soil stress');
    if (weather.rainfall >= 40) causes.push('heavy rainfall or waterlogging pressure');
  }

  if (typeof weather?.humidity === 'number') {
    evidence.push(`Humidity is ${weather.humidity}%`);
    if (weather.humidity >= 82) causes.push('high humidity disease pressure');
  }

  if (damagePercentage >= 40) {
    actionItems.push('Take clear field photos of affected rows, leaves, and soil condition');
    actionItems.push('Request agriculture officer or insurer field inspection');
  }
  if (ndvi < 0.4) actionItems.push('Check irrigation, root zone moisture, pest signs, and nutrient deficiency');
  if (typeof weather?.temperature === 'number' && weather.temperature >= 36) actionItems.push('Increase irrigation scheduling if soil is dry');
  if (typeof weather?.rainfall === 'number' && weather.rainfall >= 40) actionItems.push('Inspect drainage and root rot symptoms');
  if (actionItems.length === 0) actionItems.push('Continue monitoring and repeat analysis after the next Sentinel pass');

  const uniqueCauses = [...new Set(causes)];
  const damageCause = uniqueCauses.length ? uniqueCauses.join(', ') : 'no major stress signal detected';
  const problemTitle =
    riskLevel === 'Critical'
      ? 'Severe crop stress / possible crop failure'
      : riskLevel === 'High'
      ? 'High crop stress detected'
      : riskLevel === 'Medium'
      ? 'Moderate crop stress detected'
      : 'No major crop damage detected';

  return {
    problemTitle,
    problemSummary:
      riskLevel === 'Low'
        ? `Sentinel NDVI shows ${vegetationHealth.toLowerCase()} crop condition. No strong damage signal is visible right now.`
        : `${problemTitle}. Probable cause: ${damageCause}.`,
    damageCause,
    damageSeverity: riskLevel,
    ndviDelta: delta,
    evidence: [...new Set(evidence)],
    actionItems: [...new Set(actionItems)],
  };
}

function assessRealNdvi(ndviValue, previousNdvi, cropType, areaHectares, weather = null) {
  const ndvi = Math.max(0, Math.min(1, Number(ndviValue || 0)));
  const delta = typeof previousNdvi === 'number' ? ndvi - previousNdvi : 0;

  let vegetationHealth = 'Critical';
  if (ndvi >= 0.7) vegetationHealth = 'Excellent';
  else if (ndvi >= 0.55) vegetationHealth = 'Good';
  else if (ndvi >= 0.4) vegetationHealth = 'Moderate';
  else if (ndvi >= 0.25) vegetationHealth = 'Poor';

  const healthPercentage = Math.max(0, Math.min(100, Math.round(ndvi * 100)));
  const ndviStress = Math.max(0, Math.round((0.7 - ndvi) * 100));
  const declineStress = Math.max(0, Math.round(Math.abs(Math.min(0, delta)) * 100));
  const damagePercentage = Math.max(0, Math.min(100, Math.round(ndviStress + declineStress)));

  let riskLevel = 'Low';
  if (damagePercentage >= 60 || vegetationHealth === 'Critical') riskLevel = 'Critical';
  else if (damagePercentage >= 40 || vegetationHealth === 'Poor') riskLevel = 'High';
  else if (damagePercentage >= 20 || vegetationHealth === 'Moderate') riskLevel = 'Medium';

  const recommendation =
    riskLevel === 'Critical'
      ? 'Critical vegetation stress detected from Sentinel NDVI. File claim and request field inspection.'
      : riskLevel === 'High'
      ? 'High vegetation stress detected from Sentinel NDVI. Start claim documentation.'
      : riskLevel === 'Medium'
      ? 'Moderate vegetation stress detected from Sentinel NDVI. Monitor and add field photos.'
      : 'Sentinel NDVI shows healthy crop condition. Continue routine monitoring.';

  const valuePerHectare = CROP_VALUE_PER_HECTARE[cropType] || 75000;
  const problemAssessment = buildProblemAssessment({
    ndvi,
    previousNdvi,
    damagePercentage,
    riskLevel,
    vegetationHealth,
    weather,
  });

  return {
    ndviValue: Number(ndvi.toFixed(4)),
    vegetationHealth,
    healthPercentage,
    damagePercentage,
    estimatedLoss: Math.round((damagePercentage / 100) * valuePerHectare * Number(areaHectares || 0)),
    riskLevel,
    recommendation,
    ...problemAssessment,
  };
}

async function createStoredFarmAnalysis(farm) {
  const [sentinel, weather] = await Promise.all([
    getSentinelHubAnalysis(farm),
    getWeather(farm.centerLat, farm.centerLng).catch(() => null),
  ]);
  const currentStats = sentinel.currentStats;
  const previousStats = sentinel.previousStats;
  const hasUsefulNdviLayer = Boolean(sentinel.imagery?.ndviLayerUrl);
  const assessment = assessRealNdvi(
    currentStats.mean,
    previousStats?.mean,
    farm.cropType,
    farm.areaHectares,
    weather
  );

  const analysis = new Analysis({
    farmId: farm._id,
    ...assessment,
    ndviMin: clampNdvi(currentStats.min),
    ndviMax: clampNdvi(currentStats.max),
    temperature: weather?.temperature ?? null,
    rainfall: weather?.rainfall ?? null,
    humidity: weather?.humidity ?? null,
    currentImageUrl: sentinel.imagery?.currentImageUrl || '',
    previousImageUrl: sentinel.imagery?.previousImageUrl || '',
    ndviLayerUrl: hasUsefulNdviLayer ? (sentinel.imagery?.ndviLayerUrl || '') : '',
    imageSamples: sentinel.imagery?.imageSamples || [],
    imagerySource: sentinel.source,
    imageryStatus: sentinel.imagery
      ? hasUsefulNdviLayer ? 'sentinel' : 'sentinel-ndvi-unavailable'
      : 'sentinel-stats-only',
    analysisDate: new Date(),
  });

  await analysis.save();
  return analysis;
}

module.exports = {
  createStoredFarmAnalysis,
  assessRealNdvi,
  buildProblemAssessment,
};
