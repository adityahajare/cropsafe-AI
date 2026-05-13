import api from "@/lib/api";
import { Clock, FileText, CheckCircle } from "lucide-react";

/* ─────────────────────────────────────────
   TYPES (Matching Backend)
───────────────────────────────────────── */

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
  analysisId?: {
    _id: string;
    ndviValue: number;
    damagePercentage: number;
    riskLevel: string;
  };
  claimNumber?: string;
  claimAmount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  adminRemarks?: string;
  adminVerified: boolean;
  decisionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────── */

export const statusConfig: Record<
  ClaimStatus,
  { badge: string; icon: any; label: string; color: string }
> = {
  pending: { 
    badge: "badge-warning", 
    icon: Clock, 
    label: "Pending",
    color: "#f59e0b"
  },
  under_review: { 
    badge: "badge-info", 
    icon: FileText, 
    label: "Under Review",
    color: "#3b82f6"
  },
  approved: { 
    badge: "badge-success", 
    icon: CheckCircle, 
    label: "Approved",
    color: "#10b981"
  },
  rejected: { 
    badge: "badge-destructive", 
    icon: Clock, 
    label: "Rejected",
    color: "#ef4444"
  },
};

/* ─────────────────────────────────────────
   CLAIM APIs (CORRECTED FOR BACKEND)
───────────────────────────────────────── */

/**
 * SUBMIT CLAIM
 * POST /api/claims/submit/:farmId
 */
export async function submitClaim(farmId: string, notes?: string) {
  const { data } = await api.post(`/claims/submit/${farmId}`, { notes });
  return data?.claim ?? data;
}

/**
 * GET FARMER CLAIMS (from token)
 * GET /api/claims/farmer
 */
export async function getMyClaims(): Promise<Claim[]> {
  const { data } = await api.get("/claims/farmer");
  return data?.claims ?? [];
}

/**
 * GET CLAIM STATUS FOR A FARM
 * GET /api/claims/status/:farmId
 */
export async function getClaimStatus(farmId: string): Promise<Claim | null> {
  const { data } = await api.get(`/claims/status/${farmId}`);
  return data?.claim ?? null;
}

/**
 * GET SINGLE CLAIM BY ID
 * GET /api/claims/:id
 */
export async function getClaimById(id: string): Promise<Claim | null> {
  const { data } = await api.get(`/claims/${id}`);
  return data?.claim ?? null;
}

/* ─────────────────────────────────────────
   ADMIN CLAIM APIs
───────────────────────────────────────── */

/**
 * GET ALL CLAIMS (ADMIN)
 * GET /api/admin/claims
 */
export async function getAllClaims(params?: { status?: string }): Promise<Claim[]> {
  const { data } = await api.get("/admin/claims", { params });
  return data?.claims ?? [];
}

/**
 * GET PENDING CLAIMS (ADMIN)
 * GET /api/admin/claims/pending
 */
export async function getPendingClaims(): Promise<Claim[]> {
  const { data } = await api.get("/admin/claims/pending");
  return data?.claims ?? [];
}

/**
 * UPDATE CLAIM STATUS (ADMIN)
 * PUT /api/admin/claims/:claimId
 */
export async function updateClaimStatus(
  claimId: string,
  status: ClaimStatus,
  approvedAmount?: number,
  adminRemarks?: string
) {
  const { data } = await api.put(`/admin/claims/${claimId}`, {
    status,
    approvedAmount,
    adminRemarks,
  });
  return data?.claim ?? data;
}

/**
 * GET SINGLE CLAIM (ADMIN)
 * GET /api/admin/claims/:id
 */
export async function getAdminClaim(id: string): Promise<Claim | null> {
  const { data } = await api.get(`/admin/claims/${id}`);
  return data?.claim ?? null;
}