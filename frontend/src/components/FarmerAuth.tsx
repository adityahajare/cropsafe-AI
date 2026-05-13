import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import area from "@turf/area";
import { polygon } from "@turf/helpers";
import { MAHARASHTRA_CITIES, CROP_TYPES, SEASON_TYPES } from "@/utils/constants";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface FarmerAuthProps {
  onLogin: (user: any) => void;
  onBack: () => void;
}

const FarmerAuth: React.FC<FarmerAuthProps> = ({ onLogin, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    aadhaar: "",
    mobile: "",
    village: "",
    district: "",
    city: "",
    state: "Maharashtra",
    password: "",
  });

  const [farmData, setFarmData] = useState({
    areaHectares: "",
    cropType: "",
    season: "",
    sowingDate: new Date().toISOString().split("T")[0],
  });

  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawnPolygonRef = useRef<L.Polygon | null>(null);

  // Init Map
  useEffect(() => {
    if (!showMap) return;
    if (mapRef.current) return;

    const map = L.map("registration-map").setView([18.52, 73.85], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new (L.Control as any).Draw({
      draw: { polygon: true, rectangle: false, circle: false, marker: false, polyline: false },
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    map.on("draw:created", (e: any) => {
      const layer = e.layer;
      if (drawnPolygonRef.current) drawnItems.removeLayer(drawnPolygonRef.current);
      drawnPolygonRef.current = layer;
      drawnItems.addLayer(layer);

      const latlngs = layer.getLatLngs()[0] as any[];
      const coords = latlngs.map((p: any) => [p.lng, p.lat]);
      const poly = polygon([coords]);
      const sqm = area(poly);
      const hectares = (sqm / 10000).toFixed(2);

      setFarmData((prev) => ({ ...prev, areaHectares: hectares }));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [showMap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // LOGIN
      if (isLogin) {
        const res = await api.post("/auth/login", {
          aadhaar: formData.aadhaar,
          password: formData.password,
        });
        
        if (res.data.success) {
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          onLogin(res.data.user);
        }
        return;
      }

      // REGISTER - Validate required fields
      if (!formData.name || !formData.aadhaar || !formData.mobile || !formData.village || !formData.district || !formData.city || !formData.password) {
        setError("Please fill all required fields");
        setLoading(false);
        return;
      }

      if (formData.aadhaar.length !== 12) {
        setError("Aadhaar must be 12 digits");
        setLoading(false);
        return;
      }

      if (formData.mobile.length !== 10) {
        setError("Mobile must be 10 digits");
        setLoading(false);
        return;
      }

      const registerRes = await api.post("/auth/register", {
        name: formData.name,
        aadhaar: formData.aadhaar,
        mobile: formData.mobile,
        village: formData.village,
        district: formData.district,
        city: formData.city,
        state: formData.state,
        password: formData.password,
      });

      if (!registerRes.data.success) {
        setError(registerRes.data.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto login after registration
      const loginRes = await api.post("/auth/login", {
        aadhaar: formData.aadhaar,
        password: formData.password,
      });

      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("user", JSON.stringify(loginRes.data.user));

      // Save farm if drawn
      if (drawnPolygonRef.current && farmData.cropType && farmData.season && farmData.areaHectares) {
        const latlngs = drawnPolygonRef.current.getLatLngs()[0] as any[];
        const polygonCoordinates = latlngs.map((p: any) => [p.lat, p.lng]);
        const center = mapRef.current?.getCenter();

        await api.post("/farms", {
          polygonCoordinates,
          centerLat: center?.lat || 18.52,
          centerLng: center?.lng || 73.85,
          areaHectares: parseFloat(farmData.areaHectares),
          cropType: farmData.cropType,
          season: farmData.season,
          sowingDate: farmData.sowingDate,
          city: formData.city,
          cityBoundaryVerified: true,
        });
      }

      onLogin(loginRes.data.user);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-emerald-800 mb-6">{isLogin ? "Farmer Login" : "Farmer Registration"}</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Aadhaar (12 digits)"
            value={formData.aadhaar}
            onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            required
          />

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />

              <input
                type="tel"
                placeholder="Mobile (10 digits)"
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />

              <input
                type="text"
                placeholder="Village"
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />

              <input
                type="text"
                placeholder="District"
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />

              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                required
              >
                <option value="">Select City</option>
                {MAHARASHTRA_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              {/* Farm Details */}
              <select
                value={farmData.cropType}
                onChange={(e) => setFarmData({ ...farmData, cropType: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                required
              >
                <option value="">Select Crop</option>
                {CROP_TYPES.map((crop) => (
                  <option key={crop.name} value={crop.name}>{crop.emoji} {crop.name}</option>
                ))}
              </select>

              <select
                value={farmData.season}
                onChange={(e) => setFarmData({ ...farmData, season: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                required
              >
                <option value="">Select Season</option>
                {SEASON_TYPES.map((season) => (
                  <option key={season.name} value={season.name}>{season.icon} {season.name}</option>
                ))}
              </select>

              <input
                type="date"
                value={farmData.sowingDate}
                onChange={(e) => setFarmData({ ...farmData, sowingDate: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />

              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="w-full py-3 rounded-xl border-2 border-emerald-600 text-emerald-600 font-medium"
              >
                {showMap ? "Hide Map" : "Draw Farm Boundary"}
              </button>

              {showMap && (
                <div id="registration-map" style={{ height: "300px", borderRadius: "12px", marginTop: "10px" }} />
              )}

              {farmData.areaHectares && (
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-emerald-700">Farm Area: <strong>{farmData.areaHectares} hectares</strong></p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg disabled:opacity-50"
          >
            {loading ? "Processing..." : (isLogin ? "Login" : "Register")}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 font-medium">
            {isLogin ? "New Farmer? Register" : "Already have an account? Login"}
          </button>
        </div>

        <button onClick={onBack} className="w-full mt-3 py-2 text-gray-500 text-sm">← Back</button>
      </div>
    </div>
  );
};

export default FarmerAuth;