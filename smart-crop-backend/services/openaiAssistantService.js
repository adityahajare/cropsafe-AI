const axios = require("axios");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";

function ensureApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }
}

function getLanguageLabel(language) {
  switch (String(language || "").toLowerCase()) {
    case "hindi":
    case "hi":
    case "hi-in":
      return "Hindi";
    case "marathi":
    case "mr":
    case "mr-in":
      return "Marathi";
    default:
      return "English";
  }
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(stripCodeFences(text));
  } catch (error) {
    return null;
  }
}

async function createChatCompletion(messages, maxTokens = 900) {
  ensureApiKey();

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: CHAT_MODEL,
        temperature: 0.3,
        max_tokens: maxTokens,
        messages,
      },
      {
        timeout: 45000,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    const apiError = error?.response?.data?.error;
    const normalized = new Error(apiError?.message || error.message || "OpenAI request failed");
    normalized.statusCode = error?.response?.status || 500;
    normalized.errorCode = apiError?.code || null;
    throw normalized;
  }
}

async function runDiseaseVisionDiagnosis({
  imageBuffer,
  mimeType,
  cropType,
  locationLabel,
  language,
}) {
  const languageLabel = getLanguageLabel(language);
  const base64Image = imageBuffer.toString("base64");
  const prompt = [
    "You are CropSafe's crop disease triage assistant for Indian farmers, especially Maharashtra.",
    "Analyze the crop image conservatively. Do not guess when evidence is weak.",
    "Use simple farmer-friendly wording and stay grounded in visible image evidence.",
    `Reply in ${languageLabel}.`,
    "Return strict JSON only with keys:",
    "diagnosis, confidence, severity, problem, solution, note, visibleSymptoms, likelyCauses, shouldEscalate.",
    "Rules:",
    "- diagnosis: short issue name or 'Uncertain crop issue'",
    "- confidence: number from 0 to 1",
    "- severity: one of Low, Medium, High, Critical",
    "- problem: 1-2 sentence plain explanation",
    "- solution: 2-4 practical steps for Indian farmers",
    "- note: mention limits and when to confirm with agriculture officer",
    "- visibleSymptoms: array of short strings",
    "- likelyCauses: array of short strings",
    "- shouldEscalate: true if lab/officer confirmation is important",
    "",
    `Crop: ${cropType || "Unknown"}`,
    `Location: ${locationLabel || "Unknown"}`,
  ].join("\n");

  const content = await createChatCompletion(
    [
      {
        role: "system",
        content: "You are a careful agriculture vision assistant that returns strict JSON only.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType || "image/jpeg"};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    900
  );

  return safeJsonParse(content);
}

function buildAssistantSystemPrompt({ language, farmContext }) {
  const languageLabel = getLanguageLabel(language);
  const contextLines = [
    "You are CropSafe AI Assistant for Indian farmers, especially Maharashtra users with mixed literacy levels.",
    `Respond in ${languageLabel}.`,
    "Keep tone warm, practical, and trustworthy.",
    "Prefer short paragraphs and short bullet lists.",
    "Use simple words. Avoid jargon unless you explain it.",
    "Never invent government schemes, claim status, weather, or prices.",
    "If data is missing, say what is missing and give the next practical step.",
    "For pesticides/fungicides/fertilizers, avoid dosage claims unless the user provided the product and context. Encourage local officer confirmation for severe disease or spray choice.",
  ];

  if (farmContext) {
    contextLines.push(
      "",
      "Current farmer context:",
      `- Farm name: ${farmContext.farmName || "Unknown"}`,
      `- Crop: ${farmContext.cropType || "Unknown"}`,
      `- Area (ha): ${farmContext.areaHectares || "Unknown"}`,
      `- District/City: ${farmContext.district || farmContext.city || "Unknown"}`,
      `- Season: ${farmContext.season || "Unknown"}`
    );
  }

  return contextLines.join("\n");
}

async function runAssistantChat({ messages, language, farmContext }) {
  const sanitizedMessages = Array.isArray(messages)
    ? messages
        .filter((message) => message?.content)
        .slice(-12)
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: String(message.content),
        }))
    : [];

  const content = await createChatCompletion(
    [
      {
        role: "system",
        content: buildAssistantSystemPrompt({ language, farmContext }),
      },
      ...sanitizedMessages,
    ],
    700
  );

  return content;
}

module.exports = {
  getLanguageLabel,
  runDiseaseVisionDiagnosis,
  runAssistantChat,
};
