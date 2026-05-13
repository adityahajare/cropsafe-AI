import { useEffect, useMemo, useRef, useState } from "react";
import { LayersControl, MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Check, Edit, LocateFixed, MapPin, Plus, Search, Trash2, Undo2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CROP_TYPES, SEASON_TYPES } from "@/utils/constants";
import { calculateAreaHectares, getPolygonCenter } from "@/utils/geo";
import { createFarm, deleteFarm, getFarms, runAnalysis, updateFarm } from "@/services/farmService";
import api from "@/lib/api";

const CUSTOM_CROP = "__custom_crop__";
const defaultCenter: [number, number] = [18.5204, 73.8567];
const defaultZoom = 19;
const closeFarmZoom = 20;
const maxFarmZoom = 23;
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

type FarmLocationMeta = {
  village: string;
  district: string;
  city: string;
  state: string;
  cityLat?: number;
  cityLon?: number;
};

type MapSearchResult = {
  center: [number, number];
  meta: Partial<FarmLocationMeta>;
};

function DrawingLayer({
  drawing,
  onPoint,
}: {
  drawing: boolean;
  onPoint: (point: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      if (drawing) onPoint([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function MapViewportController({
  center,
  zoom,
  fitPoints,
  fitVersion,
}: {
  center: [number, number];
  zoom: number;
  fitPoints: [number, number][];
  fitVersion: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  useEffect(() => {
    if (fitPoints.length >= 2) {
      map.fitBounds(fitPoints, { animate: true, maxZoom: maxFarmZoom, padding: [28, 28] });
    }
  }, [fitPoints, fitVersion, map]);

  return null;
}

export default function DrawFarmMap() {
  const navigate = useNavigate();
  const [farms, setFarms] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [boundary, setBoundary] = useState<[number, number][]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [fitVersion, setFitVersion] = useState(0);
  const [farmLocation, setFarmLocation] = useState<FarmLocationMeta>({ village: "", district: "", city: "", state: "" });
  const [customCropType, setCustomCropType] = useState("");
  const searchCacheRef = useRef<Map<string, MapSearchResult>>(new Map());
  const [form, setForm] = useState({
    farmName: "",
    cropType: "",
    season: "",
    sowingDate: new Date().toISOString().split("T")[0],
    areaHectares: "0.00",
  });

  useEffect(() => {
    const pending = localStorage.getItem("pending_farm_data");
    if (pending) {
      try {
        const data = JSON.parse(pending);
        const pendingCrop = data.cropType || "";
        const isKnownCrop = CROP_TYPES.some((crop) => crop.name === pendingCrop);
        setForm((prev) => ({
          ...prev,
          farmName: data.farmName || prev.farmName,
          cropType: pendingCrop && !isKnownCrop ? CUSTOM_CROP : pendingCrop || prev.cropType,
          season: data.season || prev.season,
          sowingDate: data.sowingDate || prev.sowingDate,
        }));
        if (pendingCrop && !isKnownCrop) setCustomCropType(pendingCrop);
        setFarmLocation({
          village: data.village || "",
          district: data.district || "",
          city: data.city || "",
          state: data.state || "",
          cityLat: Number.isFinite(Number(data.cityLat)) ? Number(data.cityLat) : undefined,
          cityLon: Number.isFinite(Number(data.cityLon)) ? Number(data.cityLon) : undefined,
        });
        const initialLocation = [data.village, data.city, data.district, data.state, "India"].filter(Boolean).join(", ");
        if (Number.isFinite(Number(data.cityLat)) && Number.isFinite(Number(data.cityLon))) {
          setMapCenter([Number(data.cityLat), Number(data.cityLon)]);
          setMapZoom(closeFarmZoom);
        }
        if (initialLocation !== "India") {
          setSearch(initialLocation);
          if (!Number.isFinite(Number(data.cityLat)) || !Number.isFinite(Number(data.cityLon))) {
            void locateOnMap(initialLocation, closeFarmZoom);
          }
        }
      } catch {
        localStorage.removeItem("pending_farm_data");
      }
    }
    loadFarms();
  }, []);

  const area = useMemo(() => calculateAreaHectares(boundary), [boundary]);

  useEffect(() => {
    if (boundary.length >= 3) {
      setForm((prev) => ({ ...prev, areaHectares: area.toFixed(2) }));
    }
  }, [area, boundary.length]);

  const loadFarms = async () => {
    const data = await getFarms();
    setFarms(Array.isArray(data) ? data : []);
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyLocationMeta = (meta: Partial<FarmLocationMeta>) => {
    setFarmLocation((prev) => ({
      village: meta.village || prev.village,
      district: meta.district || prev.district,
      city: meta.city || prev.city,
      state: meta.state || prev.state,
      cityLat: meta.cityLat ?? prev.cityLat,
      cityLon: meta.cityLon ?? prev.cityLon,
    }));
  };

  const refreshLocationFromCoordinates = async (lat: number, lon: number) => {
    try {
      const { data } = await api.get("/locations/reverse", {
        params: { lat, lon },
        timeout: 7000,
      });
      const location = data?.location;
      if (!location) return null;

      applyLocationMeta({
        village: location.village || "",
        city: location.city || "",
        district: location.district || "",
        state: location.state || "",
        cityLat: Number.isFinite(Number(location.lat)) ? Number(location.lat) : lat,
        cityLon: Number.isFinite(Number(location.lon)) ? Number(location.lon) : lon,
      });
      return location;
    } catch {
      return null;
    }
  };

  const parseMapboxLocation = (feature: any) => {
    const context = Array.isArray(feature?.context) ? feature.context : [];
    const findText = (prefix: string) => context.find((item: any) => String(item.id || "").startsWith(prefix))?.text || "";
    return {
      village: feature?.place_type?.includes("locality") ? feature.text : "",
      city: feature?.place_type?.includes("place") ? feature.text : findText("place"),
      district: findText("district"),
      state: findText("region"),
    };
  };

  const parseNominatimLocation = (item: any) => {
    const address = item?.address || {};
    return {
      village: address.village || address.hamlet || address.locality || "",
      city: address.city || address.town || address.village || "",
      district: address.state_district || address.county || "",
      state: address.state || "",
    };
  };

  const updateMapFromSearchResult = (result: MapSearchResult, zoom: number) => {
    setMapCenter(result.center);
    setMapZoom(zoom);
    applyLocationMeta(result.meta);
  };

  const buildSearchCandidates = (query: string) => {
    const cleanedQuery = query.replace(/\s+/g, " ").trim();
    const candidates = [
      [cleanedQuery, farmLocation.state, "India"].filter(Boolean).join(", "),
      [cleanedQuery, farmLocation.district, farmLocation.state, "India"].filter(Boolean).join(", "),
      cleanedQuery,
    ]
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    return [...new Set(candidates)].sort((a, b) => a.length - b.length);
  };

  const searchWithBackend = async (query: string): Promise<MapSearchResult | null> => {
    if (!farmLocation.state) return null;

    const { data } = await api.get("/locations/cities", {
      params: { state: farmLocation.state, q: query },
      timeout: 2500,
    });
    const first = data?.cities?.find((item: any) => Number.isFinite(item.lat) && Number.isFinite(item.lon));
    if (!first) return null;

    return {
      center: [Number(first.lat), Number(first.lon)],
      meta: {
        village: first.name,
        city: first.name,
        district: first.district,
        state: first.state,
        cityLat: Number(first.lat),
        cityLon: Number(first.lon),
      },
    };
  };

  const searchWithMapbox = async (query: string): Promise<MapSearchResult | null> => {
    if (!mapboxToken) return null;

    const mapboxRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=in&limit=1&access_token=${mapboxToken}`
    );
    const mapboxData = await mapboxRes.json();
    const feature = mapboxData?.features?.[0];
    const center = feature?.center;
    if (!Array.isArray(center) || center.length < 2) return null;

    return {
      center: [Number(center[1]), Number(center[0])],
      meta: {
        ...parseMapboxLocation(feature),
        cityLat: Number(center[1]),
        cityLon: Number(center[0]),
      },
    };
  };

  const searchWithNominatim = async (query: string): Promise<MapSearchResult | null> => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in&addressdetails=1`
    );
    const data = await res.json();
    if (!data?.[0]) return null;

    return {
      center: [Number(data[0].lat), Number(data[0].lon)],
      meta: {
        ...parseNominatimLocation(data[0]),
        cityLat: Number(data[0].lat),
        cityLon: Number(data[0].lon),
      },
    };
  };

  const getFirstSearchResult = async (query: string): Promise<MapSearchResult | null> => {
    const providers = mapboxToken
      ? [() => searchWithMapbox(query), () => searchWithBackend(query), () => searchWithNominatim(query)]
      : [() => searchWithBackend(query), () => searchWithNominatim(query)];

    try {
      return await Promise.any(
        providers.map((provider) =>
          provider().then((result) => {
            if (!result) throw new Error("No result");
            return result;
          })
        )
      );
    } catch {
      return null;
    }
  };

  const locateOnMap = async (query: string, zoom = closeFarmZoom) => {
    if (!query.trim()) return false;
    const normalizedQuery = query.toLowerCase();
    if (
      farmLocation.cityLat != null &&
      farmLocation.cityLon != null &&
      farmLocation.city &&
      normalizedQuery.includes(farmLocation.city.toLowerCase())
    ) {
      setMapCenter([farmLocation.cityLat, farmLocation.cityLon]);
      setMapZoom(zoom);
      return true;
    }

    try {
      for (const candidate of buildSearchCandidates(query)) {
        const cacheKey = candidate.toLowerCase();
        const cached = searchCacheRef.current.get(cacheKey);
        if (cached) {
          updateMapFromSearchResult(cached, zoom);
          return true;
        }

        const result = await getFirstSearchResult(candidate);
        if (result) {
          searchCacheRef.current.set(cacheKey, result);
          updateMapFromSearchResult(result, zoom);
          return true;
        }
      }
    } catch {
      setMessage("Map search is unavailable right now. Use your location or try a nearby village name.");
    }
    return false;
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(closeFarmZoom);
        setMessage("Map moved to your current GPS location. Use the highest sharp zoom available from the active satellite provider.");
      },
      () => setMessage("Location permission unavailable. Search or draw on the current map.")
    );
  };

  const searchLocation = async () => {
    const query = search.trim() || [farmLocation.village, farmLocation.city, farmLocation.district, farmLocation.state].filter(Boolean).join(", ");
    if (!query) {
      setMessage("Enter a village, taluka, district, or landmark first.");
      return;
    }

    setSearchingLocation(true);
    const found = await locateOnMap(query, closeFarmZoom);
    setSearchingLocation(false);
    setMessage(found ? "Map centered on your selected area. Use the highest sharp zoom available from the active satellite provider while drawing." : "Location not found. Try village, taluka, district, and state together.");
  };

  const clearBoundary = () => {
    setBoundary([]);
    setDrawing(false);
    setForm((prev) => ({ ...prev, areaHectares: "0.00" }));
  };

  const undoLastPoint = () => {
    setBoundary((prev) => prev.slice(0, -1));
  };

  const updateBoundaryPoint = (index: number, point: [number, number]) => {
    setBoundary((prev) => prev.map((item, itemIndex) => (itemIndex === index ? point : item)));
  };

  const fitBoundary = () => {
    if (boundary.length >= 2) setFitVersion((value) => value + 1);
  };

  const editFarm = (farm: any) => {
    const cropType = farm.cropType || "";
    const isKnownCrop = CROP_TYPES.some((crop) => crop.name === cropType);
    setEditingId(farm._id);
    setForm({
      farmName: farm.farmName || "",
      cropType: cropType && !isKnownCrop ? CUSTOM_CROP : cropType,
      season: farm.season || "",
      sowingDate: farm.sowingDate ? String(farm.sowingDate).slice(0, 10) : new Date().toISOString().split("T")[0],
      areaHectares: String(farm.areaHectares || "0.00"),
    });
    setCustomCropType(cropType && !isKnownCrop ? cropType : "");
    const coords = Array.isArray(farm.polygonCoordinates) ? farm.polygonCoordinates : [];
    setBoundary(coords as [number, number][]);
    if (coords.length) {
      setMapCenter(getPolygonCenter(coords as [number, number][]));
      setMapZoom(closeFarmZoom);
    }
  };

  const removeFarm = async (id: string) => {
    if (!confirm("Delete this farm?")) return;
    await deleteFarm(id);
    await loadFarms();
  };

  const saveFarm = async () => {
    const finalArea = Number(form.areaHectares) || area;
    const finalCropType = form.cropType === CUSTOM_CROP ? customCropType.trim() : form.cropType;

    if (!form.farmName.trim() || !finalCropType || !form.season || !form.sowingDate || finalArea <= 0) {
      setMessage("All farm details are mandatory: name, crop, season, sowing date, and land area.");
      return;
    }

    if (boundary.length < 3) {
      setMessage("Farm boundary is mandatory. Draw at least 3 boundary points before saving.");
      return;
    }

    const [centerLat, centerLng] = getPolygonCenter(boundary);
    const resolvedLocation = await refreshLocationFromCoordinates(centerLat, centerLng);
    const payload = {
      farmName: form.farmName.trim(),
      polygonCoordinates: boundary,
      centerLat,
      centerLng,
      areaHectares: finalArea,
      cropType: finalCropType,
      season: form.season,
      sowingDate: form.sowingDate,
      village: resolvedLocation?.village || farmLocation.village,
      district: resolvedLocation?.district || farmLocation.district,
      city: resolvedLocation?.city || farmLocation.city,
      state: resolvedLocation?.state || farmLocation.state,
      cityLat: resolvedLocation?.lat ?? farmLocation.cityLat ?? centerLat,
      cityLon: resolvedLocation?.lon ?? farmLocation.cityLon ?? centerLng,
      cityBoundaryVerified: Boolean(resolvedLocation),
    };

    setSaving(true);
    setMessage("");
    try {
      const savedFarm = editingId ? await updateFarm(editingId, payload) : await createFarm(payload);
      const savedFarmId = savedFarm?._id || editingId;

      if (!savedFarmId) {
        throw new Error("Farm could not be saved.");
      }

      localStorage.removeItem("pending_farm_data");
      setEditingId(null);
      clearBoundary();
      await loadFarms();
      if (!editingId && savedFarm?.initialAnalysis) {
        setMessage(
          savedFarm.initialAnalysis.imageryStatus === "sentinel"
            ? "Farm saved. Real Sentinel satellite analysis is stored and ready in Dashboard, Analysis, and Reports."
            : "Farm saved. Analysis is stored, but real Sentinel image is unavailable for this farm/date right now."
        );
        return;
      }

      setMessage("Farm saved. Real Sentinel and NDVI analysis is running...");

      setAnalyzing(true);
      runAnalysis(savedFarmId)
        .then(async (analysis) => {
          if (analysis) {
            setMessage("Farm saved and analysis completed. Crop health info is now available in Dashboard, Analysis, and Reports.");
            await loadFarms();
          } else {
            setMessage("Farm saved. Analysis did not return data yet. Open Analysis tab and run analysis again.");
          }
        })
        .catch((error: any) => {
          setMessage(error?.response?.data?.message || "Farm saved. Analysis failed for now; open Analysis tab and run it again.");
        })
        .finally(() => setAnalyzing(false));
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Farm could not be saved. Check all mandatory details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7faf3] pb-24">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Step 4</p>
            <h1 className="text-2xl font-bold text-slate-950">Add Multiple Farms</h1>
          </div>
          <button onClick={() => navigate("/dashboard")} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Dashboard</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Your Farms</h2>
            <button onClick={() => { setEditingId(null); clearBoundary(); }} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Add New Farm
            </button>
          </div>
          <div className="space-y-2">
            {farms.length === 0 ? (
              <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">No farms yet. Add your first farm below.</p>
            ) : farms.map((farm, index) => (
              <div key={farm._id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    Farm {index + 1}: {farm.farmName || farm.cropType}
                  </p>
                  <p className="text-sm text-slate-500">{farm.cropType} - {Number(farm.areaHectares || 0).toFixed(2)} ha</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editFarm(farm)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"><Edit className="h-4 w-4" /> Edit</button>
                  <button onClick={() => removeFarm(farm._id)} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600"><Trash2 className="h-4 w-4" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">{editingId ? "Edit Farm" : "Add New Farm"} - Farm Details</h2>
          {message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{message}</p>}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1"><span className="text-sm font-medium">Farm Name <span className="text-red-600">*</span></span><input className="input" required value={form.farmName} onChange={(e) => update("farmName", e.target.value)} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Crop Type <span className="text-red-600">*</span></span><select className="input" required value={form.cropType} onChange={(e) => update("cropType", e.target.value)}><option value="">Select crop</option>{CROP_TYPES.map((crop) => <option key={crop.name}>{crop.name}</option>)}<option value={CUSTOM_CROP}>Other / Custom crop</option></select></label>
            {form.cropType === CUSTOM_CROP && (
              <label className="space-y-1">
                <span className="text-sm font-medium">Custom Crop Name <span className="text-red-600">*</span></span>
                <input className="input" required value={customCropType} onChange={(e) => setCustomCropType(e.target.value)} placeholder="Enter crop name" />
              </label>
            )}
            <label className="space-y-1"><span className="text-sm font-medium">Season <span className="text-red-600">*</span></span><select className="input" required value={form.season} onChange={(e) => update("season", e.target.value)}><option value="">Select season</option>{SEASON_TYPES.map((season) => <option key={season.name}>{season.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm font-medium">Sowing Date <span className="text-red-600">*</span></span><input className="input" required type="date" value={form.sowingDate} onChange={(e) => update("sowingDate", e.target.value)} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Land Area (ha) <span className="text-red-600">*</span></span><input className="input" required value={form.areaHectares} onChange={(e) => update("areaHectares", e.target.value)} /></label>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:col-span-2">
              Soil type will be detected automatically from the farm boundary location during analysis.
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search village, taluka, district, or landmark" />
              </div>
              <button onClick={searchLocation} disabled={searchingLocation} className="rounded-md border px-3 py-3 text-sm font-semibold disabled:opacity-60">{searchingLocation ? "Searching..." : "Search"}</button>
              <button onClick={useMyLocation} className="inline-flex items-center gap-2 rounded-md border px-3 py-3 text-sm font-semibold"><LocateFixed className="h-4 w-4" /> Use My Location</button>
            </div>

            <div className="mb-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Detected location:</span>{" "}
              {[farmLocation.village, farmLocation.city, farmLocation.district, farmLocation.state].filter(Boolean).join(", ") || "Not resolved yet from the selected farm boundary"}
            </div>

            <div className="relative">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                maxZoom={maxFarmZoom}
                zoomSnap={0.25}
                zoomDelta={0.5}
                wheelPxPerZoomLevel={40}
                scrollWheelZoom
                className="h-[560px] w-full rounded-lg border"
              >
                <MapViewportController center={mapCenter} zoom={mapZoom} fitPoints={boundary} fitVersion={fitVersion} />
                <LayersControl position="topright">
                  {mapboxToken && (
                    <LayersControl.BaseLayer checked name="High-res satellite streets">
                      <TileLayer
                        url={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                        attribution="Imagery Mapbox, Maxar, OpenStreetMap"
                        tileSize={512}
                        zoomOffset={-1}
                        maxZoom={maxFarmZoom}
                        maxNativeZoom={22}
                      />
                    </LayersControl.BaseLayer>
                  )}
                  <LayersControl.BaseLayer checked={!mapboxToken} name="Real satellite imagery">
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="Imagery Esri, Maxar, Earthstar Geographics"
                      maxZoom={20}
                      maxNativeZoom={19}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Street map">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="OpenStreetMap contributors"
                      maxZoom={maxFarmZoom}
                      maxNativeZoom={19}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.Overlay checked name="Place labels">
                    <TileLayer
                      url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      attribution="Labels Esri"
                      maxZoom={maxFarmZoom}
                      maxNativeZoom={19}
                    />
                  </LayersControl.Overlay>
                </LayersControl>
              <DrawingLayer drawing={drawing} onPoint={(point) => setBoundary((prev) => [...prev, point])} />
              {farms.map((farm) => {
                const coords = Array.isArray(farm.polygonCoordinates) ? farm.polygonCoordinates : [];
                if (coords.length < 3 || farm._id === editingId) return null;
                return (
                  <Polygon
                    key={farm._id}
                    positions={coords as [number, number][]}
                    pathOptions={{ color: "#047857", fillColor: "#10b981", fillOpacity: 0.18, weight: 2 }}
                  />
                );
              })}
              {boundary.map((point, index) => (
                <Marker
                  key={`${point[0]}-${point[1]}-${index}`}
                  position={point}
                  draggable
                  eventHandlers={{
                    dragend(event) {
                      const marker = event.target;
                      const latlng = marker.getLatLng();
                      updateBoundaryPoint(index, [latlng.lat, latlng.lng]);
                    },
                  }}
                />
              ))}
              {boundary.length >= 3 && <Polygon positions={boundary} pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 0.3 }} />}
              </MapContainer>
              <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
                {mapboxToken ? "Mapbox satellite active - drag markers to refine farm corners" : "Esri satellite active - add VITE_MAPBOX_TOKEN for sharper close zoom"}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700"><MapPin className="mr-1 inline h-4 w-4 text-emerald-700" /> Area: {area.toFixed(2)} hectares - Points: {boundary.length}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setDrawing(true)} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"><MapPin className="h-4 w-4" /> Start Drawing</button>
                <button onClick={undoLastPoint} disabled={boundary.length === 0} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"><Undo2 className="h-4 w-4" /> Undo Point</button>
                <button onClick={fitBoundary} disabled={boundary.length < 2} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"><LocateFixed className="h-4 w-4" /> Fit Boundary</button>
                <button onClick={clearBoundary} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"><Trash2 className="h-4 w-4" /> Clear</button>
                <button onClick={() => setDrawing(false)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"><Check className="h-4 w-4" /> Save Boundary</button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-between">
            <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-md border px-5 py-3 font-semibold"><X className="h-4 w-4" /> Cancel</button>
            <button onClick={saveFarm} disabled={saving || analyzing} className="rounded-md bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-60">
              {analyzing ? "Analyzing Farm..." : saving ? "Saving..." : editingId ? "Update Farm" : "Add Farm to List"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
