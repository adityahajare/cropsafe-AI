import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getFarms, getClaims } from "@/services/farmService";
import { getCurrentWeather, getWeatherByCoords } from "@/services/weatherService";
import { WEATHER_CONDITIONS } from "@/utils/constants";

// Farm Facts Database
const FARM_FACTS = [
  { category: "weather", fact: "Tomorrow's forecast: 32°C, 20% chance of rain. Good for spraying." },
  { category: "crop", fact: "Rice needs standing water for first 30 days after transplanting." },
  { category: "pest", fact: "Watch for Brown Plant Hopper in rice during humid conditions." },
  { category: "market", fact: "Today's MSP: Rice ₹2,220 | Wheat ₹2,275 | Maize ₹2,090" },
  { category: "government", fact: "PMFBY enrollment deadline: July 31st" },
  { category: "general", fact: "Early morning is best time for harvesting to retain moisture." },
];

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [factOfDay, setFactOfDay] = useState(FARM_FACTS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get farms
      const farmsData = await getFarms();
      const farmsList = Array.isArray(farmsData) ? farmsData : [];
      setFarms(farmsList);

      // Get claims
      const claimsData = await getClaims();
      setClaims(Array.isArray(claimsData) ? claimsData : []);

      // Get latest analysis for first farm
      if (farmsList.length > 0) {
        const firstFarm = farmsList[0];

        try {
          const weatherCity = firstFarm?.city || user?.city || "";
          const weatherState = firstFarm?.state || user?.state || "";
          const hasFarmCoords =
            Number.isFinite(Number(firstFarm?.centerLat)) &&
            Number.isFinite(Number(firstFarm?.centerLng));

          let weatherData = null;
          if (weatherCity) {
            try {
              weatherData = await getCurrentWeather(weatherCity, weatherState);
              weatherData = { ...weatherData, city: weatherCity };
            } catch {
              weatherData = null;
            }
          }

          if (!weatherData && hasFarmCoords) {
            weatherData = await getWeatherByCoords(Number(firstFarm.centerLat), Number(firstFarm.centerLng));
          }

          if (weatherData) {
            setWeather(weatherData);
          }
        } catch {
          setWeather(null);
        }

        try {
          const analysisRes = await api.get(`/analysis/latest/${farmsList[0]._id}`);
          setAnalysis(analysisRes.data?.analysis || analysisRes.data);
        } catch (err) {
          console.log("No analysis available");
        }
      } else if (user?.city) {
        try {
          const weatherData = await getCurrentWeather(user.city, user.state);
          setWeather({ ...weatherData, city: user.city });
        } catch (err) {
          console.log("Weather not available");
        }
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Voice playback function
  const speakFact = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(factOfDay.fact);
      utterance.lang = 'en-IN';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  // Share fact to WhatsApp
  const shareFact = () => {
    const text = encodeURIComponent(`🌾 Farm Tip: ${factOfDay.fact}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const pendingClaims = claims.filter(c => c.status === "pending" || c.status === "under_review").length;
  const totalFarms = farms.length;
  const avgHealth = analysis?.healthPercentage || 0;
  const ndviValue = analysis?.ndviValue || 0;

  const miniChartData = ndviValue ? [ndviValue] : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header with Welcome Message */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-100 text-sm">नमस्कार, 👋</p>
            <h1 className="text-white text-2xl font-bold">{user?.name || "Farmer"}</h1>
            <p className="text-emerald-100 text-sm mt-1">{user?.city || "Maharashtra"}</p>
          </div>
          <div className="relative">
            <button className="text-white text-xl relative">
              🔔
              {pendingClaims > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingClaims}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-5">
        {/* Weather Widget (Glass Card) */}
        {weather && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-emerald-800">{weather.temperature}°C</p>
                <p className="text-sm text-gray-500 mt-1">{weather.description || weather.condition || "Partly Cloudy"}</p>
              </div>
              <div className="text-5xl">{WEATHER_CONDITIONS[weather.condition]?.icon || "🌤️"}</div>
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t">
              <span className="text-sm text-gray-500">💧 Humidity: {weather.humidity || 65}%</span>
              <span className="text-sm text-gray-500">🌧️ Rain: {weather.rainfall || 2}mm</span>
              <span className="text-sm text-gray-500">💨 Wind: {weather.windSpeed || 12}km/h</span>
            </div>
            
            {/* 5-day forecast (horizontal scroll) */}
            <div className="mt-4 overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                  <div key={i} className="text-center min-w-[60px]">
                    <p className="text-xs text-gray-500">{day}</p>
                    <p className="text-xl">{["☀️", "🌤️", "🌧️", "⛅", "☀️"][i]}</p>
                    <p className="text-xs font-bold">{28 + i}°C</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FACT OF THE DAY CARD */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <span className="text-xs font-semibold uppercase tracking-wide">Fact of the Day</span>
              </div>
              <p className="text-sm mt-2 leading-relaxed">{factOfDay.fact}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={speakFact} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                <i className="fas fa-volume-up text-white"></i>
              </button>
              <button onClick={shareFact} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                <i className="fab fa-whatsapp text-white"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border hover:shadow-md transition">
            <p className="text-3xl font-bold text-emerald-600">{totalFarms}</p>
            <p className="text-xs text-gray-500 mt-1">Total Farms</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border hover:shadow-md transition">
            <p className="text-3xl font-bold text-emerald-600">{avgHealth}%</p>
            <p className="text-xs text-gray-500 mt-1">Avg Health</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border hover:shadow-md transition">
            <p className="text-3xl font-bold text-amber-600">{pendingClaims}</p>
            <p className="text-xs text-gray-500 mt-1">Active Claims</p>
          </div>
        </div>

        {/* My Farms Section (Horizontal Scroll) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-emerald-800">🌾 My Farms</h2>
            <button 
              onClick={() => navigate("/draw-farm")} 
              className="text-emerald-600 text-sm font-medium"
            >
              + Add New
            </button>
          </div>
          
          {farms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-emerald-200">
              <p className="text-5xl mb-3">🌾</p>
              <p className="text-gray-500">No farms registered yet</p>
              <button 
                onClick={() => navigate("/draw-farm")} 
                className="mt-3 bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-medium"
              >
                Draw Your Farm
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 horizontal-scroll">
              {farms.map((farm) => (
                <div 
                  key={farm._id}
                  onClick={() => navigate(`/analysis?farmId=${farm._id}`)}
                  className="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border w-44 cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-2xl mb-2">{farm.cropType === "Rice" ? "🌾" : farm.cropType === "Wheat" ? "🌿" : "🌽"}</p>
                  <p className="font-bold text-emerald-800">{farm.cropType}</p>
                  <p className="text-sm text-gray-500 mt-1">{farm.areaHectares} ha</p>
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avgHealth}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{avgHealth}% health</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Analysis Card */}
        {analysis && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="font-bold text-emerald-800 mb-3">📊 Recent Analysis</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">NDVI Value</p>
                <p className="text-2xl font-bold text-emerald-600">{ndviValue.toFixed(3)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Health</p>
                <p className="text-2xl font-bold text-emerald-600">{avgHealth}%</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${avgHealth}%` }}></div>
              </div>
            </div>
            {/* Mini chart - simple bars */}
            <div className="mt-4 flex items-end gap-2 h-16">
              {miniChartData.map((value, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-emerald-100 rounded-t-lg" style={{ height: `${value * 80}px` }}></div>
                  <span className="text-[10px] text-gray-400 mt-1">{idx === 3 ? "Now" : `W${idx + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips Card */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
          <h3 className="font-bold text-emerald-800 mb-2">🌱 Farming Tip</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {factOfDay.fact}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-3 pb-6">
          <button 
            onClick={() => navigate("/analysis")} 
            className="bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition active:scale-95"
          >
            🔍 View Analysis
          </button>
          <button 
            onClick={() => navigate("/claims")} 
            className="border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-medium hover:bg-emerald-50 transition active:scale-95"
          >
            📋 My Claims
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="flex justify-around items-center">
          <div className="nav-item active text-center" onClick={() => navigate("/dashboard")}>
            <i className="fas fa-home text-xl"></i>
            <p className="text-xs mt-1">Home</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/analysis")}>
            <i className="fas fa-chart-line text-xl"></i>
            <p className="text-xs mt-1">Analysis</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/disease")}>
            <i className="fas fa-biohazard text-xl"></i>
            <p className="text-xs mt-1">Disease</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/claims")}>
            <i className="fas fa-file-invoice-dollar text-xl"></i>
            <p className="text-xs mt-1">Claim</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/chatbot")}>
            <i className="fas fa-robot text-xl"></i>
            <p className="text-xs mt-1">AI</p>
          </div>
        </div>
      </div>

      {/* Floating Mic Button */}
      <div className="floating-mic" onClick={() => navigate("/chatbot")}>
        <i className="fas fa-microphone text-white text-xl"></i>
      </div>
    </div>
  );
}
