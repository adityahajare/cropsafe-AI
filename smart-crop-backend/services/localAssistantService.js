function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.includes("marathi") || value === "mr" || value === "mr-in") return "marathi";
  if (value.includes("hindi") || value === "hi" || value === "hi-in") return "hindi";
  return "english";
}

function getLastUserMessage(messages) {
  const last = [...(Array.isArray(messages) ? messages : [])].reverse().find((message) => message?.role !== "assistant" && message?.content);
  return String(last?.content || "").trim().toLowerCase();
}

function localize(language, english, hindi, marathi) {
  if (language === "marathi") return marathi;
  if (language === "hindi") return hindi;
  return english;
}

function buildFarmLine(language, farmContext) {
  if (!farmContext) return "";
  const parts = [
    farmContext.farmName,
    farmContext.cropType,
    farmContext.areaHectares ? `${farmContext.areaHectares} ha` : "",
    farmContext.district || farmContext.city || "",
  ].filter(Boolean);

  if (parts.length === 0) return "";

  return localize(
    language,
    `Current farm context: ${parts.join(", ")}.`,
    `आपके वर्तमान खेत की जानकारी: ${parts.join(", ")}.`,
    `तुमच्या सध्याच्या शेताची माहिती: ${parts.join(", ")}.`
  );
}

