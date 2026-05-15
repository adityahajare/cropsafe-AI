const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User.model");
const Farm = require("../models/Farm.model");
const Analysis = require("../models/SatelliteAnalysis");
const Report = require("../models/Report");
const Claim = require("../models/Claim.model");
const Weather = require("../models/weather");
const { buildFarmMetadata } = require("../utils/farmMetadata");
const { inferSoilType } = require("../utils/soilInference");
const { createAnalysisFallbackImages } = require("../services/analysisFallbackImageService");

const DEMO_PASSWORD = "Farmer@123";
const DEMO_STATE = "Maharashtra";
const DEMO_EXPORT_DIR = path.join(__dirname, "..", "..", "demo-data");

const DEMO_FARMERS = [
  { name: "Aditya Jadhav", village: "Hatkanangale", district: "Kolhapur", city: "Kolhapur", mobile: "9000000001", aadhaar: "900000000001" },
  { name: "Ramesh Patil", village: "Mirajwadi", district: "Sangli", city: "Sangli", mobile: "9000000002", aadhaar: "900000000002" },
  { name: "Sita Shinde", village: "Baramati", district: "Pune", city: "Pune", mobile: "9000000003", aadhaar: "900000000003" },
  { name: "Vilas More", village: "Tasgaon", district: "Sangli", city: "Sangli", mobile: "9000000004", aadhaar: "900000000004" },
  { name: "Sunita Chavan", village: "Karad", district: "Satara", city: "Satara", mobile: "9000000005", aadhaar: "900000000005" },
  { name: "Mohan Pawar", village: "Muktainagar", district: "Jalgaon", city: "Jalgaon", mobile: "9000000006", aadhaar: "900000000006" },
  { name: "Asha Koli", village: "Akluj", district: "Solapur", city: "Solapur", mobile: "9000000007", aadhaar: "900000000007" },
  { name: "Ganesh Mane", village: "Pimpalgaon", district: "Nashik", city: "Nashik", mobile: "9000000008", aadhaar: "900000000008" },
  { name: "Lata Salunkhe", village: "Akole", district: "Ahmednagar", city: "Ahmednagar", mobile: "9000000009", aadhaar: "900000000009" },
  { name: "Shankar Kale", village: "Pandharpur", district: "Solapur", city: "Solapur", mobile: "9000000010", aadhaar: "900000000010" },
  { name: "Meena Deshmukh", village: "Niphad", district: "Nashik", city: "Nashik", mobile: "9000000011", aadhaar: "900000000011" },
  { name: "Rahul Gaikwad", village: "Paithan", district: "Aurangabad", city: "Chhatrapati Sambhajinagar", mobile: "9000000012", aadhaar: "900000000012" },
  { name: "Pooja Bhosale", village: "Mangalvedha", district: "Solapur", city: "Solapur", mobile: "9000000013", aadhaar: "900000000013" },
  { name: "Nitin Kadam", village: "Karmala", district: "Solapur", city: "Solapur", mobile: "9000000014", aadhaar: "900000000014" },
  { name: "Savita Jagtap", village: "Yawal", district: "Jalgaon", city: "Jalgaon", mobile: "9000000015", aadhaar: "900000000015" },
  { name: "Tukaram Powar", village: "Kagal", district: "Kolhapur", city: "Kolhapur", mobile: "9000000016", aadhaar: "900000000016" },
  { name: "Neha Ingale", village: "Shrirampur", district: "Ahmednagar", city: "Ahmednagar", mobile: "9000000017", aadhaar: "900000000017" },
  { name: "Prakash Khot", village: "Shirol", district: "Kolhapur", city: "Kolhapur", mobile: "9000000018", aadhaar: "900000000018" },
  { name: "Kavita Thorat", village: "Lasalgaon", district: "Nashik", city: "Nashik", mobile: "9000000019", aadhaar: "900000000019" },
  { name: "Mahesh Londhe", village: "Deulgaon Raja", district: "Buldhana", city: "Buldhana", mobile: "9000000020", aadhaar: "900000000020" },
];

