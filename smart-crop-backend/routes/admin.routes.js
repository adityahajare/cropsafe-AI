const express = require('express');
const User = require('../models/User.model');
const Farm = require('../models/Farm.model');
const Claim = require('../models/Claim.model');
const Analysis = require('../models/SatelliteAnalysis');
const Report = require('../models/Report');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.use((req, res, next) => {
  authenticate(req, res, (authError) => {
    if (authError || !req.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing token',
      });
    }

    isAdmin(req, res, (adminError) => {
      if (adminError) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      next();
    });
  });
});

function withClaimPopulation(query) {
  return query.populate({
    path: 'farmId',
    select: 'cropType areaHectares season centerLat centerLng farmerId',
    populate: {
      path: 'farmerId',
      select: 'name aadhaar mobile village district city',
    },
  });
}

function enrichClaim(claim) {
  const plain = typeof claim.toObject === 'function' ? claim.toObject() : claim;
  const farmer = plain.farmId?.farmerId;

  return {
    ...plain,
    farmerName: farmer?.name || plain.farmerName || 'Unknown',
    farmerAadhaar: farmer?.aadhaar || plain.farmerAadhaar || 'N/A',
    farmerMobile: farmer?.mobile || plain.farmerMobile || 'N/A',
    farmerVillage: farmer?.village || plain.farmerVillage || 'N/A',
    farmerDistrict: farmer?.district || plain.farmerDistrict || 'N/A',
    farmerCity: farmer?.city || plain.farmerCity || 'N/A',
  };
}

router.get('/stats', async (req, res) => {
  try {
    const [
      totalFarmers,
      totalFarms,
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      underReviewClaims,
      totalAnalysis,
      lowNdviAlerts,
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports,
    ] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      Farm.countDocuments(),
      Claim.countDocuments(),
      Claim.countDocuments({ status: 'pending' }),
      Claim.countDocuments({ status: 'approved' }),
      Claim.countDocuments({ status: 'rejected' }),
      Claim.countDocuments({ status: 'under_review' }),
      Analysis.countDocuments(),
      Analysis.countDocuments({
        $or: [
          { ndviValue: { $lt: 0.3 } },
          { damagePercentage: { $gte: 50 } },
          { riskLevel: { $in: ['High', 'Critical'] } },
        ],
      }),
      Report.countDocuments(),
      Report.countDocuments({ reportStatus: 'PENDING' }),
      Report.countDocuments({ reportStatus: 'APPROVED' }),
      Report.countDocuments({ reportStatus: 'REJECTED' }),
    ]);

    const [totalClaimAmount, approvedAmount] = await Promise.all([
      Claim.aggregate([{ $group: { _id: null, total: { $sum: '$claimAmount' } } }]),
      Claim.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$approvedAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalFarmers,
        totalFarms,
        totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        underReviewClaims,
        totalAnalysis,
        lowNdviAlerts,
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        expiringPolicies: 0,
        totalClaimAmount: totalClaimAmount[0]?.total || 0,
        approvedAmount: approvedAmount[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
    });
  }
});

router.get('/claims/pending', async (req, res) => {
  try {
    const claims = await withClaimPopulation(
      Claim.find({ status: { $in: ['pending', 'under_review'] } }).sort({ createdAt: -1 })
    );

    res.json({ success: true, claims: claims.map(enrichClaim) });
  } catch (error) {
    console.error('Pending claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims',
    });
  }
});

router.get('/claims', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const claims = await withClaimPopulation(Claim.find(query).sort({ createdAt: -1 }));

    res.json({ success: true, claims: claims.map(enrichClaim) });
  } catch (error) {
    console.error('All claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims',
    });
  }
});

router.get('/claims/:claimId', async (req, res) => {
  try {
    const claim = await withClaimPopulation(Claim.findById(req.params.claimId));

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    res.json({ success: true, claim: enrichClaim(claim) });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claim',
    });
  }
});

router.put('/claims/:claimId', async (req, res) => {
  try {
    const { status, approvedAmount, adminRemarks } = req.body;

    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const claim = await Claim.findById(req.params.claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    claim.status = status;
    claim.adminVerified = status === 'approved';
    claim.decisionDate = new Date();

    if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
    if (adminRemarks !== undefined) claim.adminRemarks = adminRemarks;

    await claim.save();

    const updatedClaim = await withClaimPopulation(Claim.findById(claim._id));

    res.json({
      success: true,
      message: `Claim ${status} successfully`,
      claim: enrichClaim(updatedClaim),
    });
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim',
    });
  }
});

router.get('/farmers', async (req, res) => {
  try {
    const farmers = await User.find({ role: 'farmer' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, farmers });
  } catch (error) {
    console.error('Farmers list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmers',
    });
  }
});

module.exports = router;
