import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cropsafe-background">
      <div className="text-center animate-slide-up">
        <span className="text-6xl block mb-4">🌾</span>
        <h1 className="mb-2 text-5xl font-bold text-cropsafe-text-dark">404</h1>
        <p className="mb-6 text-lg text-cropsafe-text-light">Oops! Page not found</p>
        <Link to="/">
          <button className="crop-btn flex items-center gap-2 mx-auto">
            <Home className="w-5 h-5" />
            Return to Home
          </button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
