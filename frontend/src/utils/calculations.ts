// ================================
// CROP NDVI REFERENCES
// ================================
export const CROP_NDVI_REFERENCES: Record<
  string,
  { healthy: number; stressed: number; critical: number }
> = {
  Rice: { healthy: 0.78, stressed: 0.45, critical: 0.25 },
  Wheat: { healthy: 0.72, stressed: 0.42, critical: 0.22 },
  Maize: { healthy: 0.74, stressed: 0.44, critical: 0.24 },
  Soybean: { healthy: 0.68, stressed: 0.4, critical: 0.2 },
  Cotton: { healthy: 0.64, stressed: 0.38, critical: 0.18 },
  Sugarcane: { healthy: 0.8, stressed: 0.48, critical: 0.28 },
  Groundnut: { healthy: 0.62, stressed: 0.36, critical: 0.16 },
  Vegetables: { healthy: 0.66, stressed: 0.4, critical: 0.2 },
};

// ================================
// CROP VALUE PER HECTARE
// ================================
export const CROP_VALUE_PER_HECTARE: Record<string, number> = {
  Rice: 85000,
  Wheat: 70000,
  Maize: 65000,
  Soybean: 75000,
  Cotton: 90000,
  Sugarcane: 120000,
  Groundnut: 80000,
  Vegetables: 95000,
};

// ================================
// SAFE CROP REFERENCE
// ================================
export function getCropReference(crop: string) {
  return (
    CROP_NDVI_REFERENCES[crop] || {
      healthy: 0.7,
      stressed: 0.4,
      critical: 0.2,
    }
  );
}

// ================================
// RISK COLOR
// ================================
export function getRiskColor(risk: string): string {
  switch (risk) {
    case "Critical":
      return "#dc3545";
    case "High":
      return "#fd7e14";
    case "Medium":
      return "#ffc107";
    default:
      return "#28a745";
  }
}

// ================================
// HEALTH COLOR
// ================================
export function getHealthColor(health: string): string {
  switch (health) {
    case "Excellent":
      return "#28a745";
    case "Good":
      return "#20c997";
    case "Moderate":
      return "#ffc107";
    case "Poor":
      return "#fd7e14";
    default:
      return "#dc3545";
  }
}

// ================================
// FORMAT CURRENCY
// ================================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// ================================
// FORMAT DATE
// ================================
export function formatDate(date?: string): string {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ================================
// NDVI HELPER (USED IN FRONTEND IF NEEDED)
// ================================
export function calculateDamage(ndvi: number): number {
  return Math.min(100, Math.max(0, Math.round((1 - ndvi) * 100)));
}

// ================================
// LOSS CALCULATION HELPER
// ================================
export function calculateLoss(
  damage: number,
  crop: string,
  area: number
): number {
  const value = CROP_VALUE_PER_HECTARE[crop] || 70000;
  return Math.round((damage / 100) * value * area);
}