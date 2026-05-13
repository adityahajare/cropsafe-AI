const Farm = require("../models/Farm.model");
const User = require("../models/User.model");
const Report = require("../models/Report");
const Analysis = require("../models/SatelliteAnalysis");
const events = require("../services/reportEvents");

// ================= HELPER =================
function buildSeries(analyses) {
  return analyses
    .slice()
    .reverse()
    .map((analysis) => ({
      label: new Date(analysis.analysisDate || analysis.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      value: Number((analysis.ndviValue || 0).toFixed(4)),
      rain: typeof analysis.rainfall === "number" ? analysis.rainfall : null,
    }));
}

function buildFinancials(area, damagePercent) {
  const a = area || 1;

  const insuredValue = a * 58000;
  const estimatedYieldValue = a * 46000;

  const estimatedLossValue = (estimatedYieldValue * damagePercent) / 100;
  const currentYieldValue = estimatedYieldValue - estimatedLossValue;
  const compensationEstimate = estimatedLossValue * 0.72;

  return {
    insuredValue: Math.round(insuredValue),
    estimatedYieldValue: Math.round(estimatedYieldValue),
    currentYieldValue: Math.round(currentYieldValue),
    estimatedLossValue: Math.round(estimatedLossValue),
    compensationEstimate: Math.round(compensationEstimate),
  };
}

function buildCaseNumber(farmId) {
  const year = new Date().getFullYear();
  const farmSuffix = String(farmId || "")
    .slice(-6)
    .toUpperCase();
  const timeSuffix = Date.now().toString(36).toUpperCase();

  return `CROP-${year}-${farmSuffix}-${timeSuffix}`;
}

// ================= MAIN =================
async function generateReport(req, res) {
  try {
    const farmerId = req.user.id;
    const { farmId: requestedFarmId, submit = false } = req.body;

    // ================= FETCH DATA =================
    const [farm, user] = await Promise.all([
      Farm.findOne({
        farmerId,
        ...(requestedFarmId ? { _id: requestedFarmId } : {}),
      }),
      User.findById(farmerId),
    ]);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    // ================= ANALYSIS =================
    const analyses = await Analysis.find({ farmId: farm._id })
      .sort({ analysisDate: -1, createdAt: -1 })
      .limit(6);

    if (!analyses.length) {
      return res.status(400).json({
        success: false,
        message: "Run farm analysis before generating report.",
      });
    }

    const latestAnalysis = analyses[0];
    const currentNDVI = latestAnalysis.ndviValue || 0;
    const baselineNDVI =
      typeof latestAnalysis.ndviDelta === "number"
        ? currentNDVI - latestAnalysis.ndviDelta
        : currentNDVI;
    const damagePercent = Math.max(0, Math.round(latestAnalysis.damagePercentage || 0));
    const confidence = latestAnalysis.imageryStatus === "sentinel" ? 92 : 70;

    const area = farm.areaHectares || 1;

    // ================= BUILD REPORT DATA =================
    const reportData = {
      farmerId,
      farmId: farm._id,
      analysisId: latestAnalysis._id,
      reportStatus: submit ? "PENDING" : "DRAFT",
      submittedToAdmin: submit,
      
      // Store additional data in dynamic fields (strict: false allows this)
      damagePercent,
      confidence,
      cropType: farm.cropType,
      areaHectares: area,
      season: farm.season,
      
      // Farmer info from User model
      farmerInfo: {
        name: user?.name || 'Unknown',
        mobile: user?.mobile || 'N/A',
        village: user?.village || '',
        district: user?.district || '',
        aadhaar: user?.aadhaar ? '****' + user.aadhaar.slice(-4) : 'N/A'
      },
      
      // NDVI Series for chart
      ndviSeries: buildSeries(analyses),
      
      // Satellite data
      satelliteData: {
        beforeImage: latestAnalysis.previousImageUrl || null,
        afterImage: latestAnalysis.currentImageUrl || null,
        ndviBeforeImage: null,
        ndviAfterImage: latestAnalysis.ndviLayerUrl || null,
        changeMapImage: latestAnalysis.ndviLayerUrl || null,
        source: latestAnalysis.imagerySource || "Sentinel Hub",
        status: latestAnalysis.imageryStatus || "unknown",
        currentNDVI: parseFloat(currentNDVI.toFixed(4)),
        baselineNDVI: parseFloat(baselineNDVI.toFixed(4)),
        ndviDelta:
          typeof latestAnalysis.ndviDelta === "number"
            ? parseFloat(latestAnalysis.ndviDelta.toFixed(3))
            : parseFloat((currentNDVI - baselineNDVI).toFixed(3)),
      },
      
      // Financial calculations
      financialData: buildFinancials(area, damagePercent),
      
      // AI Recommendation
      aiRecommendation: {
        riskLevel: latestAnalysis.riskLevel || 'Medium',
        damageDetected: damagePercent > 20,
        riskScore: damagePercent,
        problemTitle: latestAnalysis.problemTitle || null,
        problemSummary: latestAnalysis.problemSummary || null,
        damageCause: latestAnalysis.damageCause || null,
        evidence: latestAnalysis.evidence || [],
        actionItems: latestAnalysis.actionItems || [],
        finalDecision: damagePercent > 50
          ? "Recommend claim approval"
          : damagePercent > 25
          ? "Manual review required"
          : "No claim needed",
        summary: damagePercent > 50
          ? "Severe crop loss detected"
          : damagePercent > 25
          ? "Moderate crop stress detected"
          : "Crop condition mostly stable",
        confidenceLabel: confidence > 80 ? "High" : confidence > 60 ? "Medium" : "Low",
        nextAction: submit ? "Send to admin review" : "Monitor field",
      },
      
      // Weather impact
      weatherImpact: {
        temperature: typeof latestAnalysis.temperature === "number" ? latestAnalysis.temperature : null,
        rainfall: typeof latestAnalysis.rainfall === "number" ? latestAnalysis.rainfall : null,
        humidity: typeof latestAnalysis.humidity === "number" ? latestAnalysis.humidity : null,
      },
      
      // Statistics
      statistics: {
        currentNDVI: parseFloat(currentNDVI.toFixed(4)),
        baselineNDVI: parseFloat(baselineNDVI.toFixed(4)),
        damagePercent,
        confidence
      }
    };

    // ================= UPSERT =================
    let report = await Report.findOne({
      farmerId,
      farmId: farm._id,
    });

    reportData.caseNumber = report?.caseNumber || buildCaseNumber(farm._id);

    if (report) {
      report.set(reportData);
    } else {
      report = new Report(reportData);
    }

    if (submit) {
      report.decisionHistory = report.decisionHistory || [];
      report.decisionHistory.push({
        status: "PENDING",
        remark: "Submitted for review",
        actor: user?.name || "Farmer",
        decidedAt: new Date(),
      });
    }

    await report.save();

    // ================= EVENTS =================
    events.broadcast("report-updated", {
      reportId: report._id,
      status: report.reportStatus,
      farmerId: report.farmerId,
    });

    return res.json({
      success: true,
      data: report,
    });

  } catch (err) {
    console.error("REPORT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Report generation failed",
      error: err.message,
    });
  }
}

