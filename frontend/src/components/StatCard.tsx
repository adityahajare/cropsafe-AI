import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "",
  trend,
}: StatCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className={`w-5 h-5 ${color}`} />
        <span>{label}</span>
      </div>

      {/* Value */}
      <div className={`text-2xl font-bold mt-2 ${color}`}>
        {value}
      </div>

      {/* Sub text */}
      {sub && (
        <div className="text-xs mt-1 text-gray-400">
          {sub}
        </div>
      )}

      {/* Trend */}
      {trend === "up" && (
        <div className="text-xs mt-1 text-green-600">📈 Increasing</div>
      )}
      {trend === "down" && (
        <div className="text-xs mt-1 text-red-600">📉 Decreasing</div>
      )}
      {trend === "neutral" && (
        <div className="text-xs mt-1 text-gray-400">➡ Stable</div>
      )}
    </div>
  );
}