import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Leaf, Menu, X, LogOut, User, Globe, Satellite } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/utils/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "Weather", path: "/weather" },
  { label: "Claims", path: "/claims" },
  { label: "Disease", path: "/disease" },
  { label: "Admin", path: "/admin" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register";

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const langLabel = language === "marathi" ? "मराठी" : language === "hindi" ? "हिन्दी" : "EN";

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isLanding
          ? "bg-black/30 backdrop-blur-xl border-white/10"
          : "bg-white/90 backdrop-blur-lg border-gray-100"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl green-gradient flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className={`font-bold text-base ${
                isLanding ? "text-white" : "text-cropsafe-text-dark"
              }`}
            >
              {APP_NAME}
            </span>
            <span
              className={`text-[10px] font-medium ${
                isLanding ? "text-white/50" : "text-cropsafe-text-light"
              }`}
            >
              {APP_TAGLINE}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((link) => {
            const active = location.pathname === link.path || location.pathname.startsWith(link.path + "/");
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? isLanding
                      ? "bg-white/15 text-white"
                      : "bg-cropsafe-primary/10 text-cropsafe-primary"
                    : isLanding
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-cropsafe-text-light hover:text-cropsafe-text-dark hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {/* Satellite Live badge */}
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              isLanding
                ? "bg-white/10 text-white/70"
                : "bg-green-50 text-cropsafe-primary"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cropsafe-secondary animate-pulse" />
            <Satellite className="w-3 h-3" />
            Live
          </div>

          {/* Language selector */}
          <button
            onClick={() => {
              const next = language === "english" ? "hindi" : language === "hindi" ? "marathi" : "english";
              setLanguage(next);
            }}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
              isLanding
                ? "bg-white/10 text-white/70 hover:bg-white/20"
                : "bg-gray-50 text-cropsafe-text-light hover:bg-gray-100"
            }`}
          >
            <Globe className="w-3 h-3" />
            {langLabel}
          </button>

          {/* Auth buttons */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    isLanding
                      ? "bg-white/10 text-white"
                      : "bg-cropsafe-primary/10 text-cropsafe-primary"
                  }`}
                >
                  <User className="w-4 h-4" />
                  {user.name}
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-cropsafe-danger bg-red-50 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <button className="px-4 py-2 text-sm font-medium text-cropsafe-primary border border-cropsafe-primary rounded-lg hover:bg-cropsafe-primary hover:text-white transition-colors">
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button className="crop-btn !py-2 !px-4 !text-sm">
                  Register
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={`md:hidden p-2 rounded-lg transition-colors ${
            isLanding ? "text-white hover:bg-white/10" : "text-cropsafe-text-dark hover:bg-gray-50"
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white/95 backdrop-blur-xl px-4 pb-5 pt-3 space-y-1">
          {NAV_ITEMS.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-cropsafe-primary/10 text-cropsafe-primary"
                    : "text-cropsafe-text-light hover:text-cropsafe-text-dark hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Language in mobile */}
          <div className="pt-2 border-t mt-2">
            <div className="flex gap-2">
              {(["english", "hindi", "marathi"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    language === lang
                      ? "bg-cropsafe-primary text-white"
                      : "bg-gray-100 text-cropsafe-text-light"
                  }`}
                >
                  {lang === "marathi" ? "मराठी" : lang === "hindi" ? "हिन्दी" : "English"}
                </button>
              ))}
            </div>
          </div>

          {/* Auth in mobile */}
          <div className="pt-2 border-t mt-2 space-y-2">
            {isAuthenticated && user ? (
              <>
                <Link to="/profile" className="block">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cropsafe-primary/10 text-cropsafe-primary font-medium text-sm">
                    <User className="w-4 h-4" />
                    {user.name}
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-cropsafe-danger font-medium text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="flex-1">
                  <button className="w-full py-2 text-sm font-medium text-cropsafe-primary border border-cropsafe-primary rounded-lg">
                    Login
                  </button>
                </Link>
                <Link to="/register" className="flex-1">
                  <button className="w-full py-2 text-sm font-bold text-white bg-cropsafe-primary rounded-lg">
                    Register
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
