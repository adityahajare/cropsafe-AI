const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { runDiseaseVisionDiagnosis } = require('../services/openaiAssistantService');
const { runPythonDiseaseDiagnosis } = require('../services/pythonDiseaseService');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG crop images are supported'));
    }
  }
});
const { authenticate } = require('../middleware/auth');  // ✅ ADD THIS

// Disease database
const diseaseDatabase = {
  'Rice': {
    'Blast': { 
      symptoms: 'Lesions on leaves, collar rot', 
      treatment: 'Apply fungicide, use resistant varieties',
      severity: 'High'
    },
    'Blight': { 
      symptoms: 'Wilting, yellowing leaves', 
      treatment: 'Copper-based fungicides, remove infected plants',
      severity: 'Critical'
    },
    'Brown Spot': { 
      symptoms: 'Brown spots on leaves', 
      treatment: 'Foliar spray, maintain proper spacing',
      severity: 'Medium'
    }
  },
  'Wheat': {
    'Rust': { 
      symptoms: 'Orange-red pustules on leaves', 
      treatment: 'Fungicide application, resistant varieties',
      severity: 'High'
    },
    'Smut': { 
      symptoms: 'Black powdery mass on grains', 
      treatment: 'Seed treatment, crop rotation',
      severity: 'Medium'
    }
  },
  'Maize': {
    'Leaf Blight': { 
      symptoms: 'Elliptical lesions on leaves', 
      treatment: 'Fungicides, resistant hybrids',
      severity: 'High'
    }
  },
  'Soybean': {
    'Rust': { 
      symptoms: 'Brown lesions on leaves', 
      treatment: 'Early fungicide application',
      severity: 'High'
    }
  },
  'Cotton': {
    'Wilt': { 
      symptoms: 'Wilting, yellowing leaves', 
      treatment: 'Resistant varieties, crop rotation',
      severity: 'Critical'
    },
    'Boll Rot': { 
      symptoms: 'Rotting bolls', 
      treatment: 'Insect control, fungicides',
      severity: 'High'
    }
  }
};

function mapPlantNetResult(result) {
  const description = result?.description || result?.label || result?.name || 'Possible crop issue';
  const score = Number(result?.score || 0);
  return {
    name: description,
    confidence: score,
    severity: score >= 0.75 ? 'High' : score >= 0.45 ? 'Medium' : 'Low',
    problem: `${description} matched by external disease image API with ${Math.round(score * 100)}% confidence.`,
    solution: 'Compare symptoms in the field, isolate affected plants if spreading, and confirm treatment with a local agriculture officer before spraying.',
    relatedImage: result?.images?.[0]?.url?.m || result?.images?.[0]?.url?.s || null,
    providerCode: result?.name || null
  };
}

async function diagnoseWithPlantNet(file) {
  if (!process.env.PLANTNET_API_KEY) return null;

  const form = new FormData();
  form.append('images', file.buffer, {
    filename: file.originalname || 'crop.jpg',
    contentType: file.mimetype,
  });
  form.append('organs', 'leaf');

  const url = `https://my-api.plantnet.org/v2/diseases/identify?include-related-images=true&no-reject=true&nb-results=3&lang=en&api-key=${encodeURIComponent(process.env.PLANTNET_API_KEY)}`;
  const response = await axios.post(url, form, {
    timeout: 20000,
    headers: form.getHeaders()
  });

  const results = Array.isArray(response.data?.results) ? response.data.results : [];
  const predictions = results
    .map(mapPlantNetResult)
    .filter((prediction) => prediction.confidence >= 0.15);

  return {
    provider: 'Pl@ntNet Diseases',
    providerConfigured: true,
    predictions,
    rawPredictions: results.map(mapPlantNetResult),
    rawVersion: response.data?.version || null,
    remainingIdentificationRequests: response.data?.remainingIdentificationRequests ?? null
  };
}

function normalizeSeverity(value) {
  const severity = String(value || "").toLowerCase();
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  if (severity === "low") return "Low";
  return "Medium";
}

function isMeaningfulDiagnosis(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text) && !text.includes("uncertain crop issue");
}

function toArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

async function diagnoseWithOpenAI(req, file) {
  if (!process.env.OPENAI_API_KEY) return null;

  const result = await runDiseaseVisionDiagnosis({
    imageBuffer: file.buffer,
    mimeType: file.mimetype,
    cropType: req.body?.cropType,
    locationLabel: req.body?.city || req.body?.district || req.body?.village,
    language: req.body?.language || "english",
  });

  if (!result) return null;

  const confidence = Number(result.confidence || 0);
  const problem = String(result.problem || "").trim();
  const solution = String(result.solution || "").trim();
  const diagnosis = String(result.diagnosis || "").trim() || "Uncertain crop issue";

  return {
    provider: "OpenAI Vision",
    providerConfigured: true,
    diagnosis,
    confidence,
    severity: normalizeSeverity(result.severity),
    problem: problem || "The uploaded crop image suggests a possible issue, but the evidence is limited.",
    solution: solution || "Inspect the field carefully and confirm with a local agriculture officer before spraying.",
    note: String(result.note || "").trim() || "AI image review should be confirmed locally for severe cases.",
    visibleSymptoms: toArray(result.visibleSymptoms),
    likelyCauses: toArray(result.likelyCauses),
    shouldEscalate: Boolean(result.shouldEscalate),
  };
}

