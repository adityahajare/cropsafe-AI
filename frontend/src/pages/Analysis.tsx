import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Download,
  Droplets,
  FileText,
  Info,
  Leaf,
  MapPinned,
  MessageSquare,
  Play,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FarmerHeroHeader from "@/components/FarmerHeroHeader";
import { getAnalysisHistory, getFarms, getLatestAnalysis, runAnalysis } from "@/services/farmService";
import { getWeatherByCoords } from "@/services/weatherService";
import { getAnalysisProblem } from "@/utils/analysisProblem";
import { normalizeBackendAssetUrl } from "@/utils/backendAssets";

const periods = ["Last 30 Days", "Last 60 Days", "Last 90 Days", "Season"];
const metricTabs = ["NDVI", "Moisture", "Growth", "History"];

const statusMeta = (value: number) => {
  if (value > 0.6) return { label: "Healthy", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (value > 0.4) return { label: "Moderate", className: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" };
  if (value > 0.2) return { label: "Stressed", className: "bg-orange-50 text-orange-700", dot: "bg-orange-500" };
  return { label: "Critical", className: "bg-red-50 text-red-700", dot: "bg-red-500" };
};

const formatNumber = (value: unknown, digits = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "N/A";
};

const sourceMeta = (analysis: any) => {
  const source = String(analysis?.imagerySource || "");
  const status = String(analysis?.imageryStatus || "");
  const isUnavailable =
    status.includes("unavailable") ||
    status.includes("generated") ||
    source.toLowerCase().includes("generated") ||
    !analysis?.currentImageUrl;

  if (isUnavailable) {
    return {
      label: "Imagery Status",
      detail: "Latest satellite imagery is being prepared for this farm view.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      Icon: AlertCircle,
    };
  }

  return {
    label: "Imagery Source",
    detail: source || "Satellite image fetched from Sentinel Hub.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Icon: CheckCircle2,
  };
};

function CropHealthRing({ value, status }: { value: number; status: string }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));
  const color = safeValue >= 75 ? "#16803c" : safeValue >= 55 ? "#eab308" : safeValue >= 35 ? "#f97316" : "#dc2626";

  return (
    <div className="relative mx-auto h-44 w-44">
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${color} ${safeValue * 3.6}deg, #e5e7eb 0deg)` }} />
      <div className="absolute inset-4 rounded-full bg-white shadow-inner" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-slate-950">{safeValue}%</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{status}</p>
      </div>
    </div>
  );
}

