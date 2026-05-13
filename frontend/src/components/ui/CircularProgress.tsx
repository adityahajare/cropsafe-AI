import { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

function getColor(value: number): string {
  if (value >= 75) return "#2E7D32";
  if (value >= 50) return "#FDD835";
  if (value >= 25) return "#FF9800";
  return "#E53935";
}

export default function CircularProgress({
  value,
  size = 200,
  strokeWidth = 12,
  label,
  suffix = "%",
  className = "",
  animate = true,
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const color = getColor(value);

  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }

    let start = 0;
    const duration = 1000;
    const startTime = performance.now();

    function animateFrame(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      start = eased * value;
      setAnimatedValue(Math.round(start));

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      }
    }

    requestAnimationFrame(animateFrame);
  }, [value, animate]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="circular-progress">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8F5E9"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: animate ? "stroke-dashoffset 1s ease-out" : "none" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-cropsafe-text-dark"
          style={{ fontSize: size * 0.22 }}
        >
          {animatedValue}
          {suffix}
        </span>
        {label && (
          <span
            className="text-cropsafe-text-light font-medium"
            style={{ fontSize: size * 0.09 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
