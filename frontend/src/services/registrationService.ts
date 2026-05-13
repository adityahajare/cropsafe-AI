import api from "@/lib/api";  // ✅ Use correct import name

export interface UserRegistrationData {
  name: string;
  mobile: string;
  aadhaar: string;
  village: string;
  district: string;
  city: string;
  password: string;
}

export interface FarmRegistrationData {
  polygonCoordinates: number[][];  // ✅ Changed
  centerLat: number;               // ✅ Changed
  centerLng: number;               // ✅ Changed
  areaHectares: number;            // ✅ Changed
  cropType: string;                // ✅ Changed
  season: string;
  sowingDate: string;
  city?: string;
  cityBoundaryVerified?: boolean;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

/* =========================
   REGISTER USER (FIXED)
========================= */
export const registerUser = async (userData: UserRegistrationData) => {
  try {
    const { data } = await api.post("/auth/register", {
      name: userData.name,
      mobile: userData.mobile,
      aadhaar: userData.aadhaar,           // ✅ From user input
      village: userData.village,
      district: userData.district,
      city: userData.city,
      password: userData.password,          // ✅ From user input
    });

    // Store token from response
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Registration failed");
  }
};

/* =========================
   SAVE FARM (FIXED)
========================= */
export const saveFarm = async (farmData: FarmRegistrationData) => {
  try {
    // Area should be calculated on frontend or backend
    // Backend will recalculate anyway
    const { data } = await api.post("/farms", {
      polygonCoordinates: farmData.polygonCoordinates,
      centerLat: farmData.centerLat,
      centerLng: farmData.centerLng,
      areaHectares: farmData.areaHectares,
      cropType: farmData.cropType,
      season: farmData.season,
      sowingDate: farmData.sowingDate,
      city: farmData.city,
      cityBoundaryVerified: farmData.cityBoundaryVerified || false,
    });

    return data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to save farm");
  }
};

/* =========================
   GENERATE REPORT (FIXED)
========================= */
export const generateReport = async (options?: { submit?: boolean; forceRefresh?: boolean }) => {
  try {
    // farmerId comes from JWT token automatically
    const { data } = await api.post("/reports/generate", options || {});
    return data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Report failed");
  }
};

/* =========================
   RUN ANALYSIS (ADDED)
========================= */
export const runAnalysis = async (farmId: string) => {
  try {
    const { data } = await api.post(`/analysis/run/${farmId}`);
    return data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Analysis failed");
  }
};

/* =========================
   SUBMIT CLAIM (ADDED)
========================= */
export const submitClaim = async (farmId: string, notes?: string) => {
  try {
    const { data } = await api.post(`/claims/submit/${farmId}`, { notes });
    return data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Claim submission failed");
  }
};

/* =========================
   GEOCODE (OK - Keep as is)
========================= */
export const geocode = async (address: string) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=5`
  );

  const data = await response.json();

  return {
    results: data.map((item: any) => ({
      lat: Number(item.lat),
      lon: Number(item.lon),
      label: item.display_name,
    })),
  };
};

/* =========================
   AREA CALCULATION (Keep)
========================= */
export const calculatePolygonArea = (boundary: [number, number][]) => {
  if (boundary.length < 3) return 0;

  const R = 6378137;
  const rad = (d: number) => (d * Math.PI) / 180;

  let area = 0;

  for (let i = 0; i < boundary.length; i++) {
    const [lat1, lon1] = boundary[i];
    const [lat2, lon2] = boundary[(i + 1) % boundary.length];

    area += rad(lon2 - lon1) *
      (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }

  return Math.abs((area * R * R) / 2) / 10000;
};

/* =========================
   EXPORTS
========================= */
export const apiService = {
  registerUser,
  saveFarm,
  generateReport,
  runAnalysis,
  submitClaim,
  geocode,
};