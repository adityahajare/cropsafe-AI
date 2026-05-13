const Farm = require("../models/Farm.model");
const User = require("../models/User.model");

const saveFarmBoundary = async (req, res) => {
  try {
    console.log("📥 Incoming Data:", req.body);

    const {
      polygonCoordinates,  // ✅ Changed from boundary
      centerLat,          // ✅ Changed from centerCoordinates.lat
      centerLng,          // ✅ Changed from centerCoordinates.lng
      cropType,           // ✅ Changed from crop
      season,
      areaHectares,       // ✅ Changed from landSize
      sowingDate,         // ✅ REQUIRED field
      city,
      cityBoundaryVerified
    } = req.body;

    // ✅ get farmerId from JWT
    const farmerId = req.user.id;

    // ❌ validation
    if (
      !farmerId ||
      !polygonCoordinates ||
      !Array.isArray(polygonCoordinates) ||
      polygonCoordinates.length < 3 ||
      !centerLat ||
      !centerLng ||
      !cropType ||
      !season ||
      !areaHectares ||
      !sowingDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: polygonCoordinates, centerLat, centerLng, cropType, season, areaHectares, sowingDate"
      });
    }

    // ✅ check farmer exists
    const user = await User.findById(farmerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    // ✅ create farm with correct schema fields
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
      data: farm
    });

  } catch (err) {
    console.error("❌ SAVE FARM ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while saving farm",
      error: err.message
    });
  }
};

// ✅ Additional: Get all farms for a farmer
const getFarmerFarms = async (req, res) => {
  try {
    const farmerId = req.user.id;
    
    const farms = await Farm.find({ farmerId }).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      count: farms.length,
      data: farms
    });
  } catch (err) {
    console.error("GET FARMS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farms",
      error: err.message
    });
  }
};

// ✅ Additional: Get single farm by ID
const getFarmById = async (req, res) => {
  try {
    const { farmId } = req.params;
    const farmerId = req.user.id;
    
    const farm = await Farm.findOne({ _id: farmId, farmerId });
    
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found"
      });
    }
    
    return res.json({
      success: true,
      data: farm
    });
  } catch (err) {
    console.error("GET FARM ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farm",
      error: err.message
    });
  }
};

// ✅ Additional: Update farm
const updateFarm = async (req, res) => {
  try {
    const { farmId } = req.params;
    const farmerId = req.user.id;
    
    const updateData = req.body;
    
    const farm = await Farm.findOneAndUpdate(
      { _id: farmId, farmerId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found"
      });
    }
    
    return res.json({
      success: true,
      message: "Farm updated successfully",
      data: farm
    });
  } catch (err) {
    console.error("UPDATE FARM ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update farm",
      error: err.message
    });
  }
};

// ✅ Additional: Delete farm
const deleteFarm = async (req, res) => {
  try {
    const { farmId } = req.params;
    const farmerId = req.user.id;
    
    const farm = await Farm.findOneAndDelete({ _id: farmId, farmerId });
    
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found"
      });
    }
    
    return res.json({
      success: true,
      message: "Farm deleted successfully"
    });
  } catch (err) {
    console.error("DELETE FARM ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete farm",
      error: err.message
    });
  }
};

module.exports = { 
  saveFarmBoundary, 
  getFarmerFarms, 
  getFarmById, 
  updateFarm, 
  deleteFarm 
};