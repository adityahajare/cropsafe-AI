import React from "react";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 0-indexed
  className?: string;
}

export default function StepIndicator({
  steps,
  currentStep,
  className = "",
}: StepIndicatorProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          {/* Step circle + label */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                index < currentStep
                  ? "bg-cropsafe-primary text-white scale-100"
                  : index === currentStep
                  ? "bg-cropsafe-primary text-white scale-110 shadow-lg shadow-cropsafe-primary/30"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {index < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                index <= currentStep
                  ? "text-cropsafe-text-dark"
                  : "text-gray-400"
              }`}
            >
              {step}
            </span>
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="flex-1 mx-2 h-1 rounded-full overflow-hidden bg-gray-200 relative">
              <div
                className="absolute inset-y-0 left-0 bg-cropsafe-primary rounded-full transition-all duration-500 ease-out"
                style={{
                  width: index < currentStep ? "100%" : "0%",
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