const LOCATION_POOL = [
  { village: "Malgaon", city: "Sangli", district: "Sangli", lat: 16.852, lng: 74.583 },
  { village: "Miraj", city: "Sangli", district: "Sangli", lat: 16.830, lng: 74.642 },
  { village: "Baramati", city: "Pune", district: "Pune", lat: 18.151, lng: 74.577 },
  { village: "Karad", city: "Satara", district: "Satara", lat: 17.289, lng: 74.181 },
  { village: "Pandharpur", city: "Solapur", district: "Solapur", lat: 17.679, lng: 75.331 },
  { village: "Akluj", city: "Solapur", district: "Solapur", lat: 17.879, lng: 75.024 },
  { village: "Niphad", city: "Nashik", district: "Nashik", lat: 20.084, lng: 73.792 },
  { village: "Lasalgaon", city: "Nashik", district: "Nashik", lat: 20.149, lng: 74.239 },
  { village: "Akole", city: "Ahmednagar", district: "Ahmednagar", lat: 19.531, lng: 73.967 },
  { village: "Shrirampur", city: "Ahmednagar", district: "Ahmednagar", lat: 19.619, lng: 74.654 },
  { village: "Paithan", city: "Chhatrapati Sambhajinagar", district: "Aurangabad", lat: 19.475, lng: 75.386 },
  { village: "Yawal", city: "Jalgaon", district: "Jalgaon", lat: 21.168, lng: 75.699 },
  { village: "Muktainagar", city: "Jalgaon", district: "Jalgaon", lat: 21.039, lng: 76.048 },
  { village: "Kagal", city: "Kolhapur", district: "Kolhapur", lat: 16.578, lng: 74.319 },
  { village: "Shirol", city: "Kolhapur", district: "Kolhapur", lat: 16.736, lng: 74.603 },
  { village: "Deulgaon Raja", city: "Buldhana", district: "Buldhana", lat: 20.017, lng: 76.036 },
];

const CROP_ROTATION = [
  { cropType: "Sugarcane", season: "Kharif" },
  { cropType: "Rice", season: "Kharif" },
  { cropType: "Wheat", season: "Rabi" },
  { cropType: "Soybean", season: "Kharif" },
  { cropType: "Cotton", season: "Kharif" },
  { cropType: "Maize", season: "Kharif" },
];

function polygonFromCenter(lat, lng, size = 0.0075) {
  return [
    [Number((lat - size).toFixed(6)), Number((lng - size).toFixed(6))],
    [Number((lat - size).toFixed(6)), Number((lng + size).toFixed(6))],
    [Number((lat + size).toFixed(6)), Number((lng + size).toFixed(6))],
    [Number((lat + size).toFixed(6)), Number((lng - size).toFixed(6))],
  ];
}

function buildNdviSeries(current, previous) {
  const middle = Number(((current + previous) / 2).toFixed(4));
  return [
    { label: "01 Mar", value: Number(previous.toFixed(4)), rain: 2 },
    { label: "20 Mar", value: middle, rain: 5 },
    { label: "10 Apr", value: Number(current.toFixed(4)), rain: 1 },
  ];
}

function buildFinancials(area, damagePercent) {
  const insuredValue = Math.round(area * 58000);
  const estimatedYieldValue = Math.round(area * 46000);
  const estimatedLossValue = Math.round((estimatedYieldValue * damagePercent) / 100);
  const currentYieldValue = Math.round(estimatedYieldValue - estimatedLossValue);
  const compensationEstimate = Math.round(estimatedLossValue * 0.72);

  return {
    insuredValue,
    estimatedYieldValue,
    currentYieldValue,
    estimatedLossValue,
    compensationEstimate,
  };
}

