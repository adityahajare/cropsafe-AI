const mongoose = require('mongoose');

const FarmSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  polygonCoordinates: { type: [[Number]], required: true },
  boundaryGeoJson: { type: mongoose.Schema.Types.Mixed },
  boundingBox: {
    minLat: Number,
    minLng: Number,
    maxLat: Number,
    maxLng: Number
  },
  centerLat: { type: Number, required: true },
  centerLng: { type: Number, required: true },
  areaHectares: { type: Number, required: true, min: 0.01 },
  cropType: { type: String, required: true },
  season: { type: String, required: true },
  sowingDate: { type: Date, required: true },
  cropStageAtRegistration: String,
  daysSinceSowingAtRegistration: Number,
  city: String,
  district: String,
  state: String,
  village: String,
  country: { type: String, default: 'India' },
  locationLabel: String,
  farmName: { type: String, required: true, trim: true },
  soilType: { type: String, required: true, trim: true },
  cityBoundaryVerified: { type: Boolean, default: false },
  dataQuality: {
    boundaryPoints: Number,
    hasValidBoundary: Boolean,
    hasValidCenter: Boolean,
    hasFarmerLocation: Boolean,
    source: String,
    lastMetadataRefresh: Date
  },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Farm', FarmSchema);
