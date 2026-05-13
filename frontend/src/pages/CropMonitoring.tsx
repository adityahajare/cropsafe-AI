import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getFarms, runAnalysis, getLatestAnalysis } from "@/services/farmService";
import { getHealthColor, getRiskBadge } from "@/utils/ndviCalculator";

interface User {
  id: string;
  name: string;
  city?: string;
}

interface CropMonitoringProps {
  user: User | null;
}

// NDVI Color Scale Legend
const NDVI_LEGEND = [
  { range: "0.8 - 1.0", label: "Excellent", color: "#006400", emoji: "🟢" },
  { range: "0.6 - 0.8", label: "Good", color: "#32CD32", emoji: "🟢" },
  { range: "0.4 - 0.6", label: "Moderate", color: "#FFD700", emoji: "🟡" },
  { range: "0.2 - 0.4", label: "High Stress", color: "#FF8C00", emoji: "🟠" },
  { range: "0.0 - 0.2", label: "Critical", color: "#FF0000", emoji: "🔴" },
];

const CropMonitoring: React.FC<CropMonitoringProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const farmIdParam = searchParams.get("farmId");

  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [selectedFarmData, setSelectedFarmData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [compareMode, setCompareMode] = useState<"slider" | "side">("slider");
  const [sliderPosition, setSliderPosition] = useState(50);

  const loadFarms = async () => {
    try {
      const farmList = await getFarms();
      const farmsArray = Array.isArray(farmList) ? farmList : [];
      setFarms(farmsArray);

      if (farmIdParam) {
        const farm = farmsArray.find((f: any) => f._id === farmIdParam);
        setSelectedFarm(farmIdParam);
        setSelectedFarmData(farm);
      } else if (farmsArray.length > 0) {
        setSelectedFarm(farmsArray[0]._id);
        setSelectedFarmData(farmsArray[0]);
      }
    } catch (err) {
      console.error("getFarms error:", err);
      setFarms([]);
    }
  };

  const loadAnalysis = async () => {
    if (!selectedFarm) return;
    setLoading(true);
    try {
      const analysisData = await getLatestAnalysis(selectedFarm);
      setAnalysis(analysisData);
    } catch (err) {
      console.error("analysis error:", err);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedFarm) return;
    setRunning(true);
    try {
      const analysisData = await runAnalysis(selectedFarm);
      setAnalysis(analysisData);
    } catch (err) {
      console.error("run analysis error:", err);
      alert("Analysis failed. Try again.");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => { loadFarms(); }, []);
  useEffect(() => { if (selectedFarm) loadAnalysis(); }, [selectedFarm]);

  const healthPct = analysis?.healthPercentage || 0;
  const ndviValue = analysis?.ndviValue || 0;
  const damagePct = analysis?.damagePercentage || 0;
  const lossAmount = analysis?.estimatedLoss || 0;
  const risk = getRiskBadge(analysis?.riskLevel || "low");
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (healthPct / 100) * circumference;

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const lat = selectedFarmData?.centerLat || 18.5204;
  const lng = selectedFarmData?.centerLng || 73.8567;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">📊 Crop Monitoring & NDVI Analysis</h1>
        <p className="text-emerald-100 text-sm mt-1">Welcome, {user?.name || "Farmer"}</p>
        
        {farms.length > 0 && (
          <select
            value={selectedFarm}
            onChange={(e) => {
              setSelectedFarm(e.target.value);
              const farm = farms.find((f) => f._id === e.target.value);
              setSelectedFarmData(farm);
            }}
            className="mt-3 w-full px-4 py-3 rounded-xl bg-white/20 text-white border border-white/30"
          >
            {farms.map((f) => (
              <option key={f._id} value={f._id}>
                {f.cropType} - {(f.areaHectares || 0).toFixed(1)} ha ({f.season})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="px-4 space-y-5 mt-4">
        {farms.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-4xl mb-3">🌾</p>
            <p className="text-gray-500">No farms found. Please add a farm first.</p>
            <button onClick={() => navigate("/draw-farm")} className="mt-4 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium">
              Draw Your Farm
            </button>
          </div>
        ) : !analysis && !loading ? (
          <div className="glass-card p-8 text-center">
            <p className="text-5xl mb-3">🛰️</p>
            <p className="text-gray-500">No analysis yet. Run NDVI analysis to check crop health.</p>
            <button onClick={handleRunAnalysis} disabled={running} className="mt-4 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium">
              {running ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>
        ) : loading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : analysis ? (
          <>
            {/* Health Meter */}
            <div className="glass-card p-6 text-center">
              <svg width="180" height="180" className="mx-auto">
                <circle cx="90" cy="90" r="80" fill="none" stroke="#e8f5e9" strokeWidth="12" />
                <circle cx="90" cy="90" r="80" fill="none" stroke={getHealthColor(healthPct)} strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                <text x="90" y="85" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#064e3b">{healthPct}%</text>
                <text x="90" y="105" textAnchor="middle" fontSize="12" fill="#6b7280">Health</text>
              </svg>
              <p className="text-sm text-gray-500 mt-2">NDVI: {ndviValue.toFixed(4)}</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
                <p className="text-2xl font-bold text-emerald-600">{ndviValue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">NDVI Value</p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
                <p className="text-2xl font-bold text-red-500">{damagePct}%</p>
                <p className="text-xs text-gray-500">Damage</p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
                <p className="text-2xl font-bold text-amber-600">₹{lossAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Loss Amount</p>
              </div>
            </div>

            {/* Risk Level */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Risk Level</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: risk.color + '20', color: risk.color }}>
                  {risk.emoji} {analysis?.riskLevel || "Low"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{analysis?.recommendation || "Crop health is normal."}</p>
            </div>

            {/* NDVI Color Scale Legend */}
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">NDVI Color Scale:</p>
              <div className="flex flex-wrap gap-3">
                {NDVI_LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-1 text-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={handleRunAnalysis} disabled={running} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                {running ? "Running..." : "Re-analyze"}
              </button>
              <button onClick={() => navigate(`/claims?farmId=${selectedFarm}`)} className="flex-1 border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-medium">
                Submit Claim
              </button>
              <button className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium">Generate Report</button>
            </div>
          </>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="flex justify-around items-center">
          <div className="nav-item text-center" onClick={() => navigate("/dashboard")}><i className="fas fa-home text-xl"></i><p className="text-xs mt-1">Home</p></div>
          <div className="nav-item active text-center" onClick={() => navigate("/analysis")}><i className="fas fa-chart-line text-xl"></i><p className="text-xs mt-1">Analysis</p></div>
          <div className="nav-item text-center" onClick={() => navigate("/disease")}><i className="fas fa-biohazard text-xl"></i><p className="text-xs mt-1">Disease</p></div>
          <div className="nav-item text-center" onClick={() => navigate("/claims")}><i className="fas fa-file-invoice-dollar text-xl"></i><p className="text-xs mt-1">Claim</p></div>
          <div className="nav-item text-center" onClick={() => navigate("/chatbot")}><i className="fas fa-robot text-xl"></i><p className="text-xs mt-1">AI</p></div>
        </div>
      </div>

      {/* Floating Mic */}
      <div className="floating-mic" onClick={() => navigate("/chatbot")}>
        <i className="fas fa-microphone text-white text-xl"></i>
      </div>
    </div>
  );
};

export default CropMonitoring;
