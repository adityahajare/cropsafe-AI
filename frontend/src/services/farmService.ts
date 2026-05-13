import api from "@/lib/api";  // ✅ MUST HAVE THIS - FIXES "api error"

/* ================= SAFE WRAPPER ================= */

async function safeCall<T>(fn: () => Promise<any>, options?: { throwOnError?: boolean }): Promise<T | null> {
  try {
    const response = await fn();
    return response?.data ?? null;
  } catch (err) {
    console.error("API Error:", err);
    if (options?.throwOnError) throw err;
    return null;
  }
}

/* ================= FARM APIs ================= */

export async function getFarms() {
  const data: any = await safeCall(() => api.get("/farms"));
  return data?.farms ?? data?.data ?? data ?? [];
}

export async function getFarmById(farmId: string) {
  const data: any = await safeCall(() => api.get(`/farms/${farmId}`));
  return data?.farm ?? data?.data ?? data;
}

export async function createFarm(farmData: any) {
  const data: any = await safeCall(() => api.post("/farms", farmData), { throwOnError: true });
  if (data?.farm && data?.analysis) {
    return { ...data.farm, initialAnalysis: data.analysis };
  }
  return data?.farm ?? data?.data ?? data;
}

export async function updateFarm(farmId: string, farmData: any) {
  const data: any = await safeCall(() => api.put(`/farms/${farmId}`, farmData), { throwOnError: true });
  return data?.farm ?? data?.data ?? data;
}

export async function deleteFarm(farmId: string) {
  return safeCall(() => api.delete(`/farms/${farmId}`));
}

/* ================= ANALYSIS APIs ================= */

export async function runAnalysis(farmId: string) {
  const data: any = await safeCall(() => api.post(`/analysis/run/${farmId}`), { throwOnError: true });
  return data?.analysis ?? data?.data ?? data;
}

export async function getLatestAnalysis(farmId: string) {
  const data: any = await safeCall(() => api.get(`/analysis/latest/${farmId}`));
  if (data && Object.prototype.hasOwnProperty.call(data, "analysis")) return data.analysis;
  return data?.analysis ?? data?.data ?? data;
}

export async function getAnalysisHistory(farmId: string) {
  const data: any = await safeCall(() => api.get(`/analysis/history/${farmId}`));
  return data?.analyses ?? data?.history ?? data?.data ?? data ?? [];
}

/* ================= CLAIMS APIs ================= */

export async function submitClaim(farmId: string, notes?: string) {
  return safeCall(() => api.post(`/claims/submit/${farmId}`, { notes }));
}

export async function getClaims() {
  const data: any = await safeCall(() => api.get("/claims/farmer"));
  return data?.claims ?? data?.data ?? data ?? [];
}

export async function getClaimStatus(farmId: string) {
  return safeCall(() => api.get(`/claims/status/${farmId}`));
}

/* ================= ADMIN APIs ================= */

export async function getAdminStats() {
  return safeCall(() => api.get("/admin/stats"));
}

export async function getPendingClaims() {
  return safeCall(() => api.get("/admin/claims/pending"));
}

export async function getAllClaims(params?: { status?: string }) {
  return safeCall(() => api.get("/admin/claims", { params }));
}

export async function updateClaimStatus(claimId: string, status: string, approvedAmount?: number, adminRemarks?: string) {
  return safeCall(() => api.put(`/admin/claims/${claimId}`, { status, approvedAmount, adminRemarks }));
}

export async function getAllFarmers() {
  return safeCall(() => api.get("/admin/farmers"));
}

/* ================= AUTH APIs ================= */

export async function registerFarmer(userData: {
  name: string;
  aadhaar: string;
  mobile: string;
  village: string;
  district: string;
  city: string;
  state?: string;
  password: string;
}) {
  try {
    const response = await api.post("/auth/register", userData);
    console.log("Register API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Register API error:", error);
    throw error;
  }
}

export async function loginFarmer(aadhaar: string, password: string) {
  try {
    const response = await api.post("/auth/login", { aadhaar, password });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function loginAdmin(email: string, password: string) {
  try {
    const response = await api.post("/auth/admin-login", { email, password });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getProfile() {
  return safeCall(() => api.get("/auth/profile"));
}
