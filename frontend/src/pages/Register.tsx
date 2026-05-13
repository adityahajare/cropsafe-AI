import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, Home, Leaf, LockKeyhole, MapPinned, Sprout, UserRound } from "lucide-react";
import { registerFarmer } from "@/services/farmService";
import { useAuth } from "@/contexts/AuthContext";
import { CROP_TYPES, SEASON_TYPES } from "@/utils/constants";
import { getIndianStates, LocationCity, searchIndianCities } from "@/services/locationService";
import heroFarm from "@/assets/hero-farm.jpg";

const steps = [
  { label: "Personal", icon: UserRound },
  { label: "Address", icon: Home },
  { label: "Security", icon: LockKeyhole },
  { label: "Farm", icon: Sprout },
  { label: "Boundary", icon: MapPinned },
];

const CUSTOM_CROP = "__custom_crop__";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<LocationCity[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [customCropType, setCustomCropType] = useState("");
  const [selectedCity, setSelectedCity] = useState<LocationCity | null>(null);

  const [form, setForm] = useState({
    name: "",
    aadhaar: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    village: "",
    district: "",
    state: "",
    city: "",
    farmName: "",
    cropType: "",
    season: "",
    sowingDate: "",
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const validateAadhaar = (val: string) => /^[0-9]{12}$/.test(val);
  const validateMobile = (val: string) => /^[6-9][0-9]{9}$/.test(val);

  useEffect(() => {
    getIndianStates()
      .then(setStates)
      .catch(() => {
        setStates([
          "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
          "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
          "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
          "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh",
          "Uttarakhand", "West Bengal"
        ]);
      });
  }, []);

  useEffect(() => {
      if (!form.state || cityQuery.trim().length < 2) {
      setCityResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCityLoading(true);
      try {
        setCityResults(await searchIndianCities(form.state, cityQuery));
      } catch {
        setCityResults([]);
      } finally {
        setCityLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.state, cityQuery]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (form.password.length >= 6) score++;
    if (/[a-z]/.test(form.password)) score++;
    if (/[A-Z]/.test(form.password)) score++;
    if (/[0-9]/.test(form.password)) score++;
    return score;
  }, [form.password]);

  const getStepError = () => {
    if (step === 1) {
      if (!form.name.trim()) return "Full name is required.";
      if (!validateAadhaar(form.aadhaar)) return "Aadhaar must be exactly 12 digits.";
      if (!validateMobile(form.mobile)) return "Mobile must be 10 digits and start with 6, 7, 8, or 9.";
    }
    if (step === 2) {
      if (!form.village.trim()) return "Village is required.";
      if (!form.district.trim()) return "District is required.";
      if (!form.state) return "State is required.";
      if (!form.city) return "City is required.";
      if (!selectedCity || !Number.isFinite(Number(selectedCity.lat)) || !Number.isFinite(Number(selectedCity.lon))) {
        return "Select your place from the search suggestions so the farm map can open in the right area.";
      }
    }
    if (step === 3) {
      if (form.password.length < 6) return "Password must be at least 6 characters.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (step === 4) {
      if (!form.farmName.trim()) return "Farm name is required.";
      if (!form.cropType) return "Crop type is required.";
      if (form.cropType === CUSTOM_CROP && !customCropType.trim()) return "Custom crop name is required.";
      if (!form.season) return "Season is required.";
      if (!form.sowingDate) return "Sowing date is required.";
    }
    if (step === 5 && !agreeTerms) return "Confirm the details before continuing to the map.";
    return "";
  };

  const canNext = () => !getStepError();

  const goNext = () => {
    const validationMessage = getStepError();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handleRegister = async () => {
    setError("");

    if (!canNext()) {
      setError("Complete the current step before continuing.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerFarmer({
        name: form.name,
        aadhaar: form.aadhaar,
        mobile: form.mobile,
        village: form.village,
        district: form.district,
        city: form.city,
        state: form.state,
        password: form.password,
      });

      if (res?.success) {
        const finalCropType = form.cropType === CUSTOM_CROP ? customCropType.trim() : form.cropType;
        login(res.token, res.user);
        localStorage.setItem(
          "pending_farm_data",
          JSON.stringify({
            cropType: finalCropType,
            season: form.season,
            sowingDate: form.sowingDate,
            farmName: form.farmName,
            village: form.village,
            district: form.district,
            city: form.city,
            state: form.state,
            cityLat: selectedCity?.lat,
            cityLon: selectedCity?.lon,
            cityDisplayName: selectedCity?.displayName,
          })
        );
        navigate("/draw-farm");
      } else {
        setError(res?.message || "Registration failed");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroFarm})` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-emerald-950/55 to-black/20" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white" aria-label="CropSafe home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold">CropSafe</span>
          </button>
          <button onClick={() => navigate("/")} className="text-sm font-semibold text-white/75 hover:text-white">
            Back
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="rounded-lg bg-emerald-950/90 p-6 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur">
            <h1 className="text-3xl font-bold">Farmer Registration</h1>
            <p className="mt-3 text-emerald-100">
              Complete five steps, then draw the farm boundary on the map to finish onboarding.
            </p>

            <div className="mt-8 space-y-3">
              {steps.map((item, index) => {
                const number = index + 1;
                const Icon = item.icon;
                const complete = step > number;
                const active = step === number;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-md p-3 ${
                      active ? "bg-white text-emerald-950" : complete ? "bg-emerald-700/70" : "bg-white/8"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500 text-white">
                      {complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="text-xs opacity-75">Step {number}</p>
                      <p className="font-semibold">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-lg bg-white/95 p-5 shadow-2xl ring-1 ring-white/60 md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Step {step} of 5</p>
                <h2 className="text-2xl font-bold text-slate-950">{steps[step - 1].label}</h2>
              </div>
              <div className="hidden rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 sm:block">
                Farm boundary comes next
              </div>
            </div>

            {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Full name</span>
                  <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Rajesh Patil" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Aadhaar number</span>
                  <input className="input" value={form.aadhaar} onChange={(e) => update("aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12 digits" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Mobile number</span>
                  <input className="input" value={form.mobile} onChange={(e) => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10 digits" />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Village</span>
                  <input className="input" value={form.village} onChange={(e) => update("village", e.target.value)} placeholder="Village" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">District</span>
                  <input className="input" value={form.district} onChange={(e) => update("district", e.target.value)} placeholder="District" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">State</span>
                  <select
                    className="input"
                    value={form.state}
                    onChange={(e) => {
                      update("state", e.target.value);
                      update("city", "");
                      setSelectedCity(null);
                      setCityQuery("");
                      setCityResults([]);
                    }}
                  >
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">City</span>
                  <input
                    className="input"
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      update("city", "");
                      setSelectedCity(null);
                    }}
                    disabled={!form.state}
                    placeholder={form.state ? "Search city, town, or village" : "Select state first"}
                  />
                  {form.city && <p className="text-xs font-medium text-emerald-700">Selected: {form.city}</p>}
                  {cityLoading && <p className="text-xs text-slate-500">Searching cities...</p>}
                  {!cityLoading && form.state && cityQuery.trim().length >= 2 && cityResults.length === 0 && !form.city && (
                    <p className="text-xs text-emerald-700">Keep typing your village, taluka, or nearby town and choose the closest match below.</p>
                  )}
                  {cityResults.length > 0 && (
                    <div className="max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                      {cityResults.map((city) => (
                        <button
                          type="button"
                          key={`${city.name}-${city.district}-${city.lat}-${city.lon}`}
                          onClick={() => {
                            update("city", city.name);
                            if (city.district) update("district", city.district);
                            if (city.state) update("state", city.state);
                            setCityQuery(city.name);
                            setSelectedCity(city);
                            setCityResults([]);
                          }}
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-emerald-50"
                        >
                          <span className="font-medium text-slate-900">{city.name}</span>
                          <span className="block text-xs text-slate-500">{[city.district, city.state].filter(Boolean).join(", ")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <input className="input" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Minimum 6 characters" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Confirm password</span>
                  <input className="input" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Repeat password" />
                </label>
                <div className="md:col-span-2">
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${passwordScore * 25}%` }} />
                  </div>
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="mt-3 text-sm font-semibold text-emerald-700">
                    {showPassword ? "Hide password" : "Show password"}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Farm name</span>
                  <input className="input" value={form.farmName} onChange={(e) => update("farmName", e.target.value)} placeholder="e.g. North Field" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Crop type</span>
                  <select className="input" value={form.cropType} onChange={(e) => update("cropType", e.target.value)}>
                    <option value="">Select crop</option>
                    {CROP_TYPES.map((crop) => (
                      <option key={crop.name}>{crop.name}</option>
                    ))}
                    <option value={CUSTOM_CROP}>Other / Custom crop</option>
                  </select>
                </label>
                {form.cropType === CUSTOM_CROP && (
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Custom crop name</span>
                    <input
                      className="input"
                      value={customCropType}
                      onChange={(e) => setCustomCropType(e.target.value)}
                      placeholder="Enter crop name"
                    />
                  </label>
                )}
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Season</span>
                  <select className="input" value={form.season} onChange={(e) => update("season", e.target.value)}>
                    <option value="">Select season</option>
                    {SEASON_TYPES.map((season) => (
                      <option key={season.name}>{season.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                    Sowing date
                  </span>
                  <input className="input" type="date" value={form.sowingDate} onChange={(e) => update("sowingDate", e.target.value)} />
                </label>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Soil type will be detected automatically after you draw the farm boundary.
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex gap-4">
                  <MapPinned className="mt-1 h-8 w-8 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">Farm boundary drawing</h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      After registration, CropSafe will open the map drawing screen with your farm details filled in. Draw the farm polygon to calculate area and complete onboarding.
                    </p>
                    <label className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-950">
                      <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="h-4 w-4 accent-emerald-700" />
                      I confirm the details are correct and I am ready to draw my farm boundary.
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 flex gap-3">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="rounded-md border border-emerald-700 px-5 py-3 font-semibold text-emerald-700">
                  Back
                </button>
              )}
              {step < 5 ? (
                <button onClick={goNext} className="ml-auto rounded-md bg-emerald-700 px-6 py-3 font-bold text-white">
                  Continue
                </button>
              ) : (
                <button disabled={loading || !canNext()} onClick={handleRegister} className="ml-auto rounded-md bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-50">
                  {loading ? "Registering..." : "Register and Draw Boundary"}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