function buildLocalAssistantReply({ messages, language, farmContext }) {
  const lang = normalizeLanguage(language);
  const text = getLastUserMessage(messages);
  const farmLine = buildFarmLine(lang, farmContext);

  if (!text) {
    return localize(
      lang,
      "Please type your crop, claim, disease, weather, or NDVI question and I will help with the next step.",
      "कृपया फसल, दावा, रोग, मौसम या NDVI से जुड़ा सवाल लिखें। मैं अगला सही कदम बताऊंगा।",
      "कृपया पीक, दावा, रोग, हवामान किंवा NDVI याबद्दल प्रश्न लिहा. मी पुढचा योग्य टप्पा सांगेन."
    );
  }

  if (text.includes("claim") || text.includes("insurance") || text.includes("bima") || text.includes("pmfby")) {
    return [localize(
      lang,
      "To file a claim, first open Claims, choose the damaged farm, add damage notes, and attach field photos if asked.",
      "दावा करने के लिए Claims खोलें, नुकसान वाला खेत चुनें, नुकसान की जानकारी भरें और जरूरत हो तो फोटो जोड़ें।",
      "दावा करण्यासाठी Claims उघडा, नुकसान झालेले शेत निवडा, नुकसानीची माहिती भरा आणि गरज असल्यास फोटो जोडा."
    ), farmLine, localize(
      lang,
      "Before sending, keep your latest farm analysis and report ready because admin review depends on that evidence.",
      "भेजने से पहले नवीनतम farm analysis और report तैयार रखें, क्योंकि admin review उसी पर आधारित होगा।",
      "पाठवण्यापूर्वी ताजे farm analysis आणि report तयार ठेवा, कारण admin review त्यावर अवलंबून असतो."
    )].filter(Boolean).join("\n\n");
  }

  if (text.includes("ndvi") || text.includes("satellite")) {
    return [localize(
      lang,
      "NDVI shows crop greenness and stress from satellite imagery. Higher NDVI usually means healthier vegetation.",
      "NDVI सैटेलाइट इमेज से फसल की हरियाली और तनाव दिखाता है। ज्यादा NDVI अक्सर बेहतर फसल स्थिति दिखाता है।",
      "NDVI सॅटेलाइट प्रतिमेतून पिकाची हिरवाई आणि ताण दाखवतो. जास्त NDVI म्हणजे सहसा पिकाची चांगली स्थिती."
    ), farmLine, localize(
      lang,
      "If NDVI is low, check water, nutrient balance, pest signs, and compare the current image with the previous farm image.",
      "अगर NDVI कम है, तो पानी, पोषण, कीट के लक्षण और current image को previous image से मिलाकर देखें।",
      "NDVI कमी असेल तर पाणी, पोषण, किडीची चिन्हे आणि current image ची previous image शी तुलना करा."
    )].filter(Boolean).join("\n\n");
  }

  if (text.includes("disease") || text.includes("leaf") || text.includes("spot") || text.includes("rust") || text.includes("blast")) {
    return [localize(
      lang,
      "For disease help, upload a clear daylight photo of the affected leaf, stem, or fruit on the Disease page.",
      "रोग जांच के लिए Disease page पर प्रभावित पत्ती, तना या फल की साफ दिन के उजाले वाली फोटो अपलोड करें।",
      "रोग तपासणीसाठी Disease page वर प्रभावित पान, खोड किंवा फळाचा स्वच्छ दिवसा घेतलेला फोटो अपलोड करा."
    ), localize(
      lang,
      "Do not spray blindly. First confirm whether it looks like fungus, pest damage, nutrient stress, or water stress.",
      "बिना पुष्टि के स्प्रे न करें। पहले यह देखें कि समस्या फंगस, कीट, पोषण तनाव या पानी के तनाव से जुड़ी है या नहीं।",
      "पडताळणीशिवाय फवारणी करू नका. आधी समस्या बुरशी, किड, पोषण ताण किंवा पाण्याच्या ताणाशी संबंधित आहे का ते पाहा."
    )].join("\n\n");
  }

  if (text.includes("weather") || text.includes("rain") || text.includes("temperature")) {
    return [localize(
      lang,
      "Open the dashboard weather card and compare rainfall, humidity, and temperature before irrigation or spray decisions.",
      "सिंचाई या स्प्रे से पहले dashboard weather card में rainfall, humidity और temperature देखें।",
      "सिंचन किंवा फवारणीपूर्वी dashboard weather card मधील rainfall, humidity आणि temperature पहा."
    ), farmLine].filter(Boolean).join("\n\n");
  }

  if (text.includes("fertilizer") || text.includes("urea") || text.includes("nutrient")) {
    return localize(
      lang,
      "Use soil-test-based fertilizer where possible. If leaves are yellow, first check moisture and recent rain before applying extra urea.",
      "जहां संभव हो soil-test के आधार पर खाद दें। पत्ते पीले हों तो अतिरिक्त यूरिया देने से पहले नमी और हाल की बारिश देखें।",
      "जिथे शक्य असेल तिथे soil-test नुसार खत द्या. पाने पिवळी असतील तर अतिरिक्त युरिया देण्यापूर्वी आर्द्रता आणि अलीकडचा पाऊस तपासा."
    );
  }

  if (text.includes("report") || text.includes("pdf")) {
    return localize(
      lang,
      "Open Reports to review the professional assessment file, then export the PDF or send it to admin review.",
      "Reports खोलें, assessment file देखें, फिर PDF export करें या admin review के लिए भेजें।",
      "Reports उघडा, assessment file पहा, नंतर PDF export करा किंवा admin review साठी पाठवा."
    );
  }

  if (text.includes("farm boundary") || text.includes("map") || text.includes("draw farm")) {
    return localize(
      lang,
      "Use Draw Farm to mark the exact field boundary. Better boundary means better satellite analysis and better claim evidence.",
      "Draw Farm में सही खेत boundary बनाएं। सही boundary से satellite analysis और claim evidence बेहतर मिलता है।",
      "Draw Farm मध्ये अचूक शेत boundary काढा. योग्य boundary मुळे satellite analysis आणि claim evidence अधिक चांगले मिळते."
    );
  }

  if (text.includes("hi") || text.includes("hello") || text.includes("namaste") || text.includes("hii")) {
    return localize(
      lang,
      "Namaste. Ask me about crop health, claims, disease scan, reports, weather, or NDVI and I will guide you.",
      "नमस्ते। फसल, दावा, disease scan, report, मौसम या NDVI के बारे में पूछिए, मैं मार्गदर्शन करूंगा।",
      "नमस्कार. पीक, दावा, disease scan, report, हवामान किंवा NDVI बद्दल विचारा, मी मार्गदर्शन करीन."
    );
  }

  return [localize(
    lang,
    "I can help with crop health, disease scan, weather, NDVI, claims, reports, and farm setup.",
    "मैं फसल स्वास्थ्य, disease scan, मौसम, NDVI, claim, report और farm setup में मदद कर सकता हूं।",
    "मी पीक आरोग्य, disease scan, हवामान, NDVI, दावा, report आणि farm setup मध्ये मदत करू शकतो."
  ), localize(
    lang,
    "Try a short question like: low NDVI, crop disease, claim documents, heavy rain advice, or report export.",
    "छोटा सवाल लिखें: low NDVI, crop disease, claim documents, heavy rain advice, या report export.",
    "लहान प्रश्न लिहा: low NDVI, crop disease, claim documents, heavy rain advice, किंवा report export."
  )].join("\n\n");
}

module.exports = {
  buildLocalAssistantReply,
};
