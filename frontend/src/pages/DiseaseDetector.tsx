import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CloudRain,
  Database,
  FileImage,
  ImagePlus,
  Loader2,
  ShieldAlert,
  Thermometer,
  X,
} from "lucide-react";
import FarmerHeroHeader from "@/components/FarmerHeroHeader";
import { getFarms } from "@/services/farmService";
import { getCurrentWeather, getWeatherByCoords, WeatherResponse } from "@/services/weatherService";
import api from "@/lib/api";
import { backendAsset } from "@/utils/backendAssets";

type Severity = "Low" | "Medium" | "High" | "Critical";

type DiseaseResult = {
  disease: string;
  candidateIssue?: string | null;
  cropHint: string;
  severity: Severity;
  problem: string;
  solution: string;
  confidence?: number;
  confidenceBand?: "uncertain" | "possible" | "likely";
  showDiseaseName?: boolean;
  aiConfidenceVisible?: boolean;
  source?: string;
  note?: string;
  visibleSymptoms?: string[];
  likelyCauses?: string[];
  shouldEscalate?: boolean;
};

const TRENDING_DISEASES: DiseaseResult[] = [
  {
    disease: "Leaf Spot / Blight",
    cropHint: "Vegetables, rice, maize, soybean",
    severity: "High",
    problem: "Brown or dark leaf spots may spread during humid weather and reduce photosynthesis.",
    solution: "Remove heavily infected leaves, avoid overhead irrigation, improve spacing, and consult an agriculture officer for a crop-safe fungicide.",
  },
  {
    disease: "Rust",
    cropHint: "Wheat, soybean, pulses",
    severity: "High",
    problem: "Orange or brown powdery pustules on leaves can spread quickly in moist conditions.",
    solution: "Inspect nearby plants, avoid dense canopy moisture, and use a recommended rust-control fungicide only after local confirmation.",
  },
  {
    disease: "Powdery Mildew",
    cropHint: "Grapes, vegetables, pulses",
    severity: "Medium",
    problem: "White powder-like patches on leaves can slow growth and reduce yield.",
    solution: "Improve sunlight and airflow, avoid excess nitrogen, and apply recommended mildew treatment if infection is spreading.",
  },
  {
    disease: "Bacterial Wilt",
    cropHint: "Tomato, brinjal, chilli",
    severity: "Critical",
    problem: "Sudden wilting without clear leaf spots may indicate bacterial infection or root-zone damage.",
    solution: "Remove affected plants, avoid moving soil/water from infected area, rotate crops, and seek local lab/officer confirmation.",
  },
  {
    disease: "Nutrient Deficiency",
    cropHint: "All crops",
    severity: "Medium",
    problem: "Yellowing, pale growth, or weak leaves can be caused by nitrogen, iron, zinc, or water imbalance.",
    solution: "Check soil moisture first, then use soil-test-based fertilizer. Avoid random high-dose urea because it can worsen pest risk.",
  },
  {
    disease: "Pest Damage",
    cropHint: "Cotton, rice, vegetables, pulses",
    severity: "High",
    problem: "Holes, curled leaves, webbing, or damaged shoots often indicate insect feeding.",
    solution: "Inspect underside of leaves and stems, use traps where suitable, remove affected parts, and spray only recommended pesticide at correct dose.",
  },
  {
    disease: "Root Rot / Waterlogging Stress",
    cropHint: "Soybean, pulses, vegetables",
    severity: "High",
    problem: "Yellowing and wilting after heavy rainfall may come from root oxygen loss and fungal/root rot pressure.",
    solution: "Improve drainage, avoid irrigation, do not apply fertilizer immediately, and inspect roots before chemical treatment.",
  },
  {
    disease: "Viral Leaf Curl / Mosaic",
    cropHint: "Cotton, chilli, tomato, pulses",
    severity: "Critical",
    problem: "Curled, distorted, or mosaic-pattern leaves may indicate viral disease often spread by sucking pests.",
    solution: "Remove severely infected plants, control vector insects, avoid saving seed from infected plants, and get local confirmation.",
  },
];

const FAQS = [
  {
    question: "How does this disease scan help?",
    answer: "It combines crop image patterns, farm context, and regional crop-risk signals to show the likely issue and the next practical step.",
  },
  {
    question: "Why does weather matter for disease?",
    answer: "High humidity and rain increase fungal/blight risk. Heat and dry wind can create stress symptoms that look like disease.",
  },
  {
    question: "What photo should I upload?",
    answer: "Use a clear daylight photo of affected leaves/stem/fruit. Include both diseased and healthy parts if possible.",
  },
  {
    question: "Should I spray immediately?",
    answer: "Do not spray blindly. First confirm if the issue is pest, fungus, nutrient, water stress, or herbicide damage. Follow local recommended dose.",
  },
];

const diseaseScanImage = backendAsset("/assets/ui/disease-scan.svg");

function cleanScanMessage(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "CropSafe image scan did not return a diagnosis.";
  return text;
}

