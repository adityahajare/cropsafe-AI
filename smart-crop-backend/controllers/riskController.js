const calculateRisk = (ndvi, rainfall, temperature, humidity, windSpeed) => {
  let riskScore = 0;
  let riskLevel = "Low";
  let riskFactors = [];

  // NDVI Risk (40%)
  if (ndvi < 0.3) {
    riskScore += 40;
    riskFactors.push("Very low NDVI → Severe crop stress");
  } else if (ndvi < 0.5) {
    riskScore += 25;
    riskFactors.push("Low NDVI → Moderate crop stress");
  } else if (ndvi < 0.7) {
    riskScore += 10;
    riskFactors.push("Slight NDVI drop → Mild stress");
  }

  // Rainfall Risk (30%)
  if (rainfall < 20) {
    riskScore += 30;
    riskFactors.push("Low rainfall → Drought risk");
  } else if (rainfall > 200) {
    riskScore += 20;
    riskFactors.push("Excessive rainfall → Flood risk");
  }

  // Temperature Risk (20%)
  if (temperature > 38) {
    riskScore += 20;
    riskFactors.push("Extreme heat → Heat stress");
  } else if (temperature > 35) {
    riskScore += 10;
    riskFactors.push("High temperature → Heat stress risk");
  }

  // Humidity Risk (10%)
  if (humidity > 85) {
    riskScore += 10;
    riskFactors.push("High humidity → Fungal disease risk");
  }

  if (riskScore >= 70) riskLevel = "Critical";
  else if (riskScore >= 50) riskLevel = "High";
  else if (riskScore >= 30) riskLevel = "Medium";

  return { riskScore, riskLevel, riskFactors };
};

module.exports = calculateRisk;