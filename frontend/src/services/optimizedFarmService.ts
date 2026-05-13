// ✅ ADD THIS IMPORT FIRST
import api from "@/lib/api";

// ✅ ADD THIS FUNCTION DEFINITION
async function safeCall<T>(fn: () => Promise<any>): Promise<T | null> {
  try {
    const response = await fn();
    // Handle backend response structure { success: boolean, data: T }
    if (response?.data?.success === false) {
      console.error("API Error:", response.data.message);
      return null;
    }
    return (response?.data?.data ?? response?.data ?? null) as T | null;
  } catch (err: any) {
    console.error("API Error:", err?.response?.data?.message || err?.message);
    return null;
  }
}

// ✅ YOUR EXISTING FUNCTIONS (CORRECT)
export async function getFarms() {
  return safeCall(() => api.get("/farms"));
}

export async function createFarm(farmData: {
  polygonCoordinates: number[][];
  centerLat: number;
  centerLng: number;
  areaHectares: number;
  cropType: string;
  season: string;
  sowingDate: string;
  city?: string;
  cityBoundaryVerified?: boolean;
}) {
  return safeCall(() => api.post("/farms", farmData));
}

export async function runAnalysis(farmId: string) {
  return safeCall(() => api.post(`/analysis/run/${farmId}`));
}

export async function getLatestAnalysis(farmId: string) {
  return safeCall(() => api.get(`/analysis/latest/${farmId}`));
}

export async function submitClaim(farmId: string, notes?: string) {
  return safeCall(() => api.post(`/claims/submit/${farmId}`, { notes }));
}

export async function getClaims() {
  return safeCall(() => api.get("/claims/farmer"));
}