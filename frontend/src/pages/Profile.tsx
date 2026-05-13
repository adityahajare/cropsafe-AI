import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import FarmerHeroHeader from "@/components/FarmerHeroHeader";
import { useNavigate } from "react-router-dom";
import { Bell, CreditCard, Globe, HelpCircle, Info, LogOut, MapPin, Phone, Settings, ShieldCheck, Sprout, UserRound } from "lucide-react";
import { getFarms } from "@/services/farmService";

type ProfileSection = "personal" | "bank" | "notifications" | "help" | "about" | null;

export default function Profile() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);
  const [openSection, setOpenSection] = useState<ProfileSection>(null);

  useEffect(() => {
    getFarms()
      .then((data) => setFarms(Array.isArray(data) ? data : []))
      .catch(() => setFarms([]));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf3]">
        <p className="text-slate-500">Loading profile...</p>
      </div>
    );
  }

  const maskAadhaar = (aadhaar?: string) => {
    if (!aadhaar || aadhaar.length < 4) return "XXXX";
    return `XXXX-XXXX-${aadhaar.slice(-4)}`;
  };

  const address = [user.village, user.district, user.city, user.state].filter(Boolean).join(", ") || "Address not available";

  const toggleSection = (section: Exclude<ProfileSection, null>) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const profileActions = [
    { label: "My Farms", icon: Sprout, action: () => navigate("/draw-farm"), value: `${farms.length} farms` },
    { label: "Personal Information", icon: UserRound, action: () => toggleSection("personal"), value: "Verified" },
    { label: "Bank Details", icon: CreditCard, action: () => toggleSection("bank"), value: "Pending" },
    { label: "Notification Settings", icon: Bell, action: () => toggleSection("notifications"), value: "On" },
    { label: "Help & Support", icon: HelpCircle, action: () => toggleSection("help"), value: "" },
    { label: "About CropSafe", icon: Info, action: () => toggleSection("about"), value: "" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f7faf3] pb-28">
      <FarmerHeroHeader
        eyebrow="Account"
        title={t("profile.title")}
        subtitle="Manage identity, language, farms, and account settings from one simple profile page."
        action={<Settings className="h-5 w-5" />}
        highlights={[
          { label: "Profile", value: "Verified farmer" },
          { label: "Language", value: language === "marathi" ? "Marathi" : language === "hindi" ? "Hindi" : "English" },
          { label: "Farms", value: `${farms.length} saved` },
        ]}
      />

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-700">
                <UserRound className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-950">{user.name}</h2>
                <p className="text-sm text-slate-500">{user.mobile || "Mobile not added"}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-slate-50 p-2">
              {[
                { label: "Farms", value: String(farms.length || 0) },
                { label: "Language", value: language === "marathi" ? "MR" : language === "hindi" ? "HI" : "EN" },
                { label: "Role", value: "Farmer" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 text-base font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-black text-slate-950">Personal Information</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <CreditCard className="mb-2 h-5 w-5 text-blue-600" />
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Aadhaar</p>
                  <p className="mt-1 font-black text-slate-950">{maskAadhaar(user.aadhaar)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <Phone className="mb-2 h-5 w-5 text-emerald-700" />
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Mobile</p>
                  <p className="mt-1 font-black text-slate-950">{user.mobile || "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                  <MapPin className="mb-2 h-5 w-5 text-amber-600" />
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Address</p>
                  <p className="mt-1 font-black text-slate-950">{address}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
                    <Globe className="h-5 w-5 text-emerald-700" />
                    Language
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Current: {language === "marathi" ? "Marathi" : language === "hindi" ? "Hindi" : "English"}</p>
                </div>
                <button
                  onClick={() => setShowLanguagePicker((value) => !value)}
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"
                >
                  Change Language
                </button>
              </div>

              {showLanguagePicker && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {(["english", "hindi", "marathi"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLanguagePicker(false);
                      }}
                      className={`rounded-2xl px-4 py-4 text-sm font-black transition ${
                        language === lang ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-emerald-50"
                      }`}
                    >
                      {lang === "marathi" ? "Marathi" : lang === "hindi" ? "Hindi" : "English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
              {farms.length > 0 && (
                <div className="border-b border-slate-100 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-slate-950">My Farms</h3>
                    <button onClick={() => navigate("/draw-farm")} className="text-sm font-black text-emerald-700">View All</button>
                  </div>
                  <div className="space-y-2">
                    {farms.slice(0, 3).map((farm) => (
                      <button
                        key={farm._id}
                        onClick={() => navigate(`/analysis?farmId=${farm._id}`)}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left hover:bg-emerald-50"
                      >
                        <span>
                          <span className="block font-black text-slate-900">{farm.farmName || farm.cropType || "Farm"}</span>
                          <span className="mt-1 block text-xs font-semibold text-slate-500">
                            {farm.cropType || "Crop"} - {Number(farm.areaHectares || 0).toFixed(2)} ha
                            {farm.latestAnalysis?.healthPercentage != null ? ` - ${farm.latestAnalysis.healthPercentage}% health` : ""}
                          </span>
                        </span>
                        <span className="text-slate-400">&gt;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {profileActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} onClick={item.action} className="flex w-full items-center justify-between rounded-2xl px-3 py-4 text-left hover:bg-slate-50">
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-bold text-slate-900">{item.label}</span>
                    </span>
                    <span className="text-sm font-semibold text-slate-500">{item.value ? `${item.value} >` : ">"}</span>
                  </button>
                );
              })}

              {openSection === "personal" && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p><b>Name:</b> {user.name}</p>
                  <p className="mt-1"><b>Mobile:</b> {user.mobile || "Not added"}</p>
                  <p className="mt-1"><b>Aadhaar:</b> {maskAadhaar(user.aadhaar)}</p>
                  <p className="mt-1"><b>Address:</b> {address}</p>
                </div>
              )}

              {openSection === "bank" && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-black text-slate-900">Payout account setup</p>
                  <p className="mt-1">Keep one bank account ready for claim settlement review. Final payout verification is handled during approval.</p>
                </div>
              )}

              {openSection === "notifications" && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p><b>Claim updates:</b> Enabled</p>
                  <p className="mt-1"><b>Weather alerts:</b> Enabled</p>
                  <p className="mt-1"><b>Report review updates:</b> Enabled</p>
                </div>
              )}

              {openSection === "help" && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-black text-slate-900">Support paths</p>
                  <div className="mt-2 space-y-2">
                    <button onClick={() => navigate("/chatbot")} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left font-bold text-emerald-700">Open CropSafe Assistant</button>
                    <button onClick={() => navigate("/claims")} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left font-bold text-emerald-700">Open Claim Center</button>
                  </div>
                </div>
              )}

              {openSection === "about" && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-black text-slate-900">CropSafe</p>
                  <p className="mt-1">This app combines farm registration, satellite NDVI analysis, weather data, disease image checks, claim filing, and admin report review for crop insurance support.</p>
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-red-200 bg-red-50 p-4">
              <button onClick={handleLogout} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white p-4 font-black text-red-700 hover:bg-red-100">
                <LogOut className="h-5 w-5" />
                {t("nav.logout")}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