function buildCaseNumber(farmId, index) {
  return `CROP-2026-${String(farmId).slice(-6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
}

function statusFromIndex(index) {
  const mod = index % 4;
  if (mod === 0) return "PENDING";
  if (mod === 1) return "APPROVED";
  if (mod === 2) return "REJECTED";
  return "DRAFT";
}

function claimStatusFromIndex(index) {
  const mod = index % 4;
  if (mod === 0) return "pending";
  if (mod === 1) return "approved";
  if (mod === 2) return "rejected";
  return "under_review";
}

function buildAssessment(index) {
  const currentNdvi = Number((0.22 + ((index * 7) % 45) / 100).toFixed(4));
  const previousNdvi = Number(Math.max(0.18, currentNdvi - (((index % 5) - 2) * 0.035)).toFixed(4));
  const ndviDelta = Number((currentNdvi - previousNdvi).toFixed(4));
  const healthPercentage = Math.max(0, Math.min(100, Math.round(currentNdvi * 100)));
  const damagePercentage = Math.max(8, Math.min(78, Math.round((0.72 - currentNdvi) * 100 + Math.max(0, -ndviDelta * 70))));
  const vegetationHealth =
    currentNdvi >= 0.65 ? "Excellent" :
    currentNdvi >= 0.52 ? "Good" :
    currentNdvi >= 0.38 ? "Moderate" :
    currentNdvi >= 0.26 ? "Poor" : "Critical";
  const riskLevel =
    damagePercentage >= 60 ? "Critical" :
    damagePercentage >= 40 ? "High" :
    damagePercentage >= 20 ? "Medium" : "Low";

  return {
    currentNdvi,
    previousNdvi,
    ndviDelta,
    healthPercentage,
    damagePercentage,
    vegetationHealth,
    riskLevel,
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGODB_URI missing");

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for demo seed");

  const demoAadhaars = DEMO_FARMERS.map((farmer) => farmer.aadhaar);
  const existingUsers = await User.find({ aadhaar: { $in: demoAadhaars } }).select("_id");
  const existingUserIds = existingUsers.map((user) => user._id);
  const existingFarms = await Farm.find({ farmerId: { $in: existingUserIds } }).select("_id");
  const existingFarmIds = existingFarms.map((farm) => farm._id);

  await Promise.all([
    Analysis.deleteMany({ farmId: { $in: existingFarmIds } }),
    Report.deleteMany({ farmId: { $in: existingFarmIds } }),
    Claim.deleteMany({ farmId: { $in: existingFarmIds } }),
    Weather.deleteMany({ farmId: { $in: existingFarmIds } }),
    Farm.deleteMany({ _id: { $in: existingFarmIds } }),
    User.deleteMany({ _id: { $in: existingUserIds } }),
  ]);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];
  for (const farmer of DEMO_FARMERS) {
    const user = await User.create({
      ...farmer,
      state: DEMO_STATE,
      password: hashedPassword,
      role: "farmer",
      createdAt: new Date(),
    });
    users.push(user);
  }

  const farms = [];
  const analyses = [];
  const reports = [];
  const claims = [];
  const weathers = [];

  for (let index = 0; index < 30; index += 1) {
    const user = users[index % users.length];
    const farmerData = DEMO_FARMERS[index % DEMO_FARMERS.length];
    const location = LOCATION_POOL[index % LOCATION_POOL.length];
    const crop = CROP_ROTATION[index % CROP_ROTATION.length];
    const areaHectares = Number((1.2 + ((index * 17) % 21) / 10).toFixed(2));
    const polygonCoordinates = polygonFromCenter(
      Number((location.lat + ((index % 3) - 1) * 0.009).toFixed(6)),
      Number((location.lng + ((index % 4) - 1.5) * 0.008).toFixed(6))
    );
    const sowingDate = new Date(2025, (index * 2) % 12, 5 + (index % 18));
    const farmMeta = buildFarmMetadata({
      payload: {
        farmName: `${crop.cropType} Field ${index + 1}`,
        polygonCoordinates,
        areaHectares,
        cropType: crop.cropType,
        season: crop.season,
        sowingDate,
        city: location.city,
        district: location.district,
        village: location.village,
        state: DEMO_STATE,
      },
      user: { ...user.toObject(), city: farmerData.city, district: farmerData.district, village: farmerData.village, state: DEMO_STATE },
      soilType: null,
    });
    farmMeta.soilType = inferSoilType({
      centerLat: farmMeta.centerLat,
      centerLng: farmMeta.centerLng,
      cropType: crop.cropType,
      city: location.city,
    });

    const farm = await Farm.create(farmMeta);
    farms.push(farm);

    const assessment = buildAssessment(index);
    const estimatedLoss = Math.round((damagePercentageToValue(assessment.damagePercentage) * areaHectares));
    const temperature = 26 + (index % 10);
    const rainfall = (index * 3) % 28;
    const humidity = 48 + (index % 38);

    const fallbackImages = createAnalysisFallbackImages({
      farm,
      analysis: {
        ndviValue: assessment.currentNdvi,
        ndviDelta: assessment.ndviDelta,
        damagePercentage: assessment.damagePercentage,
        riskLevel: assessment.riskLevel,
      },
      previousNdvi: assessment.previousNdvi,
    });

    const analysis = await Analysis.create({
      farmId: farm._id,
      ndviValue: assessment.currentNdvi,
      ndviMin: Math.max(0, Number((assessment.currentNdvi - 0.09).toFixed(4))),
      ndviMax: Math.min(1, Number((assessment.currentNdvi + 0.1).toFixed(4))),
      vegetationHealth: assessment.vegetationHealth,
      healthPercentage: assessment.healthPercentage,
      damagePercentage: assessment.damagePercentage,
      estimatedLoss,
      riskLevel: assessment.riskLevel,
      recommendation:
        assessment.riskLevel === "Critical"
          ? "Immediate field inspection and claim preparation recommended."
          : assessment.riskLevel === "High"
            ? "Add field evidence and monitor crop stress closely."
            : assessment.riskLevel === "Medium"
              ? "Continue monitoring and compare with next image cycle."
              : "Crop condition is stable. Keep routine monitoring.",
      problemTitle:
        assessment.riskLevel === "Critical"
          ? "Severe crop stress / possible crop failure"
          : assessment.riskLevel === "High"
            ? "High crop stress detected"
            : assessment.riskLevel === "Medium"
              ? "Moderate crop stress detected"
              : "No major crop damage detected",
      problemSummary:
        assessment.damagePercentage >= 55
          ? "Vegetation health is low and field stress is clearly visible in the NDVI trend."
          : assessment.damagePercentage >= 30
            ? "Crop stress is visible and should be rechecked with fresh field evidence."
            : "Crop condition remains mostly stable with manageable stress signals.",
      damageCause:
        rainfall > 15 ? "rainfall pressure and field water imbalance" :
        temperature >= 33 ? "heat stress and moisture loss" :
        "moderate vegetation decline compared with baseline",
      damageSeverity: assessment.riskLevel,
      ndviDelta: assessment.ndviDelta,
      evidence: [
        `Current NDVI ${assessment.currentNdvi.toFixed(3)}`,
        `Baseline NDVI ${assessment.previousNdvi.toFixed(3)}`,
        `Estimated damage ${assessment.damagePercentage}%`,
      ],
      actionItems: [
        "Inspect affected rows and take daylight field photos",
        "Check irrigation and drainage before treatment",
        "Prepare report if stress continues in the next analysis cycle",
      ],
      temperature,
      rainfall,
      humidity,
      currentImageUrl: fallbackImages.currentImageUrl,
      previousImageUrl: fallbackImages.previousImageUrl,
      ndviLayerUrl: fallbackImages.ndviLayerUrl,
      imageSamples: fallbackImages.imageSamples,
      imagerySource: fallbackImages.source,
      imageryStatus: fallbackImages.status,
      analysisDate: new Date(Date.now() - index * 86400000 * 2),
    });
    analyses.push(analysis);

    const weather = await Weather.create({
      farmId: farm._id,
      temperature,
      rainfall,
      humidity,
      windSpeed: 8 + (index % 9),
      recordedDate: new Date(),
    });
    weathers.push(weather);

    const reportStatus = statusFromIndex(index);
    const reportDecisionHistory = [];
    if (reportStatus !== "DRAFT") {
      reportDecisionHistory.push({
        status: "PENDING",
        remark: "Submitted for review",
        actor: user.name,
        decidedAt: new Date(Date.now() - index * 86400000),
      });
    }
    if (reportStatus === "APPROVED" || reportStatus === "REJECTED") {
      reportDecisionHistory.push({
        status: reportStatus,
        remark: reportStatus === "APPROVED" ? "Eligible crop stress case approved." : "Stress not high enough for approval.",
        actor: "Admin",
        decidedAt: new Date(Date.now() - index * 43200000),
      });
    }

    const financialData = buildFinancials(areaHectares, assessment.damagePercentage);
    const report = await Report.create({
      farmerId: user._id,
      farmId: farm._id,
      analysisId: analysis._id,
      caseNumber: buildCaseNumber(farm._id, index),
      reportStatus,
      submittedToAdmin: reportStatus !== "DRAFT",
      decisionHistory: reportDecisionHistory,
      generatedAt: new Date(Date.now() - index * 86400000),
      damagePercent: assessment.damagePercentage,
      confidence: 86,
      cropType: crop.cropType,
      areaHectares,
      season: crop.season,
      farmerInfo: {
        name: user.name,
        mobile: user.mobile,
        village: farm.village,
        district: farm.district,
        aadhaar: `****${user.aadhaar.slice(-4)}`,
      },
      ndviSeries: buildNdviSeries(assessment.currentNdvi, assessment.previousNdvi),
      satelliteData: {
        beforeImage: fallbackImages.previousImageUrl,
        afterImage: fallbackImages.currentImageUrl,
        ndviBeforeImage: null,
        ndviAfterImage: fallbackImages.ndviLayerUrl,
        changeMapImage: fallbackImages.ndviLayerUrl,
        source: fallbackImages.source,
        status: fallbackImages.status,
        currentNDVI: assessment.currentNdvi,
        baselineNDVI: assessment.previousNdvi,
        ndviDelta: assessment.ndviDelta,
      },
      financialData,
      aiRecommendation: {
        riskLevel: assessment.riskLevel,
        damageDetected: assessment.damagePercentage > 20,
        riskScore: assessment.damagePercentage,
        problemTitle: analysis.problemTitle,
        problemSummary: analysis.problemSummary,
        damageCause: analysis.damageCause,
        evidence: analysis.evidence,
        actionItems: analysis.actionItems,
        finalDecision:
          assessment.damagePercentage > 55
            ? "Recommend claim approval"
            : assessment.damagePercentage > 30
              ? "Manual review required"
              : "No claim needed",
        summary:
          assessment.damagePercentage > 55
            ? "Severe crop loss detected"
            : assessment.damagePercentage > 30
              ? "Moderate crop stress detected"
              : "Crop condition mostly stable",
        confidenceLabel: "High",
        nextAction: reportStatus === "DRAFT" ? "Monitor field" : "Send to admin review",
      },
      weatherImpact: { temperature, rainfall, humidity },
      statistics: {
        currentNDVI: assessment.currentNdvi,
        baselineNDVI: assessment.previousNdvi,
        damagePercent: assessment.damagePercentage,
        confidence: 86,
      },
    });
    reports.push(report);

    if (index < 18) {
      const claimStatus = claimStatusFromIndex(index);
      const claim = await Claim.create({
        farmId: farm._id,
        analysisId: analysis._id,
        claimAmount: financialData.compensationEstimate,
        approvedAmount: claimStatus === "approved" ? Math.round(financialData.compensationEstimate * 0.92) : undefined,
        status: claimStatus,
        adminRemarks:
          claimStatus === "approved"
            ? "Approved based on NDVI stress and report evidence."
            : claimStatus === "rejected"
              ? "Rejected due to insufficient damage threshold."
              : claimStatus === "under_review"
                ? "Needs field officer verification."
                : "Awaiting review.",
        adminVerified: claimStatus === "approved",
        decisionDate: claimStatus === "pending" ? undefined : new Date(),
        notes: `${crop.cropType} demo claim for ${farm.farmName}`,
        createdAt: new Date(Date.now() - index * 86400000 * 1.5),
        updatedAt: new Date(),
      });
      claims.push(claim);
    }
  }

  ensureDir(DEMO_EXPORT_DIR);
  const credentials = users.map((user, index) => ({
    name: user.name,
    aadhaar: user.aadhaar,
    mobile: user.mobile,
    password: DEMO_PASSWORD,
    village: DEMO_FARMERS[index].village,
    district: DEMO_FARMERS[index].district,
    city: DEMO_FARMERS[index].city,
  }));

  const markdownLines = [
    "# CropSafe Demo Credentials",
    "",
    `Generated on ${new Date().toLocaleString("en-IN")}`,
    "",
    "## Admin Login",
    "",
    `- Email: ${process.env.ADMIN_EMAIL || "admin@cropsafe.com"}`,
    `- Password: ${process.env.ADMIN_PASSWORD || "Admin@123"}`,
    "",
    "## Farmer Login",
    "",
    "| Name | Aadhaar | Password | Mobile | Location |",
    "| --- | --- | --- | --- | --- |",
    ...credentials.map((item) => `| ${item.name} | ${item.aadhaar} | ${item.password} | ${item.mobile} | ${item.village}, ${item.district} |`),
    "",
    "## Demo Data Summary",
    "",
    `- Farmers: ${users.length}`,
    `- Farms: ${farms.length}`,
    `- Analyses: ${analyses.length}`,
    `- Reports: ${reports.length}`,
    `- Claims: ${claims.length}`,
  ];

  fs.writeFileSync(path.join(DEMO_EXPORT_DIR, "demo-credentials.md"), markdownLines.join("\n"), "utf8");
  fs.writeFileSync(path.join(DEMO_EXPORT_DIR, "demo-credentials.json"), JSON.stringify(credentials, null, 2), "utf8");

  console.log(`Seed complete:
- Farmers: ${users.length}
- Farms: ${farms.length}
- Analyses: ${analyses.length}
- Reports: ${reports.length}
- Claims: ${claims.length}
- Credentials: ${path.join(DEMO_EXPORT_DIR, "demo-credentials.md")}`);

  await mongoose.disconnect();
}

function damagePercentageToValue(damagePercentage) {
  return 45000 * (Math.max(10, damagePercentage) / 100);
}

main().catch(async (error) => {
  console.error("Demo seed failed:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
