const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User.model");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

/* =========================
   HELPERS
========================= */
const generateToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing in .env");
  }
  // Standardizing payload to { id, role }
  return jwt.sign(
    { id: payload.id || payload._id, role: payload.role },
    process.env.JWT_SECRET,
    { expiresIn: payload.role === "admin" ? "1d" : "7d" }
  );
};

/* =========================
   REGISTER FARMER
========================= */
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      aadhaar,
      mobile,
      village,
      district,
      city,
      state,
      password,
    } = req.body;

    if (!name || !aadhaar || !mobile || !village || !district || !city || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, Aadhaar, mobile, village, district, city, and password are required",
      });
    }

    if (!/^[0-9]{12}$/.test(String(aadhaar))) {
      return res.status(400).json({ success: false, message: "Aadhaar must be 12 digits" });
    }

    if (!/^[6-9][0-9]{9}$/.test(String(mobile))) {
      return res.status(400).json({ success: false, message: "Mobile must be a valid 10 digit Indian number" });
    }

    const exists = await User.findOne({
      $or: [{ aadhaar }, { mobile }],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Ensure password is a string for bcrypt
    const hashed = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name,
      aadhaar,
      mobile,
      village,
      district,
      city,
      state: state || "Maharashtra",
      password: hashed,
      role: "farmer",
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        aadhaar: user.aadhaar,
        mobile: user.mobile,
        village: user.village,
        district: user.district,
        city: user.city,
        state: user.state,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err); // 👈 IMPORTANT
    return res.status(500).json({
      success: false,
      message: err.message || "Server error during registration",
    });
  }
});
/* =========================
   FARMER LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { aadhaar, password } = req.body;

    const user = await User.findOne({ aadhaar, role: "farmer" });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        aadhaar: user.aadhaar,
        mobile: user.mobile,
        village: user.village,
        district: user.district,
        city: user.city,
        state: user.state,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =========================
   ADMIN LOGIN (ENV ONLY)
   ✅ NO DB
   ✅ NO MODEL
   ✅ NO 401 LOOP BUG
========================= */
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();

    if (
      cleanEmail !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const admin = {
      id: "env-admin",
      name: "Admin",
      email: process.env.ADMIN_EMAIL,
      role: "admin",
    };

    const token = generateToken(admin);

    return res.json({
      success: true,
      token,
      user: admin
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =========================
   PROFILE
========================= */
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
