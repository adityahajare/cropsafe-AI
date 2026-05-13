const Claim = require("../models/Claim.model");
const User = require("../models/User.model");
const Farm = require("../models/Farm.model");
const SatelliteAnalysis = require("../models/SatelliteAnalysis");

// ================= SUBMIT CLAIM =================
exports.submitClaim = async (req, res) => {
  try {
    const { farmId, notes } = req.body;
    const farmerId = req.user.id;

    if (!farmId) {
      return res.status(400).json({
        success: false,
        message: "farmId is required"
      });
    }

    // Validate farmer exists
    const user = await User.findById(farmerId);
    if (!user || user.role !== 'farmer') {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    // Validate farm belongs to farmer
    const farm = await Farm.findOne({ _id: farmId, farmerId });
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or doesn't belong to you"
      });
    }

    // Get latest analysis for this farm
    const analysis = await SatelliteAnalysis.findOne({ farmId }).sort({ analysisDate: -1 });
    
    if (!analysis) {
      return res.status(400).json({
        success: false,
        message: "Please run NDVI analysis first before submitting a claim"
      });
    }

    // Check for existing pending claim
    const existingClaim = await Claim.findOne({ 
      farmId, 
      status: { $in: ['pending', 'under_review'] } 
    });
    
    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending claim for this farm"
      });
    }

    const claim = new Claim({
      farmId,
      analysisId: analysis._id,
      claimAmount: analysis.estimatedLoss,
      status: 'pending',
      notes: notes || '',
      adminRemarks: ''
    });

    await claim.save();

    return res.status(201).json({
      success: true,
      message: "Claim submitted successfully",
      data: claim
    });

  } catch (err) {
    console.error("SUBMIT CLAIM ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ================= GET MY CLAIMS =================
exports.getFarmerClaims = async (req, res) => {
  try {
    const farmerId = req.user.id;

    // Get all farms belonging to this farmer
    const farms = await Farm.find({ farmerId });
    const farmIds = farms.map(f => f._id);

    const claims = await Claim.find({ farmId: { $in: farmIds } })
      .sort({ createdAt: -1 })
      .populate('farmId', 'cropType areaHectares season')
      .populate('analysisId', 'ndviValue damagePercentage riskLevel');

    return res.json({
      success: true,
      count: claims.length,
      data: claims
    });

  } catch (err) {
    console.error("GET CLAIMS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ================= GET SINGLE CLAIM =================
exports.getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('farmId', 'cropType areaHectares season centerLat centerLng')
      .populate('analysisId', 'ndviValue ndviMin ndviMax vegetationHealth healthPercentage damagePercentage estimatedLoss riskLevel recommendation');

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    return res.json({
      success: true,
      data: claim
    });

  } catch (err) {
    console.error("GET CLAIM ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ================= UPDATE CLAIM STATUS (ADMIN) =================
exports.updateClaimStatus = async (req, res) => {
  try {
    const { status, approvedAmount, adminRemarks } = req.body;

    const allowedStatus = ["pending", "under_review", "approved", "rejected"];

    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Allowed: pending, under_review, approved, rejected"
      });
    }

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    // Update fields
    if (status) claim.status = status;
    if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
    if (adminRemarks) claim.adminRemarks = adminRemarks;
    
    claim.adminVerified = status === 'approved';
    claim.decisionDate = new Date();

    await claim.save();

    return res.json({
      success: true,
      message: `Claim ${status} successfully`,
      data: claim
    });

  } catch (err) {
    console.error("UPDATE CLAIM ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ================= GET ALL CLAIMS (ADMIN) =================
exports.getAllClaims = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const claims = await Claim.find(query)
      .sort({ createdAt: -1 })
      .populate('farmId', 'cropType areaHectares season centerLat centerLng')
      .populate('analysisId', 'ndviValue damagePercentage riskLevel');

    return res.json({
      success: true,
      count: claims.length,
      data: claims
    });

  } catch (err) {
    console.error("GET ALL CLAIMS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};