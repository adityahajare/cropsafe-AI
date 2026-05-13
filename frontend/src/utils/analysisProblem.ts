export type AnalysisProblem = {
  title: string;
  summary: string;
  cause: string;
  severity: string;
  evidence: string[];
  actionItems: string[];
  damagePercentage: number;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function getAnalysisProblem(analysis: any, weather?: any): AnalysisProblem {
  const ndvi = Number(analysis?.ndviValue ?? 0);
  const damagePercentage = Number(analysis?.damagePercentage ?? 0);
  const riskLevel = String(analysis?.riskLevel || "Low");
  const vegetationHealth = String(analysis?.vegetationHealth || "Unknown");
  const temp = Number(weather?.temperature ?? analysis?.temperature);
  const rain = Number(weather?.rainfall ?? analysis?.rainfall);
  const humidity = Number(weather?.humidity ?? analysis?.humidity);
  const ndviDelta = Number(analysis?.ndviDelta);

  const causes: string[] = [];
  const evidence: string[] = [];
  const actionItems: string[] = [];

  evidence.push(`Current NDVI is ${Number.isFinite(ndvi) ? ndvi.toFixed(3) : "N/A"} (${vegetationHealth})`);
  evidence.push(`Estimated crop damage is ${Number.isFinite(damagePercentage) ? damagePercentage : 0}%`);

  if (Number.isFinite(ndviDelta)) {
    evidence.push(`NDVI change from previous scene is ${ndviDelta >= 0 ? "+" : ""}${ndviDelta.toFixed(3)}`);
    if (ndviDelta <= -0.1) causes.push("vegetation dropped compared with the previous Sentinel scene");
  }

  if (ndvi > 0 && ndvi < 0.25) causes.push("very low vegetation cover");
  else if (ndvi > 0 && ndvi < 0.4) causes.push("low vegetation vigor");
  else if (ndvi >= 0.4 && ndvi < 0.55) causes.push("moderate crop stress");

  if (Number.isFinite(temp)) {
    evidence.push(`Temperature is ${Math.round(temp)} C`);
    if (temp >= 36) causes.push("heat stress");
  }

  if (Number.isFinite(rain)) {
    evidence.push(`Recent rainfall is ${rain} mm`);
    if (rain < 2 && ndvi > 0 && ndvi < 0.45) causes.push("low rainfall or dry soil stress");
    if (rain >= 40) causes.push("heavy rainfall or waterlogging pressure");
  }

  if (Number.isFinite(humidity)) {
    evidence.push(`Humidity is ${humidity}%`);
    if (humidity >= 82) causes.push("high humidity disease pressure");
  }

  if (damagePercentage >= 40) {
    actionItems.push("Take clear field photos of affected rows, leaves, and soil condition");
    actionItems.push("Request agriculture officer or insurer field inspection");
  }
  if (ndvi > 0 && ndvi < 0.4) actionItems.push("Check irrigation, root zone moisture, pest signs, and nutrient deficiency");
  if (Number.isFinite(temp) && temp >= 36) actionItems.push("Increase irrigation scheduling if soil is dry");
  if (Number.isFinite(rain) && rain >= 40) actionItems.push("Inspect drainage and root rot symptoms");
  if (actionItems.length === 0) actionItems.push("Continue monitoring and repeat analysis after the next Sentinel pass");

  const cause = analysis?.damageCause || unique(causes).join(", ") || "no major stress signal detected";
  const title =
    analysis?.problemTitle ||
    (riskLevel === "Critical"
      ? "Severe crop stress / possible crop failure"
      : riskLevel === "High"
        ? "High crop stress detected"
        : riskLevel === "Medium"
          ? "Moderate crop stress detected"
          : "No major crop damage detected");

  return {
    title,
    summary:
      analysis?.problemSummary ||
      (riskLevel === "Low"
        ? `Sentinel NDVI shows ${vegetationHealth.toLowerCase()} crop condition. No strong damage signal is visible right now.`
        : `${title}. Probable cause: ${cause}.`),
    cause,
    severity: analysis?.damageSeverity || riskLevel,
    evidence: Array.isArray(analysis?.evidence) && analysis.evidence.length ? analysis.evidence : unique(evidence),
    actionItems: Array.isArray(analysis?.actionItems) && analysis.actionItems.length ? analysis.actionItems : unique(actionItems),
    damagePercentage: Number.isFinite(damagePercentage) ? damagePercentage : 0,
  };
}
