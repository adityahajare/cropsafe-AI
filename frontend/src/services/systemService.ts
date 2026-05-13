import api from "@/lib/api";

/* ============================================
   TYPES (CORRECTED FOR BACKEND)
============================================ */

export type ClaimStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export interface Claim {
  _id: string;
  farmId: {
    _id: string;
    cropType: string;
    areaHectares: number;
    season: string;
  };
  claimNumber?: string;
  claimAmount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  adminRemarks?: string;
  adminVerified?: boolean;
  decisionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched fields from backend (populated)
  farmerName?: string;
  farmerMobile?: string;
  farmerAadhaar?: string;
  farmerDistrict?: string;
  farmerVillage?: string;
  farmerCity?: string;
  cropType?: string;
  damagePercent?: number;
}

/* ============================================
   SAFE RESPONSE HANDLER (FIXED)
============================================ */

function safeExtract<T>(res: any, key?: string): T {
  const data = res?.data ?? res;

  if (!data) return data as T;

  // direct array case
  if (Array.isArray(data)) return data as T;

  // safe nested extraction
  if (key) {
    return (
      data?.[key] ??
      data?.data?.[key] ??
      data?.result?.[key] ??
      ([] as T)
    ) as T;
  }

  return data as T;
}

/* ============================================
   DASHBOARD
============================================ */

export async function getAdminDashboard() {
  const res = await api.get("/admin/stats");
  return safeExtract<any>(res, "stats") || {};
}

/* ============================================
   CLAIMS
============================================ */

export async function getPendingClaims(): Promise<Claim[]> {
  const res = await api.get("/admin/claims/pending");
  const claims = safeExtract<Claim[]>(res, "claims");
  return Array.isArray(claims) ? claims : [];
}

export async function getAllClaims(params?: { status?: string }): Promise<Claim[]> {
  const res = await api.get("/admin/claims", { params });
  const claims = safeExtract<Claim[]>(res, "claims");
  return Array.isArray(claims) ? claims : [];
}

export async function getClaim(id: string): Promise<Claim | null> {
  const res = await api.get(`/admin/claims/${id}`);
  const claim = safeExtract<Claim>(res, "claim");
  return claim || null;
}

/* ============================================
   UPDATE DECISION (CORRECTED)
============================================ */

export async function updateClaimDecision(
  id: string,
  status: ClaimStatus,
  adminRemarks: string,
  approvedAmount?: number  // ✅ ADDED - matches backend
) {
  const res = await api.put(`/admin/claims/${id}`, {
    status,
    approvedAmount,  // ✅ ADDED
    adminRemarks,
    // ❌ REMOVED adminName - backend doesn't use it
  });

  const claim = safeExtract<Claim>(res, "claim");
  return claim || null;
}

/* ============================================
   GET ALL FARMERS (ADDED)
============================================ */

export async function getAllFarmers() {
  const res = await api.get("/admin/farmers");
  return safeExtract<any[]>(res, "farmers") || [];
}