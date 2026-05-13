const Farm = require("../models/Farm.model");
const User = require("../models/User.model");

// ===============================
// ✅ SAVE FARM
// ===============================
const saveFarmBoundary = async (req, res) => {
  try {
    console.log("📥 DATA RECEIVED:", req.body);

    const {
      polygonCoordinates,  // ✅ Changed from boundary
      centerLat,          // ✅ Changed from centerCoordinates.lat
      centerLng,          // ✅ Changed from centerCoordinates.lng
      cropType,           // ✅ Changed from crop
      season,
      areaHectares,       // ✅ Changed from landSize
      sowingDate,         // ✅ REQUIRED - must be provided
      city,
      cityBoundaryVerified
    } = req.body;

    const farmerId = req.user.id; // ✅ from JWT

    // 🔥 VALIDATION - Check all required fields
    if (!polygonCoordinates || polygonCoordinates.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm boundary (polygonCoordinates required with at least 3 points)",
      });
    }

    if (!centerLat || !centerLng) {
      return res.status(400).json({
        success: false,
        message: "centerLat and centerLng are required",
      });
    }

    if (!cropType || !season || !areaHectares || !sowingDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: cropType, season, areaHectares, sowingDate",
      });
    }

    // ✅ Verify farmer exists
    const user = await User.findById(farmerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    // ✅ SAVE FARM with correct schema fields
    const farm = new Farm({
      farmerId,
      polygonCoordinates,     // ✅ matches schema
      centerLat,              // ✅ matches schema
      centerLng,              // ✅ matches schema
      areaHectares,           // ✅ matches schema
      cropType,               // ✅ matches schema
      season,                 // ✅ matches schema
      sowingDate: new Date(sowingDate),  // ✅ matches schema
      city: city || user.city || '',
      cityBoundaryVerified: cityBoundaryVerified || false,
      status: 'active'
    });

    await farm.save();

    return res.status(201).json({
      success: true,
      message: "Farm saved successfully",
      data: farm,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ===============================
// ✅ GET MY FARMS (IMPORTANT FOR UI)
// ===============================
const getMyFarms = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const farms = await Farm.find({ farmerId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: farms.length,
      data: farms,
    });

  } catch (err) {
    console.error("GET FARMS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching farms",
    });
  }
};

// ===============================
// ✅ GET SINGLE FARM
// ===============================
const getFarmById = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    const farm = await Farm.findOne({ _id: id, farmerId });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    res.json({
      success: true,
      data: farm,
    });

  } catch (err) {
    console.error("GET FARM ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching farm",
    });
  }
};

// ===============================
// ✅ UPDATE FARM
// ===============================
const updateFarm = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;
    
    // Don't allow updating farmerId
    delete req.body.farmerId;

    const farm = await Farm.findOneAndUpdate(
      { _id: id, farmerId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    res.json({
      success: true,
      data: farm,
    });

  } catch (err) {
    console.error("UPDATE FARM ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

// ===============================
// ✅ DELETE FARM
// ===============================
const deleteFarm = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    const farm = await Farm.findOneAndDelete({ _id: id, farmerId });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    res.json({
      success: true,
      message: "Deleted successfully",
    });

  } catch (err) {
    console.error("DELETE FARM ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

module.exports = {
  saveFarmBoundary,
  getMyFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
};