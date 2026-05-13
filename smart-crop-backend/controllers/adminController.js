const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User.model");
const Report = require("../models/Report");
const Farm = require("../models/Farm.model");

/* ================= SIGN TOKEN ================= */
function signToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      role: user.role,
      type: "admin"
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

/* ================= ADMIN LOGIN (ROBUST FINAL VERSION) ================= */
async function loginAdmin(req, res) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    email = email.trim().toLowerCase();

    /* ================= 1. ENV ADMIN (PRIMARY) ================= */
    const isEnvAdmin =
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD;

    if (isEnvAdmin) {
      const envAdmin = {
        _id: "env-admin",
        id: "env-admin",
        email,
        role: "admin"
      };

      return res.json({
        success: true,
        token: signToken(envAdmin),
        user: envAdmin
      });
    }

    /* ================= 2. DB ADMIN (OPTIONAL FALLBACK) ================= */
    const admin = await User.findOne({
      email,
      role: "admin"
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials"
      });
    }

    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials"
      });
    }

    return res.json({
      success: true,
      token: signToken(admin),
      user: {
        id: admin._id,
        email: admin.email,
        role: "admin"
      }
    });

  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during admin login"
    });
  }
}

/* ================= DASHBOARD ================= */
async function getDashboardStats(req, res) {
  try {
    const [
      totalFarmers,
      totalFarms,
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports
    ] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      Farm.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ reportStatus: "PENDING" }),
      Report.countDocuments({ reportStatus: "APPROVED" }),
      Report.countDocuments({ reportStatus: "REJECTED" })
    ]);

    return res.json({
      success: true,
      data: {
        totalFarmers,
        totalFarms,
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats"
    });
  }
}

module.exports = {
  loginAdmin,
  getDashboardStats
};