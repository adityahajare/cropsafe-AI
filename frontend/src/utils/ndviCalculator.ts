import { CROP_NDVI_THRESHOLDS, CROP_VALUE_PER_HECTARE } from "./constants";

export function calculateNDVI(nir: number, red: number): number {
  const denominator = nir + red;
  if (denominator === 0) return 0;
  return (nir - red) / denominator;
}

export function classifyHealth(ndvi: number, cropType: string): {
  vegetationHealth: string;
  healthPercentage: number;
  damagePercentage: number;
  riskLevel: string;
  recommendation: string;
  estimatedLoss: number;
  areaHectares?: number;
} {
  // ✅ Use the imported constants
  const ref = CROP_NDVI_THRESHOLDS[cropType] || CROP_NDVI_THRESHOLDS.Soybean;
  const valuePerHectare = CROP_VALUE_PER_HECTARE[cropType] || 75000;

  let healthPercentage: number;
  let vegetationHealth: string;
  let damagePercentage: number;
  let riskLevel: string;
  let recommendation: string;

  if (ndvi >= ref.healthy) {
    healthPercentage = Math.min(100, Math.round(85 + ((ndvi - ref.healthy) / (1 - ref.healthy)) * 15));
    vegetationHealth = "Excellent";
    damagePercentage = 5;
    riskLevel = "Low";
    recommendation = "Crop health is excellent. Continue good practices.";
  } else if (ndvi >= ref.stressed) {
    const range = ref.healthy - ref.stressed;
    healthPercentage = Math.round(60 + ((ndvi - ref.stressed) / range) * 25);
    vegetationHealth = healthPercentage > 75 ? "Good" : "Moderate";
    damagePercentage = Math.round(((ref.healthy - ndvi) / ref.healthy) * 100);
    riskLevel = damagePercentage > 20 ? "Medium" : "Low";
    recommendation = damagePercentage > 20
      ? "Moderate crop stress detected. Consider filing partial insurance claim."
      : "Crop health is satisfactory. Monitor regularly.";
  } else if (ndvi >= ref.critical) {
    const range = ref.stressed - ref.critical;
    healthPercentage = Math.round(30 + ((ndvi - ref.critical) / range) * 30);
    vegetationHealth = "Poor";
    damagePercentage = Math.min(100, Math.round(((ref.healthy - ndvi) / ref.healthy) * 100 * 1.1));
    riskLevel = damagePercentage > 40 ? "High" : "Medium";
    recommendation = "Significant crop damage detected. File insurance claim urgently.";
  } else {
    healthPercentage = Math.round((ndvi / ref.critical) * 30);
    vegetationHealth = "Critical";
    damagePercentage = Math.min(100, Math.round(((ref.healthy - ndvi) / ref.healthy) * 100 * 1.3));
    riskLevel = "Critical";
    recommendation = "CRITICAL: Crop failure detected. File emergency insurance claim immediately.";
  }

  return {
    vegetationHealth,
    healthPercentage,
    damagePercentage,
    riskLevel,
    recommendation,
    estimatedLoss: Math.round((damagePercentage / 100) * valuePerHectare),
  };
}

export function getHealthColor(percentage: number): string {
  if (percentage >= 75) return "#2E7D32";
  if (percentage >= 50) return "#FDD835";
  if (percentage >= 25) return "#FF9800";
  return "#E53935";
}

export function getRiskBadge(riskLevel: string): { color: string; emoji: string } {
  switch (riskLevel) {
    case "Low": return { color: "#4CAF50", emoji: "🟢" };
    case "Medium": return { color: "#FFC107", emoji: "🟡" };
    case "High": return { color: "#FF9800", emoji: "🟠" };
    case "Critical": return { color: "#E53935", emoji: "🔴" };
    default: return { color: "#9E9E9E", emoji: "⚪" };
  }
}