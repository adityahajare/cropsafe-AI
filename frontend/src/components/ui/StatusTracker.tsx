import { Check, Clock, Search } from "lucide-react";

interface StatusTrackerProps {
  currentStatus: "Pending" | "Processing" | "Approved" | "Rejected" | "Completed";
  className?: string;
}

const STATUS_STEPS = [
  { key: "Pending", label: "Pending", icon: Clock },
  { key: "Processing", label: "Under Review", icon: Search },
  { key: "Approved", label: "Approved", icon: Check },
];

const STATUS_INDEX: Record<string, number> = {
  Pending: 0,
  Processing: 1,
  Approved: 2,
  Completed: 2,
  Rejected: -1,
};

export default function StatusTracker({
  currentStatus,
  className = "",
}: StatusTrackerProps) {
  const currentIndex = STATUS_INDEX[currentStatus] ?? 0;
  const isRejected = currentStatus === "Rejected";

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = currentIndex === index;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRejected && isCurrent
                    ? "bg-cropsafe-danger text-white"
                    : isCompleted
                    ? "bg-cropsafe-primary text-white"
                    : isCurrent
                    ? "bg-cropsafe-primary text-white scale-110 shadow-lg shadow-cropsafe-primary/30 animate-pulse-glow"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-xs font-medium ${
                  isCompleted || isCurrent
                    ? isRejected && isCurrent
                      ? "text-cropsafe-danger"
                      : "text-cropsafe-primary"
                    : "text-gray-400"
                }`}
              >
                {isRejected && isCurrent ? "Rejected" : step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STATUS_STEPS.length - 1 && (
              <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden bg-gray-200 relative">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    isRejected && isCurrent
                      ? "bg-cropsafe-danger"
                      : "bg-cropsafe-primary"
                  }`}
                  style={{
                    width: isCompleted ? "100%" : "0%",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
