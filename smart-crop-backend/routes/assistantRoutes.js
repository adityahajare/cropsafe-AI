const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { runAssistantChat } = require("../services/openaiAssistantService");
const { buildLocalAssistantReply } = require("../services/localAssistantService");

router.post("/chat", authenticate, async (req, res) => {
  try {
    const { messages, language, farmContext } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Chat messages are required",
      });
    }

    const reply = await runAssistantChat({
      messages,
      language,
      farmContext,
    });

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Assistant chat error:", error.message);

    const quotaIssue = error.errorCode === "insufficient_quota";
    const rateLimit = error.statusCode === 429 && !quotaIssue;
    const fallbackReply = buildLocalAssistantReply({
      messages: req.body?.messages,
      language: req.body?.language,
      farmContext: req.body?.farmContext,
    });

    if (quotaIssue || rateLimit || error.statusCode === 503) {
      return res.json({
        success: true,
        reply: fallbackReply,
        fallback: true,
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: "AI assistant could not answer right now.",
    });
  }
});

module.exports = router;
