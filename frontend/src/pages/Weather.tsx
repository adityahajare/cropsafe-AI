import { useEffect, useState } from "react";
import {
  CloudRain, Thermometer, Droplets, Wind,
  AlertTriangle, Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedCard from "@/components/ui/AnimatedCard";
import { getCurrentWeather, getWeatherForecast } from "@/services/weatherService"; // ✅ FIXED

const DEFAULT_CITY = "Nashik";

export default function Weather() {
  const { t } = useLanguage();
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [inputCity, setInputCity] = useState(DEFAULT_CITY);

  const fetchWeather = async (cityName: string) => {
    if (!cityName.trim()) return;
    setLoading(true);
    setError("");
    try {
      // ✅ Use correct function
      const currentData = await getCurrentWeather(cityName);
      setWeather(currentData);
      setCity(cityName);
      
      // ✅ Also fetch forecast
      const forecastData = await getWeatherForecast(cityName);
      setForecast(forecastData?.forecasts || []);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(`Could not fetch weather for "${cityName}".`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeather(DEFAULT_CITY); }, []);

  const conditions = weather ? [
    { icon: Thermometer, label: "Temperature", value: `${weather.temperature}°C`, color: "text-red-500", bg: "bg-red-50" },
    { icon: CloudRain, label: "Rainfall", value: `${weather.rainfall || 0} mm`, color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Droplets, label: "Humidity", value: `${weather.humidity || 0}%`, color: "text-cyan-500", bg: "bg-cyan-50" },
    { icon: Wind, label: "Wind Speed", value: `${weather.windSpeed || 0} km/h`, color: "text-slate-500", bg: "bg-slate-50" },
  ] : [];

  const getForecastDay = (index: number) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const date = new Date();
    date.setDate(date.getDate() + index);
    return days[date.getDay()];
  };

  const getForecastIcon = (condition: string) => {
    const icons: Record<string, string> = {
      Clear: "☀️", Clouds: "🌤️", Rain: "🌧️", Drizzle: "🌦️", Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️"
    };
    return icons[condition] || "🌤️";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">🌤️ Weather</h1>
        <p className="text-emerald-100 text-sm mt-1">Live weather for {city}</p>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {/* Search Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputCity}
            onChange={(e) => setInputCity(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchWeather(inputCity); }}
            placeholder="Enter city name..."
            className="flex-1 px-4 py-3 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            onClick={() => fetchWeather(inputCity)}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Weather Cards */}
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ))
          ) : (
            conditions.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-2`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))
          )}
        </div>

        {/* Agricultural Advice */}
        {weather && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
            <h3 className="font-bold text-gray-800 mb-2">🌾 Agricultural Advice</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {weather.temperature > 35
                ? "🔥 High temperature detected. Ensure adequate irrigation for your crops. Consider providing shade for sensitive plants."
                : weather.rainfall > 50
                ? "🌧️ Heavy rainfall expected. Check drainage systems and avoid fertilization. Monitor for waterlogging."
                : "✅ Weather conditions are favorable for crop growth. Continue regular monitoring and maintain irrigation schedule."
              }
            </p>
          </div>
        )}

        {/* 5-Day Forecast */}
        {forecast.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-3">📅 5-Day Forecast</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {forecast.slice(0, 5).map((day, i) => (
                <div key={i} className="min-w-[80px] text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500">{new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" })}</p>
                  <p className="text-2xl my-1">{getForecastIcon(day.condition)}</p>
                  <p className="text-sm font-bold text-emerald-700">{day.temperature}°C</p>
                  <p className="text-[10px] text-gray-400">{day.condition}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="flex justify-around items-center">
          <div className="nav-item text-center" onClick={() => window.location.href = "/dashboard"}>
            <i className="fas fa-home text-xl"></i><p className="text-xs mt-1">Home</p>
          </div>
          <div className="nav-item text-center" onClick={() => window.location.href = "/analysis"}>
            <i className="fas fa-chart-line text-xl"></i><p className="text-xs mt-1">Analysis</p>
          </div>
          <div className="nav-item text-center" onClick={() => window.location.href = "/disease"}>
            <i className="fas fa-biohazard text-xl"></i><p className="text-xs mt-1">Disease</p>
          </div>
          <div className="nav-item text-center" onClick={() => window.location.href = "/claims"}>
            <i className="fas fa-file-invoice-dollar text-xl"></i><p className="text-xs mt-1">Claim</p>
          </div>
          <div className="nav-item text-center" onClick={() => window.location.href = "/chatbot"}>
            <i className="fas fa-robot text-xl"></i><p className="text-xs mt-1">AI</p>
          </div>
        </div>
      </div>

      {/* Floating Mic */}
      <div className="floating-mic" onClick={() => window.location.href = "/chatbot"}>
        <i className="fas fa-microphone text-white text-xl"></i>
      </div>
    </div>
  );
}