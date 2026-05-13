const mongoose = require('mongoose');
const crypto = require('crypto');

const ClaimSchema = new mongoose.Schema({
  farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'SatelliteAnalysis' },
  claimNumber: { type: String, unique: true },
  claimAmount: { type: Number, required: true, min: 0 },
  approvedAmount: { type: Number, min: 0 },
  status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected'], default: 'pending' },
  adminRemarks: String,
  adminVerified: { type: Boolean, default: false },
  decisionDate: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate claim number before saving
ClaimSchema.pre('save', function (next) {
  if (!this.claimNumber) {
    const ts = Date.now();
    const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    this.claimNumber = `CLM-${ts}-${suffix}`;
  }

  this.updatedAt = Date.now();
  next();
});
ClaimSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Claim', ClaimSchema);
