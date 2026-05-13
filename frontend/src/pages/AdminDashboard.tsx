import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CloudSun,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Map,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminDashboard,
  getAllClaims,
  getAllFarmers,
  getClaim,
  getPendingClaims,
  updateClaimDecision,
  Claim,
  ClaimStatus,
} from "@/services/adminService";
import {
  decideReport,
  getAllReports,
  getReportById,
  Report,
} from "@/services/cropService";
import { normalizeBackendAssetUrl } from "@/utils/backendAssets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyle: Record<ClaimStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  under_review: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const reportStatusStyle: Record<Report["reportStatus"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};

const asObject = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const formatCurrency = (amount?: number) =>
  `Rs. ${Math.round(amount || 0).toLocaleString("en-IN")}`;

function quoteCsv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(quoteCsv).join(","),
    ...rows.map((row) => headers.map((header) => quoteCsv(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getReportFarmerName(report: Report) {
  const farmer = asObject(report.farmerId);
  return report.farmerInfo?.name || farmer.name || "N/A";
}

function getReportCrop(report: Report) {
  const farm = asObject(report.farmId);
  return report.cropType || farm.cropType || "N/A";
}

function getReportStatus(report: Report): Report["reportStatus"] {
  return report.reportStatus || "DRAFT";
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  const [claims, setClaims] = useState<Claim[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [remark, setRemark] = useState("");
  const [reportRemark, setReportRemark] = useState("");
  const [tab, setTab] = useState<ClaimStatus>("pending");
  const [loading, setLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [reportTab, setReportTab] = useState<"ALL" | Report["reportStatus"]>("ALL");

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardStats, farmersData, reportsData] = await Promise.all([
        getAdminDashboard(),
        getAllFarmers().catch(() => []),
        getAllReports().catch(() => []),
      ]);

      setStats(dashboardStats || {});
      setFarmers(Array.isArray(farmersData) ? farmersData : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);

      const claimsData =
        tab === "pending" || tab === "under_review"
          ? await getPendingClaims()
          : await getAllClaims({ status: tab });

      const filteredClaims =
        tab === "under_review"
          ? claimsData.filter((claim) => claim.status === "under_review")
          : claimsData;

      setClaims(filteredClaims || []);
    } catch (err) {
      console.error("Dashboard error:", err);
      setStats({});
      setClaims([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openDetail = useCallback(async (id: string) => {
    try {
      const claim = await getClaim(id);
      setSelected(claim);
      setRemark(claim?.adminRemarks || "");
    } catch (err) {
      console.error("Error fetching claim:", err);
    }
  }, []);

  const openReportDetail = useCallback(async (id: string) => {
    try {
      const report = await getReportById(id);
      setSelectedReport(report);
      const lastDecision = report?.decisionHistory?.[report.decisionHistory.length - 1];
      setReportRemark(lastDecision?.remark || "");
    } catch (err) {
      console.error("Error fetching report:", err);
    }
  }, []);

  const updateDecision = useCallback(
    async (status: "approved" | "rejected") => {
      if (!selected) return;

      const approvedAmount = status === "approved" ? Math.round((selected.claimAmount || 0) * 0.72) : undefined;
      await updateClaimDecision(selected._id, status, remark, approvedAmount);
      await loadAll();
      setSelected(null);
      setRemark("");
    },
    [selected, remark, loadAll]
  );

  const updateReportDecision = useCallback(
    async (status: "APPROVED" | "REJECTED") => {
      if (!selectedReport) return;

      try {
        setReportSaving(true);
        await decideReport(selectedReport._id, status, reportRemark, "Admin");
        await loadAll();
        setSelectedReport(null);
        setReportRemark("");
      } finally {
        setReportSaving(false);
      }
    },
    [selectedReport, reportRemark, loadAll]
  );

  const filteredFarmers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return farmers.slice(0, 5);
    return farmers
      .filter((farmer) =>
        [farmer.name, farmer.mobile, farmer.district, farmer.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      .slice(0, 5);
  }, [farmers, query]);

  const filteredReports = useMemo(() => {
    if (reportTab === "ALL") return reports;
    return reports.filter((report) => getReportStatus(report) === reportTab);
  }, [reports, reportTab]);

  const selectedReportImages = useMemo(() => {
    if (!selectedReport) return [];
    const satellite = selectedReport.satelliteData || {};
    return [
      { label: "Previous Satellite", url: satellite.beforeImage || satellite.baselineImage },
      { label: "Current Satellite", url: satellite.afterImage || satellite.currentImage },
      { label: "NDVI Map", url: satellite.ndviAfterImage || satellite.changeMapImage || satellite.currentNDVIUrl || satellite.changeMapUrl },
    ]
      .map((image) => ({ ...image, url: normalizeBackendAssetUrl(image.url) }))
      .filter((image) => Boolean(image.url));
  }, [selectedReport]);

  const exportFarmersCsv = useCallback(() => {
    downloadCsv(
      `cropsafe-farmers-${new Date().toISOString().slice(0, 10)}.csv`,
      farmers.map((farmer) => ({
        name: farmer.name || "",
        mobile: farmer.mobile || "",
        aadhaar: farmer.aadhaar || "",
        village: farmer.village || "",
        district: farmer.district || "",
        city: farmer.city || "",
        state: farmer.state || "",
      }))
    );
  }, [farmers]);

  const statCards = [
    { label: "Total Farmers", value: stats.totalFarmers ?? farmers.length ?? 0, icon: Users },
    { label: "Reports", value: stats.totalReports ?? reports.length ?? 0, icon: ClipboardList },
    { label: "Pending Claims", value: stats.pendingClaims ?? 0, icon: FileText },
    { label: "Pending Reports", value: stats.pendingReports ?? reports.filter((report) => getReportStatus(report) === "PENDING").length, icon: FileCheck2 },
  ];

  const liveModuleCards = [
    { title: "Farmers", value: stats.totalFarmers ?? farmers.length ?? 0, subtitle: "registered profiles", icon: Users },
    { title: "Policies", value: stats.totalFarms ?? 0, subtitle: "active farm records", icon: ShieldCheck },
    { title: "Satellite Alerts", value: stats.lowNdviAlerts ?? 0, subtitle: "low NDVI or high damage", icon: Map },
    { title: "Claims", value: stats.pendingClaims ?? 0, subtitle: "pending farmer claims", icon: ClipboardList },
    { title: "Weather", value: stats.totalAnalysis ?? 0, subtitle: "analyses with weather context", icon: CloudSun },
  ];

  return (
    <div className="min-h-screen bg-[#f7faf3]">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <p className="text-sm font-medium text-emerald-300">CropSafe Admin</p>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-300">Manage farmers, satellite evidence, reports, and claim decisions from one live control room.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-50 p-2 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-2xl font-bold text-slate-950">{card.value}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-500">{card.label}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Recent Activities</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Live</span>
            </div>
            <div className="space-y-3">
              {[
                `${farmers.length || stats.totalFarmers || 0} farmers registered`,
                `${stats.pendingClaims || 0} claims awaiting review`,
                `${stats.pendingReports ?? reports.filter((report) => getReportStatus(report) === "PENDING").length} reports awaiting decision`,
                `${stats.activePolicies || stats.totalFarms || 0} active farm policies`,
              ].map((activity) => (
                <div key={activity} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
                  <UserCheck className="h-5 w-5 text-emerald-700" />
                  <span className="text-sm font-medium text-slate-700">{activity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-amber-950">
              <AlertTriangle className="h-5 w-5" />
              Alerts
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">Low NDVI Alerts</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{stats.lowNdviAlerts ?? 0}</p>
              </div>
              <div className="rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">Pending Claims</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{stats.pendingClaims || 0}</p>
              </div>
              <div className="rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">Expiring Policies</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{stats.expiringPolicies ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">Season rollover watch</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {liveModuleCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-emerald-700" />
                  <span className="text-2xl font-black text-slate-950">{card.value}</span>
                </div>
                <h3 className="mt-3 font-bold text-slate-950">{card.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{card.subtitle}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Farmers Management</h2>
              <Button variant="outline" size="sm" onClick={exportFarmersCsv} disabled={farmers.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search farmer, mobile, district"
              />
            </div>
            <div className="space-y-2">
              {filteredFarmers.length === 0 ? (
                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No farmers found.</p>
              ) : (
                filteredFarmers.map((farmer) => (
                  <div key={farmer._id || farmer.id || farmer.mobile} className="rounded-md border border-slate-200 p-3">
                    <p className="font-semibold text-slate-950">{farmer.name || "Farmer"}</p>
                    <p className="text-sm text-slate-500">{farmer.mobile || "No mobile"} - {farmer.district || farmer.city || "Maharashtra"}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950">Claims Management</h2>
              <div className="flex flex-wrap gap-2">
                {(["pending", "under_review", "approved", "rejected"] as const).map((nextTab) => (
                  <Button
                    key={nextTab}
                    onClick={() => setTab(nextTab)}
                    variant={tab === nextTab ? "default" : "outline"}
                    className={tab === nextTab ? "bg-emerald-700 hover:bg-emerald-800" : ""}
                    size="sm"
                  >
                    {nextTab === "under_review" ? "Under Review" : nextTab.charAt(0).toUpperCase() + nextTab.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500">Loading claims...</div>
            ) : claims.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No claims found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Crop</TableHead>
                      <TableHead>Loss</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim._id}>
                        <TableCell className="font-medium">{claim.farmerName || "N/A"}</TableCell>
                        <TableCell>{claim.cropType || claim.farmId?.cropType || "N/A"}</TableCell>
                        <TableCell>{claim.damagePercent || 0}%</TableCell>
                        <TableCell>Rs. {(claim.claimAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`rounded px-2 py-1 text-xs font-medium ${statusStyle[claim.status]}`}>
                            {claim.status === "under_review" ? "Under Review" : claim.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => openDetail(claim._id)} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            <Eye className="mr-1 h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Insurance Reports</h2>
              <p className="text-sm text-slate-500">AI crop damage reports generated by farmers for admin review.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "PENDING", "APPROVED", "REJECTED", "DRAFT"] as const).map((nextTab) => (
                <Button
                  key={nextTab}
                  onClick={() => setReportTab(nextTab)}
                  variant={reportTab === nextTab ? "default" : "outline"}
                  className={reportTab === nextTab ? "bg-emerald-700 hover:bg-emerald-800" : ""}
                  size="sm"
                >
                  {nextTab}
                </Button>
              ))}
              <Button onClick={loadAll} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-md bg-slate-50 p-5 text-sm text-slate-500">
              No reports found for this status. Ask the farmer to open Reports and send the farm report to admin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Damage</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report._id}>
                      <TableCell className="font-medium">{getReportFarmerName(report)}</TableCell>
                      <TableCell>{getReportCrop(report)}</TableCell>
                      <TableCell>{report.damagePercent ?? report.statistics?.damagePercent ?? 0}%</TableCell>
                      <TableCell>{report.aiRecommendation?.riskLevel || "N/A"}</TableCell>
                      <TableCell>{formatCurrency(report.financialData?.compensationEstimate)}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-1 text-xs font-medium ${reportStatusStyle[getReportStatus(report)]}`}>
                          {getReportStatus(report)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openReportDetail(report._id)} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                          <Eye className="mr-1 h-4 w-4" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
            <h3 className="text-xl font-bold">Review Claim</h3>
            <div className="my-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Farmer</span>
                <span className="font-medium">{selected.farmerName || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Crop</span>
                <span className="font-medium">{selected.cropType || selected.farmId?.cropType || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Loss</span>
                <span className="font-medium text-amber-700">{selected.damagePercent || 0}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Claim amount</span>
                <span className="font-bold text-emerald-700">Rs. {(selected.claimAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">Admin remarks</label>
            <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Add remarks..." rows={3} className="mt-1" />

            <div className="mt-5 flex gap-2">
              <Button onClick={() => updateDecision("approved")} className="flex-1 bg-emerald-700 hover:bg-emerald-800">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button onClick={() => updateDecision("rejected")} className="flex-1 bg-red-600 hover:bg-red-700">
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={() => setSelected(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Review Insurance Report</h3>
                <p className="text-sm text-slate-500">{getReportFarmerName(selectedReport)} - {getReportCrop(selectedReport)}</p>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-medium ${reportStatusStyle[getReportStatus(selectedReport)]}`}>
                {getReportStatus(selectedReport)}
              </span>
            </div>

            <div className="my-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Damage</p>
                <p className="text-xl font-bold text-amber-700">{selectedReport.damagePercent ?? selectedReport.statistics?.damagePercent ?? 0}%</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Risk</p>
                <p className="text-xl font-bold text-slate-950">{selectedReport.aiRecommendation?.riskLevel || "N/A"}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Estimated compensation</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedReport.financialData?.compensationEstimate)}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">NDVI</p>
                <p className="text-xl font-bold text-slate-950">{selectedReport.statistics?.currentNDVI ?? selectedReport.satelliteData?.currentNDVI ?? "N/A"}</p>
              </div>
            </div>

            {selectedReportImages.length > 0 && (
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {selectedReportImages.map((image) => (
                  <div key={image.label} className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    <img src={image.url} alt={image.label} className="h-28 w-full object-cover" />
                    <p className="p-2 text-xs font-semibold text-slate-600">{image.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p className="font-semibold text-slate-950">{selectedReport.aiRecommendation?.problemTitle || selectedReport.aiRecommendation?.summary || "Farm assessment"}</p>
                <p className="mt-1 text-slate-600">{selectedReport.aiRecommendation?.problemSummary || selectedReport.aiRecommendation?.finalDecision || "No detailed problem summary saved."}</p>
                {selectedReport.aiRecommendation?.damageCause && (
                  <p className="mt-2 text-slate-700"><span className="font-semibold">Cause:</span> {selectedReport.aiRecommendation.damageCause}</p>
                )}
              </div>

              {Boolean(selectedReport.aiRecommendation?.evidence?.length) && (
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold text-slate-950">Evidence</p>
                  <div className="mt-2 space-y-1 text-slate-600">
                    {selectedReport.aiRecommendation?.evidence?.slice(0, 5).map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              )}

              {Boolean(selectedReport.aiRecommendation?.actionItems?.length) && (
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold text-slate-950">Suggested Action</p>
                  <div className="mt-2 space-y-1 text-slate-600">
                    {selectedReport.aiRecommendation?.actionItems?.slice(0, 5).map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">Admin remarks</label>
            <Textarea value={reportRemark} onChange={(event) => setReportRemark(event.target.value)} placeholder="Add approval or rejection reason..." rows={3} className="mt-1" />

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => updateReportDecision("APPROVED")} disabled={reportSaving} className="flex-1 bg-emerald-700 hover:bg-emerald-800">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button onClick={() => updateReportDecision("REJECTED")} disabled={reportSaving} className="flex-1 bg-red-600 hover:bg-red-700">
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={() => setSelectedReport(null)} disabled={reportSaving} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
