import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, CloudSun, FileText, Leaf, MessageSquare, Send, Sprout, TrendingUp } from "lucide-react";

import { getFarms } from "@/services/farmService";
import api from "@/lib/api";
import { backendAsset } from "@/utils/backendAssets";
import { useLanguage } from "@/contexts/LanguageContext";

const QUICK_QUESTIONS = [
  "How to file claim?",
  "What is NDVI?",
  "Farm boundary help",
  "PDF report images",
  "Heavy rain advice",
  "Low NDVI reason",
  "Fertilizer advice",
  "Cotton pest help",
  "Soil type detection",
  "Profile and logout",
];

const SUGGESTION_CARDS = [
  { title: "Crop Disease", subtitle: "Symptoms and next steps", question: "Disease help", icon: Leaf },
  { title: "Weather", subtitle: "Farm weather guidance", question: "Weather advice", icon: CloudSun },
  { title: "Insurance Claim", subtitle: "Claim process help", question: "How to file claim?", icon: FileText },
  { title: "Government Scheme", subtitle: "PMFBY and support", question: "PMFBY crop insurance", icon: Building2 },
  { title: "Fertilizer", subtitle: "Balanced crop nutrition", question: "Fertilizer advice", icon: Sprout },
  { title: "Market Price", subtitle: "MSP and mandi guidance", question: "Crop MSP price", icon: TrendingUp },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const assistantImage = backendAsset("/assets/ui/ai-assistant.svg");

function getWelcomeMessage(language: string) {
  if (language === "marathi") {
    return "नमस्कार. मी CropSafe मदत केंद्र आहे. पीक, हवामान, NDVI, दावा, रोग, खत, पाणी, अहवाल किंवा सरकारी मदतीबद्दल विचारा.";
  }
  if (language === "hindi") {
    return "नमस्ते. मैं CropSafe सहायता केंद्र हूँ. फसल, मौसम, NDVI, दावा, रोग, खाद, सिंचाई, रिपोर्ट या सरकारी सहायता के बारे में पूछिए.";
  }
  return "Namaste. I am CropSafe Help Desk. Ask me about crops, weather, NDVI, claims, disease, fertilizer, irrigation, reports, or government support.";
}

function getCompactPrompt(language: string) {
  if (language === "marathi") {
    return "कृपया प्रश्न थोडक्यात लिहा. मी पुढचा योग्य टप्पा सांगेन.";
  }
  if (language === "hindi") {
    return "कृपया सवाल थोड़ा छोटा लिखें. मैं अगला सही कदम बताऊँगा.";
  }
  return "Please ask the question in a shorter form. I will guide you with the next step.";
}

export default function Chatbot() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [farms, setFarms] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: getWelcomeMessage(language),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isChatting = messages.length > 1;

  useEffect(() => {
    getFarms().then((data) => setFarms(Array.isArray(data) ? data : [])).catch(() => setFarms([]));
  }, []);

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 1) return current;
      return [{ role: "assistant", content: getWelcomeMessage(language) }];
    });
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const userMessage = text || input.trim();
    if (!userMessage) return;

    const nextMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    try {
      const { data } = await api.post("/assistant/chat", {
        language,
        farmContext: farms[0]
          ? {
              farmName: farms[0].farmName,
              cropType: farms[0].cropType,
              areaHectares: farms[0].areaHectares,
              district: farms[0].district,
              city: farms[0].city,
              season: farms[0].season,
            }
          : null,
        messages: nextMessages,
      });

      const reply =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "Here is the best next step for your farm question.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: getCompactPrompt(language) }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7faf3] pb-24">
      <div className="rounded-b-3xl bg-gradient-to-r from-emerald-800 to-emerald-600 px-5 pb-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-white" aria-label="Back">
              <ChevronRight className="h-6 w-6 rotate-180" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-700 shadow">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CropSafe Help Desk</h1>
              <p className="mt-0.5 text-sm text-emerald-100">Simple farm help for claims, disease, weather, and reports</p>
            </div>
          </div>
        </div>
      </div>

      {!isChatting ? (
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <img src={assistantImage} alt="" className="h-28 w-28 shrink-0 rounded-lg object-cover" />
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Hello, I am your CropSafe Help Desk</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Ask about crops, claims, weather, NDVI, disease, fertilizer, irrigation, or reports.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-bold text-slate-950">You Can Ask</h2>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTION_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button key={card.title} onClick={() => handleSend(card.question)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm">
                    <Icon className="mb-3 h-7 w-7 text-emerald-700" />
                    <p className="font-bold text-slate-900">{card.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-900">Farmer Tip</p>
            <p className="mt-1 text-sm text-emerald-900">For disease questions, upload a clear crop photo on the Disease page or describe the visible symptom here.</p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-950">Your Farm</h2>
            {farms[0] ? (
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Sprout className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950">{farms[0].farmName || farms[0].cropType}</p>
                  <p className="text-sm text-slate-500">{farms[0].cropType} - {Number(farms[0].areaHectares || 0).toFixed(2)} ha</p>
                </div>
                <button onClick={() => navigate(`/analysis?farmId=${farms[0]._id}`)} className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-700">Open</button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Register a farm to unlock crop-specific guidance.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="max-h-[62vh] flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.slice(1).map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "rounded-br-md bg-emerald-100 text-slate-900"
                    : "rounded-bl-md border bg-white text-slate-700 shadow-sm"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border bg-white px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleSend(question)}
              className="shrink-0 rounded-full border bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-emerald-400"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder="Ask your question..."
            className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            onClick={() => handleSend()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          Try: "low NDVI", "farm boundary help", "claim documents", "heavy rain advice"
        </p>
      </div>
    </div>
  );
}
