const mongoose = require('mongoose');

const SatelliteAnalysisSchema = new mongoose.Schema({
  farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  ndviValue: { type: Number, required: true, min: 0, max: 1 },
  ndviMin: { type: Number, min: 0, max: 1 },
  ndviMax: { type: Number, min: 0, max: 1 },
  vegetationHealth: { type: String, enum: ['Excellent', 'Good', 'Moderate', 'Poor', 'Critical'], required: true },
  healthPercentage: { type: Number, required: true, min: 0, max: 100 },
  damagePercentage: { type: Number, required: true, min: 0, max: 100 },
  estimatedLoss: { type: Number, required: true, min: 0 },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
  recommendation: { type: String, required: true },
  problemTitle: String,
  problemSummary: String,
  damageCause: String,
  damageSeverity: String,
  ndviDelta: Number,
  evidence: { type: [String], default: [] },
  actionItems: { type: [String], default: [] },
  temperature: { type: Number },
  rainfall: { type: Number },
  humidity: { type: Number },
  currentImageUrl: String,
  previousImageUrl: String,
  ndviLayerUrl: String,
  imageSamples: {
    type: [
      {
        label: String,
        kind: String,
        from: String,
        to: String,
        url: String,
      },
    ],
    default: [],
  },
  imagerySource: String,
  imageryStatus: String,
  analysisDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SatelliteAnalysis', SatelliteAnalysisSchema);
