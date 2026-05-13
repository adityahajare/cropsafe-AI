import api from "@/lib/api";

/* ================= TYPES ================= */

export interface GenerateReportRequest {
  farmId?: string;
  submit?: boolean;      // If true, submits to admin immediately
  forceRefresh?: boolean; // If true, forces fresh satellite analysis
}

export interface Report {
  _id: string;
  farmerId: string | {
    _id: string;
    name?: string;
    mobile?: string;
    aadhaar?: string;
    village?: string;
    district?: string;
  };
  farmId: string | {
    _id: string;
    cropType?: string;
    areaHectares?: number;
    season?: string;
    centerLat?: number;
    centerLng?: number;
  };
  reportStatus: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  submittedToAdmin: boolean;
  damagePercent?: number;
  confidence?: number;
  cropType?: string;
  areaHectares?: number;
  season?: string;
  farmerInfo?: {
    name: string;
    mobile: string;
    village: string;
    district: string;
    aadhaar?: string;
  };
  satelliteData?: {
    currentNDVI: number;
    baselineNDVI: number;
    ndviDelta: number;
    source: string;
    beforeImage?: string | null;
    afterImage?: string | null;
    ndviBeforeImage?: string | null;
    ndviAfterImage?: string | null;
    changeMapImage?: string | null;
    currentImage?: string;
    baselineImage?: string;
    currentNDVIUrl?: string;
    baselineNDVIUrl?: string;
    changeMapUrl?: string;
  };
  financialData?: {
    insuredValue: number;
    estimatedYieldValue: number;
    currentYieldValue: number;
    estimatedLossValue: number;
    compensationEstimate: number;
  };
  aiRecommendation?: {
    riskLevel: string;
    damageDetected: boolean;
    riskScore: number;
    problemTitle?: string | null;
    problemSummary?: string | null;
    damageCause?: string | null;
    evidence?: string[];
    actionItems?: string[];
    finalDecision: string;
    summary: string;
    confidenceLabel: string;
    nextAction: string;
  };
  ndviSeries?: Array<{
    label: string;
    value: number;
    rain: number;
  }>;
  weatherImpact?: {
    temperature: number;
    rainfall: number;
    humidity: number;
  };
  statistics?: {
    currentNDVI?: number;
    baselineNDVI?: number;
    damagePercent?: number;
    confidence?: number;
  };
  decisionHistory?: Array<{
    status: string;
    remark: string;
    actor: string;
    decidedAt: Date;
  }>;
  generatedAt: Date;
  createdAt: Date;
}

/* ================= REPORT GENERATION ================= */

/**
 * Generate a new report
 * POST /api/reports/generate
 * farmerId is taken from JWT token automatically
 */
export async function generateReport(options?: GenerateReportRequest): Promise<Report | null> {
  try {
    const { data } = await api.post("/reports/generate", options || {});
    return data?.data ?? data ?? null;
  } catch (err) {
    console.error("Report generation error:", err);
    return null;
  }
}

/**
 * Submit existing report to admin for review
 * POST /api/reports/:id/submit
 */
export async function submitReportToAdmin(reportId: string): Promise<Report | null> {
  try {
    const { data } = await api.post(`/reports/${reportId}/submit`);
    return data?.data ?? data ?? null;
  } catch (err) {
    console.error("Report submission error:", err);
    return null;
  }
}

/**
 * Get all reports (farmer) - get reports for logged-in farmer
 * Note: Your backend may need this endpoint
 */
export async function getMyReports(): Promise<Report[]> {
  try {
    const { data } = await api.get("/reports/my");
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch (err) {
    console.error("Get my reports error:", err);
    return [];
  }
}

/* ================= ADMIN REPORT APIS ================= */

/**
 * Get all reports (admin only)
 * GET /api/reports
 */
export async function getAllReports(status?: string, location?: string): Promise<Report[]> {
  try {
    const params: any = {};
    if (status) params.status = status;
    if (location) params.location = location;
    
    const { data } = await api.get("/reports", { params });
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch (err) {
    console.error("Get all reports error:", err);
    return [];
  }
}

/**
 * Get single report by ID (admin only)
 * GET /api/reports/:id
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  try {
    const { data } = await api.get(`/reports/${reportId}`);
    return data?.data ?? data ?? null;
  } catch (err) {
    console.error("Get report error:", err);
    return null;
  }
}

/**
 * Decide on a report (admin approve/reject)
 * Note: Your backend may need this endpoint
 */
export async function decideReport(
  reportId: string,
  status: "APPROVED" | "REJECTED",
  remark?: string,
  adminName?: string
): Promise<Report | null> {
  try {
    const { data } = await api.put(`/reports/${reportId}/decide`, {
      status,
      remark,
      adminName,
    });
    return data?.data ?? data ?? null;
  } catch (err) {
    console.error("Decide report error:", err);
    return null;
  }
}

/* ================= SATELLITE ANALYSIS ================= */
/**
 * Get satellite analysis for farm
 * Use the existing analysis endpoints instead
 */
export async function getSatelliteAnalysis(farmId: string) {
  try {
    const { data } = await api.get(`/analysis/latest/${farmId}`);
    return data?.analysis ?? null;
  } catch (err) {
    console.error("Satellite analysis error:", err);
    return null;
  }
}

/* ================= COMPATIBILITY ================= */
// Keep original function names for backward compatibility
export { getSatelliteAnalysis as getSatelliteAnalysisLegacy };