// ✅ ADD AUTHENTICATION TO THESE ROUTES
router.post('/predict', authenticate, async (req, res) => {  // ADDED authenticate
  res.status(410).json({
    success: false,
    message: 'Rule-based disease prediction is disabled. Use POST /api/diseases/image-diagnose for real image API diagnosis.',
  });
});

router.post('/image-diagnose', authenticate, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Crop image is required' });
    }

    let aiVision = null;
    let external = null;
    let pythonVision = null;

    try {
      aiVision = await diagnoseWithOpenAI(req, req.file);
    } catch (error) {
      console.warn('OpenAI disease vision unavailable:', error?.response?.data || error.message);
    }

    try {
      pythonVision = await runPythonDiseaseDiagnosis({
        file: req.file,
        cropType: req.body?.cropType,
        locationLabel: req.body?.city || req.body?.district || req.body?.village,
      });
    } catch (error) {
      console.warn('Python disease analyzer unavailable:', error.message);
    }

    try {
      external = await diagnoseWithPlantNet(req.file);
    } catch (error) {
      console.warn('PlantNet disease API unavailable:', error?.response?.data || error.message);
    }

    if (aiVision?.confidence >= 0.35) {
      return res.json({
        success: true,
        source: aiVision.provider,
        externalConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY),
        likelyIssue: aiVision.diagnosis,
        severity: aiVision.severity,
        confidence: aiVision.confidence,
        problem: aiVision.problem,
        solution: aiVision.solution,
        note: aiVision.note,
        visibleSymptoms: aiVision.visibleSymptoms,
        likelyCauses: aiVision.likelyCauses,
        shouldEscalate: aiVision.shouldEscalate,
        fallbackPredictions: external?.predictions || [],
        apiMeta: {
          primary: "OpenAI Vision",
          fallback: external?.provider || null,
          remainingIdentificationRequests: external?.remainingIdentificationRequests ?? null,
        },
      });
    }

    if (pythonVision?.confidence >= 0.42) {
      return res.json({
        success: true,
        source: "Local Python Vision",
        externalConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY),
        likelyIssue: pythonVision.diagnosis,
        severity: normalizeSeverity(pythonVision.severity),
        confidence: Number(pythonVision.confidence || 0),
        problem: pythonVision.problem,
        solution: pythonVision.solution,
        note: pythonVision.note || "Local Python image analysis result.",
        visibleSymptoms: toArray(pythonVision.visibleSymptoms),
        likelyCauses: toArray(pythonVision.likelyCauses),
        shouldEscalate: Boolean(pythonVision.shouldEscalate),
        fallbackPredictions: external?.predictions || [],
        apiMeta: {
          primary: "Local Python Vision",
          fallback: external?.provider || null,
          metrics: pythonVision.metrics || null,
          remainingIdentificationRequests: external?.remainingIdentificationRequests ?? null,
        },
      });
    }

    if (aiVision && aiVision.confidence >= 0.18 && isMeaningfulDiagnosis(aiVision.diagnosis)) {
      return res.json({
        success: true,
        source: `${aiVision.provider} - cautious result`,
        externalConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY),
        likelyIssue: `Possible ${aiVision.diagnosis}`,
        severity: aiVision.severity === 'Critical' ? 'High' : aiVision.severity,
        confidence: aiVision.confidence,
        problem: aiVision.problem || 'The crop image shows a possible disease or stress pattern, but confidence is limited.',
        solution: aiVision.solution || 'Inspect more leaves in daylight and confirm with a local agriculture officer before spraying.',
        note: aiVision.note || 'Low-confidence AI result. Use this as a field clue, not as final diagnosis.',
        visibleSymptoms: aiVision.visibleSymptoms,
        likelyCauses: aiVision.likelyCauses,
        shouldEscalate: true,
        fallbackPredictions: external?.predictions || [],
        apiMeta: {
          primary: "OpenAI Vision",
          fallback: external?.provider || null,
          confidenceMode: "cautious",
          remainingIdentificationRequests: external?.remainingIdentificationRequests ?? null,
        },
      });
    }

    if (pythonVision && Number(pythonVision.confidence || 0) >= 0.22 && isMeaningfulDiagnosis(pythonVision.diagnosis)) {
      return res.json({
        success: true,
        source: "Local Python Vision - cautious result",
        externalConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY),
        likelyIssue: `Possible ${pythonVision.diagnosis}`,
        severity: normalizeSeverity(pythonVision.severity),
        confidence: Number(pythonVision.confidence || 0),
        problem: pythonVision.problem || "The local image analyzer found a possible crop issue, but confidence is limited.",
        solution: pythonVision.solution || "Inspect more leaves in daylight and confirm with a local agriculture officer before spraying.",
        note: pythonVision.note || "Low-confidence local Python result. Use this as a field clue, not as final diagnosis.",
        visibleSymptoms: toArray(pythonVision.visibleSymptoms),
        likelyCauses: toArray(pythonVision.likelyCauses),
        shouldEscalate: true,
        fallbackPredictions: external?.predictions || [],
        apiMeta: {
          primary: "Local Python Vision",
          fallback: external?.provider || null,
          confidenceMode: "cautious",
          metrics: pythonVision.metrics || null,
          remainingIdentificationRequests: external?.remainingIdentificationRequests ?? null,
        },
      });
    }

    if (!external?.predictions?.length && external?.rawPredictions?.length) {
      const bestRaw = [...external.rawPredictions].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0];
      const bestRawScore = Number(bestRaw?.confidence || 0);

      if (bestRaw && bestRawScore >= 0.08) {
        return res.json({
          success: true,
          source: `${external.provider} - low confidence`,
          externalConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY),
          likelyIssue: `Possible ${bestRaw.name}`,
          severity: bestRawScore >= 0.2 ? bestRaw.severity : 'Low',
          confidence: bestRawScore,
          problem: `Image scan found a possible match: ${bestRaw.name}. Confidence is only ${Math.round(bestRawScore * 100)}%, so this should be treated as an early clue, not a confirmed diagnosis.`,
          solution: 'Take one closer daylight photo of the affected leaf, compare symptoms in the field, and confirm with a local agriculture officer before treatment.',
          note: 'Low-confidence image match shown because the scan found a possible disease pattern.',
          visibleSymptoms: [],
          likelyCauses: [],
          shouldEscalate: true,
          predictions: external.rawPredictions.slice(0, 3),
          apiMeta: {
            version: external.rawVersion,
            confidenceMode: 'low-confidence-match',
            remainingIdentificationRequests: external.remainingIdentificationRequests ?? null,
          },
        });
      }
    }

    if (!external?.predictions?.length) {
      const bestRawScore = Math.max(
        0,
        ...((external?.rawPredictions || []).map((prediction) => Number(prediction.confidence || 0)))
      );

      return res.status(external?.providerConfigured ? 422 : 503).json({
        success: false,
        message: process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY
          ? `Disease image scan found no confident match. Best image confidence was ${Math.round(Math.max(bestRawScore, Number(aiVision?.confidence || 0)) * 100)}%. Try a closer daylight photo of the affected leaf.`
          : 'Disease image API key is not configured.',
        bestConfidence: bestRawScore,
        source: aiVision?.provider || external?.provider || null,
        aiVision: aiVision
          ? {
              likelyIssue: aiVision.diagnosis,
              confidence: aiVision.confidence,
              severity: aiVision.severity,
              visibleSymptoms: aiVision.visibleSymptoms,
              likelyCauses: aiVision.likelyCauses,
            }
          : pythonVision
            ? {
                likelyIssue: pythonVision.diagnosis,
                confidence: pythonVision.confidence,
                severity: pythonVision.severity,
                problem: pythonVision.problem,
                solution: pythonVision.solution,
                visibleSymptoms: pythonVision.visibleSymptoms,
                likelyCauses: pythonVision.likelyCauses,
              }
            : null,
      });
    }

    const predictions = external.predictions;
    const best = predictions[0];

    res.json({
      success: true,
      source: external.provider,
      externalConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.PLANTNET_API_KEY),
      problem: best.problem,
      solution: best.solution,
      likelyIssue: best.name,
      severity: best.severity,
      confidence: best.confidence,
      predictions,
      aiVision: aiVision
        ? {
            likelyIssue: aiVision.diagnosis,
            confidence: aiVision.confidence,
            severity: aiVision.severity,
            problem: aiVision.problem,
            solution: aiVision.solution,
            visibleSymptoms: aiVision.visibleSymptoms,
            likelyCauses: aiVision.likelyCauses,
          }
        : null,
      apiMeta: external
        ? {
            version: external.rawVersion,
            remainingIdentificationRequests: external.remainingIdentificationRequests
          }
        : null,
      note: 'External API result. Confirm severe cases locally before treatment.'
    });
  } catch (error) {
    console.error('Image disease diagnosis error:', error);
    res.status(500).json({ success: false, message: 'Image diagnosis failed' });
  }
});

// Get disease information by name
router.get('/info/:diseaseName', authenticate, async (req, res) => {  // ADDED authenticate
  try {
    const diseaseName = req.params.diseaseName;
    // Search in database
    let diseaseInfo = null;
    let cropFound = null;
    
    for (const crop in diseaseDatabase) {
      if (diseaseDatabase[crop][diseaseName]) {
        diseaseInfo = diseaseDatabase[crop][diseaseName];
        cropFound = crop;
        break;
      }
    }
    
    if (diseaseInfo) {
      res.json({ 
        success: true, 
        disease: {
          name: diseaseName,
          crop: cropFound,
          ...diseaseInfo
        }
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Disease information not found' 
      });
    }
  } catch (error) {
    console.error('Disease info error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch disease info' });
  }
});

module.exports = router;
