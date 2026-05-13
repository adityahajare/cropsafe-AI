import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Sprout,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Satellite,
  Loader2,
  Volume2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import CircularProgress from "@/components/ui/CircularProgress";
import CountUpNumber from "@/components/ui/CountUpNumber";
import { getFarms, getFarmById } from "@/services/farmService";
import api from "@/lib/api";
import { getAnalysisProblem } from "@/utils/analysisProblem";
import { normalizeBackendAssetUrl } from "@/utils/backendAssets";
import { speakText } from "@/utils/voice";

export default function FarmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // ✅ Safely get farms - ensure it's always an array
      const farmsList = await getFarms();
      const safeFarmsList = Array.isArray(farmsList) ? farmsList : [];
      setFarms(safeFarmsList);

      if (id && id !== "undefined") {
        const farmDetail = await getFarmById(id);
        setFarm(farmDetail);
        // Load analysis if available
        try {
          const analysisRes = await api.get(`/analysis/latest/${id}`);
          setAnalysis(analysisRes.data?.analysis ?? null);
          const historyRes = await api.get(`/analysis/history/${id}`);
          setTrendData((historyRes.data?.analyses || []).map((item: any) => ({
            date: String(item.analysisDate || item.createdAt || "Latest").slice(0, 10),
            ndvi: Number(item.ndviValue || 0),
          })).reverse());
        } catch (err) {
          console.log("No analysis available yet");
          setAnalysis(null);
          setTrendData([]);
        }
      } else if (safeFarmsList.length > 0) {
        const firstFarm = safeFarmsList[0];
        setFarm(firstFarm);
        try {
          const analysisRes = await api.get(`/analysis/latest/${firstFarm._id}`);
          setAnalysis(analysisRes.data?.analysis ?? null);
          const historyRes = await api.get(`/analysis/history/${firstFarm._id}`);
          setTrendData((historyRes.data?.analyses || []).map((item: any) => ({
            date: String(item.analysisDate || item.createdAt || "Latest").slice(0, 10),
            ndvi: Number(item.ndviValue || 0),
          })).reverse());
        } catch (err) {
          console.log("No analysis available yet");
          setAnalysis(null);
          setTrendData([]);
        }
      }
    } catch (err) {
      console.error("Failed to load farm data:", err);
      setFarms([]);
      setFarm(null);
    }
    setLoading(false);
  };

  const speakRecommendation = () => {
    if (!analysis?.recommendation) return;
    speakText(analysis.recommendation, "en-IN");
  };

  const hasAnalysis = analysis?.ndviValue !== undefined && analysis?.ndviValue !== null;
  const healthPercent = analysis?.healthPercentage;
  const damagePercent = analysis?.damagePercentage;
  const ndviValue = analysis?.ndviValue;
  const previousImageUrl = normalizeBackendAssetUrl(analysis?.previousImageUrl);
  const currentImageUrl = normalizeBackendAssetUrl(analysis?.currentImageUrl);
  const ndviLayerUrl = normalizeBackendAssetUrl(analysis?.ndviLayerUrl);
  const hasUsefulNdviLayer = Boolean(ndviLayerUrl);
  const imageSamples = (Array.isArray(analysis?.imageSamples) ? analysis.imageSamples : [])
    .map((sample: any) => ({ ...sample, url: normalizeBackendAssetUrl(sample?.url) }))
    .filter((sample: any) => sample.url);
  const farmProblem = getAnalysisProblem(analysis);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="text-center">
          <span className="text-6xl block mb-4">🌾</span>
          <h2 className="text-xl font-bold text-emerald-800 mb-2">No Farm Selected</h2>
          <p className="text-gray-600 mb-6">Register a farm to view details</p>
          <button onClick={() => navigate("/draw-farm")} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium">
            Register Farm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Farm Details</h1>
        <p className="text-emerald-100 text-sm mt-1">{farm.cropType} • {farm.season}</p>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Farm Selector - ✅ Safe check for farms array */}
        {farms && farms.length > 1 && (
          <div className="mb-2">
            <select
              value={farm?._id || ""}
              onChange={(e) => navigate(`/farm/${e.target.value}`)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {farms.map((f: any) => (
                <option key={f._id} value={f._id}>
                  {f.cropType} - {f.areaHectares} ha ({f.season})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Crop Info Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Sprout className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-800">{farm.cropType}</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
                <div><span className="text-gray-500">Area:</span> <span className="font-medium">{farm.areaHectares} ha</span></div>
                <div><span className="text-gray-500">Season:</span> <span className="font-medium">{farm.season}</span></div>
                <div><span className="text-gray-500">Sown:</span> <span className="font-medium">{new Date(farm.sowingDate).toLocaleDateString("en-IN")}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="px-2 py-0.5 bg-green-100 text-emerald-700 rounded-full text-xs font-medium">Active</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Meter */}
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm border">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 justify-center">
            <Activity className="w-4 h-4 text-emerald-600" /> Crop Health
          </h3>
          {hasAnalysis ? (
            <CircularProgress value={Number(healthPercent || 0)} size={180} label="Health" suffix="%" />
          ) : (
            <div className="flex h-[180px] items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-500">
              Run analysis for real Sentinel NDVI
            </div>
          )}
          {Number(damagePercent || 0) > 0 && (
            <p className="mt-3 text-sm text-red-500 font-medium">Damage: {damagePercent}%</p>
          )}
        </div>

        {hasAnalysis && (
          <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Detected Problem</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-950">{farmProblem.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{farmProblem.summary}</p>
              </div>
              <div className="rounded-xl bg-orange-50 px-3 py-2 text-center">
                <p className="text-xs font-bold text-orange-700">Damage</p>
                <p className="text-2xl font-extrabold text-orange-900">{farmProblem.damagePercentage}%</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Probable cause
                </p>
                <p className="text-sm text-slate-700">{farmProblem.cause}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Next action
                </p>
                <p className="text-sm text-emerald-900">{farmProblem.actionItems[0]}</p>
              </div>
            </div>
          </div>
        )}

        {/* NDVI Trend Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-emerald-600" /> NDVI Trend (Last 4 Weeks)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f5e9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6b8c6b" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} stroke="#6b8c6b" />
                <Tooltip />
                <Line type="monotone" dataKey="ndvi" stroke="#2E7D32" strokeWidth={2.5} dot={{ fill: "#2E7D32", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-500">Current NDVI: </span>
            <span className="font-bold text-emerald-600">{hasAnalysis ? Number(ndviValue).toFixed(3) : "N/A"}</span>
          </div>
        </div>

        {/* Satellite Images */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-emerald-600" /> Satellite Images
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl overflow-hidden">
              {previousImageUrl ? (
                <img src={previousImageUrl} className="w-full h-24 object-cover" alt="Before" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-slate-100 px-2 text-center text-[11px] text-slate-500">Real image unavailable</div>
              )}
              <p className="text-xs text-center mt-1 text-gray-500">30 days ago</p>
            </div>
            <div className="rounded-xl overflow-hidden">
              {currentImageUrl ? (
                <img src={currentImageUrl} className="w-full h-24 object-cover" alt="Current" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-slate-100 px-2 text-center text-[11px] text-slate-500">Real image unavailable</div>
              )}
              <p className="text-xs text-center mt-1 text-gray-500">Current</p>
            </div>
            <div className="rounded-xl overflow-hidden">
              {hasUsefulNdviLayer ? (
                <img src={ndviLayerUrl} className="w-full h-24 object-cover" alt="NDVI" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-slate-100 px-2 text-center text-[11px] text-slate-500">NDVI image not visually useful</div>
              )}
              <p className="text-xs text-center mt-1 text-gray-500">NDVI Layer</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">Source: {analysis?.imagerySource || "N/A"}</p>
        </div>

        {imageSamples.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Satellite className="w-4 h-4 text-emerald-600" /> Real Sentinel Samples
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {imageSamples.map((sample: any) => (
                <a
                  key={`${sample.label}-${sample.url}`}
                  href={sample.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                >
                  <img src={sample.url} className="h-24 w-full object-cover" alt={sample.label || "Sentinel sample"} />
                  <div className="p-2">
                    <p className="text-xs font-bold text-slate-800">{sample.label || "Sentinel sample"}</p>
                    <p className="text-[10px] text-slate-500">{[sample.from, sample.to].filter(Boolean).join(" to ")}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendation */}
        {analysis?.recommendation && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> AI Recommendation
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">{analysis.recommendation}</p>
            <button 
              onClick={speakRecommendation} 
              className="flex items-center gap-2 mt-3 text-sm text-emerald-600 font-medium"
            >
              <Volume2 className="w-4 h-4" /> Read Aloud
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 pb-6">
          <button 
            onClick={() => navigate(`/analysis?farmId=${farm._id}`)} 
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium"
          >
            View Analysis
          </button>
          <button 
            onClick={() => navigate(`/claims/new?farmId=${farm._id}`)} 
            className="flex-1 border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-medium"
          >
            File Claim
          </button>
        </div>
      </div>
    </div>
  );
}