async function listReports(req, res) {
  try {
    const { status, location } = req.query;

    const query = {};
    if (status && typeof status === "string") {
      query.reportStatus = status.toUpperCase();
    }

    if (location && typeof location === "string" && location.trim()) {
      query["farmerInfo.village"] = { $regex: location.trim(), $options: "i" };
    }

    const reports = await Report.find(query)
      .populate('farmerId', 'name mobile')
      .populate('farmId', 'cropType areaHectares season')
      .sort({ generatedAt: -1 });

    return res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    console.error("LIST REPORTS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

async function listMyReports(req, res) {
  try {
    const farmerId = req.user.id;
    const { status, farmId } = req.query;

    const query = { farmerId };
    if (status && typeof status === "string") {
      query.reportStatus = status.toUpperCase();
    }
    if (farmId && typeof farmId === "string") {
      query.farmId = farmId;
    }

    const reports = await Report.find(query)
      .populate('farmId', 'farmName cropType areaHectares season centerLat centerLng')
      .sort({ generatedAt: -1, createdAt: -1 });

    return res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    console.error("LIST MY REPORTS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

async function getReport(req, res) {
  try {
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate('farmerId', 'name mobile aadhaar village district')
      .populate('farmId', 'cropType areaHectares season centerLat centerLng');

    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: "Report not found" 
      });
    }

    return res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error("GET REPORT ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

async function submitReportToAdmin(req, res) {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    const report = await Report.findOne({ _id: id, farmerId });
    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: "Report not found" 
      });
    }

    report.reportStatus = "PENDING";
    report.submittedToAdmin = true;

    report.decisionHistory = report.decisionHistory || [];
    report.decisionHistory.push({
      status: "PENDING",
      remark: "Submitted for review",
      actor: report.farmerInfo?.name || "Farmer",
      decidedAt: new Date(),
    });

    await report.save();

    events.broadcast("report-updated", {
      reportId: report._id,
      status: report.reportStatus,
      farmerId: report.farmerId,
    });

    return res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error("SUBMIT REPORT ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

async function decideReport(req, res) {
  try {
    const { id } = req.params;
    const { status, remark, adminName } = req.body;

    const allowed = ["APPROVED", "REJECTED"];
    const nextStatus = typeof status === "string" ? status.toUpperCase() : "";
    
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid status. Must be APPROVED or REJECTED" 
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: "Report not found" 
      });
    }

    report.reportStatus = nextStatus;
    report.submittedToAdmin = true;

    report.decisionHistory = report.decisionHistory || [];
    report.decisionHistory.push({
      status: nextStatus,
      remark: remark || "",
      actor: adminName || "Admin",
      decidedAt: new Date(),
    });

    await report.save();

    events.broadcast("report-updated", {
      reportId: report._id,
      status: report.reportStatus,
      farmerId: report.farmerId,
    });

    return res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error("DECIDE REPORT ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  generateReport,
  listMyReports,
  listReports,
  getReport,
  submitReportToAdmin,
  decideReport,
};
