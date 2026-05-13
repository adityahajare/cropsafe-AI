import { FileText, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClaimApprovalCardProps {
  id: string;
  farmer: string;
  crop: string;
  loss: number;
  amount: number;
  region: string;
}

export function ClaimApprovalCard({ id, farmer, crop, loss, amount, region }: ClaimApprovalCardProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">{farmer}</p>
          <p className="text-xs text-muted-foreground">{id} · {crop} · {region} · {loss}% loss</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-display font-semibold">₹{amount.toLocaleString()}</span>
        <Button size="sm" variant="success" className="gap-1">
          <CheckCircle className="w-3 h-3" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="gap-1">
          <XCircle className="w-3 h-3" /> Reject
        </Button>
      </div>
    </div>
  );
}
