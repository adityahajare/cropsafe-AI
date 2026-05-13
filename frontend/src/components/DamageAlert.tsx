import { AlertTriangle, Satellite, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DamageAlertProps {
  description: string;
  confidence: string;
  estimatedClaim: string;
  submitted: boolean;
  onSubmit: () => void;
}

export function DamageAlert({ description, confidence, estimatedClaim, submitted, onSubmit }: DamageAlertProps) {
  if (submitted) {
    return (
      <div className="stat-card border-l-4 border-l-emerald-500 bg-emerald-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-emerald-800">Claim Submitted Successfully</h3>
            <p className="text-sm text-emerald-700 mt-0.5">
              Your claim for {estimatedClaim} has been submitted. Expected processing: 48 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card border-l-4 border-l-destructive bg-red-50/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold">Crop Damage Detected</h3>
              <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
                AI Alert
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Source:</span>
                <span className="font-medium">Satellite + Weather</span>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence:</span>{" "}
                <span className="font-semibold text-destructive">{confidence}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Est. Claim:</span>{" "}
                <span className="font-semibold">{estimatedClaim}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          className="bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-sm shrink-0"
          size="sm"
          onClick={onSubmit}
        >
          Submit Claim
        </Button>
      </div>
    </div>
  );
}