function SatelliteImageCard({
  imageUrl,
  label,
  source,
  showNdviLegend = false,
}: {
  imageUrl?: string;
  label: string;
  source?: string;
  showNdviLegend?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const normalizedImageUrl = useMemo(() => normalizeBackendAssetUrl(imageUrl), [imageUrl]);
  const displayUrl = useMemo(
    () => normalizedImageUrl ? `${normalizedImageUrl}${normalizedImageUrl.includes("?") ? "&" : "?"}v=${Date.now()}` : "",
    [normalizedImageUrl]
  );

  useEffect(() => {
    setFailed(false);
  }, [normalizedImageUrl]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-72 bg-slate-100">
        {displayUrl && !failed ? (
          <img
            src={displayUrl}
            alt={label}
            className="h-72 w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-72 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500">
            <Camera className="h-9 w-9 text-slate-400" />
            <p className="font-bold text-slate-700">Satellite view is refreshing</p>
            <p>The NDVI summary and farm analysis remain ready while the latest image panel updates.</p>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-emerald-700 shadow">
          {label}
        </div>
        {displayUrl && !failed && showNdviLegend && (
          <div className="absolute inset-x-4 bottom-4">
            <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-600 shadow" />
            <div className="mt-1 flex justify-between text-xs font-bold text-white drop-shadow">
              <span>Low NDVI</span>
              <span>High NDVI</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
        <span>{source || "Imagery API"}</span>
        {normalizedImageUrl && !failed && (
          <a className="font-bold text-emerald-700" href={normalizedImageUrl} target="_blank" rel="noreferrer">
            Open image
          </a>
        )}
      </div>
    </div>
  );
}

function SampleImageTile({ sample }: { sample: any }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = useMemo(() => normalizeBackendAssetUrl(sample?.url), [sample?.url]);

  if (!imageUrl || failed) return null;

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <img
        src={imageUrl}
        alt={sample?.label || "Sentinel sample"}
        className="h-32 w-full object-cover"
        onError={() => setFailed(true)}
      />
      <div className="p-3">
        <p className="text-sm font-bold text-slate-950">{sample?.label || "Sentinel sample"}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {[sample?.from, sample?.to].filter(Boolean).join(" to ") || sample?.kind || "Sentinel"}
        </p>
      </div>
    </a>
  );
}

export default function Analysis() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const farmIdParam = searchParams.get("farmId");
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [period, setPeriod] = useState("Last 30 Days");
  const [activeMetric, setActiveMetric] = useState("NDVI");
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const loadFarms = async () => {
      setLoading(true);
      const farmList = await getFarms();
      const list = Array.isArray(farmList) ? farmList : [];
      setFarms(list);
      setSelectedFarm(farmIdParam || list[0]?._id || "");
      setLoading(false);
    };
    loadFarms();
  }, [farmIdParam]);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!selectedFarm) return;
      setAnalysis(await getLatestAnalysis(selectedFarm));
      const historyData = await getAnalysisHistory(selectedFarm);
      setHistory(Array.isArray(historyData) ? historyData : []);
    };
    loadAnalysis();
  }, [selectedFarm]);

  const farm = useMemo(() => farms.find((item) => item._id === selectedFarm), [farms, selectedFarm]);

  useEffect(() => {
    const loadWeather = async () => {
      if (!farm?.centerLat || !farm?.centerLng) {
        setWeather(null);
        return;
      }

      try {
        setWeather(await getWeatherByCoords(Number(farm.centerLat), Number(farm.centerLng)));
      } catch {
        setWeather(null);
      }
    };

    loadWeather();
  }, [farm?.centerLat, farm?.centerLng]);

  const hasAnalysis = analysis?.ndviValue !== undefined && analysis?.ndviValue !== null;
  const currentNdvi = Number(analysis?.ndviValue ?? 0);
  const ndviMin = Number(analysis?.ndviMin);
  const ndviMax = Number(analysis?.ndviMax);
  const hasUsefulNdviLayer = Boolean(analysis?.ndviLayerUrl);
  const healthStatus = statusMeta(currentNdvi);
  const imageryMeta = sourceMeta(analysis);
  const SourceIcon = imageryMeta.Icon;
  const locationName =
    [farm?.city, farm?.state].filter(Boolean).join(", ") ||
    farm?.locationLabel ||
    weather?.city ||
    "Farm boundary";
  const humidityValue = weather?.humidity ?? analysis?.humidity;
  const rainfallValue = weather?.rainfall ?? analysis?.rainfall;
  const growthValue = analysis?.healthPercentage;
  const cloudCover = analysis?.cloudCoverage ?? analysis?.cloudCover;
  const farmProblem = getAnalysisProblem(analysis, weather);
  const historicalRows = history;
  const chartData = historicalRows.length
    ? historicalRows.map((row: any) => ({
        month: String(row.date || row.month || row.analysisDate || "Entry").slice(0, 10),
        ndvi: Number(row.ndvi ?? row.ndviValue ?? 0),
      }))
    : [{ month: "Latest", ndvi: currentNdvi }];
  const imageSamples = useMemo(() => {
    const rawSamples = Array.isArray(analysis?.imageSamples) ? analysis.imageSamples : [];
    const fallbackSamples = [
      { label: "Previous true color", kind: "truecolor", url: analysis?.previousImageUrl },
      { label: "Current true color", kind: "truecolor", url: analysis?.currentImageUrl },
      { label: "Current NDVI map", kind: "ndvi", url: analysis?.ndviLayerUrl },
    ];
    const seen = new Set<string>();

    return [...rawSamples, ...fallbackSamples]
      .map((sample) => ({ ...sample, url: normalizeBackendAssetUrl(sample?.url) }))
      .filter((sample) => {
        if (!sample.url || seen.has(sample.url)) return false;
        seen.add(sample.url);
        return true;
      });
  }, [analysis]);

  const handleRunAnalysis = async () => {
    if (!selectedFarm) return;
    setRunning(true);
    try {
      setAnalysis(await runAnalysis(selectedFarm));
      const historyData = await getAnalysisHistory(selectedFarm);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf3]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7faf3] px-4 py-6">
        <div className="mx-auto max-w-md rounded-lg border border-dashed border-emerald-300 bg-white p-8 text-center">
          <Sprout className="mx-auto h-10 w-10 text-emerald-700" />
          <h1 className="mt-3 text-2xl font-bold">No farms found</h1>
          <p className="mt-1 text-slate-500">Add a farm to view satellite imagery and NDVI trends.</p>
          <button onClick={() => navigate("/draw-farm")} className="mt-5 rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white">
            Add Farm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf3] pb-24">
      <FarmerHeroHeader
        eyebrow="Analysis"
        title="Farm Health Report"
        subtitle={locationName}
        action={
          <button onClick={handleRunAnalysis} disabled={running} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-emerald-800 disabled:opacity-70">
            {running ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running" : "Run"}
          </button>
        }
      />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <select className="input" value={selectedFarm} onChange={(event) => setSelectedFarm(event.target.value)}>
              {farms.map((item) => (
                <option key={item._id} value={item._id}>
                  {(item.farmName || "Farm")} - {item.cropType} - {Number(item.areaHectares || 0).toFixed(2)} ha
                </option>
              ))}
            </select>
            <select className="input" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          {farm && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Crop", value: farm.cropType || "Crop not saved", icon: Sprout },
                { label: "Area", value: `${Number(farm.areaHectares || 0).toFixed(2)} ha`, icon: MapPinned },
                { label: "Season", value: farm.season || "Season not saved", icon: ShieldCheck },
                { label: "Weather", value: weather ? `${formatNumber(weather.temperature)} C, ${formatNumber(weather.humidity, 0)}% RH` : "Weather syncing", icon: Camera },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-md bg-slate-50 p-3">
                    <Icon className="mb-2 h-4 w-4 text-emerald-700" />
                    <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                    <p className="truncate font-bold text-slate-950">{item.value}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 border-b border-slate-100 text-sm">
            {metricTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMetric(tab)}
                className={`px-3 py-3 font-semibold ${activeMetric === tab ? "border-b-2 border-emerald-700 text-emerald-700" : "text-slate-500"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {!hasAnalysis ? (
          <section className="rounded-lg border border-dashed border-emerald-300 bg-white p-8 text-center shadow-sm">
            <Camera className="mx-auto h-10 w-10 text-emerald-700" />
            <h2 className="mt-3 text-xl font-bold text-slate-950">No analysis report yet</h2>
            <p className="mt-1 text-slate-500">Run analysis for this farm to show NDVI, moisture, growth, satellite view, and location API data.</p>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Detected Farm Problem</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">{farmProblem.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{farmProblem.summary}</p>
                </div>
                <div className="rounded-md bg-orange-50 px-4 py-3 text-center">
                  <p className="text-xs font-bold text-orange-700">Damage</p>
                  <p className="text-3xl font-extrabold text-orange-900">{farmProblem.damagePercentage}%</p>
                  <p className="text-xs font-semibold text-orange-700">{farmProblem.severity}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Probable Cause
                  </p>
                  <p className="text-sm text-slate-700">{farmProblem.cause}</p>
                </div>
                <div className="rounded-md bg-emerald-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    Next Action
                  </p>
                  <p className="text-sm text-emerald-900">{farmProblem.actionItems[0]}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {farmProblem.evidence.slice(0, 4).map((item) => (
                  <p key={item} className="rounded-md border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    {item}
                  </p>
                ))}
              </div>
            </section>

            {activeMetric === "NDVI" && (
              <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-950">Crop Health (NDVI)</h2>
                      <p className="text-sm text-slate-500">{locationName}</p>
                    </div>
                    <Leaf className="h-5 w-5 text-emerald-700" />
                  </div>
                  <CropHealthRing value={Number(analysis?.healthPercentage || 0)} status={healthStatus.label} />
                  <div className="mt-5 space-y-3 text-sm">
                    {[
                      ["Very Good", "0.6 - 1.0", "bg-emerald-500"],
                      ["Moderate", "0.3 - 0.6", "bg-yellow-500"],
                      ["Poor", "0 - 0.3", "bg-red-500"],
                    ].map(([label, range, color]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                          <span className={`h-3 w-3 rounded-full ${color}`} />
                          {label}
                        </span>
                        <span className="text-slate-500">{range}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-950">NDVI Trend</h2>
                        <p className="text-sm text-slate-500">Report values for the selected farm</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${healthStatus.className}`}>{currentNdvi.toFixed(2)}</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[0, 1]} />
                          <Tooltip formatter={(value: number) => value.toFixed(2)} />
                          <Line type="monotone" dataKey="ndvi" stroke="#047857" strokeWidth={3} dot={{ r: 5, fill: "#047857" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      { label: "Min NDVI", value: Number.isFinite(ndviMin) ? ndviMin.toFixed(2) : "Pending", className: "text-orange-600" },
                      { label: "Max NDVI", value: Number.isFinite(ndviMax) ? ndviMax.toFixed(2) : "Pending", className: "text-emerald-700" },
                      { label: "Avg NDVI", value: currentNdvi.toFixed(2), className: "text-emerald-700" },
                      { label: "Cloud Cover", value: cloudCover === undefined || cloudCover === null ? "Check scene" : String(cloudCover), className: "text-slate-800" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
                        <p className="text-xs font-bold text-slate-500">{item.label}</p>
                        <p className={`mt-2 text-2xl font-bold ${item.className}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <h2 className="font-bold text-slate-950">NDVI Map</h2>
                        <p className="text-sm text-slate-500">{analysis?.analysisDate ? String(analysis.analysisDate).slice(0, 10) : "Latest scan"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{imageryMeta.label}</span>
                    </div>
                    <SatelliteImageCard
                      imageUrl={hasUsefulNdviLayer ? analysis?.ndviLayerUrl : analysis?.currentImageUrl}
                      label={hasUsefulNdviLayer ? "Farm NDVI map" : imageryMeta.label}
                      source={analysis?.imagerySource}
                      showNdviLegend={hasUsefulNdviLayer}
                    />
                    {analysis?.ndviLayerUrl && (
                      <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
                        {hasUsefulNdviLayer ? (
                          <span>NDVI color layer is active. Red and orange areas indicate weaker vegetation; green areas indicate healthier vegetation.</span>
                        ) : (
                          <span>NDVI color layer hidden because this scene is visually flat. Use the numeric NDVI and true-color image above.</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between px-5 py-4">
                        <div>
                          <h2 className="font-bold text-slate-950">Latest Satellite View</h2>
                          <p className="text-sm text-slate-500">True-color Sentinel image for the selected farm boundary.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          Current
                        </span>
                      </div>
                      <SatelliteImageCard
                        imageUrl={analysis?.currentImageUrl}
                        label="Current satellite image"
                        source={analysis?.imagerySource}
                      />
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between px-5 py-4">
                        <div>
                          <h2 className="font-bold text-slate-950">Previous Satellite View</h2>
                          <p className="text-sm text-slate-500">Previous usable scene for comparison from the same farm boundary.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          Previous
                        </span>
                      </div>
                      <SatelliteImageCard
                        imageUrl={analysis?.previousImageUrl}
                        label="Previous satellite image"
                        source={analysis?.imagerySource}
                      />
                    </div>
                  </div>

                  {imageSamples.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-bold text-slate-950">Real Sentinel Samples</h2>
                          <p className="text-sm text-slate-500">Different date windows from the same farm boundary.</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {imageSamples.length} images
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {imageSamples.map((sample) => (
                          <SampleImageTile key={`${sample.label}-${sample.url}`} sample={sample} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeMetric === "Moisture" && (
              <section className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Humidity", value: humidityValue === undefined || humidityValue === null ? "Weather syncing" : `${formatNumber(humidityValue, 0)}%`, detail: "Real weather API by farm coordinates", icon: Droplets },
                  { label: "Rainfall", value: `${formatNumber(rainfallValue)} mm`, detail: "Latest API rainfall reading", icon: Bell },
                  { label: "Soil Moisture", value: "Field check", detail: "Estimate from NDVI and rainfall until sensor data is added", icon: Leaf },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <Icon className="mb-4 h-6 w-6 text-emerald-700" />
                      <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
                      <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
                    </div>
                  );
                })}
              </section>
            )}

            {activeMetric === "Growth" && (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Growth Report</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  {[
                    { label: "Growth Score", value: growthValue === undefined || growthValue === null ? "Pending" : `${Math.round(Number(growthValue))}%` },
                    { label: "Health", value: analysis?.healthPercentage === undefined || analysis?.healthPercentage === null ? "Pending" : `${analysis.healthPercentage}%` },
                    { label: "Damage", value: analysis?.damagePercentage === undefined || analysis?.damagePercentage === null ? "Pending" : `${analysis.damagePercentage}%` },
                    { label: "Risk", value: analysis?.riskLevel || "Review" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {analysis?.recommendation || "Run analysis to generate growth recommendation."}
                </div>
                <div className="mt-4 rounded-md border border-orange-100 bg-orange-50 p-4">
                  <p className="text-sm font-bold text-orange-900">Damage explanation</p>
                  <p className="mt-1 text-sm text-orange-900">{farmProblem.summary}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {farmProblem.actionItems.map((item) => (
                      <p key={item} className="rounded bg-white/70 px-3 py-2 text-xs font-semibold text-orange-900">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeMetric === "History" && (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-950">Historical NDVI Data</h2>
                <div className="space-y-3">
                  {historicalRows.map((row: any, index: number) => {
                    const rowNdvi = Number(row.ndvi ?? row.ndviValue ?? 0);
                    const meta = statusMeta(rowNdvi);
                    return (
                      <div key={row._id || index} className="flex items-center justify-between rounded-md border border-slate-100 p-3">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-5 w-5 text-emerald-700" />
                          <div>
                            <p className="font-bold text-slate-950">{String(row.analysisDate || row.date || "Entry").slice(0, 10)}</p>
                            <p className="text-sm text-slate-500">NDVI {rowNdvi.toFixed(2)}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-[1fr_320px]">
              <div className={`rounded-lg border p-4 shadow-sm ${imageryMeta.className}`}>
                <div className="flex gap-3">
                  <SourceIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <h2 className="font-bold">{imageryMeta.label}</h2>
                    <p className="text-sm">{imageryMeta.detail}</p>
                  </div>
                </div>
              </div>

              <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-bold text-slate-950">Claim Readiness</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Risk</span><b>{analysis?.riskLevel || "Review"}</b></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Problem</span><b className="text-right">{farmProblem.title}</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">Loss</span><b>Rs. {Number(analysis?.estimatedLoss || 0).toLocaleString("en-IN")}</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">Source</span><b>{imageryMeta.label}</b></div>
                </div>
                <p className="mt-3 flex gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                  <Info className="h-4 w-4 shrink-0 text-emerald-700" />
                  Claim suggestion is based on NDVI, weather, crop stage, and admin verification.
                </p>
              </aside>
            </section>
          </>
        )}

        <section className="flex flex-wrap gap-3">
          <button onClick={() => navigate(`/reports?farmId=${selectedFarm}`)} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-3 font-bold text-white">
            <Download className="h-4 w-4" />
            Download Report PDF
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 font-semibold">
            <MessageSquare className="h-4 w-4" />
            Share with Expert
          </button>
          <button onClick={() => navigate(`/claims?farmId=${selectedFarm}`)} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 font-semibold">
            <FileText className="h-4 w-4" />
            Claim
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 font-semibold">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </section>
      </main>
    </div>
  );
}
