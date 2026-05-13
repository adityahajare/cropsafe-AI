const axios = require("axios");
const FormData = require("form-data");

exports.detectDisease = async (req, res) => {
  try {
    // ===============================
    // 1. AUTH CHECK
    // ===============================
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // ===============================
    // 2. FILE VALIDATION
    // ===============================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded"
      });
    }

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed"
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image too large (max 5MB)"
      });
    }

    // ===============================
    // 3. PREPARE FORM DATA
    // ===============================
    const formData = new FormData();

    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "crop.jpg",
      contentType: req.file.mimetype
    });

    // ===============================
    // 4. CALL AI SERVICE
    // ===============================
    const aiUrl =
      process.env.AI_SERVICE_URL || "http://localhost:8000/predict";

    const response = await axios.post(aiUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });

    if (!response?.data) {
      return res.status(502).json({
        success: false,
        message: "Invalid AI response"
      });
    }

    const result = response.data;

    // ===============================
    // 5. CLEAN RESPONSE FOR FRONTEND
    // ===============================
    return res.json({
      success: true,
      service: "AI Disease Detection",

      data: {
        disease: result?.disease || "Unknown",
        confidence: result?.confidence || 0,
        treatment: result?.treatment || "No suggestion",
        prevention: result?.prevention || "No suggestion"
      },

      meta: {
        farmerId: req.user.id,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error("AI DETECTION ERROR:", error.message);

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI service is not running"
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "AI service timeout"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Disease detection failed",
      error: error.message
    });
  }
};