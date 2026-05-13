function calculateRisk(ndvi, rainfall, temperature, humidity, windSpeed) {
  let score = 0;

  if (ndvi < 0.3) score += 40;
  else if (ndvi < 0.5) score += 20;

  if (rainfall > 120) score += 20;
  if (rainfall < 10) score += 15;

  if (temperature > 35) score += 15;

  if (humidity < 30 || humidity > 85) score += 10;

  if (windSpeed > 25) score += 10;

  let riskLevel = "Low";
  if (score > 70) riskLevel = "High";
  else if (score > 40) riskLevel = "Medium";

  return {
    riskScore: score,
    riskLevel
  };
}

module.exports = calculateRisk;