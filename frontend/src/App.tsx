import { Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

// Pages
import AdminLogin from "@/components/AdminLogin";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DrawFarmMap from "@/pages/DrawFarmMap";
import Dashboard from "@/pages/Dashboard";
import Analysis from "@/pages/Analysis";
import DiseaseDetector from "@/pages/DiseaseDetector";
import InsuranceClaim from "@/pages/InsuranceClaim";
import Chatbot from "@/pages/Chatbot";
import ReportGenerator from "@/pages/ReportGenerator";
import AdminDashboard from "@/pages/AdminDashboard";
import Profile from "@/pages/Profile";

/* =========================
   PROTECTED ROUTE (FARMER)
========================= */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF7]">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF7]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please login to continue</p>
          <a
            href="/login"
            className="bg-[#2E7D32] text-white px-6 py-3 rounded-xl font-bold"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/* =========================
   ADMIN ROUTE (FIXED + SAFE)
========================= */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ wait for hydration
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E53935] font-medium mb-4">
            Please login first
          </p>
          <a
            href="/admin/login"
            className="bg-[#2E7D32] text-white px-6 py-3 rounded-xl font-bold"
          >
            Admin Login
          </a>
        </div>
      </div>
    );
  }

  // 🔥 strict role check
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 font-medium">
          Admin access required
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/* =========================
   APP
========================= */
export default function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // ✅ safer admin route detection
  const isAdminRoute =
    location.pathname === "/admin" ||
    location.pathname.startsWith("/admin/");
  const isPublicRoute = ["/", "/login", "/register", "/admin/login"].includes(location.pathname);
  const showFarmerChrome = isAuthenticated && !isAdminRoute && !isPublicRoute;

  return (
    <div className="min-h-screen bg-[#F9FBF7]">
      <main>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* FARMER PROTECTED */}
          <Route
            path="/draw-farm"
            element={
              <ProtectedRoute>
                <DrawFarmMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disease"
            element={
              <ProtectedRoute>
                <DiseaseDetector />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims"
            element={
              <ProtectedRoute>
                <InsuranceClaim />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* ADMIN */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>

      {/* hide bottom nav for admin */}
      {showFarmerChrome && <BottomNav />}
    </div>
  );
}
