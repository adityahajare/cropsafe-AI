import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FarmerHeroHeader from "@/components/FarmerHeroHeader";
import { getClaims, getFarms, submitClaim } from "@/services/farmService";
import { CheckCircle, ChevronRight, Clock, FileText, IndianRupee, Loader2, Plus, ShieldCheck, Sparkles, XCircle } from "lucide-react";

export default function InsuranceClaim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const farmIdParam = searchParams.get("farmId");
  const statusParam = (searchParams.get("status") || "all").toLowerCase();

  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [claims, setClaims] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    statusParam === "pending" || statusParam === "approved" || statusParam === "rejected" ? statusParam : "all"
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [farmsRes, claimsRes] = await Promise.all([getFarms(), getClaims()]);
      const farmsList = Array.isArray(farmsRes) ? farmsRes : [];
      const claimsList = Array.isArray(claimsRes) ? claimsRes : [];
      setFarms(farmsList);
      setClaims(claimsList);
      setSelectedFarm(farmIdParam || farmsList[0]?._id || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedFarmData = useMemo(() => farms.find((farm) => farm._id === selectedFarm), [farms, selectedFarm]);
  const pendingClaims = claims.filter((claim) => claim.status === "pending" || claim.status === "under_review");
  const selectedFarmPendingClaim = pendingClaims.find((claim) => {
    const claimFarmId = typeof claim.farmId === "string" ? claim.farmId : claim.farmId?._id;
    return claimFarmId === selectedFarm;
  });
  const selectedAnalysis = selectedFarmData?.latestAnalysis;
  const approvedCount = claims.filter((claim) => claim.status === "approved").length;
  const rejectedCount = claims.filter((claim) => claim.status === "rejected").length;
  const filteredClaims = claims.filter((claim) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return claim.status === "pending" || claim.status === "under_review";
    return claim.status === activeFilter;
  });

  const handleSubmit = async () => {
    if (!selectedFarm) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      await submitClaim(selectedFarm, notes);
      setSuccess(true);
      setNotes("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Claim could not be submitted right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (status === "rejected") return <XCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-amber-600" />;
  };

  const statusClass = (status: string) => {
    if (status === "approved") return "bg-emerald-50 text-emerald-700";
    if (status === "rejected") return "bg-red-50 text-red-700";
    if (status === "under_review") return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf3]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf3] pb-28">
      <FarmerHeroHeader
        eyebrow="My Claims"
        title="Claim Center"
        subtitle="Submit crop-loss claims, check review progress, and keep every farm claim in one place."
        action={
          <button onClick={() => document.getElementById("new-claim")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl bg-white/10 p-3">
            <Plus className="h-5 w-5" />
          </button>
        }
        highlights={[
          { label: "Open", value: `${pendingClaims.length} review` },
          { label: "Approved", value: `${approvedCount}` },
          { label: "Rejected", value: `${rejectedCount}` },
        ]}
      />

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <FileText className="mb-2 h-5 w-5 text-emerald-700" />
              <p className="text-xs text-slate-500">Total Claims</p>
              <p className="text-2xl font-bold text-slate-950">{claims.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Clock className="mb-2 h-5 w-5 text-amber-600" />
              <p className="text-xs text-slate-500">Pending Review</p>
              <p className="text-2xl font-bold text-slate-950">{pendingClaims.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <ShieldCheck className="mb-2 h-5 w-5 text-emerald-700" />
              <p className="text-xs text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-slate-950">{approvedCount}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Before you submit</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                  Choose the farm with visible loss, review the latest analysis, and add a simple field note. Clear notes help the admin review faster.
                </p>
              </div>
            </div>
          </div>

          <div id="new-claim" className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">File New Claim</h2>
                <p className="text-sm text-slate-500">Start a fresh crop insurance request for one farm.</p>
              </div>
            </div>

            {farms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-6 text-center">
                <p className="font-bold text-emerald-950">No farms registered</p>
                <button onClick={() => navigate("/draw-farm")} className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">
                  Register Farm First
                </button>
              </div>
            ) : selectedFarmPendingClaim ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-black text-amber-900">Pending claim already exists for this farm</p>
                <p className="mt-1 text-sm text-amber-800">Please wait for review before submitting another claim for the same farm.</p>
              </div>
            ) : success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-700" />
                <p className="mt-3 text-lg font-black text-emerald-900">Claim Submitted</p>
                <button onClick={() => setSuccess(false)} className="mt-4 text-sm font-bold text-emerald-700">
                  Submit another claim
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Select Farm</span>
                  <select className="input" value={selectedFarm} onChange={(event) => setSelectedFarm(event.target.value)}>
                    {farms.map((farm) => (
                      <option key={farm._id} value={farm._id}>
                        {farm.farmName || farm.cropType} - {Number(farm.areaHectares || 0).toFixed(2)} ha
                      </option>
                    ))}
                  </select>
                </label>

                {selectedFarmData && (
                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Crop</p>
                      <p className="mt-1 font-black text-slate-900">{selectedFarmData.cropType}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Area</p>
                      <p className="mt-1 font-black text-slate-900">{selectedFarmData.areaHectares} ha</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Season</p>
                      <p className="mt-1 font-black text-slate-900">{selectedFarmData.season}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Health</p>
                      <p className="mt-1 font-black text-slate-900">{selectedAnalysis?.healthPercentage != null ? `${selectedAnalysis.healthPercentage}%` : "Run analysis"}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Damage</p>
                      <p className="mt-1 font-black text-slate-900">{selectedAnalysis?.damagePercentage != null ? `${selectedAnalysis.damagePercentage}%` : "Review analysis"}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Est. Loss</p>
                      <p className="mt-1 font-black text-slate-900">Rs. {Number(selectedAnalysis?.estimatedLoss || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                )}

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Write simple details like rain, leaf drying, waterlogging, pest marks, or crop damage date..."
                  className="min-h-[132px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {errorMessage}
                  </div>
                )}
                <button onClick={handleSubmit} disabled={submitting} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3 text-base font-black text-white disabled:opacity-50">
                  {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                  {submitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">All Claims</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rejectedCount} rejected</span>
          </div>
          <div className="mb-4 grid grid-cols-4 gap-2 text-sm">
            {[
              { key: "all", label: "All Claims", count: claims.length },
              { key: "pending", label: "Pending", count: pendingClaims.length },
              { key: "approved", label: "Approved", count: approvedCount },
              { key: "rejected", label: "Rejected", count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key as "all" | "pending" | "approved" | "rejected")}
                className={`rounded-md border px-2 py-2 text-center font-semibold transition ${
                  activeFilter === tab.key
                    ? "border-emerald-700 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="block">{tab.label}</span>
                <span className="mt-1 block text-xs">{tab.count}</span>
              </button>
            ))}
          </div>

          {claims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-700">No claims yet</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-700">No claims in this filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map((claim) => (
                <article key={claim._id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(claim.status)}
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(claim.status)}`}>
                        {claim.status === "under_review" ? "Under Review" : claim.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{claim.createdAt ? new Date(claim.createdAt).toLocaleDateString("en-IN") : "N/A"}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Claim ID</p>
                      <p className="font-mono text-sm font-semibold">{claim.claimNumber || claim._id?.slice(-8)}</p>
                      {claim.farmId && (
                        <p className="mt-2 text-sm text-slate-600">
                          {claim.farmId.farmName || claim.farmId.cropType} - {claim.farmId.cropType} - {Number(claim.farmId.areaHectares || 0).toFixed(2)} ha
                          {claim.farmId.locationLabel ? ` - ${claim.farmId.locationLabel}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="flex items-center justify-end text-xl font-bold text-emerald-700">
                        <IndianRupee className="h-4 w-4" />
                        {(claim.claimAmount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  {claim.analysisId && (
                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-4">
                      <span>NDVI: <b>{Number(claim.analysisId.ndviValue || 0).toFixed(2)}</b></span>
                      <span>Health: <b>{claim.analysisId.healthPercentage ?? 0}%</b></span>
                      <span>Damage: <b>{claim.analysisId.damagePercentage ?? 0}%</b></span>
                      <span>Risk: <b>{claim.analysisId.riskLevel || "Review"}</b></span>
                    </div>
                  )}
                  {claim.adminRemarks && <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">Remarks: {claim.adminRemarks}</p>}
                  <div className="mt-4 flex items-center justify-end">
                    <button onClick={() => navigate(`/reports?farmId=${typeof claim.farmId === "string" ? claim.farmId : claim.farmId?._id}`)} className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                      View related report
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
