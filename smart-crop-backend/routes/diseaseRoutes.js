const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { runDiseaseVisionDiagnosis } = require('../services/openaiAssistantService');
const { runPythonDiseaseDiagnosis } = require('../services/pythonDiseaseService');

const UNCERTAIN_CONFIDENCE = 0.4;
const LIKELY_CONFIDENCE = 0.7;

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

function isOpenAIDiseaseVisionEnabled() {
  return process.env.ENABLE_OPENAI_DISEASE_VISION === "true" && Boolean(process.env.OPENAI_API_KEY);
}

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

const cropDiseaseHints = {
  rice: ['rice', 'paddy', 'blast', 'blight', 'brown spot', 'sheath', 'hopper'],
  ragi: ['ragi', 'finger millet', 'blast', 'leaf spot', 'smut', 'rust'],
  wheat: ['wheat', 'rust', 'smut', 'blight', 'mildew'],
  maize: ['maize', 'corn', 'leaf blight', 'downy mildew', 'rust', 'stem borer'],
  soybean: ['soybean', 'soyabean', 'rust', 'blight', 'mildew', 'defoliation'],
  cotton: ['cotton', 'boll', 'wilt', 'leaf curl', 'aphid', 'whitefly'],
  sugarcane: ['sugarcane', 'cane', 'red rot', 'smut', 'borer', 'rust'],
  tomato: ['tomato', 'leaf curl', 'blight', 'wilt', 'mosaic'],
  chilli: ['chilli', 'pepper', 'leaf curl', 'thrips', 'blight', 'wilt'],
  grape: ['grape', 'powdery mildew', 'downy mildew', 'anthracnose'],
};

const genericDiseaseKeywords = [
  'leaf spot',
  'blight',
  'mildew',
  'rust',
  'deficiency',
  'stress',
  'pest',
  'damage',
  'wilt',
  'rot',
  'curl',
  'mosaic',
  'borer',
  'hopper',
  'smut',
];

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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getCropHints(cropType) {
  const crop = normalizeText(cropType);
  if (!crop) return [];

  const direct = cropDiseaseHints[crop];
  if (direct) return direct;

  const entry = Object.entries(cropDiseaseHints).find(([key]) => crop.includes(key) || key.includes(crop));
  return entry ? entry[1] : [];
}

function evaluateCropCompatibility(cropType, diseaseName) {
  const hints = getCropHints(cropType);
  const disease = normalizeText(diseaseName);

  if (!disease || !hints.length) {
    return {
      cropValidated: false,
      cropCompatible: true,
      score: 1,
      note: '',
    };
  }

  if (hints.some((hint) => disease.includes(hint))) {
    return {
      cropValidated: true,
      cropCompatible: true,
      score: 1,
      note: '',
    };
  }

  if (genericDiseaseKeywords.some((hint) => disease.includes(hint))) {
    return {
      cropValidated: true,
      cropCompatible: true,
      score: 0.85,
      note: '',
    };
  }

  return {
    cropValidated: true,
    cropCompatible: false,
    score: 0.45,
    note: `This match is not commonly associated with ${cropType}. CropSafe has lowered confidence until a clearer crop-specific image is uploaded.`,
  };
}

function getConfidenceBand(confidence, cropCompatible = true) {
  if (!cropCompatible && confidence < 0.75) return 'uncertain';
  if (confidence < UNCERTAIN_CONFIDENCE) return 'uncertain';
  if (confidence < LIKELY_CONFIDENCE) return 'possible';
  return 'likely';
}

function buildGuidance(confidenceBand, candidateName, cropType) {
  if (confidenceBand === 'likely') {
    return {
      title: candidateName,
      problem: `${candidateName} is the strongest current disease match from the uploaded crop image.`,
      solution: 'Inspect nearby plants, compare symptoms across the field, and begin the recommended treatment plan after local confirmation for severe cases.',
      note: 'High-confidence result based on image evidence and crop context.',
    };
  }

  if (confidenceBand === 'possible') {
    return {
      title: 'Possible disease pattern',
      problem: `The image shows a possible disease pattern${candidateName ? ` linked to ${candidateName}` : ''}, but the evidence is still moderate.`,
      solution: 'Take one closer daylight photo of the affected leaf, inspect more plants in the same patch, and confirm with a local agriculture officer before treatment.',
      note: 'Moderate-confidence scan. Use this as a field clue, not as final diagnosis.',
    };
  }

  return {
    title: 'Uncertain detection',
    problem: `No strong disease match was found for this ${cropType || 'crop'} image. The scan needs a clearer daylight photo with the affected leaf filling most of the frame.`,
    solution: 'Upload one sharper close photo of the affected leaf, avoid shadows, and include only the damaged plant part if possible. Use field symptoms and local advice before any spray decision.',
    note: 'Low-confidence scan. CropSafe is hiding the disease name until the image evidence becomes reliable.',
  };
}

