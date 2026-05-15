import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CloudSun,
  Droplets,
  FileText,
  Leaf,
  Loader2,
  MapPinned,
  MessageSquare,
  Send,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Umbrella,
} from "lucide-react";

import FarmerHeroHeader from "@/components/FarmerHeroHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/api";
import { getFarms, getLatestAnalysis } from "@/services/farmService";
import { getWeatherByCoords, getCurrentWeather, WeatherResponse } from "@/services/weatherService";
import { backendAsset } from "@/utils/backendAssets";

type ChatRole = "user" | "assistant";

interface Message {
  role: ChatRole;
  content: string;
}

type QuickAction = {
  title: string;
  subtitle: string;
  icon: any;
  question?: string;
  route?: string;
};

type AnalysisSnapshot = {
  ndviValue?: number;
  riskLevel?: string;
  damagePercentage?: number;
  imageryStatus?: string;
  healthStatus?: string;
};

const QUICK_QUESTIONS = [
  "How to file claim?",
  "Low NDVI reason",
  "Heavy rain advice",
  "Disease prevention tips",
  "Best irrigation advice today",
  "PMFBY scheme help",
  "Which fertilizer should I check next?",
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Check Disease",
    subtitle: "Leaf photo scan and next steps",
    icon: Leaf,
    route: "/disease",
  },
  {
    title: "NDVI Analysis",
    subtitle: "See crop stress and satellite status",
    icon: TrendingUp,
    route: "/analysis",
  },
  {
    title: "Weather Help",
    subtitle: "Rain, heat, and wind guidance",
    icon: CloudSun,
    question: "Give me weather help for my selected farm",
  },
  {
    title: "Claim Support",
    subtitle: "Insurance help and claim steps",
    icon: FileText,
    route: "/claims",
  },
  {
    title: "Government Schemes",
    subtitle: "PMFBY and support programs",
    icon: ShieldCheck,
    question: "Tell me government scheme support for my crop",
  },
];

const assistantImage = backendAsset("/assets/ui/ai-assistant.svg");

function getWelcomeMessage(language: string) {
  if (language === "marathi") {
    return "Namaskar. Mi CropSafe Help Desk aahe. Pik, havaman, NDVI, dava, rog, khat, paani, ahawaal ani sarkari madat yabadal vichara.";
  }
  if (language === "hindi") {
    return "Namaste. Main CropSafe Help Desk hoon. Fasal, mausam, NDVI, daawa, rog, khaad, sinchai, report aur sarkari madad ke baare mein poochhiye.";
  }
  return "Namaste. I am CropSafe Help Desk. Ask me about crops, weather, NDVI, claims, disease, fertilizer, irrigation, reports, or government support.";
}

function getCompactPrompt(language: string) {
  if (language === "marathi") {
    return "Prashna thodkyaat liha. Mi pudhcha yogya tappaa sangen.";
  }
  if (language === "hindi") {
    return "Kripaya sawal thoda chhota likhiye. Main agla sahi kadam bataunga.";
  }
  return "Please ask the question in a shorter form. I will guide you with the next step.";
}

function getUserName() {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return "Farmer";
    const user = JSON.parse(stored);
    return user?.name?.trim?.() || "Farmer";
  } catch {
    return "Farmer";
  }
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Pending";
  return `${Math.round(value * 100)}%`;
}

function formatDamage(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Pending";
  return `${Math.round(value)}%`;
}

function getWeatherStatus(weather: WeatherResponse | null) {
  if (!weather) return "Weather syncing";
  if ((weather.rainfall || 0) > 20) return "Heavy rain watch";
  if ((weather.rainfall || 0) > 0) return "Rain expected";
  if (weather.temperature >= 36) return "Heat stress watch";
  return "Stable weather";
}

