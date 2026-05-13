import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { MapPin, Leaf, Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Farmer = {
  _id: string;
  name: string;
  mobile: string;
  aadhaar: string;
  village: string;
  district: string;
  city: string;
  state: string;
  role: string;
};

type Farm = {
  _id: string;
  cropType: string;
  areaHectares: number;
  season: string;
  sowingDate: string;
  centerLat: number;
  centerLng: number;
};

type Analysis = {
  ndviValue: number;
  healthPercentage: number;
  damagePercentage: number;
  estimatedLoss: number;
  riskLevel: string;
  recommendation: string;
};

export default function FarmerSelection() {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerFarms, setFarmerFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, []);

  // ✅ Use correct admin endpoint
  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/farmers");
      const farmersList = res.data?.farmers || res.data || [];
      setFarmers(Array.isArray(farmersList) ? farmersList : []);
    } catch (err) {
      console.error("Failed to load farmers:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch farms for selected farmer
  const fetchFarmerFarms = async (farmerId: string) => {
    setLoadingDetails(true);
    try {
      // Get farms by farmer ID (you may need this endpoint)
      const res = await api.get(`/farms?farmerId=${farmerId}`);
      const farms = res.data?.farms || res.data || [];
      setFarmerFarms(Array.isArray(farms) ? farms : []);
      
      if (farms.length > 0) {
        setSelectedFarm(farms[0]);
        await fetchAnalysis(farms[0]._id);
      }
    } catch (err) {
      console.error("Failed to load farmer farms:", err);
      setFarmerFarms([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ✅ Use correct analysis endpoint
  const fetchAnalysis = async (farmId: string) => {
    try {
      const res = await api.get(`/analysis/latest/${farmId}`);
      const analysisData = res.data?.analysis || res.data;
      setAnalysis(analysisData);
    } catch (err) {
      console.log("No analysis available for this farm");
      setAnalysis(null);
    }
  };

  const openFarmer = async (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    await fetchFarmerFarms(farmer._id);
  };

  const handleFarmChange = async (farmId: string) => {
    const farm = farmerFarms.find(f => f._id === farmId);
    if (farm) {
      setSelectedFarm(farm);
      await fetchAnalysis(farmId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // =========================
  // LIST VIEW
  // =========================
  if (!selectedFarmer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
          <h1 className="text-white text-xl font-bold">Select Farmer</h1>
          <p className="text-emerald-100 text-sm mt-1">All registered farmers in the system</p>
        </div>

        <div className="px-4 mt-5">
          {farmers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No farmers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmers.map((farmer) => (
                <div
                  key={farmer._id}
                  onClick={() => openFarmer(farmer)}
                  className="bg-white rounded-2xl p-5 shadow-sm border cursor-pointer hover:shadow-md transition-all hover:scale-[1.01]"
                >
                  <h2 className="font-bold text-lg text-emerald-800">{farmer.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4" />
                    {farmer.city}, {farmer.district}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <span>Farmer ID: {farmer._id.slice(-6)}</span>
                  </div>
                  <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================
  // DETAIL VIEW
  // =========================
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <button 
          onClick={() => {
            setSelectedFarmer(null);
            setFarmerFarms([]);
            setSelectedFarm(null);
            setAnalysis(null);
          }} 
          className="text-white mb-2 flex items-center gap-1"
        >
          ← Back to Farmers
        </button>
        <h1 className="text-white text-xl font-bold">{selectedFarmer.name}</h1>
        <p className="text-emerald-100 text-sm mt-1">{selectedFarmer.city}, {selectedFarmer.district}</p>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {/* Farmer Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Mobile</p>
            <p className="font-bold text-emerald-800">{selectedFarmer.mobile}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Aadhaar</p>
            <p className="font-bold text-emerald-800">XXXX-XXXX-{selectedFarmer.aadhaar?.slice(-4)}</p>
          </div>
        </div>

        {/* Farm Selector */}
        {farmerFarms.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Farm</label>
            <select
              value={selectedFarm?._id || ""}
              onChange={(e) => handleFarmChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {farmerFarms.map((farm) => (
                <option key={farm._id} value={farm._id}>
                  {farm.cropType} - {farm.areaHectares} ha ({farm.season})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Farm Details */}
        {selectedFarm && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4" /> Farm Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Crop:</span> <span className="font-medium">{selectedFarm.cropType}</span></div>
              <div><span className="text-gray-500">Area:</span> <span className="font-medium">{selectedFarm.areaHectares} ha</span></div>
              <div><span className="text-gray-500">Season:</span> <span className="font-medium">{selectedFarm.season}</span></div>
              <div><span className="text-gray-500">Sowing:</span> <span className="font-medium">{new Date(selectedFarm.sowingDate).toLocaleDateString("en-IN")}</span></div>
            </div>
          </div>
        )}

        {/* NDVI Analysis */}
        {loadingDetails ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : analysis ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> NDVI Analysis
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>NDVI Value: {analysis.ndviValue?.toFixed(4)}</span>
                  <span>Health: {analysis.healthPercentage}%</span>
                </div>
                <Progress value={analysis.healthPercentage} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Damage: {analysis.damagePercentage}%</span>
                  <span>Risk: {analysis.riskLevel}</span>
                </div>
                <Progress value={analysis.damagePercentage} className="h-2 bg-red-100" />
              </div>
              <p className="text-sm text-gray-600 mt-2">{analysis.recommendation}</p>
              <p className="text-sm font-medium text-emerald-600">Estimated Loss: ₹{(analysis.estimatedLoss || 0).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 text-center border">
            <p className="text-gray-500">No analysis available</p>
            <Button className="mt-3 bg-emerald-600">Run Analysis</Button>
          </div>
        )}

        {/* Action Buttons */}
        {selectedFarm && (
          <div className="flex gap-3 pt-2 pb-6">
            <Button 
              onClick={() => navigate(`/analysis?farmId=${selectedFarm._id}`)} 
              className="flex-1 bg-emerald-600"
            >
              View Full Analysis
            </Button>
            <Button 
              onClick={() => navigate(`/claims/new?farmId=${selectedFarm._id}`)} 
              variant="outline"
              className="flex-1 border-emerald-600 text-emerald-600"
            >
              File Claim
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}