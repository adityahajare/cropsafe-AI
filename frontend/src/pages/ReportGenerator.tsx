import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Leaf,
  MapPinned,
  Printer,
  RefreshCcw,
  Satellite,
  Share2,
  ShieldCheck,
  Umbrella,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAnalysisHistory, getFarms, getLatestAnalysis } from "@/services/farmService";
import { generatePDF } from "@/services/pdfGenerator";
import { generateReport as createBackendReport, Report as BackendReport } from "@/services/cropService";
import { normalizeBackendAssetUrl } from "@/utils/backendAssets";

const farmerReports = [
  "Policy Certificate",
  "Claim Settlement Report",
  "Farm Health Report",
  "NDVI Timeline Report",
  "Weather Impact Report",
  "Complete Farm Portfolio",
];

const adminReports = [
  "Farmer Summary Report",
  "Policy Summary Report",
  "Claim Summary Report",
  "District-wise Report",
  "Crop-wise Analytics",
  "NDVI Heatmap Report",
];

const reportSections = [
  "Farm Overview",
  "NDVI Analysis & Charts",
  "Weather Data",
  "Satellite Images",
  "Recommendations",
];

const reportPages = [
  "Cover Summary",
  "Satellite Evidence",
  "NDVI Analysis",
  "Financial Assessment",
  "Weather Impact",
  "Officer Conclusion",
];

