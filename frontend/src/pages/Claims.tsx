import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, Clock, FileText, Filter, Loader2, Plus, ShieldCheck, XCircle } from "lucide-react";
import { getClaims } from "@/services/farmService";
import { formatCurrency } from "@/utils/formatters";
import { backendAsset } from "@/utils/backendAssets";

type ClaimStatus = "pending" | "under_review" | "approved" | "rejected";

interface Claim {
  _id: string;
  farmId?: {
    _id: string;
    farmName?: string;
    cropType?: string;
    areaHectares?: number;
    locationLabel?: string;
  };
  claimNumber?: string;
  claimAmount?: number;
  approvedAmount?: number;
  status: ClaimStatus;
  createdAt?: string;
  cropType?: string;
  damagePercent?: number;
}

const statusConfig: Record<ClaimStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

const claimSupportImage = backendAsset("/assets/ui/claim-support.svg");

export default function Claims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getClaims()
      .then((data) => setClaims(Array.isArray(data) ? data : []))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false));
  }, []);

  const approvedCount = claims.filter((claim) => claim.status === "approved").length;
  const pendingCount = claims.filter((claim) => claim.status === "pending" || claim.status === "under_review").length;
  const rejectedCount = claims.filter((claim) => claim.status === "rejected").length;

  return (
    <div className="min-h-screen bg-[#f7faf3] pb-24">
      <header className="bg-white px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="rounded-md p-2 text-slate-700" aria-label="Menu">
            <span className="block h-0.5 w-6 bg-slate-700" />
            <span className="mt-1.5 block h-0.5 w-6 bg-slate-700" />
            <span className="mt-1.5 block h-0.5 w-6 bg-slate-700" />
          </button>
          <h1 className="text-xl font-extrabold text-emerald-800">My Claims</h1>
          <button onClick={() => navigate("/claims/new")} className="rounded-full bg-emerald-50 p-3 text-emerald-700" aria-label="New claim">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-4">
        <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">Get support when you need it most</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">Create and track crop-loss claims from real farm analysis records.</p>
            </div>
            <img src={claimSupportImage} alt="" className="h-24 w-28 shrink-0 rounded-lg object-cover" />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-emerald-800">Create New Claim</h2>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              ["1", "Select Farm"],
              ["2", "Upload Evidence"],
              ["3", "Review"],
              ["4", "Track"],
            ].map(([step, label]) => (
              <div key={step}>
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-700">{step}</div>
                <p className="mt-2 font-semibold text-slate-700">{label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/claims/new")} className="mt-4 flex w-full items-center justify-between rounded-lg bg-emerald-700 px-5 py-4 text-left font-bold text-white">
            <span className="inline-flex items-center gap-3"><Plus className="h-5 w-5" /> Start New Claim</span>
            <span className="text-2xl">›</span>
          </button>
        </section>

        <section className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: claims.length, icon: FileText, className: "text-emerald-700" },
            { label: "Pending", value: pendingCount, icon: Clock, className: "text-yellow-600" },
            { label: "Approved", value: approvedCount, icon: CheckCircle, className: "text-green-600" },
            { label: "Rejected", value: rejectedCount, icon: XCircle, className: "text-red-600" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
                <Icon className={`mx-auto mb-2 h-5 w-5 ${item.className}`} />
                <p className="text-2xl font-bold text-slate-950">{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            );
          })}
        </section>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && claims.length === 0 && (
          <section className="rounded-lg border-2 border-dashed border-emerald-200 bg-white p-8 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-emerald-700" />
            <h3 className="font-bold text-gray-800">No Claims Yet</h3>
            <p className="mt-1 text-sm text-gray-500">Submit a claim when real analysis and evidence indicate crop damage.</p>
            <button onClick={() => navigate("/analysis")} className="mt-4 rounded-md bg-emerald-700 px-5 py-3 font-bold text-white">
              Run Analysis First
            </button>
          </section>
        )}

        {!loading && claims.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-950">Claims History</h2>
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
                <Filter className="h-4 w-4" /> Filter
              </button>
            </div>
            {claims.map((claim) => {
              const status = statusConfig[claim.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const farmName = claim.farmId?.farmName || claim.farmId?.cropType || claim.cropType || "Farm";
              const amount = claim.status === "approved" ? claim.approvedAmount : claim.claimAmount;
              return (
                <article key={claim._id} onClick={() => navigate(`/claims/${claim._id}`)} className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-bold text-slate-950">{claim.claimNumber || `CLM-${claim._id.slice(-6)}`}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold text-slate-700">{farmName}</p>
                      <p className="mt-1 text-xs text-slate-500">{claim.createdAt ? new Date(claim.createdAt).toLocaleDateString("en-IN") : "N/A"}</p>
                      {claim.damagePercent != null && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                          <AlertTriangle className="h-3 w-3" />
                          Damage: {claim.damagePercent}%
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-950">{amount != null ? formatCurrency(amount) : "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">{claim.status === "approved" ? "Approved Amount" : "Estimated Loss"}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
