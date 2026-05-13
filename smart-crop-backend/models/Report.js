const mongoose = require('mongoose');

const DecisionHistorySchema = new mongoose.Schema(
  {
    status: { type: String },
    remark: { type: String },
    actor: { type: String },
    decidedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true, index: true },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'SatelliteAnalysis' },

    pdfPath: { type: String },
    caseNumber: { type: String, index: true },

    // Used heavily by admin dashboard filtering/counting
    reportStatus: { type: String, default: 'DRAFT', index: true },
    submittedToAdmin: { type: Boolean, default: false },

    decisionHistory: { type: [DecisionHistorySchema], default: [] },

    generatedAt: { type: Date, default: Date.now },
  },
  // IMPORTANT: generateReport() attaches many more fields (satellite, financial, recommendation, etc.)
  // These need to be persisted so the frontend can render them.
  { strict: false }
);

module.exports = mongoose.model('Report', ReportSchema);
