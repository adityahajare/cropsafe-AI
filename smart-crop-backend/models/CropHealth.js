const mongoose = require('mongoose');

const CropHealthSchema = new mongoose.Schema({
  farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  healthScore: { type: Number, min: 0, max: 100 },
  stressLevel: { type: String },
  recommendation: { type: String },
  recordedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CropHealth', CropHealthSchema);