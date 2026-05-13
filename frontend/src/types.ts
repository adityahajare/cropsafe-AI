// ================= FARM =================
export interface Farm {
  id?: string;
  _id?: string;
  farmerId: string;
  polygonCoordinates: number[][];
  centerLat: number;
  centerLng: number;
  areaHectares: number;
  cropType: string;
  season: string;
  soilType?: string;
  irrigationType?: string;
  sowingDate: string | Date;
  expectedHarvestDate?: string | Date;
  city?: string;
  district?: string;
  state?: string;
  village?: string;
  country?: string;
  locationLabel?: string;
  boundaryGeoJson?: any;
  boundingBox?: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
  cropStageAtRegistration?: string;
  daysSinceSowingAtRegistration?: number;
  latestAnalysis?: Partial<NDVIAnalysis> | null;
  dataQuality?: {
    boundaryPoints?: number;
    hasValidBoundary?: boolean;
    hasValidCenter?: boolean;
    hasFarmerLocation?: boolean;
    source?: string;
    lastMetadataRefresh?: string | Date;
  };
  status?: string;
  createdAt?: string;
}

// ================= ANALYSIS =================
export interface NDVIAnalysis {
  farmId: string;
  analysisDate: string | Date;
  ndviValue: number;
  ndviMin: number;
  ndviMax: number;
  ndviMean: number;
  ndviStdDev: number;
  vegetationHealth: string;
  healthPercentage: number;
  stressLevel: string;
  damagePercentage: number;
  estimatedLoss: number;
  riskLevel: string;
  recommendation: string;
}

// ================= WEATHER =================
export interface WeatherData {
  farmId?: string;
  recordedDate?: string | Date;
  temperature: number;
  rainfall: number;
  humidity: number;
  windSpeed?: number;
  soilMoisture?: number;
}

// ================= FARMER USER =================
export interface FarmerUser {
  id: string;
  _id?: string;
  name: string;
  aadhaar: string;
  mobile: string;
  village: string;
  district: string;
  city?: string;
  state: string;
  role: "farmer" | "admin";
  email?: string;
}

// ================= REGISTRATION DATA =================
export interface RegistrationData {
  // Step 1 - Personal
  name: string;
  aadhaar: string;
  mobile: string;
  password: string;
  // Step 2 - Address
  village: string;
  district: string;
  city: string;
  state: string;
  // Step 3 - Farm
  cropType: string;
  season: string;
  sowingDate: string;
  // Step 4 - Verification
  acceptTerms: boolean;
}

// ================= DISEASE RESULT =================
export interface DiseaseResult {
  name: string;
  confidence: number;
  symptoms: string;
  treatment: string;
  severity: "High" | "Medium" | "Low" | "Critical";
  prevention: string;
}

// ================= CLAIM =================
export interface ClaimData {
  _id: string;
  farmerId: string;
  farmId?: string;
  crop: string;
  area: number;
  ndvi?: number;
  damagePercent?: number;
  riskScore?: number;
  compensation: number;
  status: "Pending" | "Processing" | "Approved" | "Rejected" | "Completed";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ================= WEATHER FORECAST =================
export interface WeatherForecast {
  date: string;
  day: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

// ================= RISK LEVEL =================
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type VegetationHealth = "Excellent" | "Good" | "Moderate" | "Poor" | "Critical";

// ================= LANGUAGE =================
export type Language = "english" | "hindi" | "marathi";
