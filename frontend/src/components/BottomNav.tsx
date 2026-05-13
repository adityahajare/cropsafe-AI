import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "HOME", emoji: "🏠", match: ["/dashboard"] },
  { path: "/analysis", label: "MY FARM", emoji: "🌱", match: ["/analysis", "/draw-farm"] },
  { path: "/disease", label: "CHECK CROP", emoji: "📷", match: ["/disease"] },
  { path: "/reports", label: "REPORTS", emoji: "📄", match: ["/reports", "/claims"] },
  { path: "/profile", label: "PROFILE", emoji: "👤", match: ["/profile"] },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenRoutes = ["/", "/login", "/register", "/admin", "/admin/login"];
  
  if (hiddenRoutes.some((route) => location.pathname === route || location.pathname.startsWith(route + "/"))) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-100 bg-white/95 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-sm"
      style={{ height: "82px", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-full max-w-[500px] items-center justify-around gap-1 mx-auto px-1">
        {navItems.map((item) => {
          const isActive = item.match.some((path) => location.pathname === path || location.pathname.startsWith(path + "/"));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-1 transition-all duration-200 ${
                isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="text-[22px] leading-none">{item.emoji}</span>
              <span className={`mt-1 text-[9px] leading-tight ${isActive ? "font-black" : "font-bold"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
