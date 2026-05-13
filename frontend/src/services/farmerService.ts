import api from "@/lib/api";

/* ================= TYPES ================= */

export interface FarmerFormData {
  name: string;
  mobile: string;
  aadhaar: string;
  village: string;
  district: string;
  state?: string;
  password: string;
}

/* ================= SAFE WRAPPER ================= */

async function safeCall<T>(fn: () => Promise<any>): Promise<T | null> {
  try {
    const { data } = await fn();
    return data ?? null;
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

/* ================= REGISTER FARMER ================= */

export async function registerFarmer(payload: FarmerFormData) {
  const requestBody = {
    ...payload,
    state: payload.state || "Maharashtra",
  };

  return safeCall(() => api.post("/auth/register", requestBody));
}