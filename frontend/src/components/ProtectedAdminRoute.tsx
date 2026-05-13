import { useEffect, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token) {
      navigate("/admin/login");
      return;
    }
    
    // ✅ Check if user is admin
    try {
      const user = JSON.parse(userStr || "{}");
      if (user.role !== "admin") {
        navigate("/admin/login");
        return;
      }
    } catch {
      navigate("/admin/login");
      return;
    }
    
    setReady(true);
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          <span className="text-sm text-slate-600">Checking admin access...</span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin/login");
  };

  // Get admin name from storage
  const userStr = localStorage.getItem("user");
  const adminName = (() => {
    try {
      const user = JSON.parse(userStr || "{}");
      return user.name || "Admin";
    } catch {
      return "Admin";
    }
  })();

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2">
              <LockKeyhole className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Admin Dashboard</p>
              <p className="text-xs text-slate-500">Welcome, {adminName}</p>
            </div>
          </div>
          <button
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}