const express = require("express");
const authMiddleware = require("../middleware/auth"); // ✅ FIXED
const { authenticate, isAdmin } = authMiddleware;

const {
  generateReport,
  listMyReports,
  listReports,
  getReport,
  submitReportToAdmin,
  decideReport,
} = require("../controllers/reportController");

const router = express.Router();

// POST /api/reports/generate (farmer)
router.post("/generate", authenticate, generateReport);

// GET /api/reports/my (farmer)
router.get("/my", authenticate, listMyReports);

// POST /api/reports/:id/submit (farmer -> submit to admin)
router.post("/:id/submit", authenticate, submitReportToAdmin);

// GET /api/reports (admin only)
router.get("/", authenticate, isAdmin, listReports);

// GET /api/reports/:id (admin only)
router.get("/:id", authenticate, isAdmin, getReport);

// PUT /api/reports/:id/decide (admin approve/reject)
router.put("/:id/decide", authenticate, isAdmin, decideReport);

module.exports = router;
