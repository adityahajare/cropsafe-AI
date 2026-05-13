import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity, AlertTriangle, RefreshCw, FileText, IndianRupee,
  Loader2, Thermometer, Droplets, CloudRain, Satellite
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import CircularProgress from "@/components/ui/CircularProgress";
import CountUpNumber from "@/components/ui/CountUpNumber";
import AnimatedCard from "@/components/ui/AnimatedCard";
import { getAnalysisHistory, getLatestAnalysis, runAnalysis } from "@/services/farmService";
import api from "@/lib/api";

export default function NDVIAnalysis() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const farmId = id || searchParams.get("farmId");
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (farmId) {
      loadAnalysis();
      loadFarmDetails();
    } else {
      setLoading(false);
      setError("No farm selected");
    }
  }, [farmId]);

  const loadFarmDetails = async () => {
    try {
      const res = await api.get(`/farms/${farmId}`);
      setFarm(res.data?.farm || res.data);
    } catch (err) {
      console.error("Failed to load farm details:", err);
    }
  };

  const loadAnalysis = async () => {
    if (!farmId) return;
    setLoading(true);
    setError(null);
    try {
      const analysisData = await getLatestAnalysis(farmId);
      setAnalysis(analysisData);
      if (!analysisData) {
        setError("No analysis available. Run analysis to get started.");
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
      setError("Could not load analysis data");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!farmId) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runAnalysis(farmId);
      setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const healthPercent = analysis?.healthPercentage ?? 0;
  const damagePercent = analysis?.damagePercentage ?? 0;
  const estimatedLoss = analysis?.estimatedLoss ?? 0;
  const ndviValue = analysis?.ndviValue ?? 0;
  const riskLevel = analysis?.riskLevel ?? "No Data";
  const recommendation = analysis?.recommendation ?? "Run analysis to get crop health recommendations.";

  const riskColors: Record<string, string> = {
    Low: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    High: "bg-orange-100 text-orange-700",
    Critical: "bg-red-100 text-red-700",
    "No Data": "bg-gray-100 text-gray-700",
  };

  const riskEmoji: Record<string, string> = {
    Low: "🟢",
    Medium: "🟡",
    High: "🟠",
    Critical: "🔴",
    "No Data": "⚪",
  };

  const [historicalData, setHistoricalData] = useState<{ month: string; ndvi: number }[]>([]);

  useEffect(() => {
    if (!farmId) return;
    getAnalysisHistory(farmId).then((rows) => {
      const history = (Array.isArray(rows) ? rows : [])
        .slice()
        .reverse()
        .map((row: any) => ({
          month: new Date(row.analysisDate || row.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          ndvi: Number(row.ndviValue || 0),
        }))
        .filter((row) => row.ndvi > 0);
      setHistoricalData(history);
    });
  }, [farmId, ndviValue]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!farmId) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="text-center">
          <span className="text-5xl block mb-4">🌾</span>
          <h2 className="text-xl font-bold text-emerald-800 mb-2">No Farm Selected</h2>
          <p className="text-gray-600 mb-6">Please select a farm to view NDVI analysis</p>
          <button onClick={() => navigate("/dashboard")} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">📊 NDVI Analysis</h1>
        <p className="text-emerald-100 text-sm mt-1">
          {farm?.cropType ? `${farm.cropType} • ${farm.season}` : "Crop Health Monitoring"}
        </p>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {/* Hero: Health Meter */}
        {analysis ? (
          <div className="text-center">
            <CircularProgress value={healthPercent} size={200} label="Health" suffix="%" />
            <div className="mt-2">
              <span className="text-sm text-gray-500">NDVI Value: </span>
              <span className="text-lg font-bold text-emerald-600">
                <CountUpNumber value={ndviValue} decimals={3} />
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-emerald-200">
            <Satellite className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No analysis available</p>
            <p className="text-xs text-gray-400">Run analysis to get NDVI data</p>
          </div>
        )}

        {/* Error Message */}
        {error && !analysis && (
          <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        )}

        {/* Metric Cards */}
        {analysis && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
                <p className="text-xs text-gray-500 mb-1">Health</p>
                <p className="text-xl font-bold text-emerald-600">
                  <CountUpNumber value={healthPercent} suffix="%" />
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
                <p className="text-xs text-gray-500 mb-1">Damage</p>
                <p className="text-xl font-bold text-red-500">
                  <CountUpNumber value={damagePercent} suffix="%" />
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
                <p className="text-xs text-gray-500 mb-1">Loss</p>
                <p className="text-lg font-bold text-gray-800">
                  ₹<CountUpNumber value={estimatedLoss} />
                </p>
              </div>
            </div>

            {/* Risk Level */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-gray-800">Risk Level</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColors[riskLevel] || riskColors["No Data"]}`}>
                  {riskEmoji[riskLevel] || "⚪"} {riskLevel}
                </span>
              </div>
            </div>

            {/* NDVI Formula */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                NDVI Formula
              </h3>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-lg font-mono font-bold text-emerald-700">
                  NDVI = (NIR - RED) / (NIR + RED)
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Near-Infrared and Red bands from Sentinel-2 satellite
                </p>
              </div>
            </div>

            {/* Historical Trend */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <h3 className="font-bold text-gray-800 mb-3">📈 Historical NDVI Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5e9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6b8c6b" />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} stroke="#6b8c6b" />
                    <Tooltip />
                    <Line type="monotone" dataKey="ndvi" stroke="#2E7D32" strokeWidth={2.5} dot={{ fill: "#2E7D32", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                💡 AI Recommendation
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{recommendation}</p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2 pb-6">
          <button
            onClick={handleRunAnalysis}
            disabled={running}
            className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${running ? "animate-spin" : ""}`} />
            {running ? "Running Analysis..." : "Run NDVI Analysis"}
          </button>

          <button
            onClick={() => navigate(`/claims/new?farmId=${farmId}`)}
            disabled={!analysis}
            className="w-full py-4 rounded-xl border-2 border-emerald-600 text-emerald-600 font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400"
          >
            <FileText className="w-5 h-5" />
            Submit Claim
          </button>

          <button
            onClick={() => navigate(`/reports?farmId=${farmId}`)}
            disabled={!analysis}
            className="w-full py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <IndianRupee className="w-5 h-5" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