function statusBadge(status?: string) {
  switch (String(status || "").toUpperCase()) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function riskBadge(level?: string) {
  switch (String(level || "").toUpperCase()) {
    case "HIGH":
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function MetricCard({
  label,
  value,
  helper,
  tone = "text-slate-950",
  icon: Icon,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: string;
  icon: any;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
      {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
    </div>
  );
}

function EvidenceImage({
  title,
  subtitle,
  imageUrl,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
}) {
  const resolvedUrl = normalizeBackendAssetUrl(imageUrl);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="bg-slate-100">
        {resolvedUrl ? (
          <img src={resolvedUrl} alt={title} className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500">
            <Satellite className="h-8 w-8 text-slate-400" />
            <p className="font-semibold text-slate-700">Imagery panel is updating</p>
            <p>The report summary, NDVI evidence, and financial assessment remain ready for review.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [reportType, setReportType] = useState("Farm Health Report");
  const [format, setFormat] = useState("PDF");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includedSections, setIncludedSections] = useState<string[]>(reportSections);
  const [generating, setGenerating] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [savedReport, setSavedReport] = useState<BackendReport | null>(null);

  useEffect(() => {
    const load = async () => {
      const farmList = await getFarms();
      const list = Array.isArray(farmList) ? farmList : [];
      setFarms(list);
      if (list[0]?._id) setSelectedFarm(list[0]._id);
    };
    load();
  }, []);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!selectedFarm) return;
      const [latest, history] = await Promise.all([
        getLatestAnalysis(selectedFarm),
        getAnalysisHistory(selectedFarm),
      ]);
      const historyRows = Array.isArray(history) ? history : [];
      setAnalysis(latest ? { ...latest, history: historyRows } : null);
    };
    loadAnalysis();
  }, [selectedFarm]);

  const farm = useMemo(() => farms.find((item) => item._id === selectedFarm), [farms, selectedFarm]);
  const currentImage = normalizeBackendAssetUrl(analysis?.currentImageUrl || analysis?.currentImage);
  const previousImage = normalizeBackendAssetUrl(analysis?.previousImageUrl || analysis?.previousImage);
  const ndviImage = normalizeBackendAssetUrl(analysis?.ndviLayerUrl);
  const ndviValue = Number(analysis?.ndviValue ?? 0);
  const riskLevel = analysis?.riskLevel || "LOW";
  const reportDate = new Date().toLocaleDateString("en-IN");
  const insuredValue = Number(farm?.areaHectares || 0) * 75000;
  const estimatedLoss = Number(analysis?.estimatedLoss || 0);
  const compensationEstimate = estimatedLoss ? Math.round(estimatedLoss * 0.72) : 0;
  const historyRows = Array.isArray(analysis?.history) ? analysis.history : [];
  const reportStatus = savedReport?.reportStatus || (analysis ? "DRAFT" : "PENDING");
  const summaryText =
    analysis?.recommendation ||
    (analysis
      ? "Satellite analysis is available. Review the evidence, NDVI trend, and estimated loss before sending this report for approval."
      : "Prepare the selected farm analysis to generate the full insurance report.");

  const toggleSection = (section: string) => {
    setIncludedSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section]
    );
  };

  const handleGenerate = async () => {
    if (!user || !farm) return;
    if (format !== "PDF") {
      alert(`Please use PDF export for the current report workflow.`);
      return;
    }
    setGenerating(true);
    try {
      const doc = await generatePDF({
        farmer: {
          name: user.name || "Farmer",
          aadhaar: user.aadhaar || "",
          village: user.village || "",
          district: user.district || "",
          city: user.city || "",
          state: user.state || "",
        },
        farm: {
          cropType: farm.cropType || "",
          areaHectares: farm.areaHectares ?? null,
          season: farm.season || "",
          sowingDate: farm.sowingDate || "",
          centerLat: farm.centerLat ?? null,
          centerLng: farm.centerLng ?? null,
        },
        analysis: analysis || null,
        claim: null,
      });
      doc.save(`CropSafe-${reportType.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToAdmin = async () => {
    if (!selectedFarm) return;
    if (!analysis) {
      alert("Run farm analysis before sending the report to admin.");
      return;
    }

    setSubmittingReport(true);
    try {
      const report = await createBackendReport({ farmId: selectedFarm, submit: true });
      if (!report) {
        alert("Refresh the farm report once and send it again for admin review.");
        return;
      }

      setSavedReport(report);
      alert("Report sent to admin dashboard for review.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`CropSafe ${reportType} for ${farm?.farmName || farm?.cropType || "selected farm"}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7faf3] px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-dashed border-emerald-300 bg-white p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-emerald-700" />
          <h1 className="mt-3 text-2xl font-bold">No farms found</h1>
          <p className="mt-1 text-slate-500">Add a farm before generating reports.</p>
          <button onClick={() => navigate("/draw-farm")} className="mt-5 rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white">
            Register Farm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf3] px-4 py-8">
      <main className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-700 text-white shadow-xl">
          <div className="grid gap-6 px-5 py-6 md:grid-cols-[1.4fr_0.9fr] md:px-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Insurance Assessment File
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight">Professional Crop Report</h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
                Built from your real farm, satellite evidence, NDVI analysis, and weather signals. This version is ready for farmer review and admin submission.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">Report Status</p>
                  <p className="mt-2 text-xl font-black">{reportStatus}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">Risk Level</p>
                  <p className="mt-2 text-xl font-black">{riskLevel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">Generated On</p>
                  <p className="mt-2 text-xl font-black">{reportDate}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">File Summary</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Farmer</span>
                  <span className="font-bold text-white">{user?.name || "Registered farmer"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Farm</span>
                  <span className="font-bold text-white">{farm?.farmName || farm?.cropType || "Selected farm"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Crop</span>
                  <span className="font-bold text-white">{farm?.cropType || "Crop not saved"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Area</span>
                  <span className="font-bold text-white">{farm?.areaHectares ? `${Number(farm.areaHectares).toFixed(2)} ha` : "Area pending"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Format</span>
                  <span className="font-bold text-white">{format}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Report Setup</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the report style and export settings.</p>

              <div className="mt-5 grid gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Report Type</span>
                  <select className="input" value={reportType} onChange={(event) => setReportType(event.target.value)}>
                    {[...farmerReports, ...adminReports].map((report) => (
                      <option key={report}>{report}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Farm</span>
                  <select className="input" value={selectedFarm} onChange={(event) => setSelectedFarm(event.target.value)}>
                    {farms.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.farmName || item.cropType} - {item.cropType}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">From Date</span>
                    <input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">To Date</span>
                    <input className="input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Included Sections</h2>
              <div className="mt-4 grid gap-2">
                {reportSections.map((section) => (
                  <label key={section} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includedSections.includes(section)}
                      onChange={() => toggleSection(section)}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    {section}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Export</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {["PDF", "Excel", "CSV"].map((item) => (
                  <label key={item} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${format === item ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>
                    <input type="radio" checked={format === item} onChange={() => setFormat(item)} />
                    {item}
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                <button onClick={handleGenerate} disabled={generating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-black text-white shadow disabled:opacity-60">
                  {generating ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {generating ? "Generating..." : "Download PDF"}
                </button>
                <button onClick={handleSendToAdmin} disabled={submittingReport || !analysis} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-700 px-5 py-4 text-sm font-black text-emerald-800 disabled:opacity-60">
                  <ShieldCheck className="h-4 w-4" />
                  {submittingReport ? "Sending..." : "Send to Admin"}
                </button>
                <button onClick={shareWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-4 text-sm font-bold text-slate-700">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-4 text-sm font-bold text-slate-700">
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>

              {savedReport && (
                <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                  Report sent to admin. Status: {savedReport.reportStatus}
                </p>
              )}
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      {reportType}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(reportStatus)}`}>
                      {reportStatus}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${riskBadge(riskLevel)}`}>
                      {riskLevel} Risk
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                    {farm?.farmName || "Selected Farm"} Assessment Dossier
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{summaryText}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-bold text-slate-950">Report Reference</p>
                  <p className="mt-1 text-slate-600">{reportDate}</p>
                  <p className="text-slate-600">{user?.district || user?.village || "Location not set"}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Farmer"
                  value={user?.name || "Registered farmer"}
                  helper={user?.village || user?.city || "Village not set"}
                  icon={UserRound}
                />
                <MetricCard
                  label="Farm"
                  value={farm?.areaHectares ? `${Number(farm.areaHectares).toFixed(2)} ha` : "Area pending"}
                  helper={farm?.cropType || "Crop not set"}
                  icon={MapPinned}
                />
                <MetricCard
                  label="NDVI"
                  value={analysis ? ndviValue.toFixed(3) : "Run analysis"}
                  helper={analysis ? `${analysis?.healthPercentage || 0}% crop health` : "Run analysis first"}
                  tone={ndviValue >= 0.5 ? "text-emerald-700" : ndviValue >= 0.3 ? "text-amber-700" : "text-red-700"}
                  icon={Leaf}
                />
                <MetricCard
                  label="Estimated Loss"
                  value={estimatedLoss ? `Rs. ${estimatedLoss.toLocaleString("en-IN")}` : "Awaiting estimate"}
                  helper={compensationEstimate ? `Compensation est. Rs. ${compensationEstimate.toLocaleString("en-IN")}` : "No estimate yet"}
                  tone={estimatedLoss ? "text-red-700" : "text-slate-950"}
                  icon={Wallet}
                />
              </div>
            </section>

            <section className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">Evidence & Observation</h3>
                    <p className="text-sm text-slate-500">Live imagery and vegetation evidence from the selected farm boundary.</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Real data
                  </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <EvidenceImage title="Current Sentinel Image" subtitle="Latest usable true-color scene" imageUrl={currentImage} />
                  <EvidenceImage title="Previous Sentinel Image" subtitle="Comparison scene for the same farm" imageUrl={previousImage} />
                </div>

                <div className="mt-4">
                  <EvidenceImage title="NDVI Evidence Map" subtitle="Vegetation vigor layer used in crop health assessment" imageUrl={ndviImage || currentImage} />
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-black text-slate-950">Executive Summary</h3>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recommendation</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{summaryText}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Health</p>
                        <p className="mt-2 text-3xl font-black text-emerald-700">{analysis?.healthPercentage ?? "--"}%</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Damage</p>
                        <p className="mt-2 text-3xl font-black text-orange-600">{analysis?.damagePercentage ?? "--"}%</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-black text-slate-950">Weather & Finance</h3>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Temperature", analysis?.temperature != null ? `${analysis.temperature} C` : "Weather syncing"],
                      ["Rainfall", analysis?.rainfall != null ? `${analysis.rainfall} mm` : "Weather syncing"],
                      ["Humidity", analysis?.humidity != null ? `${analysis.humidity}%` : "Weather syncing"],
                      ["Insured Value", insuredValue ? `Rs. ${insuredValue.toLocaleString("en-IN")}` : "Policy review"],
                      ["Estimated Compensation", compensationEstimate ? `Rs. ${compensationEstimate.toLocaleString("en-IN")}` : "Awaiting estimate"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-500">{label}</span>
                        <span className="text-sm font-black text-slate-950">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">NDVI Timeline</h3>
                    <p className="text-sm text-slate-500">Historical readings available for this farm.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {historyRows.length || 1} records
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {(historyRows.length ? historyRows : [analysis]).filter(Boolean).map((row: any, index: number) => {
                    const value = Number(row?.ndvi ?? row?.ndviValue ?? analysis?.ndviValue ?? 0);
                    return (
                      <div key={row?._id || index} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            {String(row?.analysisDate || row?.createdAt || new Date()).slice(0, 10)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {value >= 0.5 ? "Healthy vegetation pattern" : value >= 0.3 ? "Moderate vegetation pattern" : "Stressed vegetation pattern"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-black ${value >= 0.5 ? "text-emerald-700" : value >= 0.3 ? "text-amber-700" : "text-red-700"}`}>
                            {value.toFixed(3)}
                          </p>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">NDVI</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-slate-950">Report Pages</h3>
                <p className="mt-1 text-sm text-slate-500">The exported PDF includes these structured sections.</p>
                <div className="mt-5 grid gap-3">
                  {reportPages.map((page) => (
                    <div key={page} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-950">{page}</p>
                          <p className="text-sm text-slate-500">Included in the formal export</p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                  ))}
                </div>
              </section>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Document Actions</h3>
                  <p className="text-sm text-slate-500">Go back, print, or generate the official export.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button onClick={handleGenerate} disabled={generating} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-60">
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
