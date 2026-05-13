import { useState, useEffect } from "react";

export default function LoadingAnimation() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const steps = ["Earth", "India", "City", "Farm"];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 8, 100));
    }, 200);
    
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 1200);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-emerald-800 to-emerald-600 flex items-center justify-center z-50">
      <div className="text-center text-white">
        {/* Animated rings */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-t-white border-r-white/30 border-b-white/30 border-l-white/30 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          <div className="absolute inset-0 flex items-center justify-center text-5xl animate-float">🛰️</div>
        </div>
        
        {/* Progress bar */}
        <div className="w-48 mx-auto mb-4">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
        
        {/* Loading text */}
        <p className="text-white/80 text-sm mb-2">
          Loading {steps[step]} data...
        </p>
        <p className="text-white/50 text-xs">{progress}%</p>
      </div>
    </div>
  );
}