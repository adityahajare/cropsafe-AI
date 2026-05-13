import { getLatestAnalysis, runAnalysis } from "@/services/farmService";

export async function getSatelliteAnalysis(farmId: string, runFresh = false) {
  return runFresh ? runAnalysis(farmId) : getLatestAnalysis(farmId);
}