function getRegionalSignals(weather: WeatherResponse | null) {
  if (!weather) {
    return {
      risk: "Regional risk unavailable",
      level: "Medium" as Severity,
      advice: "Weather data is not available right now. Use image scan and field inspection together.",
    };
  }

  if ((weather.rainfall || 0) >= 40 || weather.humidity >= 82) {
    return {
      risk: "High fungal / waterlogging pressure",
      level: "High" as Severity,
      advice: "Rain and humidity can increase blight, rust, mildew, and root rot risk. Check drainage and avoid spraying before rain.",
    };
  }

  if (weather.temperature >= 36) {
    return {
      risk: "Heat stress pressure",
      level: "Medium" as Severity,
      advice: "Heat can cause wilting, leaf scorch, flower drop, and symptoms that look like disease. Check soil moisture before spraying.",
    };
  }

  return {
    risk: "Normal monitoring",
    level: "Low" as Severity,
    advice: "Weather is not showing strong disease pressure. Continue scouting leaves, stems, and field edges.",
  };
}

export default function DiseaseDetector() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm._id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );
  const regional = useMemo(() => getRegionalSignals(weather), [weather]);

  const severityColor = useMemo(
    () => ({
      Low: "bg-green-100 text-green-700 border-green-200",
      Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
      High: "bg-orange-100 text-orange-700 border-orange-200",
      Critical: "bg-red-100 text-red-700 border-red-200",
    }),
    []
  );

  useEffect(() => {
    const load = async () => {
      const list = await getFarms();
      const farmList = Array.isArray(list) ? list : [];
      setFarms(farmList);
      if (farmList[0]?._id) setSelectedFarmId(farmList[0]._id);
    };
    load();
  }, []);

  useEffect(() => {
    setWeatherLoading(true);
    const request = selectedFarm?.centerLat && selectedFarm?.centerLng
      ? getWeatherByCoords(Number(selectedFarm.centerLat), Number(selectedFarm.centerLng))
      : getCurrentWeather(selectedFarm?.city || selectedFarm?.district || "Pune");

    request
      .then(setWeather)
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [selectedFarm?._id, selectedFarm?.city, selectedFarm?.district]);

  const loadFile = (selectedFile?: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (selectedFarm?.cropType) formData.append("cropType", selectedFarm.cropType);
      if (selectedFarm?.city) formData.append("city", selectedFarm.city);
      formData.append("language", localStorage.getItem("language") || "english");

      const { data } = await api.post("/diseases/image-diagnose", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      if (data?.success) {
        setResult({
          disease: data.likelyIssue || "Possible crop issue",
          candidateIssue: data.candidateIssue || null,
          cropHint: selectedFarm?.cropType ? `${selectedFarm.cropType} - ${selectedFarm.city || "selected farm"}` : "Uploaded crop image",
          severity: data.severity || "Medium",
          problem: data.problem || "A crop issue may be present in the uploaded image.",
          solution: data.solution || "Inspect the farm and confirm with a local agriculture officer.",
          confidence: typeof data.confidence === "number" ? data.confidence : undefined,
          confidenceBand: data.confidenceBand,
          showDiseaseName: Boolean(data.showDiseaseName),
          aiConfidenceVisible: Boolean(data.aiConfidenceVisible),
          source: data.source || "CropSafe image scan",
          note: data.note || "Confirm severe cases locally before treatment.",
          visibleSymptoms: Array.isArray(data.visibleSymptoms) ? data.visibleSymptoms : [],
          likelyCauses: Array.isArray(data.likelyCauses) ? data.likelyCauses : [],
          shouldEscalate: Boolean(data.shouldEscalate),
        });
        return;
      }
      throw new Error(data?.message || "CropSafe scan did not return a diagnosis.");
    } catch (error: any) {
      setResult({
        disease: "Diagnosis unavailable",
        cropHint: selectedFarm?.cropType ? `${selectedFarm.cropType} - ${selectedFarm.city || "selected farm"}` : "Uploaded crop image",
        severity: "Medium",
        problem: cleanScanMessage(error?.response?.data?.message || error?.message),
        solution: "Try a clearer crop photo, or confirm with a local agriculture officer. CropSafe will not show a guessed disease result.",
        confidenceBand: "uncertain",
        showDiseaseName: false,
        aiConfidenceVisible: false,
        source: "Scan unavailable",
        note: "No local guessed diagnosis was used.",
        visibleSymptoms: [],
        likelyCauses: [],
        shouldEscalate: false,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#f7faf3] pb-28">
      <FarmerHeroHeader
        eyebrow="Disease Detection"
        title="Scan Your Crop"
        subtitle="Photo scan, regional risk, and treatment guide"
        action={
          <div className="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white">
            {selectedFarm ? `${selectedFarm.farmName || selectedFarm.cropType} - ${selectedFarm.cropType}` : "No farm selected"}
          </div>
        }
      />

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <div className="p-5">
                <h2 className="text-xl font-extrabold text-slate-950">Get AI powered disease analysis for your crops</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Upload or capture a clear image of the affected plant part. CropSafe shows a result only when the scan returns a confident match.</p>
              </div>
              <img src={diseaseScanImage} alt="" className="h-52 w-full object-cover md:h-full" />
            </div>
          </section>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Regional Issue Context</h2>
                <p className="text-sm text-slate-500">Uses your selected farm location and current weather when available.</p>
              </div>
              {farms.length > 0 && (
                <select className="input max-w-xs" value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
                  {farms.map((farm) => (
                    <option key={farm._id} value={farm._id}>
                      {farm.farmName || farm.cropType} - {farm.cropType}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <CloudRain className="mb-2 h-5 w-5 text-sky-600" />
                <p className="text-xs text-slate-500">Rain / Humidity</p>
                <p className="font-bold text-slate-950">
                  {weatherLoading ? "Loading..." : weather ? `${weather.rainfall || 0} mm / ${weather.humidity}%` : "Unavailable"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <Thermometer className="mb-2 h-5 w-5 text-orange-600" />
                <p className="text-xs text-slate-500">Temperature</p>
                <p className="font-bold text-slate-950">{weather ? `${weather.temperature} C` : "Unavailable"}</p>
              </div>
              <div className={`rounded-lg border p-4 ${severityColor[regional.level]}`}>
                <AlertTriangle className="mb-2 h-5 w-5" />
                <p className="text-xs opacity-80">Regional Risk</p>
                <p className="font-bold">{regional.risk}</p>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">{regional.advice}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-slate-950">Scan Your Crop</h2>
            <p className="mb-3 text-sm text-slate-500">Take or upload a clear photo of the affected leaf or plant.</p>
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                loadFile(event.dataTransfer.files?.[0]);
              }}
              className={`block cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition ${
                dragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-emerald-400"
              }`}
            >
              {imagePreview ? (
                <div className="relative mx-auto max-w-md">
                  <img src={imagePreview} className="h-72 w-full rounded-lg object-cover" alt="Crop upload preview" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      clearImage();
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="py-10">
                  <ImagePlus className="mx-auto h-12 w-12 text-emerald-700" />
                  <p className="mt-3 font-semibold text-slate-800">Drop image here or tap to upload</p>
                  <p className="mt-1 text-sm text-slate-500">Use a clear leaf/stem/fruit photo in daylight</p>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={(event) => loadFile(event.target.files?.[0])} className="hidden" />
            </label>

            <button
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 py-4 text-lg font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {analyzing ? "Analyzing issue..." : "Analyze Image"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">Preliminary guide. Confirm severe cases with a local agriculture officer.</p>
          </div>

          {result && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Likely Problem</p>
                  <h2 className="text-2xl font-bold text-slate-950">{result.disease}</h2>
                  <p className="mt-1 text-sm text-slate-500">{result.cropHint}</p>
                  {!result.showDiseaseName && result.candidateIssue && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      No strong disease match shown yet. Candidate pattern stayed below CropSafe reliability threshold.
                    </p>
                  )}
                  {(result.source || result.confidence != null) && (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {result.source || "CropSafe image scan"}
                      {result.aiConfidenceVisible && result.confidence != null ? ` - ${Math.round(result.confidence * 100)}% AI confidence` : ""}
                    </p>
                  )}
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-bold ${severityColor[result.severity]}`}>
                  {result.severity}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-red-50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-bold text-red-800">
                    <FileImage className="h-5 w-5" />
                    Problem
                  </div>
                  <p className="text-sm text-red-900">{result.problem}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-bold text-emerald-800">
                    <ShieldAlert className="h-5 w-5" />
                    Solution
                  </div>
                  <p className="text-sm text-emerald-900">{result.solution}</p>
                </div>
              </div>
              {(result.visibleSymptoms?.length || result.likelyCauses?.length) && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">What the image shows</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {(result.visibleSymptoms || []).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">Likely causes</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {(result.likelyCauses || []).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {result.shouldEscalate && (
                <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">
                  This case needs priority field attention before major treatment or spray planning.
                </p>
              )}
              {result.note && <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">{result.note}</p>}
            </section>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-emerald-700" />
              <h2 className="font-bold text-slate-950">Field Reference</h2>
            </div>
            <p className="mb-3 text-sm text-slate-500">
              These are education cards only. They do not become a diagnosis unless the crop image scan returns a result.
            </p>
            <div className="grid gap-3">
              {TRENDING_DISEASES.map((item) => (
                <div
                  key={item.disease}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{item.disease}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${severityColor[item.severity]}`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.cropHint}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-700" />
              <h2 className="font-bold text-slate-950">Image Scan</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                CropSafe analyzes crop photos using image intelligence, farm context, and field risk signals to highlight likely disease patterns and practical next steps.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-950">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.question} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-slate-900">{faq.question}</summary>
                  <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <p className="text-sm text-emerald-900">
                Best results come from combining image symptoms, farm crop, recent weather, NDVI trend, and local officer confirmation.
              </p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
