import api from "@/lib/api";

/* ================= TYPES ================= */
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
  farmerName?: string;
  farmerMobile?: string;
  farmerAadhaar?: string;
  farmerDistrict?: string;
  cropType?: string;
  damagePercent?: number;
  claimAmount?: number;
  approvedAmount?: number;
  status: ClaimStatus;
  adminRemarks?: string;
  adminVerified?: boolean;
  decisionDate?: string;
  createdAt: string;
}

/* ================= SAFE RESPONSE ================= */
const getData = (res: any) => res?.data ?? res;

/* ================= DASHBOARD ================= */
export async function getAdminDashboard() {
  const res = await api.get("/admin/stats");
  const data = getData(res);
  // Return stats directly for easier use
  return data?.stats ?? {};
}

/* ================= CLAIMS ================= */
export async function getPendingClaims(): Promise<Claim[]> {
  const res = await api.get("/admin/claims/pending");
  const data = getData(res);
  return data?.claims ?? [];
}

export async function getAllClaims(params?: { status?: string }): Promise<Claim[]> {
  const res = await api.get("/admin/claims", { params });
  const data = getData(res);
  return data?.claims ?? [];
}

export async function getClaim(id: string): Promise<Claim | null> {
  const res = await api.get(`/admin/claims/${id}`);
  const data = getData(res);
  return data?.claim ?? null;
}

/* ================= UPDATE CLAIM ================= */
export async function updateClaimDecision(
  id: string,
  status: ClaimStatus,
  adminRemarks: string,
  approvedAmount?: number
) {
  const res = await api.put(`/admin/claims/${id}`, {
    status,
    approvedAmount,
    adminRemarks,
  });
  const data = getData(res);
  return data?.claim ?? null;
}

/* ================= GET FARMERS ================= */
export async function getAllFarmers() {
  const res = await api.get("/admin/farmers");
  const data = getData(res);
  return data?.farmers ?? [];
}