function finalizeDiagnosis(payload, cropType) {
  const rawName = String(payload.rawDiseaseName || payload.likelyIssue || '').replace(/^Possible\s+/i, '').trim();
  const rawConfidence = Number(payload.confidence || 0);
  const cropCheck = evaluateCropCompatibility(cropType, rawName);
  const adjustedConfidence = Math.max(0, Math.min(1, rawConfidence * cropCheck.score));
  const confidenceBand = getConfidenceBand(adjustedConfidence, cropCheck.cropCompatible);
  const guidance = buildGuidance(confidenceBand, rawName, cropType);

  const mergedNote = [guidance.note, payload.note, cropCheck.note].filter(Boolean).join(' ');

  return {
    ...payload,
    likelyIssue: guidance.title,
    candidateIssue: rawName || null,
    confidence: adjustedConfidence,
    confidenceBand,
    showDiseaseName: confidenceBand !== 'uncertain',
    aiConfidenceVisible: confidenceBand !== 'uncertain',
    cropValidated: cropCheck.cropValidated,
    cropCompatible: cropCheck.cropCompatible,
    problem: payload.problem || guidance.problem,
    solution: payload.solution || guidance.solution,
    note: mergedNote,
    rawDiseaseName: rawName || null,
    shouldEscalate: payload.shouldEscalate ?? confidenceBand !== 'likely',
    severity: confidenceBand === 'uncertain'
      ? 'Low'
      : payload.severity || (confidenceBand === 'likely' ? 'High' : 'Medium'),
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
  if (!isOpenAIDiseaseVisionEnabled()) return null;

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
    message: 'Use POST /api/diseases/image-diagnose. The active disease flow uses local Python image analysis first, with external APIs only as optional support.',
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
      pythonVision = await runPythonDiseaseDiagnosis({
        file: req.file,
        cropType: req.body?.cropType,
        locationLabel: req.body?.city || req.body?.district || req.body?.village,
      });
    } catch (error) {
      console.warn('Python disease analyzer unavailable:', error.message);
    }

    try {
      aiVision = await diagnoseWithOpenAI(req, req.file);
    } catch (error) {
      console.warn('Optional OpenAI disease vision unavailable:', error?.response?.data || error.message);
    }

    try {
      external = await diagnoseWithPlantNet(req.file);
    } catch (error) {
      console.warn('PlantNet disease API unavailable:', error?.response?.data || error.message);
    }

    if (pythonVision?.confidence >= 0.42) {
      return res.json(finalizeDiagnosis({
        success: true,
        source: "Local Python Vision",
        externalConfigured: Boolean(process.env.PLANTNET_API_KEY),
        openAIEnabled: isOpenAIDiseaseVisionEnabled(),
        likelyIssue: pythonVision.diagnosis,
        rawDiseaseName: pythonVision.diagnosis,
        severity: normalizeSeverity(pythonVision.severity),
        confidence: Number(pythonVision.confidence || 0),
        problem: pythonVision.problem,
        solution: pythonVision.solution,
        note: pythonVision.note || "Local Python image analysis result based on visible crop symptoms and agriculture knowledge rules.",
        visibleSymptoms: toArray(pythonVision.visibleSymptoms),
        likelyCauses: toArray(pythonVision.likelyCauses),
        shouldEscalate: Boolean(pythonVision.shouldEscalate),
        fallbackPredictions: external?.predictions || [],
        optionalAiReview: aiVision
          ? {
              provider: aiVision.provider,
              likelyIssue: aiVision.diagnosis,
              confidence: aiVision.confidence,
              severity: aiVision.severity,
            }
          : null,
        apiMeta: {
          primary: "Local Python Vision",
          fallback: external?.provider || null,
          metrics: pythonVision.metrics || null,
          remainingIdentificationRequests: external?.remainingIdentificationRequests ?? null,
        },
      }, req.body?.cropType));
    }

    if (aiVision?.confidence >= 0.35) {
      return res.json(finalizeDiagnosis({
        success: true,
        source: `${aiVision.provider} - optional review`,
        externalConfigured: Boolean(process.env.PLANTNET_API_KEY),
        openAIEnabled: true,
        likelyIssue: aiVision.diagnosis,
        rawDiseaseName: aiVision.diagnosis,
        severity: aiVision.severity,
        confidence: aiVision.confidence,
        problem: aiVision.problem,
        solution: aiVision.solution,
        note: aiVision.note || "Optional OpenAI review. Core disease detection can still run with local Python analysis.",
        visibleSymptoms: aiVision.visibleSymptoms,
        likelyCauses: aiVision.likelyCauses,
        shouldEscalate: aiVision.shouldEscalate,
        fallbackPredictions: external?.predictions || [],
        apiMeta: {
          primary: "Optional OpenAI Vision",
          fallback: external?.provider || null,
          remainingIdentificationRequests: external?.remainingIdentificationRequests ?? null,
        },
      }, req.body?.cropType));
    }

    if (aiVision && aiVision.confidence >= 0.18 && isMeaningfulDiagnosis(aiVision.diagnosis)) {
      return res.json(finalizeDiagnosis({
        success: true,
        source: `${aiVision.provider} - cautious result`,
        externalConfigured: Boolean(process.env.PLANTNET_API_KEY),
        openAIEnabled: true,
        likelyIssue: `Possible ${aiVision.diagnosis}`,
        rawDiseaseName: aiVision.diagnosis,
        severity: aiVision.severity === 'Critical' ? 'High' : aiVision.severity,
        confidence: aiVision.confidence,
        problem: '',
        solution: '',
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
      }, req.body?.cropType));
    }

    if (pythonVision && Number(pythonVision.confidence || 0) >= 0.22 && isMeaningfulDiagnosis(pythonVision.diagnosis)) {
      return res.json(finalizeDiagnosis({
        success: true,
        source: "Local Python Vision - cautious result",
        externalConfigured: Boolean(process.env.PLANTNET_API_KEY),
        openAIEnabled: isOpenAIDiseaseVisionEnabled(),
        likelyIssue: `Possible ${pythonVision.diagnosis}`,
        rawDiseaseName: pythonVision.diagnosis,
        severity: normalizeSeverity(pythonVision.severity),
        confidence: Number(pythonVision.confidence || 0),
        problem: '',
        solution: '',
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
      }, req.body?.cropType));
    }

    if (!external?.predictions?.length && external?.rawPredictions?.length) {
      const bestRaw = [...external.rawPredictions].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0];
      const bestRawScore = Number(bestRaw?.confidence || 0);

      if (bestRaw && bestRawScore >= 0.08) {
        return res.json(finalizeDiagnosis({
          success: true,
          source: `${external.provider} - low confidence`,
          externalConfigured: Boolean(process.env.PLANTNET_API_KEY),
          openAIEnabled: isOpenAIDiseaseVisionEnabled(),
          likelyIssue: `Possible ${bestRaw.name}`,
          rawDiseaseName: bestRaw.name,
          severity: bestRawScore >= 0.2 ? bestRaw.severity : 'Low',
          confidence: bestRawScore,
          problem: '',
          solution: '',
          note: 'PlantNet returned a weak candidate. CropSafe is treating it only as a supporting clue.',
          visibleSymptoms: [],
          likelyCauses: [],
          shouldEscalate: true,
          predictions: external.rawPredictions.slice(0, 3),
          apiMeta: {
            version: external.rawVersion,
            confidenceMode: 'low-confidence-match',
            remainingIdentificationRequests: external.remainingIdentificationRequests ?? null,
          },
        }, req.body?.cropType));
      }
    }

    if (!external?.predictions?.length) {
      const bestRawScore = Math.max(
        0,
        ...((external?.rawPredictions || []).map((prediction) => Number(prediction.confidence || 0)))
      );

      return res.status(external?.providerConfigured ? 422 : 503).json({
        success: false,
        message: `Local disease scan found no confident match. Best image confidence was ${Math.round(Math.max(bestRawScore, Number(aiVision?.confidence || 0), Number(pythonVision?.confidence || 0)) * 100)}%. Try a closer daylight photo of the affected leaf.`,
        bestConfidence: bestRawScore,
        source: pythonVision ? "Local Python Vision" : aiVision?.provider || external?.provider || null,
        openAIEnabled: isOpenAIDiseaseVisionEnabled(),
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

    res.json(finalizeDiagnosis({
      success: true,
      source: external.provider,
      externalConfigured: Boolean(process.env.PLANTNET_API_KEY),
      openAIEnabled: isOpenAIDiseaseVisionEnabled(),
      problem: '',
      solution: '',
      likelyIssue: best.name,
      rawDiseaseName: best.name,
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
    }, req.body?.cropType));
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
