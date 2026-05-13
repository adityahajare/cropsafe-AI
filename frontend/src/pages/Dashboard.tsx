import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Bot,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudRain,
  CloudSun,
  Droplets,
  FileText,
  Info,
  Leaf,
  MapPin,
  Plus,
  ShieldCheck,
  Sprout,
  Sunrise,
  Sunset,
  UserRound,
  Wind,
} from "lucide-react";

import heroFarm from "@/assets/hero-farm.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/api";
import { getClaims, getFarms } from "@/services/farmService";
import {
  getCurrentWeather,
  getWeatherByCoords,
  getWeatherForecast,
  getWeatherForecastByCoords,
} from "@/services/weatherService";
import { getAnalysisProblem } from "@/utils/analysisProblem";

type StatusTone = "good" | "moderate" | "care";

const SCAN_INTRO_VIDEO = "/videos/satellite-farm-scanning.mp4";
const SCAN_INTRO_SEEN_KEY = "cropsafe-satellite-scan-intro-seen";

const statusTone = {
  good: {
    text: "text-emerald-800",
    dot: "bg-emerald-600",
    ring: "#079447",
    soft: "bg-emerald-50 border-emerald-100",
    label: "Good",
  },
  moderate: {
    text: "text-amber-700",
    dot: "bg-amber-500",
    ring: "#f59e0b",
    soft: "bg-amber-50 border-amber-100",
    label: "Moderate",
  },
  care: {
    text: "text-red-700",
    dot: "bg-red-500",
    ring: "#dc2626",
    soft: "bg-red-50 border-red-100",
    label: "Needs Care",
  },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatArea(value: any) {
  const area = Number(value || 0);
  if (!Number.isFinite(area) || area <= 0) return "Area not saved";
  return `${area.toFixed(area >= 10 ? 1 : 2)} ha`;
}

function formatTime(value: any) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "--";
  return new Date(numeric * 1000).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getHealthTone(value: number | null): StatusTone {
  if (value == null) return "moderate";
  if (value >= 70) return "good";
  if (value >= 45) return "moderate";
  return "care";
}

function getRainChance(weather: any, forecast: any[]) {
  const tomorrow = forecast[1] || forecast[0];
  const rain = Number(tomorrow?.rainfall ?? weather?.rainfall ?? 0);
  if (!Number.isFinite(rain)) return "20%";
  if (rain >= 20) return "80%";
  if (rain >= 5) return "60%";
  if (rain > 0) return "35%";
  return "15%";
}

function getWeatherAlert(weather: any, forecast: any[]) {
  const tomorrow = forecast[1] || forecast[0];
  const rain = Number(tomorrow?.rainfall ?? weather?.rainfall ?? 0);
  const temp = Number(weather?.temperature);
  const humidity = Number(weather?.humidity);

  if (Number.isFinite(rain) && rain >= 20) return "Heavy rain expected. Keep drainage open.";
  if (Number.isFinite(rain) && rain > 0) return "Light to moderate rain expected. Plan irrigation.";
  if (Number.isFinite(temp) && temp >= 36) return "Hot day. Give water morning or evening.";
  if (Number.isFinite(humidity) && humidity >= 82) return "High humidity. Check crop leaves for disease.";
  return "Weather is suitable for normal farm work today.";
}

function getFarmImagePosition(index: number) {
  return ["center", "left center", "right center", "center bottom"][index % 4];
}

function ProgressRing({ value, tone }: { value: number; tone: StatusTone }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#d8f1df" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={statusTone[tone].ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sprout className="h-14 w-14 text-emerald-700" />
      </div>
    </div>
  );
}

function WeatherMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-slate-100 md:border-l md:pl-5">
      <Icon className="h-8 w-8 shrink-0 text-sky-600" />
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function ServiceTile({
  icon: Icon,
  label,
  subLabel,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  subLabel: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="min-h-[138px] rounded-[22px] border border-slate-100 bg-white p-4 text-center shadow-sm hover:border-emerald-200 hover:bg-emerald-50">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${color}`}>
        <Icon className="h-8 w-8 text-white" />
      </span>
      <span className="mt-3 block text-base font-extrabold leading-tight text-slate-950">{label}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">{subLabel}</span>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [farms, setFarms] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showScanIntro, setShowScanIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SCAN_INTRO_SEEN_KEY) !== "1";
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const farmsData = await getFarms();
        const farmList = Array.isArray(farmsData) ? farmsData : [];
        setFarms(farmList);

        const claimsData = await getClaims();
        setClaims(Array.isArray(claimsData) ? claimsData : []);

        const primaryFarm = farmList[0];
        let currentAnalysis = primaryFarm?.latestAnalysis || null;
        if (!currentAnalysis && primaryFarm?._id) {
          try {
            const res = await api.get(`/analysis/latest/${primaryFarm._id}`);
            currentAnalysis = res.data?.analysis ?? null;
          } catch {
            currentAnalysis = null;
          }
        }
        setAnalysis(currentAnalysis);

        try {
          let currentWeather = null;
          let forecastData = null;
          let forecastCity = primaryFarm?.city || user?.city || "";
          const forecastState = primaryFarm?.state || user?.state || "";
          const hasFarmCoords =
            Number.isFinite(Number(primaryFarm?.centerLat)) &&
            Number.isFinite(Number(primaryFarm?.centerLng));

          if (hasFarmCoords) {
            try {
              currentWeather = await getWeatherByCoords(Number(primaryFarm.centerLat), Number(primaryFarm.centerLng));
              forecastData = await getWeatherForecastByCoords(Number(primaryFarm.centerLat), Number(primaryFarm.centerLng)).catch(() => null);
              forecastCity = forecastData?.city || currentWeather?.city || forecastCity;
            } catch {
              currentWeather = null;
            }
          }

          if (!currentWeather && forecastCity) {
            currentWeather = await getCurrentWeather(forecastCity, forecastState);
            forecastData = await getWeatherForecast(forecastCity, forecastState).catch(() => null);
          }

          setWeather(
            currentWeather
              ? {
                  ...currentWeather,
                  city: forecastCity || currentWeather.city,
                  forecast: forecastData?.forecasts || [],
                }
              : null
          );
        } catch {
          setWeather(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.city, user?.state]);

  const primaryFarm = farms[0] || null;
  const forecast = Array.isArray(weather?.forecast) ? weather.forecast : [];
  const problem = useMemo(() => (analysis ? getAnalysisProblem(analysis, weather) : null), [analysis, weather]);
  const pendingClaims = claims.filter((claim) => ["pending", "under_review"].includes(String(claim.status).toLowerCase())).length;
  const health = analysis?.healthPercentage != null ? Number(analysis.healthPercentage) : null;
  const damage = Number(problem?.damagePercentage ?? analysis?.damagePercentage ?? 0);
  const healthTone = getHealthTone(health);
  const condition = weather?.description || weather?.condition || "Partly cloudy";
  const locationText =
    [primaryFarm?.city || user?.city, primaryFarm?.state || user?.state].filter(Boolean).join(", ") ||
    [primaryFarm?.district, user?.state].filter(Boolean).join(", ") ||
    "Maharashtra";

  const alerts = [
    {
      icon: CloudRain,
      title: getWeatherAlert(weather, forecast),
      subtitle: "Take necessary precautions",
      tone: "sky",
    },
    {
      icon: AlertTriangle,
      title:
        damage >= 40
          ? "Crop damage signal is high"
          : Number(weather?.humidity) >= 82
            ? "Leaf disease risk in humid weather"
            : "Keep checking your crop regularly",
      subtitle: problem?.cause || "Use photo check if leaves look weak",
      tone: damage >= 40 ? "red" : "green",
    },
  ];

  const finishScanIntro = () => {
    sessionStorage.setItem(SCAN_INTRO_SEEN_KEY, "1");
    setShowScanIntro(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5fbf2]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
          <p className="mt-3 text-base font-semibold text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5fbf2] pb-24 text-slate-950">
      {showScanIntro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={SCAN_INTRO_VIDEO}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={finishScanIntro}
            onError={finishScanIntro}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/20" />

          <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col justify-end px-5 pb-8 pt-8 text-white sm:px-8">
            <div className="max-w-xl">
              <p className="inline-flex rounded-full bg-emerald-400/20 px-4 py-2 text-sm font-black text-emerald-100 ring-1 ring-emerald-200/30">
                Live Farm Scan
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">Scanning your farm from satellite</h1>
              <p className="mt-3 text-lg font-semibold text-emerald-50">
                Please wait. We are checking crop health, NDVI map and damage signals.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                "Satellite image loading",
                "NDVI health map checking",
                "Farm report preparing",
              ].map((event) => (
                <div key={event} className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <p className="mt-2 text-sm font-black">{event}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={finishScanIntro} className="rounded-full bg-white px-6 py-3 text-base font-black text-slate-950">
                Skip
              </button>
              <span className="text-sm font-semibold text-slate-200">Dashboard opens automatically after the video.</span>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6">
        <header className="relative overflow-hidden rounded-b-[34px] pb-28">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <button className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-left font-extrabold shadow-sm">
              <MapPin className="h-5 w-5 shrink-0 text-slate-950" />
              <span className="truncate">{locationText}</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>

            <div className="flex items-center gap-3">
              <button className="relative rounded-full bg-white/85 p-3 shadow-sm" aria-label="Notifications">
                <Bell className="h-6 w-6" />
                {pendingClaims > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-extrabold text-white">
                    {pendingClaims}
                  </span>
                )}
              </button>
              <button onClick={() => navigate("/profile")} className="rounded-full border-2 border-emerald-200 bg-white p-2 shadow-sm" aria-label="Profile">
                <UserRound className="h-10 w-10 text-emerald-800" />
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-7 max-w-xl">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {getGreeting()}, {user?.name || "Farmer"}!
            </h1>
            <p className="mt-2 text-lg font-semibold text-slate-700">Here is what is happening in your farm today.</p>
          </div>

          <div className="absolute bottom-0 right-0 h-36 w-full overflow-hidden rounded-t-[42px] sm:h-44">
            <img src={heroFarm} alt="Farm landscape" className="h-full w-full object-cover object-center opacity-95" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#f5fbf2] via-[#f5fbf2]/55 to-transparent" />
          </div>
        </header>

        <section className="-mt-16 rounded-[24px] border border-slate-100 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
          <h2 className="text-2xl font-black">Today's Weather</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.5fr]">
            <div className="flex items-center gap-5">
              <CloudSun className="h-24 w-24 shrink-0 text-amber-400" />
              <div>
                <p className="text-6xl font-black tracking-tight">{weather?.temperature ?? "--"}°C</p>
                <p className="mt-2 text-xl font-bold capitalize text-slate-700">{condition}</p>
                <p className="text-base font-semibold text-slate-500">Feels like {weather?.feelsLike ?? weather?.temperature ?? "--"}°C</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <WeatherMetric icon={CloudRain} label="Rain Chance" value={`${getRainChance(weather, forecast)} Tomorrow`} />
              <WeatherMetric icon={Droplets} label="Humidity" value={`${weather?.humidity ?? "--"}%`} />
              <WeatherMetric icon={Wind} label="Wind" value={`${weather?.windSpeed ?? "--"} km/h`} />
              <WeatherMetric icon={Sunrise} label="Sunrise" value={formatTime(weather?.sunrise)} />
              <WeatherMetric icon={Sunset} label="Sunset" value={formatTime(weather?.sunset)} />
            </div>
          </div>

          <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-base font-bold text-slate-700">
            <Info className="h-5 w-5 shrink-0 text-sky-700" />
            <span>{getWeatherAlert(weather, forecast)}</span>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className={`rounded-[22px] border p-5 shadow-sm ${statusTone[healthTone].soft}`}>
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Leaf className="h-6 w-6 text-emerald-700" />
              Your Crop Status
            </h2>
            <div className="mt-5 flex items-center gap-5">
              <ProgressRing value={health ?? 0} tone={healthTone} />
              <div>
                <p className={`text-3xl font-black ${statusTone[healthTone].text}`}>{statusTone[healthTone].label}</p>
                <p className="mt-1 text-6xl font-black tracking-tight text-emerald-900">{health ?? "--"}%</p>
                <p className="mt-2 text-lg font-semibold text-slate-700">Crop Condition</p>
              </div>
            </div>
            <p className="mt-5 text-base font-bold text-slate-700">
              {problem?.summary || "Latest crop scan will show here after analysis."}
            </p>
          </div>

          <div className="rounded-[22px] border border-red-100 bg-red-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-black text-red-800">
              <AlertTriangle className="h-6 w-6" />
              Important Alerts
            </h2>
            <div className="mt-5 space-y-3">
              {alerts.map((alert, index) => {
                const Icon = alert.icon;
                return (
                  <div key={`${alert.title}-${index}`} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${alert.tone === "red" ? "bg-red-100 text-red-700" : alert.tone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                      <Icon className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-950">{alert.title}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{alert.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate("/analysis")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-black text-red-700">
              View All Alerts
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Quick Actions</h2>
            <button onClick={() => navigate("/chatbot")} className="inline-flex items-center gap-2 text-base font-black text-emerald-800">
              More Help
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ServiceTile icon={Camera} label="Check Crop" subLabel="Photo" color="bg-emerald-600" onClick={() => navigate("/disease")} />
            <ServiceTile icon={ShieldCheck} label="Insurance Help" subLabel="Bima support" color="bg-blue-600" onClick={() => navigate("/claims")} />
            <ServiceTile icon={Bot} label="Smart Help" subLabel="Ask support" color="bg-orange-500" onClick={() => navigate("/chatbot")} />
            <ServiceTile icon={FileText} label="My Reports" subLabel="Download" color="bg-violet-600" onClick={() => navigate("/reports")} />
            <ServiceTile icon={MapPin} label="Add My Farm" subLabel="Map boundary" color="bg-emerald-700" onClick={() => navigate("/draw-farm")} />
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">My Farms</h2>
            <button onClick={() => navigate("/analysis")} className="inline-flex items-center gap-2 text-base font-black text-emerald-800">
              View All
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {farms.slice(0, 3).map((farm, index) => {
              const farmHealth = farm.latestAnalysis?.healthPercentage ?? (index === 0 ? health : null);
              const tone = getHealthTone(farmHealth == null ? null : Number(farmHealth));
              return (
                <button key={farm._id || index} onClick={() => navigate(`/analysis?farmId=${farm._id}`)} className="overflow-hidden rounded-[18px] border border-slate-100 bg-white text-left shadow-sm">
                  <div className="h-24 bg-cover" style={{ backgroundImage: `url(${heroFarm})`, backgroundPosition: getFarmImagePosition(index) }} />
                  <div className="p-4">
                    <p className="text-lg font-black text-slate-950">{farm.farmName || `${farm.cropType || "Farm"} Field`}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{formatArea(farm.areaHectares)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                        <span className={`h-3 w-3 rounded-full ${statusTone[tone].dot}`} />
                        {statusTone[tone].label}
                      </span>
                      <span className={`text-2xl font-black ${statusTone[tone].text}`}>{farmHealth ?? "--"}%</span>
                    </div>
                  </div>
                </button>
              );
            })}

            <button onClick={() => navigate("/draw-farm")} className="flex min-h-[204px] flex-col items-center justify-center rounded-[18px] border border-dashed border-emerald-300 bg-white text-emerald-800 shadow-sm">
              <Plus className="h-12 w-12" />
              <span className="mt-3 text-xl font-black">Add Farm</span>
            </button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[22px] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="hidden h-20 w-28 items-end justify-center overflow-hidden rounded-2xl bg-white sm:flex">
                <UserRound className="h-20 w-20 text-emerald-800" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-950">Today's Farm Update</p>
                <p className="mt-1 max-w-md text-base font-semibold text-slate-700">Check weather, crop condition, and next steps from your latest analysis.</p>
              </div>
            </div>
            <button onClick={() => navigate("/analysis")} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-emerald-700 px-7 py-3 text-lg font-black text-white">
              View Full Analysis
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