function getAlerts(weather: WeatherResponse | null, analysis: AnalysisSnapshot | null) {
  const alerts: string[] = [];

  if ((analysis?.ndviValue || 0) > 0 && (analysis?.ndviValue || 0) < 0.35) {
    alerts.push("Low NDVI detected");
  }
  if ((weather?.rainfall || 0) > 10) {
    alerts.push("Rain expected tomorrow");
  }
  if ((analysis?.riskLevel || "").toLowerCase().includes("medium")) {
    alerts.push("Disease risk moderate");
  }
  if ((analysis?.riskLevel || "").toLowerCase().includes("high")) {
    alerts.push("Field stress needs quick review");
  }

  return alerts.slice(0, 3);
}

function getSuggestionCards(weather: WeatherResponse | null, analysis: AnalysisSnapshot | null) {
  const cards = [
    {
      title: "Recommended irrigation",
      body:
        weather && weather.rainfall > 10
          ? "Rain signal is active. Hold extra irrigation and inspect drainage first."
          : weather && weather.temperature >= 35
            ? "Heat is rising. Check soil moisture early morning and plan a short irrigation cycle."
            : "Use normal irrigation schedule and inspect low patches before adding extra water.",
      question: "What irrigation plan do you suggest now?",
      icon: Droplets,
    },
    {
      title: "Suggested fertilizer",
      body:
        (analysis?.ndviValue || 0) > 0 && (analysis?.ndviValue || 0) < 0.4
          ? "Crop stress is visible. Check nutrient deficiency with a field sample before adding fertilizer."
          : "Crop health looks steadier. Use soil-test-based fertilizer instead of random top-up doses.",
      question: "What fertilizer check should I do next?",
      icon: Sprout,
    },
    {
      title: "Disease prevention tips",
      body:
        weather && weather.humidity >= 80
          ? "Humidity is high. Improve airflow, avoid overhead irrigation, and inspect leaves for fungal spread."
          : "Keep scouting leaf edges, field corners, and wet patches for early disease signs.",
      question: "Give me disease prevention tips for my farm",
      icon: ShieldCheck,
    },
  ];

  return cards;
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export default function Chatbot() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const userName = useMemo(() => getUserName(), []);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [farmLoading, setFarmLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisSnapshot | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: getWelcomeMessage(language) }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [heroText, setHeroText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm._id === selectedFarmId) || farms[0] || null,
    [farms, selectedFarmId]
  );

  const weatherStatus = useMemo(() => getWeatherStatus(weather), [weather]);
  const alerts = useMemo(() => getAlerts(weather, analysis), [weather, analysis]);
  const suggestionCards = useMemo(() => getSuggestionCards(weather, analysis), [weather, analysis]);
  const farmContextReady = Boolean(selectedFarm);

  useEffect(() => {
    let mounted = true;
    setFarmLoading(true);
    getFarms()
      .then((data) => {
        if (!mounted) return;
        const farmList = Array.isArray(data) ? data : [];
        setFarms(farmList);
        if (farmList[0]?._id) setSelectedFarmId(farmList[0]._id);
      })
      .catch(() => {
        if (mounted) setFarms([]);
      })
      .finally(() => {
        if (mounted) setFarmLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 1) return current;
      return [{ role: "assistant", content: getWelcomeMessage(language) }];
    });
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const target = "Your farm AI assistant is ready.";
    setHeroText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setHeroText(target.slice(0, index));
      if (index >= target.length) window.clearInterval(timer);
    }, 35);
    return () => window.clearInterval(timer);
  }, [selectedFarmId]);

  useEffect(() => {
    if (!selectedFarm?._id) {
      setAnalysis(null);
      return;
    }

    let mounted = true;
    setAnalysisLoading(true);
    getLatestAnalysis(selectedFarm._id)
      .then((data: any) => {
        if (!mounted) return;
        setAnalysis({
          ndviValue: typeof data?.ndviValue === "number" ? data.ndviValue : typeof data?.statistics?.mean === "number" ? data.statistics.mean : undefined,
          riskLevel: data?.riskLevel || data?.risk || data?.aiRiskEngine?.riskLevel,
          damagePercentage: data?.damagePercentage || data?.estimatedDamage || data?.damageAssessment?.estimatedLossPercent,
          imageryStatus: data?.imageryStatus,
          healthStatus: data?.healthStatus || data?.ndviAnalysis?.healthStatus,
        });
      })
      .catch(() => {
        if (mounted) setAnalysis(null);
      })
      .finally(() => {
        if (mounted) setAnalysisLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedFarm?._id]);

  useEffect(() => {
    if (!selectedFarm) {
      setWeather(null);
      return;
    }

    let mounted = true;
    setWeatherLoading(true);
    const request =
      selectedFarm.centerLat && selectedFarm.centerLng
        ? getWeatherByCoords(Number(selectedFarm.centerLat), Number(selectedFarm.centerLng))
        : getCurrentWeather(selectedFarm.city || selectedFarm.district || "Pune");

    request
      .then((data) => {
        if (mounted) setWeather(data);
      })
      .catch(() => {
        if (mounted) setWeather(null);
      })
      .finally(() => {
        if (mounted) setWeatherLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedFarm?._id, selectedFarm?.centerLat, selectedFarm?.centerLng, selectedFarm?.city, selectedFarm?.district]);

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
        farmContext: selectedFarm
          ? {
              farmName: selectedFarm.farmName,
              cropType: selectedFarm.cropType,
              areaHectares: selectedFarm.areaHectares,
              district: selectedFarm.district,
              city: selectedFarm.city,
              season: selectedFarm.season,
              ndviValue: analysis?.ndviValue,
              weatherStatus,
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
    <div className="min-h-screen bg-[#f7faf3] pb-28">
      <FarmerHeroHeader
        eyebrow="AI Farm Assistant"
        title={`Hello ${userName} 👋`}
        subtitle={heroText || "Your farm AI assistant is ready."}
        action={
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white">
            <Bot className="h-4 w-4" />
            AI Online
          </div>
        }
      />

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Farm context</h2>
                <p className="text-sm text-slate-500">Selected farm and live support status</p>
              </div>
              <MapPinned className="h-5 w-5 text-emerald-700" />
            </div>

            {farmLoading ? (
              <div className="space-y-3">
                <SkeletonCard className="h-11 w-full" />
                <SkeletonCard className="h-20 w-full" />
                <SkeletonCard className="h-24 w-full" />
              </div>
            ) : farmContextReady ? (
              <div className="space-y-3">
                <select
                  className="input"
                  value={selectedFarmId}
                  onChange={(event) => setSelectedFarmId(event.target.value)}
                >
                  {farms.map((farm) => (
                    <option key={farm._id} value={farm._id}>
                      {farm.farmName || farm.cropType} - {farm.cropType}
                    </option>
                  ))}
                </select>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected Farm</p>
                  <p className="mt-1 text-base font-bold text-slate-950">{selectedFarm?.farmName || "Registered farm"}</p>
                  <p className="text-sm text-slate-600">
                    {selectedFarm?.cropType || "Crop pending"} • {Number(selectedFarm?.areaHectares || 0).toFixed(2)} ha
                  </p>
                  <p className="text-sm text-slate-500">{selectedFarm?.city || selectedFarm?.district || "Location syncing"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Current NDVI</p>
                    <p className="mt-1 text-xl font-black text-emerald-900">
                      {analysisLoading ? "..." : typeof analysis?.ndviValue === "number" ? analysis.ndviValue.toFixed(2) : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Weather Status</p>
                    <p className="mt-1 text-sm font-bold text-sky-900">
                      {weatherLoading ? "Loading..." : weatherStatus}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                Register a farm first to unlock farm-specific AI advice.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-950">AI status</h2>
            <div className="space-y-3">
              {[
                { label: "Satellite", value: analysis?.imageryStatus && !String(analysis.imageryStatus).includes("unavailable") ? "Active" : "Standby" },
                { label: "Weather", value: weather ? "Connected" : weatherLoading ? "Syncing" : "Waiting" },
                { label: "AI", value: "Online" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-950">Recent alerts</h2>
            <div className="space-y-2">
              {(alerts.length ? alerts : ["No major alert right now", "Continue daily crop check", "Chat assistant is ready"]).map((alert) => (
                <button
                  key={alert}
                  onClick={() => handleSend(alert)}
                  className="flex w-full items-start gap-3 rounded-lg bg-slate-50 px-3 py-3 text-left transition hover:bg-emerald-50"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-slate-700">{alert}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-4 border-b border-slate-100 p-4 md:grid-cols-[1fr_180px] md:items-center">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">CropSafe Help Center</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Ask about crops, disease, NDVI, weather, claims, reports, or government schemes.
                </p>
              </div>
              <img src={assistantImage} alt="" className="mx-auto h-28 w-28 rounded-lg object-cover md:mx-0 md:justify-self-end" />
            </div>

            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-5">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    onClick={() => (action.route ? navigate(action.route) : handleSend(action.question))}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    <Icon className="mb-3 h-6 w-6 text-emerald-700" />
                    <p className="text-sm font-bold text-slate-900">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{action.subtitle}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-3">
              <div className="rounded-lg bg-sky-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Weather summary</p>
                {weatherLoading ? (
                  <SkeletonCard className="mt-2 h-12 w-full" />
                ) : (
                  <>
                    <p className="mt-1 text-xl font-black text-sky-950">{weather ? `${weather.temperature}°C` : "Pending"}</p>
                    <p className="text-sm text-sky-900">{weather ? weather.condition : "Waiting for farm weather"}</p>
                  </>
                )}
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Crop condition</p>
                {analysisLoading ? (
                  <SkeletonCard className="mt-2 h-12 w-full" />
                ) : (
                  <>
                    <p className="mt-1 text-xl font-black text-emerald-950">{formatPercent(analysis?.ndviValue)}</p>
                    <p className="text-sm text-emerald-900">{analysis?.healthStatus || "Field analysis syncing"}</p>
                  </>
                )}
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Estimated stress</p>
                {analysisLoading ? (
                  <SkeletonCard className="mt-2 h-12 w-full" />
                ) : (
                  <>
                    <p className="mt-1 text-xl font-black text-amber-950">{formatDamage(analysis?.damagePercentage)}</p>
                    <p className="text-sm text-amber-900">{analysis?.riskLevel || "Review in progress"}</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-3">
              {suggestionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    onClick={() => handleSend(card.question)}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    <Icon className="mb-3 h-5 w-5 text-emerald-700" />
                    <p className="font-bold text-slate-900">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-2xl border border-slate-200 bg-[#f8fbf6] p-3 shadow-inner">
                <div className="max-h-[48vh] min-h-[280px] space-y-3 overflow-y-auto rounded-xl bg-white p-3">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.role === "user"
                            ? "rounded-br-md bg-emerald-100 text-slate-900"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="mb-1 flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">AI is preparing your farm answer</p>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSend(question)}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="sr-only" htmlFor="farm-ai-input">Ask your farm question</label>
                  <textarea
                    id="farm-ai-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={2}
                    placeholder="Ask about disease, NDVI, weather, claims, or crop care..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="inline-flex h-14 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => navigate("/analysis")}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              <TrendingUp className="mb-3 h-5 w-5 text-emerald-700" />
              <p className="font-bold text-slate-900">Chat history + analysis</p>
              <p className="mt-1 text-sm text-slate-600">Open the analysis page if you want image evidence with this advice.</p>
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              <FileText className="mb-3 h-5 w-5 text-emerald-700" />
              <p className="font-bold text-slate-900">My reports</p>
              <p className="mt-1 text-sm text-slate-600">View the latest farm report and claim evidence from one place.</p>
            </button>
            <button
              onClick={() => handleSend("Summarize my farm health and next best action")}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              <Umbrella className="mb-3 h-5 w-5 text-emerald-700" />
              <p className="font-bold text-slate-900">One-tap farm summary</p>
              <p className="mt-1 text-sm text-slate-600">Get a short summary using crop, weather, and NDVI context.</p>
            </button>
          </section>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <p className="text-sm text-emerald-900">
                CropSafe combines farm profile, weather, NDVI trend, and claim workflow context so your help answers stay useful, not generic.
              </p>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
