const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet"); // ✅ Add for security
const compression = require("compression"); // ✅ Add for performance
const morgan = require("morgan"); // ✅ Add for logging

const path = require("path");

// Load env
dotenv.config();

// Routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const analysisRoutes = require("./routes/analysis.routes");
const farmRoutes = require("./routes/farm.routes");
const claimRoutes = require("./routes/claim.routes");
const reportRoutes = require("./routes/reportRoutes");
const weatherRoutes = require("./routes/weather.routes");
const diseaseRoutes = require("./routes/diseaseRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const riskRoutes = require("./routes/riskRoutes");
const locationRoutes = require("./routes/location.routes");
const satelliteRoutes = require("./routes/optimizedSatelliteRoutes");
const ndviRoutes = require("./routes/ndviRoutes");

// ✅ Check if imageRoutes exists, if not, create a placeholder
let imageRoutes;
try {
  imageRoutes = require("./routes/imageRoutes");
  console.log("✅ Image routes loaded");
} catch (err) {
  console.warn("⚠️ Image routes not found, creating placeholder");
  imageRoutes = express.Router();
  imageRoutes.get("/", (req, res) => {
    res.json({ message: "Image routes - upload functionality coming soon" });
  });
}

const app = express();

// Security & Performance Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
})); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // CORS support
app.use(express.json({ limit: "10mb" })); // Parse JSON with size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/assets", express.static(path.join(__dirname, "public", "assets")));

// Logging in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Smart Crop Insurance Backend Running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      admin: "/api/admin",
      analysis: "/api/analysis",
      farms: "/api/farms",
      claims: "/api/claims",
      reports: "/api/reports",
      weather: "/api/weather",
      locations: "/api/locations",
      diseases: "/api/diseases",
      assistant: "/api/assistant",
      risk: "/api/risk",
      satellite: "/api/satellite",
      ndvi: "/api/ndvi",
      images: "/api/images"
    }
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Smart Crop Insurance API is running",
    version: "1.0.0",
    baseUrl: "/api",
    endpoints: {
      auth: "/api/auth",
      admin: "/api/admin",
      analysis: "/api/analysis",
      farms: "/api/farms",
      claims: "/api/claims",
      reports: "/api/reports",
      weather: "/api/weather",
      locations: "/api/locations",
      diseases: "/api/diseases",
      assistant: "/api/assistant",
      risk: "/api/risk",
      satellite: "/api/satellite",
      ndvi: "/api/ndvi",
      images: "/api/images"
    }
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/farms", farmRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/diseases", diseaseRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/satellite", satelliteRoutes);
app.use("/api/ndvi", ndviRoutes);
app.use("/api/images", imageRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("❌ Fatal Error: MONGODB_URI or MONGO_URI is not defined in .env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`\n📋 Available API endpoints:`);
      console.log(`   POST   /api/auth/register`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   POST   /api/auth/admin-login`);
      console.log(`   GET    /api/admin/stats`);
      console.log(`   POST   /api/analysis/run/:farmId`);
      console.log(`   GET    /api/farms`);
      console.log(`   POST   /api/claims/submit/:farmId`);
      console.log(`   GET    /api/weather/current/:city`);
      console.log(`   POST   /api/reports/generate`);
      console.log(`\n✅ Server ready to accept requests\n`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Please ensure MongoDB is running and the connection string is correct");
    process.exit(1);
  });

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === "production" 
    ? "Internal Server Error" 
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  // Don't crash the server, just log
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // Log but don't exit immediately
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

module.exports = app; // For testing purposes
