import api from "@/lib/api";

export interface AnalysisRequest {
  farmId: string;
}

export interface NDVICalculationRequest {
  nir: number;
  red: number;
}

export interface SatelliteImageRequest {
  lat: number;
  lng: number;
  zoom?: number;
}

/* ============================================
   RUN NDVI ANALYSIS (FULL)
   POST /api/analysis/run/:farmId
============================================ */

export async function runAnalysis(farmId: string) {
  try {
    const response = await api.post(`/analysis/run/${farmId}`);
    
    return response?.data?.analysis ?? response?.data ?? null;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to run farm analysis";

    console.error("❌ Analysis error:", msg);
    throw new Error(msg);
  }
}

/* ============================================
   GET LATEST ANALYSIS FOR FARM
   GET /api/analysis/latest/:farmId
============================================ */

export async function getLatestAnalysis(farmId: string) {
  try {
    const response = await api.get(`/analysis/latest/${farmId}`);
    
    return response?.data?.analysis ?? null;
  } catch (error: any) {
    console.error("❌ Get analysis error:", error?.message);
    return null;
  }
}

/* ============================================
   GET ANALYSIS HISTORY
   GET /api/analysis/history/:farmId
============================================ */

export async function getAnalysisHistory(farmId: string) {
  try {
    const response = await api.get(`/analysis/history/${farmId}`);
    
    return response?.data?.analyses ?? [];
  } catch (error: any) {
    console.error("❌ History error:", error?.message);
    return [];
  }
}

/* ============================================
   CALCULATE NDVI FROM BANDS
   POST /api/ndvi/calculate
============================================ */

export async function calculateNDVI(nir: number, red: number) {
  try {
    const response = await api.post(`/ndvi/calculate`, { nir, red });
    
    return response?.data ?? null;
  } catch (error: any) {
    console.error("❌ NDVI calculation error:", error?.message);
    throw new Error("Failed to calculate NDVI");
  }
}

/* ============================================
   GET SATELLITE IMAGE URL
   GET /api/satellite/image/:lat/:lng/:zoom?
============================================ */

export async function getSatelliteImage(lat: number, lng: number, zoom: number = 12) {
  try {
    const response = await api.get(`/satellite/image/${lat}/${lng}/${zoom}`);
    
    return response?.data ?? null;
  } catch (error: any) {
    console.error("❌ Satellite image error:", error?.message);
    return null;
  }
}

/* ============================================
   GET NDVI VALUE FOR COORDINATES
   GET /api/satellite/ndvi/:lat/:lng
============================================ */

export async function getNDVIByCoordinates(lat: number, lng: number) {
  try {
    const response = await api.get(`/satellite/ndvi/${lat}/${lng}`);
    
    return response?.data ?? null;
  } catch (error: any) {
    console.error("❌ NDVI by coordinates error:", error?.message);
    return null;
  }
}

/* ============================================
   COMPATIBILITY WRAPPER (if you need original function)
============================================ */

export async function getFarmAnalysis(farmId: string) {
  return runAnalysis(farmId);
}