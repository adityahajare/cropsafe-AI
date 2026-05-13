import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, IdCard, Leaf, LockKeyhole, Mail, UserCog, UserRound } from "lucide-react";
import { loginAdmin, loginFarmer } from "@/services/farmService";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import heroFarm from "@/assets/hero-farm.jpg";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const role = searchParams.get("role") === "admin" ? "admin" : "farmer";
  const isAdmin = role === "admin";

  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedAadhaar = localStorage.getItem("savedAadhaar");
    const savedEmail = localStorage.getItem("savedEmail");
    const savedRemember = localStorage.getItem("rememberMe") === "true";

    if (savedAadhaar) setAadhaar(savedAadhaar);
    if (savedEmail) setEmail(savedEmail);
    if (savedRemember) setRememberMe(true);
  }, []);

  const handleLogin = async () => {
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }

    if (isAdmin && !email) {
      setError("Email is required");
      return;
    }

    if (!isAdmin && aadhaar.length !== 12) {
      setError("Aadhaar must be 12 digits");
      return;
    }

    setLoading(true);

    try {
      const res = isAdmin
        ? await loginAdmin(email.trim().toLowerCase(), password)
        : await loginFarmer(aadhaar, password);

      if (res?.success) {
        if (rememberMe) {
          if (isAdmin) {
            localStorage.setItem("savedEmail", email);
          } else {
            localStorage.setItem("savedAadhaar", aadhaar);
          }
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("savedAadhaar");
          localStorage.removeItem("savedEmail");
          localStorage.removeItem("rememberMe");
        }

        login(res.token, res.user);
        navigate(isAdmin ? "/admin" : "/dashboard");
      } else {
        setError(res?.message || "Login failed");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const RoleIcon = isAdmin ? UserCog : UserRound;

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-6">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroFarm})` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-emerald-950/55 to-black/20" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white" aria-label="CropSafe home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold">CropSafe</span>
          </button>
          <LanguageSwitcher />
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="text-white">
            <h1 className="max-w-2xl text-5xl font-extrabold leading-tight md:text-7xl">
              {isAdmin ? "Admin Login" : "Farmer Login"}
            </h1>
            <p className="mt-4 text-xl text-emerald-50 md:text-2xl">
              Continue with the role you selected.
            </p>
          </div>

          <div className="w-full rounded-lg bg-white/95 p-6 shadow-2xl ring-1 ring-white/60 md:p-7">
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <RoleIcon className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-emerald-950">
                  {isAdmin ? "Admin Account" : "Farmer Account"}
                </h2>
                <p className="text-sm text-slate-500">
                  {isAdmin ? "Access your admin dashboard" : "Access your crop insurance dashboard"}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">
                  {isAdmin ? "Email Address" : "Aadhaar Number"}
                </span>
                <div className="relative">
                  {isAdmin ? (
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  ) : (
                    <IdCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  )}
                  <input
                    type={isAdmin ? "email" : "text"}
                    value={isAdmin ? email : aadhaar}
                    onChange={(e) =>
                      isAdmin
                        ? setEmail(e.target.value)
                        : setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))
                    }
                    placeholder={isAdmin ? "admin@cropsafe.com" : "Enter 12-digit Aadhaar"}
                    className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 pl-11 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    inputMode={isAdmin ? "email" : "numeric"}
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 pl-11 pr-12 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-700"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button
                  onClick={() => alert("Contact support at 1800-180-1551 to reset password")}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading || !password || (isAdmin ? !email : aadhaar.length !== 12)}
                className="w-full rounded-md bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </div>

            {!isAdmin && (
              <p className="mt-5 text-center text-sm text-slate-500">
                New Farmer?{" "}
                <button onClick={() => navigate("/register")} className="font-bold text-emerald-700 hover:underline">
                  Register
                </button>
              </p>
            )}

            <button
              onClick={() => navigate("/")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to role selection
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
